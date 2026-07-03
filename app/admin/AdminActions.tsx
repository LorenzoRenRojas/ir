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

  async function run(label: string, fn: () => Promise<string>) {
    setBusy(label)
    setOutput('')
    try {
      setOutput(await fn())
    } catch (err) {
      setOutput(`ERROR: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy('')
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
              return data.ok
                ? `Synced ${data.synced} contracts (market total: ${data.total}), pruned ${data.pruned} expired.`
                : `Sync failed: ${data.error}`
            })
          }
        >
          {busy === 'sync' ? 'SYNCING…' : 'SYNC CONTRACTS NOW'}
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
      </div>

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
