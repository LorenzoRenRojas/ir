'use client'

import { useEffect } from 'react'

// Last-resort boundary for errors thrown in the ROOT layout itself. Must
// render its own <html>/<body> because it replaces the whole document.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Global error boundary caught:', error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100vh', background: '#0A0A0A', color: '#fff', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '0.08em', color: '#C41230', marginBottom: 24 }}>IR</div>
        <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 12px' }}>Something broke.</h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', maxWidth: 420, lineHeight: 1.7, margin: '0 0 40px' }}>
          We hit an unexpected error. Reload to try again.
        </p>
        <button onClick={reset} style={{ padding: '12px 28px', background: '#C41230', color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', border: 'none', cursor: 'pointer', fontFamily: 'monospace' }}>
          RELOAD →
        </button>
      </body>
    </html>
  )
}
