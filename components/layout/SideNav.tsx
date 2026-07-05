'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import MetatronIcon from '@/components/MetatronIcon'
import { SignOutButton } from '@/components/ui/sign-out-button'

const mono = 'var(--font-geist-mono, monospace)'
const sans = 'var(--font-geist-sans, sans-serif)'
const crimson = '#C41230'

const NAV = [
  { href: '/dashboard', label: 'CONTRACTS' },
  { href: '/recompetes', label: 'RECOMPETES' },
  { href: '/saved', label: 'PIPELINE' },
  { href: '/settings', label: 'SETTINGS' },
]

export interface SideNavStats {
  activeValue: number
  dueThisWeek: number
  radarCount: number | null
}

function fmtValue(v: number): string {
  if (!v) return '$0'
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
  return `$${v.toLocaleString()}`
}

export default function SideNav({
  email,
  tier,
  stats,
  showCreateTeam,
}: {
  email: string
  tier: string
  stats: SideNavStats
  showCreateTeam: boolean
}) {
  const pathname = usePathname()

  return (
    <aside style={{ width: 210, flexShrink: 0, borderRight: '1px solid rgba(0,0,0,0.08)', background: '#FFFFFF', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', fontFamily: mono }}>
      <div style={{ padding: '20px 20px', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <span style={{ color: crimson, fontSize: 18, fontWeight: 700 }}>ᛁ</span>
          <span style={{ color: '#0A0A0A', fontSize: 13, fontWeight: 700, letterSpacing: '0.12em' }}>IR</span>
        </Link>
        <div style={{ color: 'rgba(0,0,0,0.22)', fontSize: 9, letterSpacing: '0.08em', marginTop: 4 }}>GOVCON INTELLIGENCE</div>
      </div>

      <nav style={{ padding: '14px 0' }}>
        {NAV.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex', alignItems: 'center', gap: 11,
                padding: '13px 20px',
                textDecoration: 'none',
                color: active ? '#0A0A0A' : 'rgba(0,0,0,0.42)',
                fontSize: 11, fontWeight: active ? 700 : 400, letterSpacing: '0.1em',
                borderLeft: `3px solid ${active ? crimson : 'transparent'}`,
                background: active ? 'rgba(196,18,48,0.04)' : 'transparent',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ color: active ? crimson : 'rgba(0,0,0,0.25)', display: 'inline-flex' }}>
                <MetatronIcon size={13} />
              </span>
              {label}
            </Link>
          )
        })}

        {showCreateTeam && (
          <Link
            href="/team/create"
            style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 20px', textDecoration: 'none', fontSize: 11, letterSpacing: '0.1em', color: crimson, marginTop: 6, borderTop: '1px solid rgba(0,0,0,0.06)' }}
          >
            <MetatronIcon size={13} />
            CREATE TEAM
          </Link>
        )}
      </nav>

      {/* Live snapshot — the dead space earns its keep */}
      <div style={{ margin: '10px 14px', border: '1px solid rgba(0,0,0,0.07)', background: '#FAFAF9' }}>
        <div style={{ padding: '12px 14px 8px', fontSize: 8, letterSpacing: '0.18em', color: 'rgba(0,0,0,0.28)' }}>SNAPSHOT</div>
        <Link href="/saved" style={{ display: 'block', padding: '8px 14px', textDecoration: 'none', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 8, letterSpacing: '0.12em', color: 'rgba(0,0,0,0.3)' }}>ACTIVE PIPELINE</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0A0A0A', fontFamily: sans }}>{fmtValue(stats.activeValue)}</div>
        </Link>
        <Link href="/saved" style={{ display: 'block', padding: '8px 14px', textDecoration: 'none', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 8, letterSpacing: '0.12em', color: 'rgba(0,0,0,0.3)' }}>DUE THIS WEEK</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: stats.dueThisWeek > 0 ? crimson : 'rgba(0,0,0,0.25)', fontFamily: sans }}>{stats.dueThisWeek}</div>
        </Link>
        <Link href="/recompetes" style={{ display: 'block', padding: '8px 14px 12px', textDecoration: 'none', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 8, letterSpacing: '0.12em', color: 'rgba(0,0,0,0.3)' }}>ON YOUR RADAR</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: stats.radarCount ? '#b45309' : 'rgba(0,0,0,0.25)', fontFamily: sans }}>{stats.radarCount ?? '—'}</div>
        </Link>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: 9, color: 'rgba(0,0,0,0.3)', letterSpacing: '0.08em', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {email}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 9, letterSpacing: '0.1em', color: crimson, textTransform: 'uppercase' }}>{tier}</span>
          <SignOutButton />
        </div>
      </div>
    </aside>
  )
}
