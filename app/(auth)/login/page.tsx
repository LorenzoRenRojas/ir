'use client'

import { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const callbackUrl = params.get('callbackUrl') ?? '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const mono = 'var(--font-geist-mono, monospace)'
  const sans = 'var(--font-geist-sans, sans-serif)'
  const crimson = '#C41230'

  async function handleGoogle() {
    setGoogleLoading(true)
    await signIn('google', { callbackUrl })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await signIn('credentials', { email: email.trim().toLowerCase(), password, redirect: false })
      if (result?.error) {
        setError('Incorrect email or password.')
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
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
          <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.18em', color: 'rgba(0,0,0,0.25)', marginBottom: 12 }}>AUTHENTICATION</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.02em', fontFamily: sans, margin: 0 }}>Welcome back.</h1>
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
            <label style={labelStyle}>EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@company.com"
              style={inputStyle}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={labelStyle}>PASSWORD</span>
              <Link href="/forgot-password" style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.08em', color: 'rgba(0,0,0,0.35)', textDecoration: 'none' }}>
                FORGOT?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ background: loading ? 'rgba(196,18,48,0.7)' : crimson, color: '#ffffff', border: 'none', padding: '13px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: mono, marginTop: 4 }}
          >
            {loading ? 'SIGNING IN…' : 'SIGN IN →'}
          </button>
        </form>

        {/* Footer */}
        <div style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid rgba(0,0,0,0.06)', textAlign: 'center' }}>
          <span style={{ color: 'rgba(0,0,0,0.38)', fontSize: 11, fontFamily: mono }}>
            No account?{' '}
            <Link href="/register" style={{ color: crimson, textDecoration: 'none', fontWeight: 700 }}>Get access →</Link>
          </span>
        </div>
      </div>

      <p style={{ textAlign: 'center', marginTop: 20, fontFamily: mono, fontSize: 10, color: 'rgba(0,0,0,0.25)', lineHeight: 1.7 }}>
        By signing in you agree to our{' '}
        <Link href="/terms" style={{ color: 'rgba(0,0,0,0.4)', textDecoration: 'underline' }}>Terms</Link>
        {' '}and{' '}
        <Link href="/privacy" style={{ color: 'rgba(0,0,0,0.4)', textDecoration: 'underline' }}>Privacy Policy</Link>.
      </p>
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
