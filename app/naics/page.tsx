import type { Metadata } from 'next'
import Link from 'next/link'
import { TOP_NAICS_CODES } from '@/lib/naics'

export const metadata: Metadata = {
  title: 'Federal Contracts by NAICS Code | IR',
  description: 'Browse live federal contract opportunities by NAICS code — IT, engineering, construction, consulting, and more. Updated daily from SAM.gov.',
  alternates: { canonical: 'https://ir-gov.app/naics' },
}

const mono = 'var(--font-geist-mono, monospace)'
const sans = 'var(--font-geist-sans, sans-serif)'
const crimson = '#C41230'

export default function NaicsIndexPage() {
  const sectors = Array.from(new Set(TOP_NAICS_CODES.map(n => n.sector)))

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
          CONTRACT DIRECTORY
        </p>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 16px', fontFamily: sans }}>
          Federal contracts by NAICS code.
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15, lineHeight: 1.7, margin: '0 0 56px', maxWidth: 620, fontFamily: sans }}>
          Live opportunities from SAM.gov, organized by industry. Pick your code to see what the
          government is buying right now.
        </p>

        {sectors.map(sector => (
          <div key={sector} style={{ marginBottom: 40 }}>
            <p style={{ fontSize: 9, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 16px' }}>
              {sector.toUpperCase()}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
              {TOP_NAICS_CODES.filter(n => n.sector === sector).map(n => (
                <Link
                  key={n.code}
                  href={`/naics/${n.code}`}
                  style={{ border: '1px solid rgba(255,255,255,0.08)', background: '#111', padding: '16px 18px', textDecoration: 'none', display: 'block' }}
                >
                  <div style={{ color: crimson, fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{n.code}</div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, lineHeight: 1.5, fontFamily: sans }}>{n.description}</div>
                </Link>
              ))}
            </div>
          </div>
        ))}

        <div style={{ marginTop: 8, padding: '20px 24px', border: '1px solid rgba(255,255,255,0.08)', background: '#0f0f0f' }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 1.7, margin: 0, fontFamily: sans }}>
            Qualify for a set-aside?{' '}
            <Link href="/set-asides" style={{ color: crimson, textDecoration: 'none', fontWeight: 700 }}>Browse 8(a), WOSB, SDVOSB &amp; HUBZone contracts →</Link>
          </p>
        </div>

        <div style={{ marginTop: 24, padding: 32, border: '1px solid rgba(196,18,48,0.3)', background: 'rgba(196,18,48,0.04)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px', fontFamily: sans }}>Get matched instead of searching.</h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.7, margin: '0 0 20px', fontFamily: sans }}>
            Set your NAICS codes once. IR scores every new federal posting against your profile and
            emails you the ones worth your time.
          </p>
          <Link href="/register" style={{ display: 'inline-block', padding: '13px 28px', background: crimson, color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none' }}>
            START FREE →
          </Link>
        </div>
      </div>
    </div>
  )
}
