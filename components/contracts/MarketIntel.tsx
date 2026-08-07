'use client'

import { useEffect, useState } from 'react'
import MetatronLoader from '@/components/MetatronLoader'

interface TopWinner { name: string; total: number; awards: number; share: number }
interface Benchmark {
  naicsCode: string
  agency: string | null
  sampleSize: number
  windowMonths: number
  capped: boolean
  minAward: number | null
  maxAward: number | null
  p25Award: number | null
  medianAward: number | null
  p75Award: number | null
  distinctWinners: number
  topWinners: TopWinner[]
  top5Share: number
}

const mono = 'var(--font-geist-mono, monospace)'
const sans = 'var(--font-geist-sans, sans-serif)'
const crimson = '#C41230'

function money(v: number | null): string {
  if (v === null || !isFinite(v)) return '—'
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`
  return `$${Math.round(v)}`
}

// Concentration gauge: share of dollars held by the top 5 firms. A true
// part-to-whole from real award records — high = a closed incumbent club
// (crimson), low = an open field a small business can break into (green).
function ConcentrationGauge({ pct }: { pct: number }) {
  const size = 92, stroke = 9, r = (size - stroke) / 2, circ = 2 * Math.PI * r
  const color = pct >= 60 ? crimson : pct >= 40 ? '#b45309' : '#16a34a'
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${(pct / 100) * circ} ${circ}`} style={{ transition: 'stroke-dasharray 0.7s cubic-bezier(0.22,1,0.36,1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: '#0A0A0A', fontFamily: sans, lineHeight: 1 }}>{pct}%</span>
        <span style={{ fontSize: 7, letterSpacing: '0.12em', color: 'rgba(0,0,0,0.35)', fontFamily: mono, marginTop: 3 }}>TOP 5</span>
      </div>
    </div>
  )
}

export default function MarketIntel({ naics, agency }: { naics: string; agency: string | null }) {
  const [data, setData] = useState<Benchmark | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')

  useEffect(() => {
    const params = new URLSearchParams({ naics })
    if (agency) params.set('agency', agency)
    fetch(`/api/benchmarks?${params.toString()}`)
      .then(async res => {
        if (!res.ok) { setState('error'); return }
        const json = await res.json()
        if (!json.benchmark) { setState('empty'); return }
        setData(json.benchmark)
        setState('ready')
      })
      .catch(() => setState('error'))
  }, [naics, agency])

  const shell = (children: React.ReactNode) => (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', padding: '28px' }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.25)', marginBottom: 20 }}>
        MARKET INTELLIGENCE · NAICS {naics}
      </div>
      {children}
    </div>
  )

  if (state === 'loading') {
    return shell(
      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
        <MetatronLoader size={90} label="READING THE AWARD DATA…" />
      </div>
    )
  }
  if (state === 'empty' || state === 'error') {
    return shell(
      <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', fontFamily: sans, margin: 0, lineHeight: 1.7 }}>
        {state === 'empty'
          ? 'Not enough recent award history in this NAICS to benchmark the market yet.'
          : 'Market data is temporarily unavailable — it loads from federal award records and will be back shortly.'}
      </p>
    )
  }
  if (!data) return null

  const concentrationPct = Math.round(data.top5Share * 100)
  const closedClub = concentrationPct >= 60
  const activity = `${data.capped ? data.sampleSize + '+' : data.sampleSize}`

  return shell(
    <>
      {/* Headline stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 1, background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', marginBottom: 22 }}>
        <div style={{ background: '#fff', padding: '14px 16px' }}>
          <div style={{ fontSize: 8, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.3)', fontFamily: mono }}>ACTIVE PLAYERS</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0A0A0A', fontFamily: sans }}>{data.distinctWinners}</div>
        </div>
        <div style={{ background: '#fff', padding: '14px 16px' }}>
          <div style={{ fontSize: 8, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.3)', fontFamily: mono }}>MAJOR AWARDS ({Math.round(data.windowMonths / 12)}YR)</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0A0A0A', fontFamily: sans }}>{activity}</div>
        </div>
        <div style={{ background: '#fff', padding: '14px 16px' }}>
          <div style={{ fontSize: 8, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.3)', fontFamily: mono }}>AWARD RANGE</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0A0A0A', fontFamily: sans }}>{money(data.minAward)}–{money(data.maxAward)}</div>
        </div>
        <div style={{ background: '#fff', padding: '14px 16px' }}>
          <div style={{ fontSize: 8, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.3)', fontFamily: mono }}>TOP-5 CONTROL</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: closedClub ? crimson : '#0A0A0A', fontFamily: sans }}>{concentrationPct}%</div>
        </div>
      </div>

      {/* Price benchmark — the band across comparable major awards.
          `!= null` (loose) so pre-upgrade cached benchmarks (undefined) skip it
          until they refresh, rather than rendering em-dashes. */}
      {data.medianAward != null && data.p25Award != null && data.p75Award != null && (
        <div style={{ marginBottom: 22, padding: '16px 18px', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.3)', fontFamily: mono, marginBottom: 14 }}>PRICE BENCHMARK · COMPARABLE AWARDS</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
            {[
              { label: 'TYPICAL LOW', v: data.p25Award, sub: '25th pct', big: false },
              { label: 'MEDIAN', v: data.medianAward, sub: 'midpoint', big: true },
              { label: 'TYPICAL HIGH', v: data.p75Award, sub: '75th pct', big: false },
            ].map((c, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', padding: '10px 6px', background: c.big ? 'rgba(196,18,48,0.05)' : 'transparent', border: c.big ? '1px solid rgba(196,18,48,0.2)' : '1px solid transparent', borderRadius: 6 }}>
                <div style={{ fontSize: 8, letterSpacing: '0.1em', color: 'rgba(0,0,0,0.3)', fontFamily: mono, marginBottom: 4 }}>{c.label}</div>
                <div style={{ fontSize: c.big ? 22 : 17, fontWeight: 800, color: c.big ? crimson : '#0A0A0A', fontFamily: sans, letterSpacing: '-0.02em' }}>{money(c.v)}</div>
                <div style={{ fontSize: 8, color: 'rgba(0,0,0,0.25)', fontFamily: mono, marginTop: 2 }}>{c.sub}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 9.5, color: 'rgba(0,0,0,0.3)', fontFamily: sans, lineHeight: 1.6, margin: '12px 0 0' }}>
            Half of comparable major awards landed between <strong style={{ color: 'rgba(0,0,0,0.55)' }}>{money(data.p25Award)}</strong> and <strong style={{ color: 'rgba(0,0,0,0.55)' }}>{money(data.p75Award)}</strong>. These are total obligated values (base + options + modifications) of the largest awards in this NAICS — a sizing benchmark to sanity-check your number, not a bid-to-win price.
          </p>
        </div>
      )}

      {/* Concentration read + gauge */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 22, flexWrap: 'wrap' }}>
        <ConcentrationGauge pct={concentrationPct} />
        <div style={{ flex: 1, minWidth: 220, fontSize: 12, color: 'rgba(0,0,0,0.55)', fontFamily: sans, lineHeight: 1.7, padding: '12px 14px', background: closedClub ? 'rgba(196,18,48,0.04)' : 'rgba(0,0,0,0.02)', border: `1px solid ${closedClub ? 'rgba(196,18,48,0.15)' : 'rgba(0,0,0,0.06)'}` }}>
          {closedClub
            ? <>The top 5 firms hold <strong style={{ color: crimson }}>{concentrationPct}%</strong> of the dollars here — this is a tight incumbent club. Your realistic paths are a <strong>set-aside lane</strong> or <strong>teaming</strong> with an established prime, not a head-on open bid.</>
            : <>Awards are spread across <strong>{data.distinctWinners} firms</strong> with the top 5 holding <strong>{concentrationPct}%</strong> — a relatively open field where a strong small business can break in on merit.</>}
        </div>
      </div>

      {/* Top players */}
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.3)', fontFamily: mono, marginBottom: 12 }}>WHO WINS HERE</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.topWinners.map((w, i) => (
          <div key={w.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.3)', fontFamily: mono, width: 16 }}>{String(i + 1).padStart(2, '0')}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#0A0A0A', fontFamily: sans, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.name}</div>
              <div style={{ height: 3, background: 'rgba(0,0,0,0.06)', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.max(4, Math.round(w.share * 100))}%`, background: crimson, borderRadius: 2 }} />
              </div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0A0A0A', fontFamily: mono, whiteSpace: 'nowrap' }}>{money(w.total)}</div>
            <div style={{ fontSize: 9, color: 'rgba(0,0,0,0.3)', fontFamily: mono, width: 34, textAlign: 'right' }}>{w.awards}×</div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 9, color: 'rgba(0,0,0,0.28)', fontFamily: mono, lineHeight: 1.6, margin: '20px 0 0' }}>
        Based on the largest federal prime awards in this NAICS{data.agency ? ` at ${data.agency}` : ''} over the last {Math.round(data.windowMonths / 12)} years. Source: USAspending.gov.
      </p>
    </>
  )
}
