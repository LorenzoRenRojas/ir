'use client'

import { useState } from 'react'

const mono = 'var(--font-geist-mono, monospace)'
const crimson = '#C41230'

const btnStyle: React.CSSProperties = {
  padding: '12px 24px',
  background: 'transparent',
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.15)',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.1em',
  cursor: 'pointer',
  fontFamily: mono,
}

export default function AdminActions() {
  const [output, setOutput] = useState('')
  const [busy, setBusy] = useState('')
  const [posts, setPosts] = useState<{ label: string; text: string }[]>([])
  const [copied, setCopied] = useState('')
  const [tierEmail, setTierEmail] = useState('')
  const [tierValue, setTierValue] = useState('pro')
  const [tierMsg, setTierMsg] = useState('')

  async function run(label: string, fn: () => Promise<string>) {
    setBusy(label)
    setOutput('')
    setPosts([])
    try {
      setOutput(await fn())
    } catch (err) {
      setOutput(`ERROR: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy('')
    }
  }

  async function copyPost(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      setTimeout(() => setCopied(''), 2000)
    } catch { /* clipboard unavailable — text is still selectable */ }
  }

  async function setTier() {
    setTierMsg('')
    if (!tierEmail.trim()) { setTierMsg('Enter an email.'); return }
    try {
      const res = await fetch('/api/admin/set-tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: tierEmail.trim(), tier: tierValue }),
      })
      const data = await res.json()
      setTierMsg(res.ok
        ? `✓ ${data.user.email} → ${data.user.subscriptionTier.toUpperCase()}. They must sign out/in for it to take effect.`
        : `Failed: ${data.error}`)
    } catch {
      setTierMsg('Network error — try again.')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button
          style={{ ...btnStyle, borderColor: crimson, color: crimson }}
          disabled={!!busy}
          onClick={() =>
            run('migrate', async () => {
              const res = await fetch('/api/migrate')
              const data = await res.json()
              if (!res.ok) return `Migration failed (${res.status}): ${data.error ?? 'unknown'}`
              const tables: string[] = data.tables ?? []
              const errors = tables.filter((t) => t.startsWith('ERROR'))
              return errors.length
                ? `Migration ran with ${errors.length} errors:\n${errors.join('\n')}`
                : `Migration complete — ${tables.length} statements OK/skipped.`
            })
          }
        >
          {busy === 'migrate' ? 'RUNNING…' : 'RUN DB MIGRATION'}
        </button>

        <button
          style={btnStyle}
          disabled={!!busy}
          onClick={() =>
            run('email', async () => {
              const res = await fetch('/api/admin/test-email', { method: 'POST' })
              const data = await res.json()
              return data.sent
                ? 'Test email sent — check your inbox. If it does not arrive, check the email log below for the Resend error.'
                : `Send failed: ${data.error}`
            })
          }
        >
          {busy === 'email' ? 'SENDING…' : 'SEND TEST EMAIL'}
        </button>

        <button
          style={btnStyle}
          disabled={!!busy}
          onClick={() =>
            run('sync', async () => {
              const res = await fetch('/api/admin/sync-contracts', { method: 'POST' })
              const data = await res.json()
              if (!data.ok) return `Sync failed: ${data.error}`
              const quotaNote = data.quotaBlocked ? '\nStopped early: daily SAM.gov budget reached — rest syncs tomorrow.' : ''
              return `Synced ${data.synced} contracts (market total: ${data.total}), pruned ${data.pruned} expired.${quotaNote}`
            })
          }
        >
          {busy === 'sync' ? 'SYNCING…' : 'SYNC CONTRACTS NOW'}
        </button>

        <button
          style={btnStyle}
          disabled={!!busy}
          onClick={() =>
            run('seed-demo', async () => {
              const res = await fetch('/api/admin/seed-demo', { method: 'POST' })
              const data = await res.json()
              if (!data.success) return `Seed failed: ${data.error ?? 'unknown'}${data.detail ? `\n${data.detail}` : ''}`
              return `Demo account ready — ${data.seeded.pipeline} pipeline items, ${data.seeded.documents} document.\nLog in: ${data.login.email} / ${data.login.password}`
            })
          }
        >
          {busy === 'seed-demo' ? 'SEEDING…' : 'SEED DEMO ACCOUNT'}
        </button>

        <button
          style={btnStyle}
          disabled={!!busy}
          onClick={() =>
            run('health', async () => {
              const res = await fetch('/api/cron/health')
              const data = await res.json()
              return data.healthy
                ? 'ALL SYSTEMS HEALTHY ✓'
                : `DEGRADED:\n${(data.problems ?? []).join('\n')}`
            })
          }
        >
          {busy === 'health' ? 'CHECKING…' : 'CHECK SYSTEM HEALTH'}
        </button>

        <button
          style={btnStyle}
          disabled={!!busy}
          onClick={() =>
            run('linkedin', async () => {
              const res = await fetch('/api/admin/linkedin-post', { method: 'POST' })
              const data = await res.json()
              if (!data.ok) return `Draft failed: ${data.error}`
              setPosts(data.posts ?? [])
              return `${(data.posts ?? []).length} drafts ready below — copy, tweak in your voice, post.`
            })
          }
        >
          {busy === 'linkedin' ? 'DRAFTING…' : 'DRAFT LINKEDIN POSTS'}
        </button>

        <button
          style={btnStyle}
          disabled={!!busy}
          onClick={() =>
            run('ai', async () => {
              const res = await fetch('/api/admin/test-ai', { method: 'POST' })
              const data = await res.json()
              if (!data.ok) return `CLAUDE KEY TEST FAILED\n${data.error}`
              return `CLAUDE KEY WORKS ✓\nModel: ${data.model}\nReply: "${data.reply}"\nTokens: ${data.usage.inputTokens} in / ${data.usage.outputTokens} out — the proposal engine is unblocked.`
            })
          }
        >
          {busy === 'ai' ? 'TESTING…' : 'TEST CLAUDE KEY'}
        </button>
      </div>

      {/* Set a user's tier — grant yourself Pro to test, or comp founding
          members / APEX counselors before Stripe is live */}
      <div style={{ marginTop: 20, padding: '16px 18px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', color: crimson, fontFamily: mono, marginBottom: 12 }}>SET USER TIER</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={tierEmail}
            onChange={e => setTierEmail(e.target.value)}
            placeholder="user@email.com"
            style={{ flex: 1, minWidth: 200, padding: '10px 12px', background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 12, fontFamily: mono }}
          />
          <select
            value={tierValue}
            onChange={e => setTierValue(e.target.value)}
            style={{ padding: '10px 12px', background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 12, fontFamily: mono }}
          >
            <option value="free">free</option>
            <option value="starter">starter</option>
            <option value="pro">pro</option>
            <option value="enterprise">enterprise</option>
          </select>
          <button style={btnStyle} onClick={setTier}>SET TIER</button>
        </div>
        {tierMsg && (
          <div style={{ marginTop: 10, fontSize: 11, color: tierMsg.startsWith('✓') ? '#4ADE80' : crimson, fontFamily: mono, lineHeight: 1.6 }}>{tierMsg}</div>
        )}
      </div>

      {posts.length > 0 && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {posts.map(p => (
            <div key={p.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: crimson, fontFamily: mono }}>{p.label}</span>
                <button
                  style={{ ...btnStyle, padding: '6px 14px', fontSize: 9 }}
                  onClick={() => copyPost(p.label, p.text)}
                >
                  {copied === p.label ? 'COPIED ✓' : 'COPY'}
                </button>
              </div>
              <pre style={{ margin: 0, padding: 16, color: 'rgba(255,255,255,0.65)', fontSize: 11, lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>
                {p.text}
              </pre>
            </div>
          ))}
        </div>
      )}

      {output && (
        <pre
          style={{
            marginTop: 16,
            padding: 16,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.6)',
            fontSize: 11,
            lineHeight: 1.7,
            whiteSpace: 'pre-wrap',
            fontFamily: mono,
          }}
        >
          {output}
        </pre>
      )}
    </div>
  )
}
