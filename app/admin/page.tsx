import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import { prisma } from '@/lib/prisma'
import { samQuotaStatus } from '@/lib/sam-quota'
import { aiDraftStatus } from '@/lib/ai-budget'
import { isAiDraftingConfigured } from '@/lib/proposal-engine'
import { getFeedPerf } from '@/lib/perf'
import AdminActions from './AdminActions'

export const dynamic = 'force-dynamic'

const mono = 'var(--font-geist-mono, monospace)'
const sans = 'var(--font-geist-sans, sans-serif)'
const crimson = '#C41230'

const label: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: '0.18em',
  color: 'rgba(255,255,255,0.3)',
  marginBottom: 12,
  fontFamily: mono,
}

function StatCard({ title, value, sub, warn }: { title: string; value: string | number; sub?: string; warn?: boolean }) {
  return (
    <div style={{ border: `1px solid ${warn ? 'rgba(196,18,48,0.4)' : 'rgba(255,255,255,0.08)'}`, padding: '20px 24px', minWidth: 150, flex: 1 }}>
      <div style={{ fontSize: 9, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.3)', fontFamily: mono }}>{title}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color: warn ? '#C41230' : '#fff', margin: '8px 0 2px', fontFamily: sans }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: warn ? '#C41230' : 'rgba(255,255,255,0.25)', fontFamily: mono }}>{sub}</div>}
    </div>
  )
}

async function safeCount(fn: () => Promise<number>): Promise<number | string> {
  try {
    return await fn()
  } catch {
    return '—'
  }
}

export default async function AdminPage() {
  const session = await requireAdmin()
  if (!session) redirect('/dashboard')

  const [users, verified, profiles, saved, proposals, teams, waitlist] = await Promise.all([
    safeCount(() => prisma.user.count()),
    safeCount(() => prisma.user.count({ where: { emailVerified: { not: null } } })),
    safeCount(() => prisma.companyProfile.count()),
    safeCount(() => prisma.savedContract.count()),
    safeCount(() => prisma.generatedDocument.count()),
    safeCount(() => prisma.team.count()),
    safeCount(() => prisma.waitlist.count()),
  ])

  let recentUsers: { email: string; name: string | null; createdAt: Date; emailVerified: Date | null; subscriptionTier: string }[] = []
  try {
    recentUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 15,
      select: { email: true, name: true, createdAt: true, emailVerified: true, subscriptionTier: true },
    })
  } catch { /* table missing pre-migration */ }

  let emailLogs: { to: string; subject: string; status: string; error: string | null; createdAt: Date }[] = []
  let emailLogsAvailable = true
  try {
    emailLogs = await prisma.emailLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { to: true, subject: true, status: true, error: true, createdAt: true },
    })
  } catch {
    emailLogsAvailable = false
  }

  // Contract store status — count the LIVE (non-expired) contracts the feed
  // actually serves, and flag a starved store so it's never silently empty.
  let storeCount: number | string = '—'
  let liveCount = 0
  let lastSync: Date | null = null
  try {
    liveCount = await prisma.contractCache.count({ where: { OR: [{ deadline: { gte: new Date() } }, { deadline: null }] } })
    storeCount = liveCount
    const latest = await prisma.contractCache.findFirst({ orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } })
    lastSync = latest?.updatedAt ?? null
  } catch { /* table missing pre-migration */ }
  const storeStarved = typeof storeCount === 'number' && liveCount < 400

  // Semantic layer coverage — how many contracts actually have a Voyage
  // embedding. "Voyage live" in env only means the KEY is set; this shows
  // whether embeddings are really being populated (by the daily pre-embed cron).
  let embeddingCount: number | null = null
  try {
    embeddingCount = await prisma.contractEmbedding.count()
  } catch { /* table missing pre-migration */ }

  // SAM.gov daily budget
  const quota = await samQuotaStatus()

  // AI proposal drafting: is Claude wired in, and how many drafts today
  const aiConfigured = isAiDraftingConfigured()
  const aiDrafts = await aiDraftStatus()

  // Feed performance: fast-paint vs backgrounded enrichment (progressive load)
  const feedPerf = await getFeedPerf()

  // Last save-contract error (recorded server-side for diagnosis)
  let lastSaveError: string | null = null
  try {
    const row = await prisma.kv.findUnique({ where: { key: 'last-save-error' } })
    lastSaveError = row?.value ?? null
  } catch { /* Kv missing */ }

  // Pipeline totals across all users
  let pipelineByStage: { status: string; _count: number }[] = []
  try {
    const grouped = await prisma.savedContract.groupBy({ by: ['status'], _count: true })
    pipelineByStage = grouped.map(g => ({ status: g.status, _count: g._count }))
  } catch { /* ignore */ }

  // Recent waitlist signups
  let waitlistRecent: { email: string; createdAt: Date }[] = []
  try {
    waitlistRecent = await prisma.waitlist.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { email: true, createdAt: true },
    })
  } catch { /* table missing pre-migration */ }

  // Environment config — booleans only, never values
  const ENV_CHECKS: { name: string; ok: boolean; note: string }[] = [
    { name: 'SAM_GOV_API_KEY', ok: !!process.env.SAM_GOV_API_KEY, note: 'live contract data' },
    { name: 'RESEND_API_KEY', ok: !!process.env.RESEND_API_KEY, note: 'all outbound email' },
    { name: 'NEXTAUTH_SECRET', ok: !!process.env.NEXTAUTH_SECRET, note: 'session security' },
    { name: 'NEXTAUTH_URL', ok: !!process.env.NEXTAUTH_URL, note: 'email link domains' },
    { name: 'GOOGLE_CLIENT_ID', ok: !!process.env.GOOGLE_CLIENT_ID, note: 'Google sign-in (free)' },
    { name: 'VOYAGE_API_KEY', ok: !!process.env.VOYAGE_API_KEY, note: 'learning match layer (adapts to saves)' },
    { name: 'ANTHROPIC_API_KEY', ok: !!process.env.ANTHROPIC_API_KEY, note: 'AI proposal drafting (feature pending)' },
    { name: 'STRIPE_SECRET_KEY', ok: !!process.env.STRIPE_SECRET_KEY, note: 'payments' },
    { name: 'CRON_SECRET', ok: !!process.env.CRON_SECRET, note: 'cron endpoint auth' },
    { name: 'ADMIN_EMAIL', ok: !!process.env.ADMIN_EMAIL, note: 'admin access (bootstrap: first account)' },
  ]

  const fmtDate = (d: Date) =>
    new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

  const th: React.CSSProperties = {
    textAlign: 'left',
    padding: '8px 12px',
    fontSize: 9,
    letterSpacing: '0.14em',
    color: 'rgba(255,255,255,0.3)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    fontFamily: mono,
    whiteSpace: 'nowrap',
  }
  const td: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    fontFamily: mono,
    verticalAlign: 'top',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', padding: '48px clamp(20px, 5vw, 64px)', fontFamily: mono }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 40 }}>
          <span style={{ color: crimson, fontSize: 20, fontWeight: 700 }}>ᛁ</span>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', marginLeft: 8 }}>IR</span>
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, letterSpacing: '0.1em', marginLeft: 6 }}>ADMIN CONSOLE</span>
        </div>

        {lastSaveError && (
          <div style={{ marginBottom: 32, padding: '16px 20px', background: 'rgba(196,18,48,0.08)', border: `1px solid ${crimson}` }}>
            <div style={{ fontSize: 9, letterSpacing: '0.16em', color: crimson, fontWeight: 700, marginBottom: 8 }}>⚠ LAST SAVE-CONTRACT ERROR</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontFamily: mono, lineHeight: 1.6, wordBreak: 'break-word' }}>{lastSaveError}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>Most recent failed save. Clears when a save next succeeds enough to overwrite it, or ignore once resolved.</div>
          </div>
        )}

        <div style={label}>PLATFORM METRICS</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 40 }}>
          <StatCard title="USERS" value={users} sub={`${verified} verified`} />
          <StatCard title="COMPANY PROFILES" value={profiles} />
          <StatCard title="SAVED CONTRACTS" value={saved} />
          <StatCard title="PROPOSALS" value={proposals} />
          <StatCard title="TEAMS" value={teams} />
          <StatCard title="WAITLIST" value={waitlist} />
        </div>

        <div style={label}>LIVE SYSTEMS</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 40 }}>
          <StatCard
            title="CONTRACT STORE (LIVE)"
            value={storeCount}
            warn={storeStarved}
            sub={storeStarved
              ? '⚠ STARVED — run SYNC CONTRACTS NOW / set CRON_SECRET'
              : lastSync ? `healthy · last sync ${new Date(lastSync).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : 'never synced — run SYNC CONTRACTS NOW'}
          />
          <StatCard
            title="SEMANTIC LAYER (VOYAGE)"
            value={embeddingCount === null ? 'N/A' : `${embeddingCount.toLocaleString()}`}
            warn={!!process.env.VOYAGE_API_KEY && embeddingCount === 0}
            sub={!process.env.VOYAGE_API_KEY
              ? 'no VOYAGE_API_KEY — keyword/NAICS matching only'
              : embeddingCount === null
                ? 'ContractEmbedding table missing — run DB migration'
                : embeddingCount === 0
                  ? '⚠ key set but 0 embedded — waiting on the daily pre-embed cron to run'
                  : `contracts embedded of ${typeof storeCount === 'number' ? storeCount.toLocaleString() : '—'} live · grows as the daily cron runs`}
          />
          <StatCard
            title="SAM.GOV BUDGET TODAY"
            value={`${quota.used}/${quota.budget}`}
            sub={
              quota.used >= quota.budget
                ? 'EXHAUSTED — resets at midnight UTC'
                : quota.reportedLimit
                  ? `cap ${quota.configured} · SAM allows ${quota.reportedLimit}/day${quota.reportedLimit < quota.configured ? ' (clamped)' : ''}`
                  : `cap ${quota.configured} · SAM limit not yet observed`
            }
          />
          <StatCard
            title="AI PROPOSAL DRAFTS TODAY"
            value={aiConfigured ? `${aiDrafts.used}/${aiDrafts.budget}` : 'TEMPLATE MODE'}
            sub={aiConfigured
              ? (aiDrafts.used >= aiDrafts.budget ? 'daily cap reached — template fallback active' : 'Claude drafts used')
              : 'no ANTHROPIC_API_KEY — proposals use templates'}
          />
          {pipelineByStage.length > 0 && (
            <StatCard
              title="PIPELINE (ALL USERS)"
              value={pipelineByStage.reduce((s, g) => s + g._count, 0)}
              sub={pipelineByStage.map(g => `${g._count} ${g.status}`).join(' · ')}
            />
          )}
          <StatCard
            title="FEED SPEED · FAST PAINT"
            value={feedPerf ? `${feedPerf.fastMs}ms` : '—'}
            sub={feedPerf
              ? `enrichment +${feedPerf.enrichMs}ms now backgrounded (was blocking) · ${feedPerf.samples} loads`
              : 'load the dashboard once to record a sample'}
          />
        </div>

        <div style={label}>ENVIRONMENT CONFIG</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 40 }}>
          {ENV_CHECKS.map(env => (
            <div key={env.name} style={{ background: '#111', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ color: env.ok ? '#4ADE80' : crimson, fontSize: 14, fontWeight: 700 }}>{env.ok ? '✓' : '✗'}</span>
              <div>
                <div style={{ fontSize: 10, letterSpacing: '0.08em', color: env.ok ? 'rgba(255,255,255,0.7)' : crimson, fontFamily: mono }}>{env.name}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: mono, marginTop: 2 }}>{env.note}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={label}>SYSTEM ACTIONS</div>
        <div style={{ marginBottom: 40 }}>
          <AdminActions />
        </div>

        {waitlistRecent.length > 0 && (
          <>
            <div style={label}>RECENT WAITLIST SIGNUPS</div>
            <div style={{ border: '1px solid rgba(255,255,255,0.08)', marginBottom: 40 }}>
              {waitlistRecent.map(w => (
                <div key={w.email} style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: mono }}>{w.email}</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: mono, whiteSpace: 'nowrap' }}>{fmtDate(w.createdAt)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={label}>RECENT SIGNUPS</div>
        <div style={{ overflowX: 'auto', marginBottom: 40, border: '1px solid rgba(255,255,255,0.08)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>EMAIL</th>
                <th style={th}>NAME</th>
                <th style={th}>TIER</th>
                <th style={th}>VERIFIED</th>
                <th style={th}>JOINED</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.length === 0 && (
                <tr><td style={td} colSpan={5}>No users yet.</td></tr>
              )}
              {recentUsers.map((u) => (
                <tr key={u.email}>
                  <td style={td}>{u.email}</td>
                  <td style={td}>{u.name ?? '—'}</td>
                  <td style={td}>{u.subscriptionTier.toUpperCase()}</td>
                  <td style={{ ...td, color: u.emailVerified ? '#4ADE80' : crimson }}>{u.emailVerified ? '✓' : '✗'}</td>
                  <td style={td}>{fmtDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={label}>EMAIL LOG (LAST 30 SENDS)</div>
        <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>TIME</th>
                <th style={th}>TO</th>
                <th style={th}>SUBJECT</th>
                <th style={th}>STATUS</th>
                <th style={th}>ERROR</th>
              </tr>
            </thead>
            <tbody>
              {!emailLogsAvailable && (
                <tr><td style={td} colSpan={5}>EmailLog table not found — run the DB migration above, then refresh.</td></tr>
              )}
              {emailLogsAvailable && emailLogs.length === 0 && (
                <tr><td style={td} colSpan={5}>No email attempts recorded yet. Use SEND TEST EMAIL above.</td></tr>
              )}
              {emailLogs.map((log, i) => (
                <tr key={i}>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmtDate(log.createdAt)}</td>
                  <td style={td}>{log.to}</td>
                  <td style={td}>{log.subject}</td>
                  <td style={{ ...td, color: log.status === 'sent' ? '#4ADE80' : crimson, whiteSpace: 'nowrap' }}>
                    {log.status.toUpperCase()}
                  </td>
                  <td style={{ ...td, maxWidth: 320, wordBreak: 'break-word' }}>{log.error ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
