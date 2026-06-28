'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

function passwordStrength(pw: string): { level: number; label: string; color: string } {
  if (!pw) return { level: 0, label: '', color: 'transparent' }
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { level: 1, label: 'WEAK', color: '#ef4444' }
  if (score <= 2) return { level: 2, label: 'FAIR', color: '#f97316' }
  if (score <= 3) return { level: 3, label: 'GOOD', color: '#eab308' }
  return { level: 4, label: 'STRONG', color: '#22c55e' }
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}

function ResetPasswordForm() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const mono = 'var(--font-geist-mono, monospace)'
  const sans = 'var(--font-geist-sans, sans-serif)'
  const crimson = '#C41230'
  const strength = passwordStrength(password)

  if (!token) {
    return (
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.09)', padding: '44px 40px', textAlign: 'center' }}>
          <p style={{ color: 'rgba(0,0,0,0.5)', fontFamily: sans, fontSize: 14 }}>Invalid reset link.</p>
          <Link href="/forgot-password" style={{ color: crimson, fontFamily: mono, fontSize: 10, letterSpacing: '0.08em', textDecoration: 'none' }}>REQUEST A NEW ONE →</Link>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Reset failed. Please try again.'); return }
      setDone(true)
      setTimeout(() => router.push('/login'), 2500)
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
            {done ? 'Password updated.' : 'Choose a new password.'}
          </h1>
        </div>

        {done ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.5)', margin: 0, fontFamily: sans, lineHeight: 1.7 }}>
              Your password has been reset. Taking you to sign in...
            </p>
            <Link href="/login" style={{ display: 'inline-block', padding: '12px 24px', background: crimson, color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none', textAlign: 'center', fontFamily: mono }}>
              SIGN IN →
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(196,18,48,0.05)', border: '1px solid rgba(196,18,48,0.18)', color: crimson, fontSize: 12, fontFamily: mono }}>
                {error}{' '}
                {error.includes('expired') && (
                  <Link href="/forgot-password" style={{ color: crimson, fontWeight: 700 }}>Request new link →</Link>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={labelStyle}>NEW PASSWORD</span>
                  {password && <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.1em', color: strength.color, fontWeight: 700 }}>{strength.label}</span>}
                </div>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" placeholder="Min 8 characters" style={inputStyle} />
                {password && (
                  <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} style={{ flex: 1, height: 2, borderRadius: 1, background: i <= strength.level ? strength.color : 'rgba(0,0,0,0.08)', transition: 'background 0.2s' }} />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={labelStyle}>CONFIRM PASSWORD</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" placeholder="••••••••"
                  style={{ ...inputStyle, borderColor: confirmPassword && confirmPassword !== password ? 'rgba(196,18,48,0.4)' : 'rgba(0,0,0,0.1)' }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{ background: loading ? 'rgba(196,18,48,0.7)' : crimson, color: '#ffffff', border: 'none', padding: '13px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: mono, marginTop: 4 }}
              >
                {loading ? 'UPDATING…' : 'SET NEW PASSWORD →'}
              </button>
            </form>
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
