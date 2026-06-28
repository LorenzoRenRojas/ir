'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function VerifyEmailPendingPage() {
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [error, setError] = useState('')

  const mono = 'var(--font-geist-mono, monospace)'
  const crimson = '#C41230'

  async function handleResend() {
    setResending(true)
    setError('')
    try {
      const res = await fetch('/api/auth/resend-verification', { method: 'POST' })
      if (res.ok) {
        setResent(true)
      } else {
        const data = await res.json()
        setError(data.error ?? 'Failed to resend. Please try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#ffffff', fontFamily: mono, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
      <div style={{ marginBottom: 28 }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ color: crimson, fontSize: 20, fontWeight: 700 }}>ᛁ</span>
        </Link>
      </div>

      <div style={{ fontSize: 9, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)', marginBottom: 20 }}>
        VERIFICATION REQUIRED
      </div>

      <h1 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 12px', fontFamily: 'var(--font-geist-sans, sans-serif)', maxWidth: 480 }}>
        Check your email.
      </h1>

      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, lineHeight: 1.7, margin: '0 0 40px', maxWidth: 440, fontFamily: 'var(--font-geist-sans, sans-serif)' }}>
        We sent a verification link to your email address. Click it to activate your account and access the dashboard.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        {resent ? (
          <div style={{ padding: '12px 24px', border: '1px solid #4ADE80', color: '#4ADE80', fontSize: 10, letterSpacing: '0.1em' }}>
            EMAIL RESENT ✓
          </div>
        ) : (
          <button
            onClick={handleResend}
            disabled={resending}
            style={{ padding: '12px 28px', background: crimson, color: '#fff', border: 'none', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', cursor: resending ? 'not-allowed' : 'pointer', opacity: resending ? 0.6 : 1, fontFamily: mono }}
          >
            {resending ? 'SENDING…' : 'RESEND VERIFICATION EMAIL'}
          </button>
        )}

        {error && (
          <div style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
          <Link href="/login" style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', textDecoration: 'none' }}>
            SIGN IN WITH A DIFFERENT ACCOUNT
          </Link>
        </div>
      </div>

      <div style={{ marginTop: 64, padding: '20px 28px', border: '1px solid rgba(255,255,255,0.06)', maxWidth: 400 }}>
        <div style={{ fontSize: 9, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.2)', marginBottom: 10 }}>DIDN&apos;T GET THE EMAIL?</div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 1.7, margin: 0, fontFamily: 'var(--font-geist-sans, sans-serif)' }}>
          Check your spam folder. Verification emails come from <span style={{ color: 'rgba(255,255,255,0.5)' }}>noreply@ir-gov.app</span>.
          Links expire after 24 hours.
        </p>
      </div>
    </div>
  )
}
