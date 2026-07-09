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

      {/* Concentration read */}
      <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', fontFamily: sans, lineHeight: 1.7, marginBottom: 22, padding: '12px 14px', background: closedClub ? 'rgba(196,18,48,0.04)' : 'rgba(0,0,0,0.02)', border: `1px solid ${closedClub ? 'rgba(196,18,48,0.15)' : 'rgba(0,0,0,0.06)'}` }}>
        {closedClub
          ? <>The top 5 firms hold <strong style={{ color: crimson }}>{concentrationPct}%</strong> of the dollars here — this is a tight incumbent club. Your realistic paths are a <strong>set-aside lane</strong> or <strong>teaming</strong> with an established prime, not a head-on open bid.</>
          : <>Awards are spread across <strong>{data.distinctWinners} firms</strong> with the top 5 holding <strong>{concentrationPct}%</strong> — a relatively open field where a strong small business can break in on merit.</>}
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
