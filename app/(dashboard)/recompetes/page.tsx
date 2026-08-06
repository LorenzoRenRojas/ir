'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import MetatronEyeIcon from '@/components/MetatronEyeIcon'
import MetatronLoader from '@/components/MetatronLoader'

interface ScoreParts {
  timing: number
  size: number
  agency: number
  taste: number
}

interface Recompete {
  awardId: string
  naicsCode: string
  description: string
  incumbent: string
  amount: number | null
  startDate: string | null
  endDate: string
  agency: string
  subAgency: string
  monthsUntilExpiry: number
  usaspendingUrl: string | null
  recompeteScore: number
  scoreParts: ScoreParts
}

const mono = 'var(--font-geist-mono, monospace)'
const sans = 'var(--font-geist-sans, sans-serif)'
const crimson = '#C41230'

const WINDOWS = [
  { key: 'all', label: 'ALL' },
  { key: 'urgent', label: '0–6 MO', min: 0, max: 6 },
  { key: 'sweet', label: '6–12 MO', min: 7, max: 12 },
  { key: 'horizon', label: '12–18 MO', min: 13, max: 18 },
] as const

function formatAmount(v: number | null): string {
  if (!v) return 'Undisclosed'
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
  return `$${Math.round(v).toLocaleString()}`
}

function formatDate(d: string): string {
  const date = new Date(d)
  if (isNaN(date.getTime())) return d
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Recompete solicitations typically drop 3–9 months before the incumbent's
// period of performance ends — forecast that window for each award.
function rfpWindow(endDate: string): { label: string; open: boolean } | null {
  const end = new Date(endDate)
  if (isNaN(end.getTime())) return null
  const from = new Date(end); from.setMonth(from.getMonth() - 9)
  const to = new Date(end); to.setMonth(to.getMonth() - 3)
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()
  if (Date.now() >= from.getTime()) {
    return { label: `RFP WINDOW OPEN — SOLICITATION EXPECTED BY ${fmt(to)}`, open: true }
  }
  return { label: `RFP EXPECTED ${fmt(from)} – ${fmt(to)}`, open: false }
}

// First few meaningful words of the award description → live SAM.gov search.
// FPDS descriptions open with boilerplate codes (IGF::OT::IGF etc.) — strip
// those, keep it short: the contracts search matches a majority of tokens.
function liveSearchQuery(description: string): string {
  return description
    .replace(/IGF::[A-Z]+::IGF/gi, ' ')
    .replace(/[^a-zA-Z ]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .slice(0, 4)
    .join(' ')
}

// Same visual language as the dashboard's match bar
function ScoreBar({ score }: { score: number }) {
  const color = score >= 75 ? '#16a34a' : score >= 55 ? crimson : '#94a3b8'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color, fontFamily: mono, flexShrink: 0 }}>{score}%</span>
      <div style={{ flex: 1, height: 3, background: 'rgba(0,0,0,0.06)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 2, transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: 9, letterSpacing: '0.08em', color: 'rgba(0,0,0,0.25)', fontFamily: mono, flexShrink: 0 }}>RECOMPETE</span>
    </div>
  )
}

function PartsBadges({ parts }: { parts: ScoreParts }) {
  const factors = [
    { label: 'TIMING', score: parts.timing, max: 35, full: 35 },
    { label: 'SIZE', score: parts.size, max: 25, full: 25 },
    { label: 'AGENCY', score: parts.agency, max: 20, full: 20 },
    { label: 'TASTE', score: parts.taste, max: 20, full: 16 }, // taste ≥16 counts as strong
  ]
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {factors.map(f => {
        const full = f.score >= f.full
        const weak = f.score <= f.max * 0.3
        const mark = full ? '✓' : weak ? '✗' : '~'
        const color = full ? '#16a34a' : weak ? 'rgba(0,0,0,0.2)' : '#b45309'
        return (
          <span key={f.label} title={`${f.score}/${f.max} points`} style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 6px', color, background: full ? 'rgba(22,163,74,0.06)' : 'rgba(0,0,0,0.02)', border: `1px solid ${full ? 'rgba(22,163,74,0.2)' : 'rgba(0,0,0,0.07)'}`, fontFamily: mono, whiteSpace: 'nowrap' }}>
            {f.label} {mark}
          </span>
        )
      })}
    </div>
  )
}

// ─── Radar analytics ──────────────────────────────────────────────────────────
// Both charts are built ENTIRELY from data already loaded on this page — no new
// requests, no load-time cost. And both are honest: they describe award history
// (who HOLDS the work and when it expires), never who will bid on it, which is
// data the government does not disclose.

// When contracts in your space expire, in 3-month buckets across the 18-mo
// horizon. Interactive: click a bar to filter the list to that window; the bars
// stay in sync with the filter chips below.
function ExpirationTimeline({ recompetes, filter, onSelect }: { recompetes: Recompete[]; filter: string; onSelect: (key: string) => void }) {
  const [hover, setHover] = useState(-1)
  const buckets = [
    { label: '0–3', min: 0, max: 3, color: crimson, win: 'urgent' },
    { label: '3–6', min: 4, max: 6, color: crimson, win: 'urgent' },
    { label: '6–9', min: 7, max: 9, color: '#b45309', win: 'sweet' },
    { label: '9–12', min: 10, max: 12, color: '#b45309', win: 'sweet' },
    { label: '12–15', min: 13, max: 15, color: '#64748b', win: 'horizon' },
    { label: '15–18', min: 16, max: 18, color: '#64748b', win: 'horizon' },
  ].map(b => ({ ...b, count: recompetes.filter(r => r.monthsUntilExpiry >= b.min && r.monthsUntilExpiry <= b.max).length }))
  const max = Math.max(1, ...buckets.map(b => b.count))

  return (
    <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
        <span style={{ fontSize: 8, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.35)', fontFamily: mono }}>EXPIRATION TIMELINE · MONTHS OUT</span>
        <span style={{ fontSize: 8, letterSpacing: '0.08em', color: 'rgba(0,0,0,0.2)', fontFamily: mono }}>CLICK TO FILTER</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 96 }}>
        {buckets.map((b, i) => {
          const dimmed = filter !== 'all' && filter !== b.win
          const isHover = hover === i
          return (
            <button
              key={b.label}
              onClick={() => onSelect(filter === b.win ? 'all' : b.win)}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(-1)}
              title={`${b.count} expiring in ${b.label} months — click to filter`}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, height: '100%', justifyContent: 'flex-end', background: 'none', border: 'none', padding: 0, cursor: 'pointer', opacity: dimmed ? 0.32 : 1, transition: 'opacity 0.2s ease' }}
            >
              <span style={{ fontSize: 10, fontWeight: 800, color: b.count > 0 ? '#0A0A0A' : 'rgba(0,0,0,0.2)', fontFamily: sans, fontVariantNumeric: 'tabular-nums' }}>{b.count}</span>
              <div style={{ width: '100%', height: `${(b.count / max) * 100}%`, minHeight: b.count > 0 ? 3 : 0, background: b.color, borderRadius: '2px 2px 0 0', filter: isHover ? 'brightness(1.2)' : 'none', boxShadow: isHover ? `0 0 0 2px ${b.color}22` : 'none', transition: 'height 0.5s cubic-bezier(0.22,1,0.36,1), filter 0.15s ease' }} />
              <span style={{ fontSize: 8, letterSpacing: '0.04em', color: filter === b.win ? '#0A0A0A' : 'rgba(0,0,0,0.35)', fontWeight: filter === b.win ? 700 : 400, fontFamily: mono }}>{b.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Who currently HOLDS the expiring work, by total contract value. Aggregated
// from real award records — this is track record, not a prediction of bidders.
function TopIncumbents({ recompetes }: { recompetes: Recompete[] }) {
  const byInc = new Map<string, { total: number; count: number }>()
  for (const r of recompetes) {
    if (!r.incumbent) continue
    const cur = byInc.get(r.incumbent) ?? { total: 0, count: 0 }
    cur.total += r.amount ?? 0
    cur.count += 1
    byInc.set(r.incumbent, cur)
  }
  const top = [...byInc.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 5)
  const max = Math.max(1, ...top.map(([, v]) => v.total))
  const grandTotal = top.reduce((s, [, v]) => s + v.total, 0)
  const [hover, setHover] = useState('')

  return (
    <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', padding: '16px 18px' }}>
      <div style={{ fontSize: 8, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.35)', fontFamily: mono, marginBottom: 16 }}>WHO HOLDS THE EXPIRING WORK · BY VALUE</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {top.map(([name, v]) => {
          const isHover = hover === name
          const share = grandTotal > 0 ? Math.round((v.total / grandTotal) * 100) : 0
          return (
            <div
              key={name}
              onMouseEnter={() => setHover(name)}
              onMouseLeave={() => setHover('')}
              title={`${name} — ${formatAmount(v.total)} across ${v.count} expiring award${v.count > 1 ? 's' : ''} (${share}% of the top 5)`}
              style={{ display: 'flex', flexDirection: 'column', gap: 4, cursor: 'default' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
                <span style={{ fontSize: 11, color: '#0A0A0A', fontFamily: sans, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>{name}</span>
                <span style={{ fontSize: 10, color: crimson, fontFamily: mono, fontWeight: 700, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{isHover ? `${share}%` : `${formatAmount(v.total)}${v.count > 1 ? ` · ${v.count}` : ''}`}</span>
              </div>
              <div style={{ height: 5, background: 'rgba(0,0,0,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(v.total / max) * 100}%`, background: crimson, borderRadius: 3, filter: isHover ? 'brightness(1.15)' : 'none', transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1), filter 0.15s ease' }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AnalyticsStrip({ recompetes, filter, onSelect }: { recompetes: Recompete[]; filter: string; onSelect: (key: string) => void }) {
  // Need enough data for the charts to say something real, not noise.
  if (recompetes.length < 4) return null
  const distinctIncumbents = new Set(recompetes.map(r => r.incumbent).filter(Boolean)).size
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: distinctIncumbents >= 2 ? 'repeat(auto-fit, minmax(280px, 1fr))' : '1fr', gap: 12 }}>
        <ExpirationTimeline recompetes={recompetes} filter={filter} onSelect={onSelect} />
        {distinctIncumbents >= 2 && <TopIncumbents recompetes={recompetes} />}
      </div>
      <p style={{ fontSize: 9, color: 'rgba(0,0,0,0.3)', fontFamily: sans, margin: '8px 2px 0', lineHeight: 1.5 }}>
        Built from USAspending award records — this is who currently <em>holds</em> the expiring work and <em>when</em> it ends. Federal bidders on open solicitations are not public, so IR never guesses them.
      </p>
    </div>
  )
}

export default function RecompetesPage() {
  const [recompetes, setRecompetes] = useState<Recompete[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<string>('all')
  const [tracked, setTracked] = useState<Record<string, 'saving' | 'done'>>({})

  useEffect(() => {
    fetch('/api/recompetes')
      .then(async res => {
        const data = await res.json()
        if (!res.ok) {
          setError(data.error ?? 'Failed to load recompetes.')
          return
        }
        setRecompetes(data.recompetes ?? [])
      })
      .catch(() => setError('Network error — try refreshing.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleTrack(r: Recompete) {
    setTracked(t => ({ ...t, [r.awardId]: 'saving' }))
    try {
      const res = await fetch('/api/contracts/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: `recompete-${r.awardId}`,
          title: `[RECOMPETE] ${r.description.slice(0, 140)}`,
          agency: r.subAgency || r.agency,
          value: r.amount,
          deadline: r.endDate,
          matchScore: r.recompeteScore,
        }),
      })
      setTracked(t => ({ ...t, [r.awardId]: res.ok ? 'done' : undefined as never }))
    } catch {
      setTracked(t => {
        const next = { ...t }
        delete next[r.awardId]
        return next
      })
    }
  }

  const visible = recompetes.filter(r => {
    if (filter === 'all') return true
    const w = WINDOWS.find(w => w.key === filter)
    if (!w || !('min' in w)) return true
    return r.monthsUntilExpiry >= w.min && r.monthsUntilExpiry <= w.max
  })

  const totalValue = recompetes.reduce((s, r) => s + (r.amount ?? 0), 0)

  return (
    <div style={{ padding: '32px 40px', minHeight: '100vh' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.16em', color: crimson, marginBottom: 10, fontFamily: mono, display: 'flex', alignItems: 'center', gap: 8 }}><MetatronEyeIcon size={20} /> RECOMPETE RADAR — PRE-RFP INTELLIGENCE</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.02em', margin: 0, fontFamily: sans }}>
          Contracts expiring in your space.
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)', margin: '8px 0 0', fontFamily: sans, lineHeight: 1.6, maxWidth: 640 }}>
          These awards match your NAICS codes and end within 18 months — the solicitations are coming{' '}
          <strong style={{ color: '#0A0A0A' }}>before they appear on SAM.gov</strong>. Ranked by your
          Recompete Score: timing, size fit, agency history, and what you save. Source: USAspending.gov.
        </p>
      </div>

      {!loading && !error && recompetes.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 1, background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.08)', marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ background: '#fff', padding: '14px 22px', flex: '1 1 140px' }}>
              <div style={{ fontSize: 8, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.3)', fontFamily: mono }}>ON YOUR RADAR</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0A0A0A', fontFamily: sans }}>{recompetes.length}</div>
            </div>
            <div style={{ background: '#fff', padding: '14px 22px', flex: '1 1 140px' }}>
              <div style={{ fontSize: 8, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.3)', fontFamily: mono }}>EXPIRING VALUE</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: crimson, fontFamily: sans }}>{formatAmount(totalValue)}</div>
            </div>
            <div style={{ background: '#fff', padding: '14px 22px', flex: '1 1 140px' }}>
              <div style={{ fontSize: 8, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.3)', fontFamily: mono }}>IN THE SWEET SPOT (6–12 MO)</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#b45309', fontFamily: sans }}>{recompetes.filter(r => r.monthsUntilExpiry >= 6 && r.monthsUntilExpiry <= 12).length}</div>
            </div>
          </div>

          <AnalyticsStrip recompetes={recompetes} filter={filter} onSelect={setFilter} />

          <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
            {WINDOWS.map(w => (
              <button key={w.key} onClick={() => setFilter(w.key)} style={{ padding: '6px 14px', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', fontFamily: mono, cursor: 'pointer', background: filter === w.key ? '#0A0A0A' : 'transparent', color: filter === w.key ? '#fff' : 'rgba(0,0,0,0.4)', border: `1px solid ${filter === w.key ? '#0A0A0A' : 'rgba(0,0,0,0.12)'}` }}>
                {w.label}
              </button>
            ))}
          </div>
        </>
      )}

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
          <MetatronLoader size={150} label="SCANNING FEDERAL AWARD DATA…" />
        </div>
      )}

      {error && !loading && (
        <div style={{ padding: '14px 18px', border: '1px solid rgba(196,18,48,0.3)', background: 'rgba(196,18,48,0.04)', fontSize: 12, color: crimson, fontFamily: sans, maxWidth: 560 }}>
          {error}{' '}
          {error.includes('NAICS') && <Link href="/settings" style={{ color: crimson, fontWeight: 700 }}>Open settings →</Link>}
        </div>
      )}

      {!loading && !error && recompetes.length === 0 && (
        <div style={{ textAlign: 'center', paddingTop: 80 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.2)', fontFamily: mono, marginBottom: 12 }}>NO EXPIRING AWARDS FOUND</div>
          <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)', fontFamily: sans }}>
            No awards in your NAICS codes expire in the next 18 months, or USAspending has no recent data for them.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visible.map((r, i) => {
          const accent = r.recompeteScore >= 75 ? '#16a34a' : r.recompeteScore >= 55 ? crimson : '#94a3b8'
          const months = r.monthsUntilExpiry
          const urgencyColor = months <= 6 ? crimson : months <= 12 ? '#b45309' : '#64748b'
          const trackState = tracked[r.awardId]
          return (
            <div
              key={r.awardId}
              style={{
                background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderLeft: `3px solid ${accent}`,
                padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10,
                animation: 'fadeSlideIn 0.35s ease both', animationDelay: `${Math.min(i, 15) * 40}ms`,
              }}
            >
              <ScoreBar score={r.recompeteScore} />
              <PartsBadges parts={r.scoreParts} />
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: sans, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {r.description}
                  </div>
                  <div style={{ display: 'flex', gap: 14, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', fontFamily: sans }}>{r.subAgency || r.agency}</span>
                    <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.3)', fontFamily: mono }}>NAICS {r.naicsCode}</span>
                    <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.3)', fontFamily: mono }}>AWARD {r.awardId}</span>
                    <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.3)', fontFamily: mono }}>
                      DEFENDING: <span style={{ color: '#0A0A0A', fontWeight: 700 }}>{r.incumbent}</span>
                    </span>
                  </div>
                  {(() => {
                    const w = rfpWindow(r.endDate)
                    return w && (
                      <div style={{ marginTop: 8, display: 'inline-block', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', fontFamily: mono, padding: '3px 8px', color: w.open ? crimson : '#b45309', background: w.open ? 'rgba(196,18,48,0.05)' : 'rgba(180,83,9,0.05)', border: `1px solid ${w.open ? 'rgba(196,18,48,0.25)' : 'rgba(180,83,9,0.25)'}` }}>
                        {w.open ? '● ' : '◌ '}{w.label}
                      </div>
                    )
                  })()}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0A0A0A', fontFamily: sans }}>{formatAmount(r.amount)}</div>
                  <div style={{ fontSize: 9, letterSpacing: '0.08em', color: urgencyColor, fontFamily: mono, fontWeight: 700, marginTop: 2 }}>
                    ENDS {formatDate(r.endDate).toUpperCase()} · ~{months} MO
                  </div>
                  {r.startDate && (
                    <div style={{ fontSize: 9, letterSpacing: '0.08em', color: 'rgba(0,0,0,0.28)', fontFamily: mono, marginTop: 2 }}>
                      RAN SINCE {formatDate(r.startDate).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleTrack(r)}
                  disabled={!!trackState}
                  style={{ padding: '7px 14px', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', fontFamily: mono, cursor: trackState ? 'default' : 'pointer', background: trackState === 'done' ? 'rgba(22,163,74,0.08)' : crimson, color: trackState === 'done' ? '#16a34a' : '#fff', border: trackState === 'done' ? '1px solid rgba(22,163,74,0.3)' : 'none' }}
                >
                  {trackState === 'done' ? '✓ IN PIPELINE' : trackState === 'saving' ? 'TRACKING…' : '+ TRACK IN PIPELINE'}
                </button>
                <Link href={`/dashboard?q=${encodeURIComponent(liveSearchQuery(r.description))}${r.naicsCode ? `&naics=${encodeURIComponent(r.naicsCode)}` : ''}`} style={{ padding: '7px 14px', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', border: '1px solid rgba(0,0,0,0.12)', color: 'rgba(0,0,0,0.5)', textDecoration: 'none', fontFamily: mono }}>
                  SCAN LIVE RFPs
                </Link>
                {r.usaspendingUrl && (
                  <a href={r.usaspendingUrl} target="_blank" rel="noopener noreferrer" style={{ padding: '7px 14px', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', border: '1px solid rgba(0,0,0,0.12)', color: 'rgba(0,0,0,0.5)', textDecoration: 'none', fontFamily: mono }}>
                    AWARD HISTORY ↗
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
