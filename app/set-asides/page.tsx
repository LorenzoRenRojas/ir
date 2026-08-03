import type { Metadata } from 'next'
import Link from 'next/link'
import { SET_ASIDES } from '@/lib/set-asides'

export const metadata: Metadata = {
  title: 'Federal Set-Aside Contracts — 8(a), WOSB, SDVOSB, HUBZone | IR',
  description: 'Browse live federal set-aside contract opportunities by program — 8(a), WOSB, EDWOSB, SDVOSB, VOSB, HUBZone, and small business. Who qualifies, how to certify, and how to win. Updated daily from SAM.gov.',
  alternates: { canonical: 'https://ir-gov.app/set-asides' },
}

const mono = 'var(--font-geist-mono, monospace)'
const sans = 'var(--font-geist-sans, sans-serif)'
const crimson = '#C41230'

export default function SetAsidesIndexPage() {
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
          SET-ASIDE DIRECTORY
        </p>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 16px', fontFamily: sans }}>
          Federal contracts by set-aside program.
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15, lineHeight: 1.7, margin: '0 0 12px', maxWidth: 640, fontFamily: sans }}>
          The government reserves a large share of its spending for small and disadvantaged businesses.
          Find your program to see live opportunities, who qualifies, and how to get certified.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, lineHeight: 1.7, margin: '0 0 56px', maxWidth: 640, fontFamily: sans }}>
          Not sure which fits? Many businesses hold more than one certification — each one you add
          widens the pool of contracts reserved for you.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {SET_ASIDES.map((s) => (
            <Link
              key={s.slug}
              href={`/set-asides/${s.slug}`}
              style={{ border: '1px solid rgba(255,255,255,0.08)', background: '#111', padding: '22px 22px', textDecoration: 'none', display: 'block' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: '#fff', background: crimson, padding: '3px 8px' }}>{s.abbr}</span>
              </div>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, lineHeight: 1.4, marginBottom: 8, fontFamily: sans }}>{s.name}</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, lineHeight: 1.6, fontFamily: sans }}>{s.tagline}</div>
            </Link>
          ))}
        </div>

        {/* Cross-link to the NAICS directory — internal links help crawlability */}
        <div style={{ marginTop: 40, padding: '20px 24px', border: '1px solid rgba(255,255,255,0.08)', background: '#0f0f0f' }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 1.7, margin: 0, fontFamily: sans }}>
            Looking by industry instead of set-aside?{' '}
            <Link href="/naics" style={{ color: crimson, textDecoration: 'none', fontWeight: 700 }}>Browse contracts by NAICS code →</Link>
          </p>
        </div>

        <div style={{ marginTop: 32, padding: 32, border: '1px solid rgba(196,18,48,0.3)', background: 'rgba(196,18,48,0.04)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px', fontFamily: sans }}>Your certifications, working for you.</h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.7, margin: '0 0 20px', fontFamily: sans }}>
            Add your set-aside status to your IR profile once. Every new posting reserved for your
            programs gets scored against your business and emailed to you — with the proposal drafted.
          </p>
          <Link href="/register" style={{ display: 'inline-block', padding: '13px 28px', background: crimson, color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none' }}>
            START FREE →
          </Link>
        </div>
      </div>
    </div>
  )
}
