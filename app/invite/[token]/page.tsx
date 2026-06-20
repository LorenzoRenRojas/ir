'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface InviteInfo {
  email: string
  teamName: string
  role: string
  expiresAt: string
}

export default function InvitePage() {
  const params = useParams<{ token: string }>()
  const token = params.token
  const { data: session, status } = useSession()
  const router = useRouter()

  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')

  useEffect(() => {
    async function fetchInvite() {
      try {
        const res = await fetch(`/api/team/invite/${token}`)
        const data = await res.json()
        if (!res.ok) {
          setLoadError(data.error ?? 'Invalid or expired invite')
        } else {
          setInvite(data.invite)
        }
      } catch {
        setLoadError('Failed to load invite')
      } finally {
        setLoading(false)
      }
    }
    fetchInvite()
  }, [token])

  async function handleJoin() {
    setJoining(true)
    setJoinError('')
    try {
      const res = await fetch(`/api/team/invite/${token}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setJoinError(data.error ?? 'Failed to join team')
      } else {
        router.push('/dashboard')
      }
    } catch {
      setJoinError('Failed to join team')
    } finally {
      setJoining(false)
    }
  }

  const cardStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: '#F8F8F7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-geist-sans, sans-serif)',
  }

  const innerStyle: React.CSSProperties = {
    background: '#FFFFFF',
    border: '1px solid rgba(0,0,0,0.08)',
    padding: '40px 40px',
    width: '100%',
    maxWidth: 440,
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.12em',
    color: 'rgba(0,0,0,0.35)',
    marginBottom: 6,
    fontFamily: 'var(--font-geist-mono, monospace)',
    textTransform: 'uppercase' as const,
  }

  const btnStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 20px',
    background: '#C41230',
    color: '#ffffff',
    border: 'none',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.1em',
    cursor: joining ? 'not-allowed' : 'pointer',
    opacity: joining ? 0.6 : 1,
    fontFamily: 'var(--font-geist-mono, monospace)',
    marginTop: 24,
  }

  if (loading || status === 'loading') {
    return (
      <div style={cardStyle}>
        <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.25)', fontFamily: 'var(--font-geist-mono, monospace)' }}>LOADING…</div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div style={cardStyle}>
        <div style={innerStyle}>
          <div style={{ fontSize: 9, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.25)', marginBottom: 16, fontFamily: 'var(--font-geist-mono, monospace)' }}>TEAM INVITE</div>
          <div style={{ padding: '14px 16px', background: 'rgba(196,18,48,0.05)', border: '1px solid rgba(196,18,48,0.2)', color: '#C41230', fontSize: 13, marginBottom: 20 }}>{loadError}</div>
          <Link href="/dashboard" style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', textDecoration: 'none', letterSpacing: '0.06em', fontFamily: 'var(--font-geist-mono, monospace)' }}>← BACK TO DASHBOARD</Link>
        </div>
      </div>
    )
  }

  if (!invite) return null

  return (
    <div style={cardStyle}>
      <div style={innerStyle}>
        <div style={{ fontSize: 9, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.25)', marginBottom: 24, fontFamily: 'var(--font-geist-mono, monospace)' }}>TEAM INVITE</div>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.02em', margin: '0 0 8px', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>
          Join {invite.teamName}
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)', margin: '0 0 28px', lineHeight: 1.6 }}>
          You have been invited to join the team workspace for <strong>{invite.teamName}</strong>.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px', background: '#F8F8F7', border: '1px solid rgba(0,0,0,0.06)' }}>
          <div>
            <div style={labelStyle}>INVITE FOR</div>
            <div style={{ fontSize: 13, color: '#0A0A0A' }}>{invite.email}</div>
          </div>
          <div>
            <div style={labelStyle}>ROLE</div>
            <div style={{ fontSize: 13, color: '#0A0A0A', textTransform: 'capitalize' }}>{invite.role}</div>
          </div>
          <div>
            <div style={labelStyle}>EXPIRES</div>
            <div style={{ fontSize: 13, color: '#0A0A0A' }}>{new Date(invite.expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
          </div>
        </div>

        {joinError && (
          <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(196,18,48,0.05)', border: '1px solid rgba(196,18,48,0.2)', color: '#C41230', fontSize: 12 }}>{joinError}</div>
        )}

        {status === 'authenticated' ? (
          <>
            {session.user?.email !== invite.email && (
              <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(196,18,48,0.05)', border: '1px solid rgba(196,18,48,0.2)', color: '#C41230', fontSize: 12 }}>
                You are signed in as <strong>{session.user?.email}</strong>, but this invite is for <strong>{invite.email}</strong>. Please sign in with the correct account.
              </div>
            )}
            <button
              onClick={handleJoin}
              disabled={joining || session.user?.email !== invite.email}
              style={{ ...btnStyle, opacity: (joining || session.user?.email !== invite.email) ? 0.5 : 1, cursor: (joining || session.user?.email !== invite.email) ? 'not-allowed' : 'pointer' }}
            >
              {joining ? 'JOINING…' : `JOIN ${invite.teamName.toUpperCase()} →`}
            </button>
          </>
        ) : (
          <>
            <p style={{ marginTop: 20, fontSize: 13, color: 'rgba(0,0,0,0.45)', lineHeight: 1.5 }}>
              Sign in or create an account with <strong>{invite.email}</strong> to accept this invite.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
              <Link
                href={`/register?invite=${token}`}
                style={{ display: 'block', width: '100%', padding: '12px 20px', background: '#C41230', color: '#ffffff', border: 'none', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none', textAlign: 'center', fontFamily: 'var(--font-geist-mono, monospace)', boxSizing: 'border-box' }}
              >
                CREATE ACCOUNT →
              </Link>
              <Link
                href={`/login?invite=${token}`}
                style={{ display: 'block', width: '100%', padding: '12px 20px', background: 'transparent', color: '#0A0A0A', border: '1px solid rgba(0,0,0,0.12)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none', textAlign: 'center', fontFamily: 'var(--font-geist-mono, monospace)', boxSizing: 'border-box' }}
              >
                SIGN IN →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
