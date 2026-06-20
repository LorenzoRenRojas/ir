'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  background: '#F8F8F7',
  border: '1px solid rgba(0,0,0,0.12)',
  color: '#0A0A0A',
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
  color: 'rgba(0,0,0,0.45)',
  marginBottom: 8,
  fontFamily: 'var(--font-geist-mono, monospace)',
}

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Registration failed'); return }
      const result = await signIn('credentials', { email: form.email, password: form.password, redirect: false })
      if (result?.error) { setError('Account created but login failed. Please sign in manually.'); router.push('/login'); return }
      router.push('/onboarding')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: 400 }}>
      <div style={{ border: '1px solid rgba(0,0,0,0.1)', background: '#FFFFFF', padding: '40px 36px' }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.28)', marginBottom: 12, fontFamily: 'var(--font-geist-mono, monospace)' }}>CREATE ACCOUNT</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.02em', fontFamily: 'var(--font-geist-sans, sans-serif)', margin: 0 }}>Get access</h1>
        </div>

        {error && (
          <div style={{ marginBottom: 20, padding: '10px 12px', background: 'rgba(196,18,48,0.05)', border: '1px solid rgba(196,18,48,0.2)', color: '#C41230', fontSize: 12, fontFamily: 'var(--font-geist-mono, monospace)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={labelStyle}>FULL NAME</label>
            <input type="text" name="name" value={form.name} onChange={handleChange} required style={inputStyle} placeholder="Jane Smith" />
          </div>
          <div>
            <label style={labelStyle}>EMAIL</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required style={inputStyle} placeholder="you@company.com" />
          </div>
          <div>
            <label style={labelStyle}>PASSWORD</label>
            <input type="password" name="password" value={form.password} onChange={handleChange} required minLength={8} style={inputStyle} placeholder="Min 8 characters" />
          </div>
          <div>
            <label style={labelStyle}>CONFIRM PASSWORD</label>
            <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} required style={inputStyle} placeholder="••••••••" />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ background: '#C41230', color: '#ffffff', border: 'none', padding: '12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontFamily: 'var(--font-geist-mono, monospace)', marginTop: 4 }}
          >
            {loading ? 'CREATING ACCOUNT…' : 'CREATE ACCOUNT →'}
          </button>
        </form>

        <div style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid rgba(0,0,0,0.07)', textAlign: 'center' }}>
          <span style={{ color: 'rgba(0,0,0,0.4)', fontSize: 11, fontFamily: 'var(--font-geist-mono, monospace)' }}>
            Have an account?{' '}
            <Link href="/login" style={{ color: '#C41230', textDecoration: 'none' }}>Sign in</Link>
          </span>
        </div>
      </div>
    </div>
  )
}
