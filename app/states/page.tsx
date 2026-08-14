import type { Metadata } from 'next'
import Link from 'next/link'
import { STATES } from '@/lib/states'

export const metadata: Metadata = {
  title: 'Government Contracts by State — Live Federal Opportunities | IR',
  description: 'Find live federal contract opportunities in your state. Every state\'s federal footprint explained — bases, labs, agencies — with contracts updated daily from SAM.gov.',
  alternates: { canonical: 'https://ir-gov.app/states' },
}

const mono = 'var(--font-geist-mono, monospace)'
const sans = 'var(--font-geist-sans, sans-serif)'
const crimson = '#C41230'

export default function StatesPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#fff', fontFamily: mono }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px clamp(20px, 5vw, 48px) 96px' }}>
        <div style={{ marginBottom: 48 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{ color: crimson, fontSize: 20, fontWeight: 700 }}>ᛁ</span>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', marginLeft: 8 }}>IR</span>
          </Link>
        </div>

        <p style={{ fontSize: 9, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 16px' }}>GOVERNMENT CONTRACTS BY STATE</p>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 16px', fontFamily: sans }}>
          Federal work, close to home.
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 16, lineHeight: 1.7, margin: '0 0 48px', maxWidth: 640, fontFamily: sans }}>
          The federal government buys in every state — bases, labs, hospitals, and field offices all
          award contracts where the work happens. Pick your state to see its federal footprint and the
          opportunities live there right now.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {STATES.map((s) => (
            <Link key={s.slug} href={`/states/${s.slug}`}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', border: '1px solid rgba(255,255,255,0.08)', background: '#111', textDecoration: 'none' }}>
              <span style={{ color: crimson, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', flexShrink: 0 }}>{s.code}</span>
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: sans }}>{s.name}</span>
            </Link>
          ))}
        </div>

        <div style={{ marginTop: 64, padding: '32px', border: '1px solid rgba(196,18,48,0.3)', background: 'rgba(196,18,48,0.04)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px', fontFamily: sans }}>
            Stop searching state by state.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.7, margin: '0 0 20px', fontFamily: sans }}>
            IR watches the whole federal market and scores every posting against your business —
            wherever the work is.
          </p>
          <Link href="/register" style={{ display: 'inline-block', padding: '13px 28px', background: crimson, color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none' }}>
            GET MATCHED FREE →
          </Link>
        </div>
      </div>
    </div>
  )
}
