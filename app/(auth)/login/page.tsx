'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  background: '#0F0F10',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#E2E8F0',
  fontSize: 13,
  fontFamily: 'var(--font-geist-mono, monospace)',
  outline: 'none',
  boxSizing: 'border-box' as const,
}

const labelStyle = {
  display: 'block',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.12em',
  color: 'rgba(255,255,255,0.45)',
  marginBottom: 8,
  fontFamily: 'var(--font-geist-mono, monospace)',
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await signIn('credentials', { email, password, redirect: false })
      if (result?.error) {
        setError('Invalid email or password')
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: 400 }}>
      <div style={{ border: '1px solid rgba(255,255,255,0.07)', background: '#0F0F10', padding: '40px 36px' }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.25)', marginBottom: 12, fontFamily: 'var(--font-geist-mono, monospace)' }}>IR — AUTHENTICATION</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#E2E8F0', letterSpacing: '-0.02em', fontFamily: 'var(--font-geist-sans, sans-serif)', margin: 0 }}>Welcome back</h1>
        </div>

        {error && (
          <div style={{ marginBottom: 20, padding: '10px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: 12, fontFamily: 'var(--font-geist-mono, monospace)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={labelStyle}>EMAIL</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} placeholder="you@company.com" />
          </div>
          <div>
            <label style={labelStyle}>PASSWORD</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} placeholder="••••••••" />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ background: '#C8A96E', color: '#0A0A0B', border: 'none', padding: '12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontFamily: 'var(--font-geist-mono, monospace)', marginTop: 4 }}
          >
            {loading ? 'SIGNING IN…' : 'SIGN IN →'}
          </button>
        </form>

        <div style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, fontFamily: 'var(--font-geist-mono, monospace)' }}>
            No account?{' '}
            <Link href="/register" style={{ color: '#C8A96E', textDecoration: 'none' }}>Register</Link>
          </span>
        </div>
      </div>
    </div>
  )
}
