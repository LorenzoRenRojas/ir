'use client'

import { useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
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

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [ref, setRef] = useState('')

  // Referral capture (?ref=CODE) — read off the URL, kept in sessionStorage so
  // it survives a bounce to login/terms and back before the form is submitted.
  useEffect(() => {
    try {
      const fromUrl = new URLSearchParams(window.location.search).get('ref')
      if (fromUrl) {
        sessionStorage.setItem('ir-ref', fromUrl)
        setRef(fromUrl)
      } else {
        setRef(sessionStorage.getItem('ir-ref') ?? '')
      }
    } catch { /* private mode — referral tracking is best-effort */ }
  }, [])

  const mono = 'var(--font-geist-mono, monospace)'
  const sans = 'var(--font-geist-sans, sans-serif)'
  const crimson = '#C41230'
  const strength = passwordStrength(form.password)

  function set(key: string, val: string) {
    setForm((p) => ({ ...p, [key]: val }))
  }

  async function handleGoogle() {
    if (!agreedToTerms) { setError('Please agree to the Terms of Service before continuing.'); return }
    setGoogleLoading(true)
    await signIn('google', { callbackUrl: '/onboarding' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!agreedToTerms) { setError('Please agree to the Terms of Service to create an account.'); return }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email.trim().toLowerCase(), password: form.password, ...(ref ? { ref } : {}) }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Registration failed.'); return }

      // Auto sign-in then redirect to email verification pending
      await signIn('credentials', { email: form.email.trim().toLowerCase(), password: form.password, redirect: false })
      router.push('/verify-email/pending')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: 420 }}>
      <div style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.09)', padding: '44px 40px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.18em', color: 'rgba(0,0,0,0.25)', marginBottom: 12 }}>CREATE ACCOUNT</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.02em', fontFamily: sans, margin: 0 }}>Get access.</h1>
        </div>

        {/* Google */}
        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          style={{ width: '100%', padding: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, border: '1px solid rgba(0,0,0,0.12)', background: '#ffffff', cursor: googleLoading ? 'not-allowed' : 'pointer', opacity: googleLoading ? 0.6 : 1, fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#0A0A0A', marginBottom: 20 }}
        >
          <GoogleIcon />
          {googleLoading ? 'REDIRECTING…' : 'CONTINUE WITH GOOGLE'}
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.07)' }} />
          <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.12em', color: 'rgba(0,0,0,0.25)' }}>OR</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.07)' }} />
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(196,18,48,0.05)', border: '1px solid rgba(196,18,48,0.18)', color: crimson, fontSize: 12, fontFamily: mono }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>FULL NAME</label>
            <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} required autoComplete="name" placeholder="Jane Smith" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>WORK EMAIL</label>
            <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required autoComplete="email" placeholder="you@company.com" style={inputStyle} />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={labelStyle}>PASSWORD</span>
              {form.password && (
                <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.1em', color: strength.color, fontWeight: 700 }}>
                  {strength.label}
                </span>
              )}
            </div>
            <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} required minLength={8} autoComplete="new-password" placeholder="Min 8 characters" style={inputStyle} />
            {form.password && (
              <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} style={{ flex: 1, height: 2, borderRadius: 1, background: i <= strength.level ? strength.color : 'rgba(0,0,0,0.08)', transition: 'background 0.2s' }} />
                ))}
              </div>
            )}
          </div>

          <div>
            <label style={labelStyle}>CONFIRM PASSWORD</label>
            <input type="password" value={form.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)} required autoComplete="new-password" placeholder="••••••••"
              style={{ ...inputStyle, borderColor: form.confirmPassword && form.confirmPassword !== form.password ? 'rgba(196,18,48,0.4)' : 'rgba(0,0,0,0.1)' }}
            />
          </div>

          {/* Terms */}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginTop: 2 }}>
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              style={{ marginTop: 2, accentColor: crimson, flexShrink: 0 }}
            />
            <span style={{ fontFamily: mono, fontSize: 10, color: 'rgba(0,0,0,0.45)', lineHeight: 1.6, letterSpacing: '0.03em' }}>
              I agree to the{' '}
              <Link href="/terms" target="_blank" style={{ color: crimson, textDecoration: 'none' }}>Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" target="_blank" style={{ color: crimson, textDecoration: 'none' }}>Privacy Policy</Link>
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || !agreedToTerms}
            style={{ background: !agreedToTerms ? 'rgba(0,0,0,0.08)' : loading ? 'rgba(196,18,48,0.7)' : crimson, color: !agreedToTerms ? 'rgba(0,0,0,0.3)' : '#ffffff', border: 'none', padding: '13px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', cursor: loading || !agreedToTerms ? 'not-allowed' : 'pointer', fontFamily: mono, marginTop: 4, transition: 'background 0.15s' }}
          >
            {loading ? 'CREATING ACCOUNT…' : 'CREATE ACCOUNT →'}
          </button>
        </form>

        {/* Footer */}
        <div style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid rgba(0,0,0,0.06)', textAlign: 'center' }}>
          <span style={{ color: 'rgba(0,0,0,0.38)', fontSize: 11, fontFamily: mono }}>
            Have an account?{' '}
            <Link href="/login" style={{ color: crimson, textDecoration: 'none', fontWeight: 700 }}>Sign in →</Link>
          </span>
          {/* A sign-up form on a domain containing "gov" is the shape phishing
              classifiers look for. State plainly, at the point of credential
              entry, that this is not a government site. */}
          <p style={{ color: 'rgba(0,0,0,0.3)', fontSize: 10.5, lineHeight: 1.6, fontFamily: sans, margin: '16px 0 0' }}>
            IR is an independent software company. This is not a government website and is
            not affiliated with or endorsed by any federal agency. Never enter your
            SAM.gov or Login.gov credentials here — IR will never ask for them.
          </p>
        </div>
      </div>
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
