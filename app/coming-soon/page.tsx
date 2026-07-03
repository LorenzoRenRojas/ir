'use client'

import { useEffect, useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import MetatronAvatar from '@/components/MetatronAvatar'

const LAUNCH = new Date('2026-07-28T00:00:00.000Z')

function getTimeLeft() {
  const diff = LAUNCH.getTime() - Date.now()
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function CountdownInner() {
  const [time, setTime] = useState(getTimeLeft)

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft()), 1000)
    return () => clearInterval(id)
  }, [])

  const mono = 'var(--font-geist-mono, monospace)'
  const sans = 'var(--font-geist-sans, sans-serif)'
  const crimson = '#C41230'

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0A0A',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      fontFamily: mono,
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 40 }}>
        <MetatronAvatar size={120} />
      </div>

      {/* Brand */}
      <div style={{ textAlign: 'center', marginBottom: 56 }}>
        <div style={{ fontSize: 9, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.2)', marginBottom: 14 }}>
          GOVERNMENT CONTRACT INTELLIGENCE
        </div>
        <h1 style={{
          fontFamily: sans,
          fontSize: 36,
          fontWeight: 800,
          color: '#ffffff',
          letterSpacing: '-0.03em',
          margin: 0,
          lineHeight: 1.1,
        }}>
          IR
        </h1>
      </div>

      {/* Countdown */}
      <div style={{ display: 'flex', gap: 32, marginBottom: 56 }}>
        {[
          { value: time.days, label: 'DAYS' },
          { value: time.hours, label: 'HRS' },
          { value: time.minutes, label: 'MIN' },
          { value: time.seconds, label: 'SEC' },
        ].map(({ value, label }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 48,
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-0.04em',
              lineHeight: 1,
              minWidth: 72,
              fontFamily: mono,
            }}>
              {pad(value)}
            </div>
            <div style={{
              fontSize: 8,
              letterSpacing: '0.18em',
              color: 'rgba(255,255,255,0.2)',
              marginTop: 8,
            }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.06)', marginBottom: 40 }} />

      {/* Tagline */}
      <p style={{
        fontFamily: sans,
        fontSize: 15,
        color: 'rgba(255,255,255,0.35)',
        textAlign: 'center',
        maxWidth: 360,
        lineHeight: 1.7,
        margin: '0 0 40px',
      }}>
        AI-matched federal contract opportunities.<br />
        Built for companies that win.
      </p>

      {/* Email capture */}
      <EmailCapture />

      {/* Footer */}
      <div style={{ marginTop: 64, fontSize: 9, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.12)' }}>
        IR-GOV.APP — LAUNCHING JULY 2026
      </div>
    </div>
  )
}

function EmailCapture() {
  const mono = 'var(--font-geist-mono, monospace)'
  const crimson = '#C41230'
  const [googleLoading, setGoogleLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleGoogle() {
    setGoogleLoading(true)
    await signIn('google', { callbackUrl: '/onboarding' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setDone(true)
      } else {
        const data = await res.json()
        setError(data.error ?? 'Something went wrong. Please try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div style={{ fontSize: 10, letterSpacing: '0.1em', color: '#4ADE80', fontFamily: mono }}>
        YOU'RE ON THE LIST ✓
      </div>
    )
  }

  return (
    <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Google */}
      <button
        onClick={handleGoogle}
        disabled={googleLoading}
        style={{
          width: '100%',
          padding: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          background: '#ffffff',
          border: 'none',
          cursor: googleLoading ? 'not-allowed' : 'pointer',
          opacity: googleLoading ? 0.7 : 1,
          fontFamily: mono,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: '#0A0A0A',
        }}
      >
        <GoogleIcon />
        {googleLoading ? 'REDIRECTING…' : 'CONTINUE WITH GOOGLE'}
      </button>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        <span style={{ fontSize: 9, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.2)' }}>OR</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
      </div>

      {/* Email */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 0 }}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          style={{
            flex: 1,
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRight: 'none',
            color: '#ffffff',
            fontSize: 12,
            fontFamily: mono,
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: '12px 20px',
            background: crimson,
            color: '#ffffff',
            border: 'none',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.1em',
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.6 : 1,
            fontFamily: mono,
            whiteSpace: 'nowrap',
          }}
        >
          {submitting ? '…' : 'NOTIFY ME →'}
        </button>
      </form>
      {error && (
        <div style={{ fontSize: 10, color: '#f87171', fontFamily: mono, textAlign: 'center' }}>{error}</div>
      )}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

export default function ComingSoonPage() {
  return (
    <Suspense>
      <CountdownInner />
    </Suspense>
  )
}
