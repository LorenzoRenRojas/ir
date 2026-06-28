'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const mono = 'var(--font-geist-mono, monospace)'
  const sans = 'var(--font-geist-sans, sans-serif)'
  const crimson = '#C41230'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      if (res.status === 429) {
        const data = await res.json()
        setError(data.error)
        return
      }
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: 420 }}>
      <div style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.09)', padding: '44px 40px' }}>

        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.18em', color: 'rgba(0,0,0,0.25)', marginBottom: 12 }}>ACCOUNT RECOVERY</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.02em', fontFamily: sans, margin: 0 }}>
            {sent ? 'Check your email.' : 'Reset your password.'}
          </h1>
        </div>

        {sent ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: 'rgba(0,0,0,0.5)', margin: 0, fontFamily: sans }}>
              If an account exists for <strong style={{ color: '#0A0A0A' }}>{email}</strong>, we sent a reset link. Check your inbox and spam folder.
            </p>
            <p style={{ fontFamily: mono, fontSize: 11, color: 'rgba(0,0,0,0.3)', margin: 0 }}>
              The link expires in 1 hour.
            </p>
            <Link href="/login" style={{ display: 'inline-block', marginTop: 8, padding: '12px 24px', background: crimson, color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none', textAlign: 'center', fontFamily: mono }}>
              BACK TO SIGN IN →
            </Link>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: 'rgba(0,0,0,0.45)', margin: '0 0 28px', fontFamily: sans }}>
              Enter your email and we&apos;ll send a reset link if an account exists.
            </p>

            {error && (
              <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(196,18,48,0.05)', border: '1px solid rgba(196,18,48,0.18)', color: crimson, fontSize: 12, fontFamily: mono }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={labelStyle}>EMAIL ADDRESS</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@company.com" style={inputStyle} />
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{ background: loading ? 'rgba(196,18,48,0.7)' : crimson, color: '#ffffff', border: 'none', padding: '13px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: mono }}
              >
                {loading ? 'SENDING…' : 'SEND RESET LINK →'}
              </button>
            </form>

            <div style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid rgba(0,0,0,0.06)', textAlign: 'center' }}>
              <Link href="/login" style={{ fontFamily: mono, fontSize: 10, color: 'rgba(0,0,0,0.35)', textDecoration: 'none', letterSpacing: '0.06em' }}>← BACK TO SIGN IN</Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 13px',
  background: '#F8F8F7',
  border: '1px solid rgba(0,0,0,0.1)',
  color: '#0A0A0A',
  fontSize: 13,
  fontFamily: 'var(--font-geist-sans, sans-serif)',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: '0.14em',
  color: 'rgba(0,0,0,0.4)',
  marginBottom: 8,
  fontFamily: 'var(--font-geist-mono, monospace)',
}
