'use client'

import { useState } from 'react'

const mono = 'var(--font-geist-mono, monospace)'
const sans = 'var(--font-geist-sans, sans-serif)'
const crimson = '#C41230'

// Lightweight in-app feedback for the beta. A tester's confusion should reach
// the founder in one click, not get lost. Emails immediately on submit.
export default function FeedbackWidget() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  async function submit() {
    if (message.trim().length < 2) return
    setState('sending')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, page: typeof window !== 'undefined' ? window.location.pathname : '' }),
      })
      if (!res.ok) { setState('error'); return }
      setState('done')
      setMessage('')
      setTimeout(() => { setOpen(false); setState('idle') }, 1600)
    } catch {
      setState('error')
    }
  }

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 200, fontFamily: sans }}>
      {open && (
        <div style={{ position: 'absolute', bottom: 52, right: 0, width: 300, background: '#fff', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.18)', padding: 16, animation: 'fbIn 0.18s ease both' }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.4)', fontFamily: mono, marginBottom: 4 }}>BETA FEEDBACK</div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)', marginBottom: 10, lineHeight: 1.5 }}>
            Confusing? Broken? Missing something? Tell us — every note goes straight to the founder.
          </div>
          {state === 'done' ? (
            <div style={{ fontSize: 13, color: '#16a34a', fontWeight: 600, padding: '10px 0' }}>Got it — thank you. ✓</div>
          ) : (
            <>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What happened, or what were you expecting?"
                autoFocus
                rows={4}
                style={{ width: '100%', resize: 'vertical', fontSize: 13, fontFamily: sans, padding: '9px 10px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 8, outline: 'none', boxSizing: 'border-box', color: '#0A0A0A' }}
              />
              {state === 'error' && <div style={{ fontSize: 11, color: crimson, marginTop: 6 }}>Couldn’t send — try again.</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button onClick={() => { setOpen(false); setState('idle') }} style={{ padding: '7px 12px', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', fontFamily: mono, background: 'transparent', color: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, cursor: 'pointer' }}>CLOSE</button>
                <button onClick={submit} disabled={state === 'sending' || message.trim().length < 2} style={{ padding: '7px 14px', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', fontFamily: mono, background: message.trim().length < 2 ? 'rgba(0,0,0,0.15)' : crimson, color: '#fff', border: 'none', borderRadius: 8, cursor: state === 'sending' || message.trim().length < 2 ? 'default' : 'pointer' }}>
                  {state === 'sending' ? 'SENDING…' : 'SEND →'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Send feedback"
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#0A0A0A', color: '#fff', border: 'none', borderRadius: 999, boxShadow: '0 4px 16px rgba(0,0,0,0.2)', cursor: 'pointer', fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}
      >
        <span style={{ color: crimson, fontSize: 13 }}>◆</span> FEEDBACK
      </button>
      <style>{`@keyframes fbIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  )
}
