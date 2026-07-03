import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SignOutButton } from '@/components/ui/sign-out-button'

const NAV = [
  { href: '/dashboard', label: 'CONTRACTS', icon: '◈' },
  { href: '/recompetes', label: 'RECOMPETES', icon: '◎' },
  { href: '/saved', label: 'PIPELINE', icon: '♡' },
  { href: '/documents', label: 'PROPOSALS', icon: '☰' },
  { href: '/settings', label: 'SETTINGS', icon: '⚙' },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const isEnterprise = session.user.subscriptionTier === 'enterprise'
  let hasTeam = false
  if (isEnterprise) {
    try {
      const membership = await prisma.teamMember.findFirst({ where: { userId: session.user.id } })
      hasTeam = !!membership
    } catch {
      hasTeam = false
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8F8F7', display: 'flex', fontFamily: 'var(--font-geist-mono, monospace)', color: '#0A0A0A' }}>
      <aside style={{ width: 200, flexShrink: 0, borderRight: '1px solid rgba(0,0,0,0.08)', background: '#FFFFFF', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ padding: '20px 20px', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <span style={{ color: '#C41230', fontSize: 18, fontWeight: 700 }}>ᛁ</span>
            <span style={{ color: '#0A0A0A', fontSize: 13, fontWeight: 700, letterSpacing: '0.12em' }}>IR</span>
          </Link>
          <div style={{ color: 'rgba(0,0,0,0.22)', fontSize: 9, letterSpacing: '0.08em', marginTop: 4 }}>GOVCON INTELLIGENCE</div>
        </div>

        <nav style={{ flex: 1, padding: '16px 0' }}>
          {NAV.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', textDecoration: 'none', color: 'rgba(0,0,0,0.45)', fontSize: 10, letterSpacing: '0.1em', transition: 'color 0.15s' }}
            >
              <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.2)' }}>{icon}</span>
              {label}
            </Link>
          ))}

          {isEnterprise && !hasTeam && (
            <Link
              href="/team/create"
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', textDecoration: 'none', fontSize: 10, letterSpacing: '0.1em', color: '#C41230', marginTop: 8, borderTop: '1px solid rgba(0,0,0,0.06)' }}
            >
              <span style={{ fontSize: 12 }}>◉</span>
              CREATE TEAM
            </Link>
          )}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 9, color: 'rgba(0,0,0,0.3)', letterSpacing: '0.08em', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {session.user.email}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 9, letterSpacing: '0.1em', color: '#C41230', textTransform: 'uppercase' }}>
              {session.user.subscriptionTier ?? 'free'}
            </span>
            <SignOutButton />
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
