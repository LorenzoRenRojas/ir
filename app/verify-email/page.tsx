'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  )
}

function VerifyEmailContent() {
  const params = useSearchParams()
  const router = useRouter()
  const success = params.get('success') === '1'
  const error = params.get('error')
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  const mono = 'var(--font-geist-mono, monospace)'
  const crimson = '#C41230'

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => router.push('/onboarding'), 3000)
      return () => clearTimeout(t)
    }
  }, [success, router])

  async function handleResend() {
    setResending(true)
    try {
      const res = await fetch('/api/auth/resend-verification', { method: 'POST' })
      if (res.ok) setResent(true)
    } finally {
      setResending(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#ffffff', fontFamily: mono, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ color: crimson, fontSize: 20, fontWeight: 700 }}>ᛁ</span>
        </Link>
      </div>

      {success && (
        <>
          <div style={{ fontSize: 9, letterSpacing: '0.2em', color: '#4ADE80', marginBottom: 20 }}>EMAIL VERIFIED</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 12px', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>You're in.</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: '0 0 32px', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>
            Your email is verified. Taking you to setup in a moment...
          </p>
          <Link href="/onboarding" style={{ padding: '12px 28px', background: crimson, color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none' }}>
            CONTINUE →
          </Link>
        </>
      )}

      {error === 'expired' && (
        <>
          <div style={{ fontSize: 9, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', marginBottom: 20 }}>LINK EXPIRED</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 12px', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>This link has expired.</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: '0 0 32px', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>Verification links are valid for 24 hours.</p>
          <button onClick={handleResend} disabled={resending || resent} style={{ padding: '12px 28px', background: resent ? 'transparent' : crimson, color: resent ? '#4ADE80' : '#fff', border: resent ? '1px solid #4ADE80' : 'none', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer', fontFamily: mono }}>
            {resent ? 'EMAIL SENT ✓' : resending ? 'SENDING…' : 'RESEND VERIFICATION →'}
          </button>
        </>
      )}

      {(error === 'invalid' || error === 'missing' || error === 'server') && (
        <>
          <div style={{ fontSize: 9, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', marginBottom: 20 }}>VERIFICATION FAILED</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 12px', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>Something went wrong.</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: '0 0 32px', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>
            That verification link doesn&apos;t look right. Try resending from your account.
          </p>
          <Link href="/login" style={{ padding: '12px 28px', background: crimson, color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none' }}>
            SIGN IN →
          </Link>
        </>
      )}
    </div>
  )
}
