import type { Metadata } from 'next'
import Link from 'next/link'
import { AGENCIES } from '@/lib/agencies'

export const metadata: Metadata = {
  title: 'Selling to Federal Agencies — VA, DoD, DHS, GSA Contracts | IR',
  description: 'How to sell to federal agencies — the VA, DoD, DHS, GSA, HHS, NASA and more. What each agency buys, how to win work, and live contract opportunities updated daily from SAM.gov.',
  alternates: { canonical: 'https://ir-gov.app/agencies' },
}

const mono = 'var(--font-geist-mono, monospace)'
const sans = 'var(--font-geist-sans, sans-serif)'
const crimson = '#C41230'

export default function AgenciesIndexPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#fff', fontFamily: mono }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px clamp(20px, 5vw, 48px) 96px' }}>
        <div style={{ marginBottom: 48 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{ color: crimson, fontSize: 20, fontWeight: 700 }}>ᛁ</span>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', marginLeft: 8 }}>IR</span>
          </Link>
        </div>

        <p style={{ fontSize: 9, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 16px' }}>
          AGENCY DIRECTORY
        </p>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 16px', fontFamily: sans }}>
          Selling to federal agencies.
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15, lineHeight: 1.7, margin: '0 0 12px', maxWidth: 640, fontFamily: sans }}>
          Every agency buys differently. Pick the one you’re targeting to see what they purchase, how
          small businesses win work there, and the opportunities open right now.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, lineHeight: 1.7, margin: '0 0 56px', maxWidth: 640, fontFamily: sans }}>
          The fastest path in is usually one agency that already buys what you sell — not all of them
          at once.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {AGENCIES.map((a) => (
            <Link
              key={a.slug}
              href={`/agencies/${a.slug}`}
              style={{ border: '1px solid rgba(255,255,255,0.08)', background: '#111', padding: '22px 22px', textDecoration: 'none', display: 'block' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: '#fff', background: crimson, padding: '3px 8px' }}>{a.abbr}</span>
              </div>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, lineHeight: 1.4, marginBottom: 8, fontFamily: sans }}>{a.name}</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, lineHeight: 1.6, fontFamily: sans }}>{a.tagline}</div>
            </Link>
          ))}
        </div>

        {/* Cross-links — internal links help crawlability and spread ranking */}
        <div style={{ marginTop: 40, padding: '20px 24px', border: '1px solid rgba(255,255,255,0.08)', background: '#0f0f0f' }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 1.9, margin: 0, fontFamily: sans }}>
            Browsing another way?{' '}
            <Link href="/set-asides" style={{ color: crimson, textDecoration: 'none', fontWeight: 700 }}>By set-aside program →</Link>
            {'  ·  '}
            <Link href="/naics" style={{ color: crimson, textDecoration: 'none', fontWeight: 700 }}>By NAICS code →</Link>
          </p>
        </div>

        <div style={{ marginTop: 32, padding: 32, border: '1px solid rgba(196,18,48,0.3)', background: 'rgba(196,18,48,0.04)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px', fontFamily: sans }}>Let the agency come to you.</h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.7, margin: '0 0 20px', fontFamily: sans }}>
            Tell IR who you sell to once. Every new posting from the agencies that buy what you offer
            gets scored against your business and emailed to you — with the proposal drafted.
          </p>
          <Link href="/register" style={{ display: 'inline-block', padding: '13px 28px', background: crimson, color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none' }}>
            START FREE →
          </Link>
        </div>
      </div>
    </div>
  )
}
