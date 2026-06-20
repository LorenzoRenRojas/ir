'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function CreateTeamPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/team/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create team')
      } else {
        router.push('/settings')
        router.refresh()
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '40px', maxWidth: 520 }}>
      <Link href="/dashboard" style={{ fontSize: 10, letterSpacing: '0.1em', color: 'rgba(0,0,0,0.35)', textDecoration: 'none', display: 'inline-block', marginBottom: 32 }}>
        ← BACK
      </Link>

      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.25)', marginBottom: 10, fontFamily: 'var(--font-geist-mono, monospace)' }}>ENTERPRISE</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.02em', margin: 0, fontFamily: 'var(--font-geist-sans, sans-serif)' }}>Create your team workspace</h1>
        <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.45)', marginTop: 12, fontFamily: 'var(--font-geist-sans, sans-serif)', lineHeight: 1.6 }}>
          Your workspace is shared with all team members. You&apos;ll be the admin — you can invite colleagues from Settings after setup.
        </p>
      </div>

      <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', padding: '28px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(0,0,0,0.35)', marginBottom: 8, fontFamily: 'var(--font-geist-mono, monospace)' }}>
              WORKSPACE NAME
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Acme Government Solutions"
              style={{ width: '100%', padding: '10px 12px', background: '#F8F8F7', border: '1px solid rgba(0,0,0,0.1)', color: '#0A0A0A', fontSize: 13, fontFamily: 'var(--font-geist-mono, monospace)', outline: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ marginTop: 6, fontSize: 10, color: 'rgba(0,0,0,0.3)', fontFamily: 'var(--font-geist-mono, monospace)' }}>
              Usually your company name. Visible to all team members.
            </div>
          </div>

          {error && (
            <div style={{ padding: '10px 12px', background: 'rgba(196,18,48,0.05)', border: '1px solid rgba(196,18,48,0.2)', color: '#C41230', fontSize: 11, fontFamily: 'var(--font-geist-mono, monospace)' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            style={{ padding: '12px', background: '#C41230', color: '#ffffff', border: 'none', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', cursor: loading || !name.trim() ? 'not-allowed' : 'pointer', opacity: loading || !name.trim() ? 0.6 : 1, fontFamily: 'var(--font-geist-mono, monospace)' }}
          >
            {loading ? 'CREATING…' : 'CREATE WORKSPACE →'}
          </button>
        </form>
      </div>
    </div>
  )
}
