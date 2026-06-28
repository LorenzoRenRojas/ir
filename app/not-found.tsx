import Link from 'next/link'

export default function NotFound() {
  const mono = 'var(--font-geist-mono, monospace)'
  const crimson = '#C41230'

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0A0A',
      color: '#ffffff',
      fontFamily: mono,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      textAlign: 'center',
    }}>
      <div style={{ marginBottom: 24 }}>
        <span style={{ color: crimson, fontSize: 20, fontWeight: 700 }}>ᛁ</span>
      </div>

      <div style={{ fontSize: 9, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.2)', marginBottom: 20 }}>
        ERROR 404
      </div>

      <h1 style={{
        fontSize: 'clamp(36px, 5vw, 64px)',
        fontWeight: 800,
        letterSpacing: '-0.03em',
        color: '#ffffff',
        margin: '0 0 12px',
        fontFamily: 'var(--font-geist-sans, sans-serif)',
      }}>
        Page not found.
      </h1>

      <p style={{
        fontSize: 14,
        color: 'rgba(255,255,255,0.35)',
        maxWidth: 400,
        lineHeight: 1.7,
        margin: '0 0 40px',
        fontFamily: 'var(--font-geist-sans, sans-serif)',
      }}>
        This page doesn&apos;t exist or was moved. The contracts are still out there — let&apos;s get you back to them.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/dashboard" style={{
          padding: '12px 28px',
          background: crimson,
          color: '#ffffff',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textDecoration: 'none',
          fontFamily: mono,
        }}>
          GO TO DASHBOARD →
        </Link>
        <Link href="/" style={{
          padding: '12px 24px',
          background: 'transparent',
          color: 'rgba(255,255,255,0.35)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textDecoration: 'none',
          border: '1px solid rgba(255,255,255,0.1)',
          fontFamily: mono,
        }}>
          HOME
        </Link>
      </div>
    </div>
  )
}
