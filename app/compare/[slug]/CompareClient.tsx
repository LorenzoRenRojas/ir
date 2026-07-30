'use client'

import Link from 'next/link'
import MetatronBackdrop from '@/components/MetatronBackdrop'
import { MarketingNav, MarketingCta, useInView, mono, sans, crimson, surface } from '@/components/marketing'
import type { Comparison } from '@/lib/comparisons'

function Matrix({ c }: { c: Comparison }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.15)
  return (
    <div ref={ref} style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '16px 20px', fontFamily: mono, fontSize: 9, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>CAPABILITY</th>
            <th style={{ textAlign: 'left', padding: '16px 20px', fontFamily: mono, fontSize: 9, letterSpacing: '0.16em', color: crimson, borderBottom: `1px solid ${crimson}`, width: '32%' }}>IR</th>
            <th style={{ textAlign: 'left', padding: '16px 20px', fontFamily: mono, fontSize: 9, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.35)', borderBottom: '1px solid rgba(255,255,255,0.1)', width: '32%' }}>{c.competitor.toUpperCase()}</th>
          </tr>
        </thead>
        <tbody>
          {c.rows.map((row, i) => (
            <tr key={row.feature} style={{ opacity: inView ? 1 : 0, transition: `opacity 0.4s ease ${i * 80}ms` }}>
              <td style={{ padding: '14px 20px', fontSize: 13, color: 'rgba(255,255,255,0.6)', borderBottom: '1px solid rgba(255,255,255,0.05)', fontFamily: sans }}>{row.feature}</td>
              <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 600, color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.05)', fontFamily: sans }}>
                <span style={{ color: row.irEdge ? '#4ADE80' : 'rgba(255,255,255,0.35)', marginRight: 8, fontFamily: mono }}>{row.irEdge ? '+' : '='}</span>{row.ir}
              </td>
              <td style={{ padding: '14px 20px', fontSize: 13, color: 'rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(255,255,255,0.05)', fontFamily: sans }}>{row.them}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PickCard({ label, body, accent }: { label: string; body: string; accent: boolean }) {
  return (
    <div style={{ flex: 1, minWidth: 260, background: '#111', border: `1px solid ${accent ? 'rgba(196,18,48,0.35)' : 'rgba(255,255,255,0.09)'}`, borderTop: `3px solid ${accent ? crimson : 'rgba(255,255,255,0.15)'}`, padding: '24px 24px' }}>
      <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.16em', color: accent ? crimson : 'rgba(255,255,255,0.4)', marginBottom: 12 }}>{label}</div>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: 'rgba(255,255,255,0.6)', margin: 0, fontFamily: sans }}>{body}</p>
    </div>
  )
}

export default function CompareClient({ c }: { c: Comparison }) {
  return (
    <div style={{ minHeight: '100vh', background: surface, color: '#fff', fontFamily: mono }}>
      <MetatronBackdrop pulse />
      <MarketingNav section="COMPARE" />

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 28px', position: 'relative', zIndex: 1 }}>
        {/* Hero */}
        <section style={{ padding: '80px 0 56px' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.18em', color: crimson, margin: '0 0 16px', fontFamily: mono }}>{c.kicker}</p>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.08, margin: '0 0 20px', fontFamily: sans }}>
            {c.headline}
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: 'rgba(255,255,255,0.5)', maxWidth: 680, margin: '0 0 32px', fontFamily: sans }}>
            {c.intro}
          </p>
          <div style={{ display: 'flex', gap: 1, flexWrap: 'wrap', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ flex: 1, minWidth: 220, background: surface, padding: '22px 24px' }}>
              <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.16em', color: crimson, marginBottom: 8 }}>IR</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', fontFamily: sans }}>{c.irPrice}</div>
            </div>
            <div style={{ flex: 1, minWidth: 220, background: surface, padding: '22px 24px' }}>
              <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>{c.competitor.toUpperCase()}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.7)', fontFamily: sans }}>{c.theirPrice}</div>
            </div>
          </div>
          {c.note && (
            <p style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.35)', margin: '16px 0 0', lineHeight: 1.7, maxWidth: 680 }}>
              NOTE: {c.note}
            </p>
          )}
        </section>

        {/* Matrix */}
        <section style={{ padding: '16px 0 56px' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 14px', fontFamily: mono }}>FEATURE FOR FEATURE</p>
          <Matrix c={c} />
          <p style={{ fontFamily: sans, fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 16, lineHeight: 1.6 }}>
            Pricing and capabilities are our best read of publicly available information and may change — always confirm current terms with each vendor.
          </p>
        </section>

        {/* Honest pick */}
        <section style={{ padding: '16px 0 56px' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 20px', fontFamily: mono }}>THE HONEST CALL</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <PickCard label={`PICK ${c.competitor.toUpperCase()} IF`} body={c.pickThemIf} accent={false} />
            <PickCard label="PICK IR IF" body={c.pickIrIf} accent />
          </div>
        </section>

        {/* Other comparisons */}
        <section style={{ padding: '16px 0 40px' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 14px', fontFamily: mono }}>COMPARE MORE</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { slug: 'highergov', label: 'IR vs HigherGov' },
              { slug: 'govtribe', label: 'IR vs GovTribe' },
              { slug: 'govwin', label: 'IR vs GovWin IQ' },
            ].filter((o) => o.slug !== c.slug).map((o) => (
              <Link key={o.slug} href={`/compare/${o.slug}`} style={{ padding: '10px 18px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', fontFamily: mono, color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.14)', textDecoration: 'none' }}>
                {o.label} →
              </Link>
            ))}
          </div>
        </section>

        <MarketingCta headline="See your matches in 5 minutes." sub="Free to start. No sales call. Your UEI does the paperwork." />
      </div>
    </div>
  )
}
