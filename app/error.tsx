'use client'

import { useEffect } from 'react'
import Link from 'next/link'

// Route-level error boundary — catches render/data errors in any page below
// the root layout and shows a branded recovery screen instead of a raw stack.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Route error boundary caught:', error)
  }, [error])

  const mono = 'var(--font-geist-mono, monospace)'
  const sans = 'var(--font-geist-sans, sans-serif)'
  const crimson = '#C41230'

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#fff', fontFamily: mono, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '0.08em', color: crimson, marginBottom: 24 }}>IR</div>
      <div style={{ fontSize: 9, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.2)', marginBottom: 20 }}>SOMETHING BROKE</div>
      <h1 style={{ fontSize: 'clamp(30px, 5vw, 52px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 12px', fontFamily: sans }}>
        A momentary glitch.
      </h1>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', maxWidth: 420, lineHeight: 1.7, margin: '0 0 40px', fontFamily: sans }}>
        Something went wrong loading this view. It&apos;s usually temporary — try again, or head back to your dashboard.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={reset} style={{ padding: '12px 28px', background: crimson, color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', border: 'none', cursor: 'pointer', fontFamily: mono }}>
          TRY AGAIN →
        </button>
        <Link href="/dashboard" style={{ padding: '12px 24px', background: 'transparent', color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)', fontFamily: mono }}>
          DASHBOARD
        </Link>
      </div>
      {error.digest && (
        <div style={{ marginTop: 32, fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.15)' }}>
          REF: {error.digest}
        </div>
      )}
    </div>
  )
}
