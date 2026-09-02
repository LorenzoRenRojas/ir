'use client'

import { useState } from 'react'

// One-field email capture for the weekly Federal Market Report.
//
// This is the owned list. LinkedIn newsletters don't export subscribers, so
// every public page that earns a visitor's attention offers the same
// low-friction ask: one email, no account. Rows land in the Waitlist table
// (already migrated, already on the admin console) tagged with where they
// came from, so we learn which pages actually convert.
//
// Copy discipline: promise only what exists. The report is drafted from the
// store by Post Studio, so "what IR tracked" is the honest framing; never
// "everything posted."

const mono = 'var(--font-geist-mono, monospace)'
const sans = 'var(--font-geist-sans, sans-serif)'
const crimson = '#C41230'

export default function EmailCapture({
  source,
  theme = 'dark',
  headline = 'The Federal Market Report',
  sub = 'One email a week: what IR tracked across SAM.gov, the set-aside share, what is closing soon, and one thing worth knowing. No account, no pitch.',
  compact = false,
}: {
  source: string
  theme?: 'dark' | 'light'
  headline?: string
  sub?: string
  compact?: boolean
}) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  const dark = theme === 'dark'
  const fg = dark ? '#fff' : '#0A0A0A'
  const dim = dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'
  const faint = dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'
  const line = dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)'
  const field = dark ? 'rgba(255,255,255,0.04)' : '#F8F8F7'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState('busy')
    setMsg('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      })
      if (res.ok) {
        setState('done')
      } else {
        const data = await res.json().catch(() => ({}))
        setMsg(data.error ?? 'Something went wrong. Please try again.')
        setState('error')
      }
    } catch {
      setMsg('Network error. Please try again.')
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <div style={{ padding: compact ? '16px 0' : '24px 0', fontFamily: mono, fontSize: 11, letterSpacing: '0.1em', color: '#4ADE80' }}>
        YOU&apos;RE ON THE LIST ✓
        <span style={{ display: 'block', marginTop: 8, fontFamily: sans, fontSize: 12.5, letterSpacing: 0, color: dim, lineHeight: 1.6 }}>
          First issue goes out late September. Unsubscribe from any email in one click.
        </span>
      </div>
    )
  }

  return (
    <div style={{ padding: compact ? '4px 0' : '8px 0' }}>
      {!compact && (
        <>
          <p style={{ margin: '0 0 6px', fontFamily: sans, fontSize: 16, fontWeight: 700, color: fg }}>{headline}</p>
          <p style={{ margin: '0 0 16px', fontFamily: sans, fontSize: 13.5, lineHeight: 1.65, color: dim, maxWidth: 520 }}>{sub}</p>
        </>
      )}
      <form onSubmit={submit} style={{ display: 'flex', maxWidth: 440 }}>
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@company.com"
          aria-label="Email address"
          style={{
            flex: 1, minWidth: 0, padding: '12px 14px', background: field, border: `1px solid ${line}`,
            borderRight: 'none', color: fg, fontSize: 13, fontFamily: sans, outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={state === 'busy'}
          style={{
            padding: '12px 18px', background: crimson, color: '#fff', border: 'none', fontSize: 10,
            fontWeight: 700, letterSpacing: '0.1em', fontFamily: mono, cursor: state === 'busy' ? 'wait' : 'pointer',
            opacity: state === 'busy' ? 0.7 : 1, whiteSpace: 'nowrap',
          }}
        >
          {state === 'busy' ? '…' : 'SEND IT WEEKLY →'}
        </button>
      </form>
      {state === 'error' && (
        <p style={{ margin: '8px 0 0', fontFamily: mono, fontSize: 11, color: '#f87171' }}>{msg}</p>
      )}
      <p style={{ margin: '10px 0 0', fontFamily: sans, fontSize: 11, color: faint, lineHeight: 1.6 }}>
        Weekly, starting late September. One-click unsubscribe. We never share your address.
      </p>
    </div>
  )
}
