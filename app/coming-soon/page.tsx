'use client'

import { useEffect, useState, Suspense } from 'react'
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
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setDone(true)
  }

  if (done) {
    return (
      <div style={{ fontSize: 10, letterSpacing: '0.1em', color: '#4ADE80', fontFamily: mono }}>
        YOU'RE ON THE LIST ✓
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 0, width: '100%', maxWidth: 380 }}>
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
        style={{
          padding: '12px 20px',
          background: crimson,
          color: '#ffffff',
          border: 'none',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
          cursor: 'pointer',
          fontFamily: mono,
          whiteSpace: 'nowrap',
        }}
      >
        NOTIFY ME →
      </button>
    </form>
  )
}

export default function ComingSoonPage() {
  return (
    <Suspense>
      <CountdownInner />
    </Suspense>
  )
}
