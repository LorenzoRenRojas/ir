import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import { prisma } from '@/lib/prisma'
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

function StatCard({ title, value, sub }: { title: string; value: string | number; sub?: string }) {
  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.08)', padding: '20px 24px', minWidth: 150, flex: 1 }}>
      <div style={{ fontSize: 9, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.3)', fontFamily: mono }}>{title}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color: '#fff', margin: '8px 0 2px', fontFamily: sans }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: mono }}>{sub}</div>}
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

        <div style={label}>PLATFORM METRICS</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 40 }}>
          <StatCard title="USERS" value={users} sub={`${verified} verified`} />
          <StatCard title="COMPANY PROFILES" value={profiles} />
          <StatCard title="SAVED CONTRACTS" value={saved} />
          <StatCard title="PROPOSALS" value={proposals} />
          <StatCard title="TEAMS" value={teams} />
          <StatCard title="WAITLIST" value={waitlist} />
        </div>

        <div style={label}>SYSTEM ACTIONS</div>
        <div style={{ marginBottom: 40 }}>
          <AdminActions />
        </div>

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
