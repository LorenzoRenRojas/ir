import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#F8F8F7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'var(--font-geist-mono, monospace)' }}>
      <div style={{ marginBottom: 40 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <span style={{ color: '#C41230', fontSize: 24, fontWeight: 700 }}>ᛁ</span>
          <span style={{ color: '#0A0A0A', fontSize: 16, fontWeight: 700, letterSpacing: '0.12em' }}>IR</span>
          <span style={{ color: 'rgba(0,0,0,0.25)', fontSize: 10, letterSpacing: '0.08em' }}>GOVCON INTELLIGENCE</span>
        </Link>
      </div>
      {children}
    </div>
  )
}
