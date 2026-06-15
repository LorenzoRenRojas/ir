import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { SignOutButton } from '@/components/ui/sign-out-button'

const NAV = [
  { href: '/dashboard', label: 'CONTRACTS', icon: '◈' },
  { href: '/saved', label: 'SAVED', icon: '♡' },
  { href: '/documents', label: 'DOCUMENTS', icon: '☰' },
  { href: '/settings', label: 'SETTINGS', icon: '⚙' },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0B', display: 'flex', fontFamily: 'var(--font-geist-mono, monospace)', color: '#E2E8F0' }}>
      {/* Sidebar */}
      <aside style={{ width: 200, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
        {/* Logo */}
        <div style={{ padding: '20px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <span style={{ color: '#C8A96E', fontSize: 18, fontWeight: 700 }}>ᛁ</span>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: '0.12em' }}>IR</span>
          </Link>
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9, letterSpacing: '0.08em', marginTop: 4 }}>GOVCON INTELLIGENCE</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 0' }}>
          {NAV.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', textDecoration: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: '0.1em', transition: 'color 0.15s' }}
            >
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>{icon}</span>
              {label}
            </Link>
          ))}
        </nav>

        {/* User info */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {session.user.email}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 9, letterSpacing: '0.1em', color: '#C8A96E', textTransform: 'uppercase' }}>
              {session.user.subscriptionTier ?? 'free'}
            </span>
            <SignOutButton />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflowAuto: 'auto' as never, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
