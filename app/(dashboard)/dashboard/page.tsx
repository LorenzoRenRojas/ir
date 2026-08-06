'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import type { Contract } from '@/lib/sam-api'
import MetatronIcon from '@/components/MetatronIcon'
import MetatronLoader from '@/components/MetatronLoader'
import { PinIcon, TrendUpIcon, SubAgencyIcon, RefreshIcon } from '@/components/icons'
import { PageHeader, StatStrip } from '@/components/layout/PageHeader'

function formatValue(v?: number): string {
  if (!v) return 'Not posted'
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
  return `$${v.toLocaleString()}`
}

function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function DeadlineBadge({ dateStr }: { dateStr: string }) {
  const days = daysUntil(dateStr)
  if (days === null) return null
  if (days < 0) return (
    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 7px', background: 'rgba(0,0,0,0.04)', color: 'rgba(0,0,0,0.25)', border: '1px solid rgba(0,0,0,0.08)', fontFamily: 'var(--font-geist-mono, monospace)' }}>
      CLOSED
    </span>
  )
  const color = days <= 3 ? '#C41230' : days <= 7 ? '#b45309' : days <= 14 ? '#92400e' : 'rgba(0,0,0,0.3)'
  const bg = days <= 3 ? 'rgba(196,18,48,0.07)' : days <= 7 ? 'rgba(180,83,9,0.07)' : 'rgba(0,0,0,0.03)'
  const border = days <= 3 ? 'rgba(196,18,48,0.25)' : days <= 7 ? 'rgba(180,83,9,0.2)' : 'rgba(0,0,0,0.08)'
  return (
    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 7px', background: bg, color, border: `1px solid ${border}`, fontFamily: 'var(--font-geist-mono, monospace)', whiteSpace: 'nowrap' }}>
      {days === 0 ? 'DUE TODAY' : `${days}D LEFT`}
    </span>
  )
}

function topMatchReason(contract: Contract): string | null {
  const bd = contract.matchBreakdown
  if (!bd?.details) return null
  const scores = [
    { score: bd.naicsScore, text: bd.details.naics },
    { score: bd.setAsideScore, text: bd.details.setAside },
    { score: bd.contractSizeScore, text: bd.details.contractSize },
    { score: bd.geoScore, text: bd.details.geo },
  ]
  const top = scores.filter(s => s.score > 0).sort((a, b) => b.score - a.score)[0]
  return top?.text ?? null
}

// Compact NAICS / SET-ASIDE / SIZE / GEO row with a status dot per factor
// (solid = full credit, ring = partial, faint = none) so users see WHY a
// contract scored without clicking into the breakdown.
function BreakdownBadges({ contract }: { contract: Contract }) {
  const bd = contract.matchBreakdown
  if (!bd) return null

  const factors = [
    { label: 'NAICS', score: bd.naicsScore, max: 40 },
    { label: 'SET-ASIDE', score: bd.setAsideScore, max: 25 },
    { label: 'SIZE', score: bd.contractSizeScore, max: 20 },
    { label: 'GEO', score: bd.geoScore, max: 15 },
  ]

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {factors.map(f => {
        const full = f.score >= f.max
        const none = f.score === 0
        // Status is carried by a small dot, not a glyph: solid = full credit,
        // ring = partial, faint hollow = none. Reads as a data indicator, not text.
        const color = full ? '#16a34a' : none ? 'rgba(0,0,0,0.22)' : '#b45309'
        return (
          <span
            key={f.label}
            title={`${f.score}/${f.max} points`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 7px', color, background: full ? 'rgba(22,163,74,0.06)' : 'rgba(0,0,0,0.02)', border: `1px solid ${full ? 'rgba(22,163,74,0.2)' : 'rgba(0,0,0,0.07)'}`, fontFamily: 'var(--font-geist-mono, monospace)', whiteSpace: 'nowrap' }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: full || !none ? color : 'transparent', border: full || !none ? 'none' : `1.5px solid ${color}`, boxSizing: 'border-box' }} />
            {f.label}
          </span>
        )
      })}
    </div>
  )
}

function MatchBar({ score }: { score: number }) {
  const color = score >= 80 ? '#16a34a' : score >= 60 ? '#C41230' : '#94a3b8'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color, fontFamily: 'var(--font-geist-mono, monospace)', flexShrink: 0 }}>
        {score}%
      </span>
      <div style={{ flex: 1, height: 3, background: 'rgba(0,0,0,0.06)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 2, transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: 9, letterSpacing: '0.08em', color: 'rgba(0,0,0,0.25)', fontFamily: 'var(--font-geist-mono, monospace)', flexShrink: 0 }}>MATCH</span>
    </div>
  )
}

// Opportunity Signals — the capture-analyst flags (SHAPE IT / FY-END PUSH /
// DUE IN 2D). Tone drives color; the full explanation is the hover tooltip so
// the card stays clean but the reasoning is one hover away (our explainability
// rule). Rendered prominently because these are "act now", not metadata.
function SignalBadges({ signals }: { signals?: { kind: string; tone: string; label: string; detail: string }[] }) {
  if (!signals || signals.length === 0) return null
  const style = (tone: string) =>
    tone === 'act-now'
      ? { bg: 'rgba(196,18,48,0.09)', fg: '#C41230', bd: 'rgba(196,18,48,0.35)' }
      : tone === 'positive'
      ? { bg: 'rgba(22,163,74,0.09)', fg: '#15803d', bd: 'rgba(22,163,74,0.32)' }
      : { bg: 'rgba(0,0,0,0.04)', fg: 'rgba(0,0,0,0.5)', bd: 'rgba(0,0,0,0.12)' }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
      {signals.map((s, i) => {
        const c = style(s.tone)
        return (
          <span
            key={i}
            title={s.detail}
            style={{
              fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em', padding: '3px 8px',
              background: c.bg, color: c.fg, border: `1px solid ${c.bd}`, borderRadius: 4,
              fontFamily: 'var(--font-geist-mono, monospace)', cursor: 'help', display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: c.fg, opacity: 0.8 }} />
            {s.label}
          </span>
        )
      })}
    </div>
  )
}

function ContractCard({ contract, onSave, isSaved, saving, index, compact }: { contract: Contract; onSave: (c: Contract) => void; isSaved: boolean; saving: boolean; index: number; compact?: boolean }) {
  const [hovered, setHovered] = useState(false)
  const reason = topMatchReason(contract)
  const hasScore = contract.matchScore !== undefined
  const score = contract.matchScore ?? 0
  const accentColor = score >= 80 ? '#16a34a' : score >= 60 ? '#C41230' : '#94a3b8'

  const noSetAside = !contract.setAsideDescription ||
    contract.setAsideDescription === 'No Set-Aside' ||
    contract.setAsideDescription === 'No Set-Aside Used' ||
    contract.setAsideDescription === 'NONE'

  const incumbent = (contract as Contract & { incumbent?: { awardee: string; amount: number } | null }).incumbent
  const winProb = (contract as Contract & { winProbability?: { score: number; label: string; topFactor: string; verdict?: string; verdictDetail?: string } | null }).winProbability
  const winColor = winProb?.label === 'HIGH' ? '#16a34a' : winProb?.label === 'MEDIUM' ? '#b45309' : winProb?.label === 'INELIGIBLE' ? '#64748b' : '#C41230'
  const verdictColor = winProb?.verdict === 'PURSUE' ? '#16a34a' : winProb?.verdict === 'CONDITIONAL' ? '#b45309' : '#64748b'

  const prevValue = incumbent?.amount
    ? incumbent.amount >= 1_000_000
      ? `$${(incumbent.amount / 1_000_000).toFixed(1)}M`
      : `$${(incumbent.amount / 1_000).toFixed(0)}K`
    : null

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#FFFFFF',
        border: '1px solid rgba(0,0,0,0.08)',
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: 12,
        padding: compact ? '13px 15px' : '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? 7 : 10,
        transition: 'box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease',
        boxShadow: hovered ? '0 8px 32px rgba(0,0,0,0.10)' : '0 1px 4px rgba(0,0,0,0.04)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        animation: `fadeSlideIn 0.35s ease both`,
        animationDelay: `${index * 40}ms`,
        cursor: 'default',
      }}
    >
      {/* Win probability + match bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {winProb && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 8, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.25)', fontFamily: 'var(--font-geist-mono, monospace)' }}>WIN PROBABILITY</span>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: winColor, fontFamily: 'var(--font-geist-mono, monospace)', padding: '1px 6px', border: `1px solid ${winColor}`, opacity: 0.9 }}>{winProb.label}</span>
              {winProb.verdict && (
                <span
                  title={winProb.verdictDetail}
                  style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: '#fff', background: verdictColor, fontFamily: 'var(--font-geist-mono, monospace)', padding: '2px 7px', borderRadius: 3, cursor: 'help' }}
                >
                  {winProb.verdict}
                </span>
              )}
            </div>
            <span style={{ fontSize: 9, color: 'rgba(0,0,0,0.3)', fontFamily: 'var(--font-geist-sans, sans-serif)', fontStyle: 'italic' }}>{winProb.topFactor}</span>
          </div>
        )}
        {hasScore && <MatchBar score={score} />}
        {hasScore && <BreakdownBadges contract={contract} />}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
          {!noSetAside && (
            <span style={{ fontSize: 9, padding: '2px 7px', background: 'rgba(0,0,0,0.04)', color: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,0,0,0.08)', letterSpacing: '0.06em', fontFamily: 'var(--font-geist-mono, monospace)' }}>
              {contract.setAsideDescription}
            </span>
          )}
          <span style={{ fontSize: 9, padding: '2px 7px', background: 'rgba(0,0,0,0.03)', color: 'rgba(0,0,0,0.25)', border: '1px solid rgba(0,0,0,0.06)', letterSpacing: '0.06em', fontFamily: 'var(--font-geist-mono, monospace)' }}>
            {contract.type}
          </span>
          {contract.responseDeadline && <DeadlineBadge dateStr={contract.responseDeadline} />}
        </div>
      </div>

      {/* Opportunity Signals — capture-analyst flags */}
      <SignalBadges signals={contract.signals} />

      {/* Title */}
      <h3 style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', lineHeight: 1.4, margin: 0, fontFamily: 'var(--font-geist-sans, sans-serif)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {contract.title}
      </h3>

      {/* Match reason */}
      {reason && (
        <div style={{ fontSize: 10, color: '#16a34a', letterSpacing: '0.04em', fontFamily: 'var(--font-geist-mono, monospace)', display: 'flex', alignItems: 'center', gap: 5 }}>
          <TrendUpIcon size={11} style={{ flexShrink: 0, opacity: 0.85 }} /> {reason}
        </div>
      )}

      {/* Agency + location */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.55)', fontWeight: 500, fontFamily: 'var(--font-geist-sans, sans-serif)' }}>{contract.agency}</div>
        {contract.subAgency && contract.subAgency !== contract.agency && (
          <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.3)', fontFamily: 'var(--font-geist-sans, sans-serif)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <SubAgencyIcon size={11} style={{ flexShrink: 0, opacity: 0.6 }} />{contract.subAgency}
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, marginTop: 2, flexWrap: 'wrap', alignItems: 'baseline' }}>
          <span style={{ fontSize: 11, color: '#0A0A0A', fontWeight: 700, fontFamily: 'var(--font-geist-mono, monospace)' }}>
            {contract.value ? formatValue(contract.value) : 'Value not posted'}
          </span>
          {contract.placeOfPerformance && contract.placeOfPerformance !== 'TBD' && (
            <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.35)', fontFamily: 'var(--font-geist-sans, sans-serif)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <PinIcon size={11} style={{ flexShrink: 0, opacity: 0.7 }} />{contract.placeOfPerformance}
            </span>
          )}
        </div>
        {contract.naicsDescription && (
          <div style={{ fontSize: 9, color: 'rgba(0,0,0,0.25)', letterSpacing: '0.05em', fontFamily: 'var(--font-geist-mono, monospace)', marginTop: 1 }}>
            NAICS {contract.naicsCode} · {contract.naicsDescription}
          </div>
        )}
      </div>

      {/* Incumbent strip */}
      {incumbent && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: 'rgba(0,0,0,0.025)', borderLeft: `2px solid ${accentColor}` }}>
          <div>
            {/* fetchIncumbent returns the largest award in this NAICS since
                2022 government-wide — a market-dominance signal, NOT the
                holder of this specific contract. The label must say what the
                data is (marketing claims policy: never overstate). */}
            <div style={{ fontSize: 8, letterSpacing: '0.1em', color: 'rgba(0,0,0,0.25)', fontFamily: 'var(--font-geist-mono, monospace)', marginBottom: 1 }}>TOP AWARDEE — THIS NAICS SINCE 2022</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#0A0A0A', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>{incumbent.awardee}</div>
          </div>
          {prevValue && (
            <span style={{ fontSize: 11, fontWeight: 700, color: accentColor, fontFamily: 'var(--font-geist-mono, monospace)' }}>{prevValue}</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 2, paddingTop: 10, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <button
          onClick={() => onSave(contract)}
          disabled={saving || isSaved}
          style={{ padding: '8px 14px', fontSize: 10, letterSpacing: '0.08em', border: '1px solid rgba(0,0,0,0.1)', background: isSaved ? 'rgba(196,18,48,0.05)' : 'transparent', color: isSaved ? '#C41230' : 'rgba(0,0,0,0.4)', cursor: saving || isSaved ? 'default' : 'pointer', opacity: saving ? 0.5 : 1, fontFamily: 'var(--font-geist-mono, monospace)', transition: 'all 0.15s', display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <MetatronIcon size={11} /> {isSaved ? 'SAVED' : 'SAVE'}
        </button>
        <Link
          href={`/contracts/${encodeURIComponent(contract.id)}`}
          style={{ flex: 1, textAlign: 'center', padding: '7px 12px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', background: '#C41230', color: '#ffffff', textDecoration: 'none', fontFamily: 'var(--font-geist-mono, monospace)', transition: 'background 0.15s', opacity: hovered ? 0.9 : 1 }}
        >
          VIEW →
        </Link>
      </div>
    </div>
  )
}

function useRefreshAge(fetchedAt: Date | null) {
  const [label, setLabel] = useState('')
  useEffect(() => {
    if (!fetchedAt) return
    function update() {
      const secs = Math.floor((Date.now() - fetchedAt!.getTime()) / 1000)
      if (secs < 60) setLabel('just now')
      else if (secs < 3600) setLabel(`${Math.floor(secs / 60)}m ago`)
      else setLabel(`${Math.floor(secs / 3600)}h ago`)
    }
    update()
    const interval = setInterval(update, 30000)
    return () => clearInterval(interval)
  }, [fetchedAt])
  return label
}

const selectStyle = {
  padding: '8px 12px',
  background: '#FBFBFA',
  border: '1px solid rgba(0,0,0,0.1)',
  borderRadius: 8,
  color: 'rgba(0,0,0,0.6)',
  fontSize: 11,
  fontFamily: 'var(--font-geist-mono, monospace)',
  outline: 'none',
}

const inputFilterStyle = {
  padding: '8px 12px',
  background: '#FBFBFA',
  border: '1px solid rgba(0,0,0,0.1)',
  borderRadius: 8,
  color: '#0A0A0A',
  fontSize: 11,
  fontFamily: 'var(--font-geist-mono, monospace)',
  outline: 'none',
}

// Regulatory Radar — the "real-world events" layer. Recent Federal Register
// rules relevant to the company's sectors: the demand-forming signal a capture
// analyst reads before the contracts appear. Renders nothing when empty, so it
// never clutters the feed or implies false precision.
type RegEvent = { title: string; type: string; agency: string; date: string; url: string }
function RegulatoryRadar({ events }: { events: RegEvent[] }) {
  if (!events || events.length === 0) return null
  return (
    <div style={{ marginBottom: 24, border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, background: '#FFFFFF', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 18px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#C41230' }} />
        <span style={{ fontSize: 9, letterSpacing: '0.16em', fontWeight: 700, color: 'rgba(0,0,0,0.55)', fontFamily: 'var(--font-geist-mono, monospace)' }}>REGULATORY RADAR</span>
        <span
          title="New and proposed federal rules drive procurement — a mandate today is a contract tomorrow. These are recent rules in your sectors, straight from the Federal Register."
          style={{ fontSize: 10, color: 'rgba(0,0,0,0.3)', fontFamily: 'var(--font-geist-sans, sans-serif)', fontStyle: 'italic', cursor: 'help' }}
        >
          real-world signals that move the market
        </span>
      </div>
      <div>
        {events.map((e, i) => (
          <a
            key={i}
            href={e.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '11px 18px', textDecoration: 'none', borderBottom: i < events.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}
          >
            <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.08em', color: e.type === 'Rule' ? '#C41230' : '#b45309', fontFamily: 'var(--font-geist-mono, monospace)', whiteSpace: 'nowrap', flexShrink: 0, textTransform: 'uppercase' }}>
              {e.type === 'Proposed Rule' ? 'PROPOSED' : e.type.toUpperCase()}
            </span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: 'rgba(0,0,0,0.75)', fontFamily: 'var(--font-geist-sans, sans-serif)', lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
              {e.title}
              <span style={{ color: 'rgba(0,0,0,0.35)', fontSize: 10 }}> — {e.agency}</span>
            </span>
          </a>
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [loadErrorDetail, setLoadErrorDetail] = useState('')
  const reqSeq = useRef(0)
  const [saving, setSaving] = useState<string | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [q, setQ] = useState('')
  const [agency, setAgency] = useState('')
  const [type, setType] = useState('')
  const [setAside, setSetAside] = useState('')
  const [dueWithin, setDueWithin] = useState('')
  const [naics, setNaics] = useState('')
  const [eligibleOnly, setEligibleOnly] = useState(true)
  const [hiddenIneligible, setHiddenIneligible] = useState(0)
  // Saved contracts are in the pipeline already — hide them from the "find new
  // work" feed by default so it stays a clean triage queue. Client-side filter
  // using the saved IDs we already fetch, so no extra request and no lag.
  const [hideSaved, setHideSaved] = useState(true)
  // Feed-appearance preferences (saved in Settings → Feed). Applied as the
  // initial defaults; the user can still override per-session with the
  // controls above. prefsLoaded gates the first fetch so defaults land before
  // contracts load (no flash / double request).
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable')
  const [minMatch, setMinMatch] = useState(0)
  const [prefsLoaded, setPrefsLoaded] = useState(false)

  const refreshAge = useRefreshAge(fetchedAt)
  const [regEvents, setRegEvents] = useState<RegEvent[]>([])

  useEffect(() => {
    fetch('/api/preferences')
      .then((r) => r.json())
      .then((data) => {
        const p = data.preferences
        if (p) {
          if (typeof p.feedEligibleOnly === 'boolean') setEligibleOnly(p.feedEligibleOnly)
          if (typeof p.feedHideSaved === 'boolean') setHideSaved(p.feedHideSaved)
          if (p.feedDensity === 'compact' || p.feedDensity === 'comfortable') setDensity(p.feedDensity)
          if (typeof p.feedMinMatch === 'number') setMinMatch(p.feedMinMatch)
          // Only seed the deadline window if the URL didn't already deep-link filters.
          if (p.feedDefaultDueWithin && !new URLSearchParams(window.location.search).get('q')) {
            setDueWithin(String(p.feedDefaultDueWithin))
          }
        }
      })
      .catch(() => {})
      .finally(() => setPrefsLoaded(true))
  }, [])

  // Deep-linked search (e.g. Recompete Radar's "SCAN LIVE RFPs") — read ?q=
  // straight off the URL to avoid the useSearchParams Suspense requirement
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const preset = sp.get('q')
    if (preset) {
      setSearchInput(preset)
      setQ(preset)
    }
    // Radar's SCAN LIVE RFPs also narrows to the award's industry so the
    // keyword scan can't drift into unrelated NAICS codes
    const presetNaics = sp.get('naics')
    if (presetNaics) setNaics(presetNaics)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setQ(searchInput), 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const fetchContracts = useCallback(async () => {
    const seq = ++reqSeq.current
    setLoading(true)
    setLoadError(false)
    setLoadErrorDetail('')

    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (agency) params.set('agency', agency)
    if (type) params.set('type', type)
    if (setAside) params.set('setAside', setAside)
    if (dueWithin) params.set('dueWithin', dueWithin)
    if (naics) params.set('naics', naics)
    if (!eligibleOnly) params.set('eligibleOnly', 'false')
    const base = params.toString()

    // Phase 1 — fast paint: scored matches + signals, no USAspending wait.
    // This is what removes up to ~6s of cold-cache lag before the feed appears.
    let ok = false
    try {
      const res = await fetch(`/api/contracts?${base}${base ? '&' : ''}enrich=skip`)
      const data = await res.json().catch(() => ({}))
      // Ignore a stale response that a newer filter change has superseded.
      if (seq !== reqSeq.current) return
      if (!res.ok) {
        setLoadError(true)
        setLoadErrorDetail(typeof data.detail === 'string' ? data.detail : '')
        setContracts([])
      } else {
        setContracts(data.contracts ?? [])
        setHiddenIneligible(data.hiddenIneligible ?? 0)
        setFetchedAt(new Date())
        ok = true
      }
    } catch (err) {
      console.error(err)
      if (seq === reqSeq.current) setLoadError(true)
    } finally {
      if (seq === reqSeq.current) setLoading(false)
    }

    // Phase 2 — background enrichment: win probability + incumbents fill onto
    // the already-rendered cards. No spinner, never blocks; if it fails, the
    // fast feed simply stays as-is.
    if (!ok) return
    try {
      const res2 = await fetch(`/api/contracts?${base}`)
      const data2 = await res2.json().catch(() => ({}))
      if (seq !== reqSeq.current || !res2.ok) return
      const byId = new Map<string, Contract>((data2.contracts ?? []).map((c: Contract) => [c.id, c]))
      setContracts((prev) =>
        prev.map((c) => {
          const e = byId.get(c.id)
          return e ? { ...c, winProbability: e.winProbability, incumbent: e.incumbent } : c
        })
      )
    } catch { /* best-effort — the fast feed already rendered */ }
  }, [q, agency, type, setAside, dueWithin, naics, eligibleOnly])

  useEffect(() => { if (prefsLoaded) fetchContracts() }, [fetchContracts, prefsLoaded])

  useEffect(() => {
    fetch('/api/contracts/saved')
      .then(r => r.json())
      .then(data => {
        const ids = new Set<string>((data.saved ?? []).map((s: { contractId: string }) => s.contractId))
        setSavedIds(ids)
      })
      .catch(() => {})
  }, [])

  // Regulatory Radar — best-effort, never blocks the feed.
  useEffect(() => {
    fetch('/api/regulatory')
      .then(r => r.ok ? r.json() : { events: [] })
      .then(data => setRegEvents(Array.isArray(data.events) ? data.events : []))
      .catch(() => {})
  }, [])

  async function handleSave(contract: Contract) {
    setSaving(contract.id)
    try {
      const res = await fetch('/api/contracts/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId: contract.id, samNoticeId: contract.noticeId, title: contract.title, agency: contract.agency, value: contract.value, deadline: contract.responseDeadline, matchScore: contract.matchScore, contractText: [contract.title, contract.agency, contract.naicsCode, contract.description].filter(Boolean).join('\n') }),
      })
      if (res.ok) {
        setSavedIds((prev) => new Set([...prev, contract.id]))
      } else {
        // A silent failure looks like "the button did nothing" — say so
        const data = await res.json().catch(() => ({}))
        const detail = typeof data.detail === 'string' ? `\n\nAdmin detail: ${data.detail}` : ''
        alert(`Save failed: ${data.error ?? `server error ${res.status}`}. Try again in a moment — if it keeps happening, tell the admin.${detail}`)
      }
    } catch (err) {
      console.error(err)
      alert('Save failed: network error. Check your connection and try again.')
    } finally {
      setSaving(null)
    }
  }

  const onboardingDone = session?.user?.onboardingDone

  const [showWelcome, setShowWelcome] = useState(false)
  useEffect(() => {
    try {
      if (localStorage.getItem('ir-welcome') === '1') setShowWelcome(true)
    } catch { /* private mode */ }
  }, [])
  function dismissWelcome() {
    setShowWelcome(false)
    try { localStorage.removeItem('ir-welcome') } catch { /* ignore */ }
  }

  // Feed readout — a calm focal summary of what's on screen right now.
  const scoredForStat = contracts.filter((c) => c.matchScore !== undefined)
  const avgMatch = scoredForStat.length ? Math.round(scoredForStat.reduce((s, c) => s + (c.matchScore ?? 0), 0) / scoredForStat.length) : null
  const newToday = contracts.filter((c) => c.postedDate && Date.now() - new Date(c.postedDate).getTime() < 86_400_000).length
  const savedInFeedCount = contracts.filter((c) => savedIds.has(c.id)).length
  const dash = (n: number | null) => (loading || n === null ? '—' : String(n))

  return (
    <div style={{ padding: '30px 40px 48px', minHeight: '100vh' }}>
      <PageHeader
        kicker="CONTRACT INTELLIGENCE"
        title="Matched Opportunities"
        subtitle="Every open federal solicitation, scored against your company profile."
        right={fetchedAt ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }} />
            <span style={{ fontSize: 9, letterSpacing: '0.1em', color: 'rgba(0,0,0,0.35)', fontFamily: 'var(--font-geist-mono, monospace)' }}>
              SAM.GOV · {refreshAge.toUpperCase()}
            </span>
            <button onClick={fetchContracts} title="Refresh" aria-label="Refresh feed" style={{ display: 'inline-flex', alignItems: 'center', color: 'rgba(0,0,0,0.35)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>
              <RefreshIcon size={13} />
            </button>
          </div>
        ) : undefined}
      />

      <div style={{ marginBottom: 22 }}>
        <StatStrip items={[
          { label: 'OPPORTUNITIES', value: loading ? '—' : String(contracts.length) },
          { label: 'NEW TODAY', value: dash(newToday), accent: newToday > 0 ? 'crimson' : 'muted' },
          { label: 'AVG MATCH', value: avgMatch === null ? '—' : `${avgMatch}%`, accent: 'green' },
          { label: 'IN PIPELINE', value: dash(savedInFeedCount), accent: 'muted' },
        ]} />
      </div>

      {showWelcome && (
        <div style={{ marginBottom: 24, padding: '20px 24px', background: '#0A0A0A', border: '1px solid rgba(196,18,48,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.18em', color: '#C41230', fontFamily: 'var(--font-geist-mono, monospace)', marginBottom: 8, fontWeight: 700 }}>◆ PROFILE ACTIVE — THE MACHINE IS RUNNING</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-geist-sans, sans-serif)', marginBottom: 4 }}>Every contract below is scored against YOUR profile.</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-geist-sans, sans-serif)', lineHeight: 1.6 }}>Save one that looks winnable — that starts your pipeline, unlocks deadline alerts, and teaches the matcher what you like. Check RECOMPETES for contracts expiring in your space.</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
            <Link href="/playbook" style={{ padding: '9px 16px', background: '#C41230', color: '#fff', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', border: 'none', textDecoration: 'none', fontFamily: 'var(--font-geist-mono, monospace)', whiteSpace: 'nowrap' }}>
              SEE YOUR PLAYBOOK →
            </Link>
            <button onClick={dismissWelcome} style={{ padding: '9px 16px', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', fontFamily: 'var(--font-geist-mono, monospace)' }}>
              GOT IT ✓
            </button>
          </div>
        </div>
      )}

      <RegulatoryRadar events={regEvents} />

      {!onboardingDone && (
        <div style={{ marginBottom: 24, padding: '16px 20px', background: 'rgba(196,18,48,0.04)', border: '1px solid rgba(196,18,48,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#C41230', marginBottom: 4 }}>Complete your profile to see personalized matches</div>
            <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)' }}>Add NAICS codes, business type, and preferences to unlock match scores and reasons.</div>
          </div>
          <Link href="/onboarding" style={{ flexShrink: 0, padding: '8px 16px', background: '#C41230', color: '#ffffff', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            COMPLETE SETUP →
          </Link>
        </div>
      )}

      <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.03)', padding: '18px 20px', marginBottom: 22 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 2.2fr) minmax(140px, 1fr) minmax(150px, 1fr) minmax(140px, 1fr) minmax(130px, 1fr)', gap: 10 }}>
          <input type="text" placeholder="Search title, agency, keywords…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={{ ...inputFilterStyle, padding: '12px 14px', fontSize: 13 }} />
          <input type="text" placeholder="Agency" value={agency} onChange={(e) => setAgency(e.target.value)} style={{ ...inputFilterStyle, padding: '12px 14px', fontSize: 13 }} />
          <select value={setAside} onChange={(e) => setSetAside(e.target.value)} style={{ ...selectStyle, padding: '12px 12px', fontSize: 12 }}>
            <option value="">Any set-aside</option>
            <option value="Small Business">Small Business</option>
            <option value="8(a)">8(a)</option>
            <option value="Service-Disabled">SDVOSB</option>
            <option value="Women-Owned">WOSB</option>
            <option value="HUBZone">HUBZone</option>
          </select>
          <select value={type} onChange={(e) => setType(e.target.value)} style={{ ...selectStyle, padding: '12px 12px', fontSize: 12 }}>
            <option value="">All types</option>
            <option value="Solicitation">Solicitation</option>
            <option value="Sources Sought">Sources Sought</option>
            <option value="Request for Quote">RFQ</option>
            <option value="Request for Proposal">RFP</option>
            <option value="Broad Agency">BAA</option>
          </select>
          <select value={dueWithin} onChange={(e) => setDueWithin(e.target.value)} style={{ ...selectStyle, padding: '12px 12px', fontSize: 12 }}>
            <option value="">Any deadline</option>
            <option value="7">Due in 7 days</option>
            <option value="14">Due in 14 days</option>
            <option value="30">Due in 30 days</option>
            <option value="60">Due in 60 days</option>
          </select>
        </div>
        {(q || agency || type || setAside || dueWithin || naics) && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 9, letterSpacing: '0.12em', color: 'rgba(0,0,0,0.3)', fontFamily: 'var(--font-geist-mono, monospace)' }}>
              {contracts.length} RESULT{contracts.length === 1 ? '' : 'S'}
            </span>
            {naics && (
              <button
                onClick={() => setNaics('')}
                title="Showing this industry and closely related codes — click to remove"
                style={{ fontSize: 9, letterSpacing: '0.08em', fontWeight: 700, color: '#b45309', background: 'rgba(180,83,9,0.06)', border: '1px solid rgba(180,83,9,0.3)', cursor: 'pointer', fontFamily: 'var(--font-geist-mono, monospace)', padding: '3px 8px' }}
              >
                NAICS {naics} + RELATED ✕
              </button>
            )}
            <button
              onClick={() => { setSearchInput(''); setAgency(''); setType(''); setSetAside(''); setDueWithin(''); setNaics('') }}
              style={{ fontSize: 9, letterSpacing: '0.1em', fontWeight: 700, color: '#C41230', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-geist-mono, monospace)', padding: '2px 4px' }}
            >
              ✕ CLEAR FILTERS
            </button>
          </div>
        )}

        {/* Personalized eligibility toggle — hide set-asides you can't prime */}
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => setEligibleOnly(v => !v)}
            role="switch"
            aria-checked={eligibleOnly}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <span style={{ width: 34, height: 18, borderRadius: 10, background: eligibleOnly ? '#C41230' : 'rgba(0,0,0,0.15)', position: 'relative', transition: 'background 0.15s', flexShrink: 0 }}>
              <span style={{ position: 'absolute', top: 2, left: eligibleOnly ? 18 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: '#0A0A0A', fontFamily: 'var(--font-geist-mono, monospace)' }}>
              CONTRACTS I CAN PRIME
            </span>
          </button>
          <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.4)', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>
            {eligibleOnly
              ? (hiddenIneligible > 0
                  ? `${hiddenIneligible} set-aside${hiddenIneligible === 1 ? '' : 's'} you're not certified for ${hiddenIneligible === 1 ? 'is' : 'are'} hidden. Turn off to see them (you can still team up to bid).`
                  : 'Showing only set-asides your certifications qualify you to bid as prime.')
              : 'Showing every opportunity, including set-asides you’d need to team up to pursue.'}
          </span>
        </div>
      </div>

      {(() => {
        // FY-end window: Jul 1 – Sep 30. Agencies must obligate remaining
        // FY funds by Sep 30 — the best-known seasonal surge in GovCon.
        const now = new Date()
        const inWindow = now.getMonth() >= 6 && now.getMonth() <= 8
        if (!inWindow) return null
        const fyEnd = new Date(now.getFullYear(), 8, 30)
        const daysLeft = Math.max(0, Math.ceil((fyEnd.getTime() - now.getTime()) / 86_400_000))
        return (
          <div style={{ marginBottom: 16, padding: '13px 18px', border: '1px solid rgba(180,83,9,0.3)', background: 'rgba(180,83,9,0.05)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: '#b45309', fontFamily: 'var(--font-geist-mono, monospace)' }}>◉ FY-END WINDOW · {daysLeft} DAYS</span>
            <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)', fontFamily: 'var(--font-geist-sans, sans-serif)', flex: 1, minWidth: 220, lineHeight: 1.5 }}>
              Agencies must obligate remaining FY funds by Sep 30 — fast-turnaround awards spike now. Favor near-term deadlines.
            </span>
            <button
              onClick={() => setDueWithin(dueWithin === '60' ? '' : '60')}
              style={{ padding: '7px 14px', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', fontFamily: 'var(--font-geist-mono, monospace)', cursor: 'pointer', background: dueWithin === '60' ? '#b45309' : 'transparent', color: dueWithin === '60' ? '#fff' : '#b45309', border: '1px solid rgba(180,83,9,0.5)' }}
            >
              {dueWithin === '60' ? '✓ SHOWING 60-DAY CLOSERS' : 'SHOW 60-DAY CLOSERS'}
            </button>
          </div>
        )
      })()}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingBottom: 80 }}>
          <MetatronLoader size={150} label="SCANNING THE FEDERAL MARKET…" />
        </div>
      ) : loadError ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingBottom: 80, textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.16em', color: '#C41230', marginBottom: 12 }}>FEED TEMPORARILY UNAVAILABLE</div>
            <div style={{ fontSize: 14, color: 'rgba(0,0,0,0.45)', fontFamily: 'var(--font-geist-sans, sans-serif)', marginBottom: 20 }}>
              We couldn&apos;t load live contract data just now. This is usually momentary.
            </div>
            {loadErrorDetail && (
              <div style={{ maxWidth: 520, margin: '0 auto 20px', padding: '10px 14px', background: 'rgba(196,18,48,0.04)', border: '1px solid rgba(196,18,48,0.15)', fontSize: 10, color: 'rgba(0,0,0,0.5)', fontFamily: 'var(--font-geist-mono, monospace)', textAlign: 'left', wordBreak: 'break-word' }}>
                ADMIN DETAIL: {loadErrorDetail}
              </div>
            )}
            <button onClick={() => fetchContracts()} style={{ padding: '10px 22px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', fontFamily: 'var(--font-geist-mono, monospace)', background: '#0A0A0A', color: '#fff', border: 'none', cursor: 'pointer' }}>
              RETRY →
            </button>
          </div>
        </div>
      ) : contracts.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingBottom: 80, textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.2)', marginBottom: 12 }}>NO RESULTS</div>
            <div style={{ fontSize: 14, color: 'rgba(0,0,0,0.45)', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>No contracts match your filters. Try broadening your search.</div>
          </div>
        </div>
      ) : (
        <>
          {contracts[0]?.id?.startsWith('mock-') && session?.user?.email !== 'demo@ir-gov.app' && (
            <div style={{ marginBottom: 16, padding: '12px 16px', border: '1px solid rgba(196,18,48,0.35)', background: 'rgba(196,18,48,0.05)', fontSize: 11, color: '#C41230', fontFamily: 'var(--font-geist-sans, sans-serif)', lineHeight: 1.6 }}>
              <strong>SAMPLE DATA</strong> — the live SAM.gov feed is unavailable right now (missing API key or daily
              rate limit exhausted). These are example contracts, not real opportunities. Live data resumes automatically
              once the feed recovers.
            </div>
          )}
          {(() => {
            // Min-match preference hides low-scoring matches, but never hides
            // unscored contracts (score undefined → treated as passing).
            const scored = minMatch > 0 ? contracts.filter(c => (c.matchScore ?? 100) >= minMatch) : contracts
            const savedInFeed = scored.filter(c => savedIds.has(c.id)).length
            const visible = hideSaved ? scored.filter(c => !savedIds.has(c.id)) : scored
            const compact = density === 'compact'
            return (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                  <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.25)', letterSpacing: '0.1em' }}>{visible.length} {hideSaved ? 'NEW' : ''} OPPORTUNIT{visible.length === 1 ? 'Y' : 'IES'}</span>
                  {savedInFeed > 0 && (
                    <button
                      onClick={() => setHideSaved(v => !v)}
                      style={{ fontSize: 9, letterSpacing: '0.08em', fontWeight: 700, color: '#C41230', background: 'transparent', border: '1px solid rgba(196,18,48,0.3)', cursor: 'pointer', fontFamily: 'var(--font-geist-mono, monospace)', padding: '3px 9px' }}
                    >
                      {hideSaved ? `${savedInFeed} SAVED HIDDEN · SHOW` : `HIDE ${savedInFeed} SAVED`}
                    </button>
                  )}
                </div>
                <style>{`
                  @keyframes fadeSlideIn {
                    from { opacity: 0; transform: translateY(12px); }
                    to   { opacity: 1; transform: translateY(0); }
                  }
                `}</style>
                {visible.length === 0 ? (
                  <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, letterSpacing: '0.14em', color: '#16a34a', marginBottom: 10, fontFamily: 'var(--font-geist-mono, monospace)' }}>ALL CAUGHT UP ✓</div>
                    <div style={{ fontSize: 14, color: 'rgba(0,0,0,0.45)', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>
                      You&apos;ve saved every match here. New opportunities land daily — check back, or turn off &ldquo;hide saved&rdquo; to review your pipeline.
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${compact ? 260 : 320}px, 1fr))`, gap: compact ? 8 : 12 }}>
                    {visible.map((contract, i) => (
                      <ContractCard
                        key={contract.id}
                        contract={contract}
                        onSave={handleSave}
                        isSaved={savedIds.has(contract.id)}
                        saving={saving === contract.id}
                        index={i}
                        compact={compact}
                      />
                    ))}
                  </div>
                )}
              </>
            )
          })()}
        </>
      )}
    </div>
  )
}
