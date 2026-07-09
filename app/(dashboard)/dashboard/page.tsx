'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import type { Contract } from '@/lib/sam-api'
import MetatronIcon from '@/components/MetatronIcon'
import MetatronLoader from '@/components/MetatronLoader'

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

// Compact NAICS ✓ · SET-ASIDE ✓ · SIZE ~ · GEO ✗ row so users see WHY a
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
        const mark = full ? '✓' : none ? '✗' : '~'
        const color = full ? '#16a34a' : none ? 'rgba(0,0,0,0.2)' : '#b45309'
        return (
          <span
            key={f.label}
            title={`${f.score}/${f.max} points`}
            style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 6px', color, background: full ? 'rgba(22,163,74,0.06)' : 'rgba(0,0,0,0.02)', border: `1px solid ${full ? 'rgba(22,163,74,0.2)' : 'rgba(0,0,0,0.07)'}`, fontFamily: 'var(--font-geist-mono, monospace)', whiteSpace: 'nowrap' }}
          >
            {f.label} {mark}
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

function ContractCard({ contract, onSave, isSaved, saving, index }: { contract: Contract; onSave: (c: Contract) => void; isSaved: boolean; saving: boolean; index: number }) {
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
  const winProb = (contract as Contract & { winProbability?: { score: number; label: string; topFactor: string } | null }).winProbability
  const winColor = winProb?.label === 'HIGH' ? '#16a34a' : winProb?.label === 'MEDIUM' ? '#b45309' : winProb?.label === 'INELIGIBLE' ? '#64748b' : '#C41230'

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
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 8, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.25)', fontFamily: 'var(--font-geist-mono, monospace)' }}>WIN PROBABILITY</span>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: winColor, fontFamily: 'var(--font-geist-mono, monospace)', padding: '1px 6px', border: `1px solid ${winColor}`, opacity: 0.9 }}>{winProb.label}</span>
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

      {/* Title */}
      <h3 style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', lineHeight: 1.4, margin: 0, fontFamily: 'var(--font-geist-sans, sans-serif)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {contract.title}
      </h3>

      {/* Match reason */}
      {reason && (
        <div style={{ fontSize: 10, color: '#16a34a', letterSpacing: '0.04em', fontFamily: 'var(--font-geist-mono, monospace)', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ opacity: 0.7 }}>↑</span> {reason}
        </div>
      )}

      {/* Agency + location */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.55)', fontWeight: 500, fontFamily: 'var(--font-geist-sans, sans-serif)' }}>{contract.agency}</div>
        {contract.subAgency && contract.subAgency !== contract.agency && (
          <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.3)', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>↳ {contract.subAgency}</div>
        )}
        <div style={{ display: 'flex', gap: 12, marginTop: 2, flexWrap: 'wrap', alignItems: 'baseline' }}>
          <span style={{ fontSize: 11, color: '#0A0A0A', fontWeight: 700, fontFamily: 'var(--font-geist-mono, monospace)' }}>
            {contract.value ? formatValue(contract.value) : prevValue ? `~${prevValue} prev.` : 'Value not posted'}
          </span>
          {contract.placeOfPerformance && contract.placeOfPerformance !== 'TBD' && (
            <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.35)', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>📍 {contract.placeOfPerformance}</span>
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
            <div style={{ fontSize: 8, letterSpacing: '0.1em', color: 'rgba(0,0,0,0.25)', fontFamily: 'var(--font-geist-mono, monospace)', marginBottom: 1 }}>DEFENDING THIS CONTRACT</div>
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
  background: '#FFFFFF',
  border: '1px solid rgba(0,0,0,0.1)',
  color: 'rgba(0,0,0,0.6)',
  fontSize: 11,
  fontFamily: 'var(--font-geist-mono, monospace)',
  outline: 'none',
}

const inputFilterStyle = {
  padding: '8px 12px',
  background: '#FFFFFF',
  border: '1px solid rgba(0,0,0,0.1)',
  color: '#0A0A0A',
  fontSize: 11,
  fontFamily: 'var(--font-geist-mono, monospace)',
  outline: 'none',
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
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

  const refreshAge = useRefreshAge(fetchedAt)

  // Deep-linked search (e.g. Recompete Radar's "SCAN LIVE RFPs") — read ?q=
  // straight off the URL to avoid the useSearchParams Suspense requirement
  useEffect(() => {
    const preset = new URLSearchParams(window.location.search).get('q')
    if (preset) {
      setSearchInput(preset)
      setQ(preset)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setQ(searchInput), 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const fetchContracts = useCallback(async () => {
    const seq = ++reqSeq.current
    setLoading(true)
    setLoadError(false)
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (agency) params.set('agency', agency)
      if (type) params.set('type', type)
      if (setAside) params.set('setAside', setAside)
      if (dueWithin) params.set('dueWithin', dueWithin)
      const res = await fetch(`/api/contracts?${params.toString()}`)
      const data = await res.json().catch(() => ({}))
      // Ignore a stale response that a newer filter change has superseded —
      // otherwise a slow broad query can land after a fast narrow one and
      // show results that don't match the filters on screen
      if (seq !== reqSeq.current) return
      if (!res.ok) {
        setLoadError(true)
        setContracts([])
      } else {
        setContracts(data.contracts ?? [])
        setFetchedAt(new Date())
      }
    } catch (err) {
      console.error(err)
      if (seq === reqSeq.current) setLoadError(true)
    } finally {
      if (seq === reqSeq.current) setLoading(false)
    }
  }, [q, agency, type, setAside, dueWithin])

  useEffect(() => { fetchContracts() }, [fetchContracts])

  useEffect(() => {
    fetch('/api/contracts/saved')
      .then(r => r.json())
      .then(data => {
        const ids = new Set<string>((data.saved ?? []).map((s: { contractId: string }) => s.contractId))
        setSavedIds(ids)
      })
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
      if (res.ok) setSavedIds((prev) => new Set([...prev, contract.id]))
    } catch (err) {
      console.error(err)
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

  return (
    <div style={{ padding: '32px 40px', minHeight: '100vh' }}>
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.25)', marginBottom: 8 }}>IR — CONTRACT INTELLIGENCE</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.02em', margin: 0, fontFamily: 'var(--font-geist-sans, sans-serif)' }}>Matched Opportunities</h1>
        </div>
        {fetchedAt && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 2 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }} />
            <span style={{ fontSize: 9, letterSpacing: '0.1em', color: 'rgba(0,0,0,0.3)', fontFamily: 'var(--font-geist-mono, monospace)' }}>
              SAM.GOV · REFRESHED {refreshAge.toUpperCase()}
            </span>
            <button
              onClick={fetchContracts}
              style={{ fontSize: 9, letterSpacing: '0.08em', color: 'rgba(0,0,0,0.3)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 6px', fontFamily: 'var(--font-geist-mono, monospace)' }}
            >
              ↺
            </button>
          </div>
        )}
      </div>

      {showWelcome && (
        <div style={{ marginBottom: 24, padding: '20px 24px', background: '#0A0A0A', border: '1px solid rgba(196,18,48,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.18em', color: '#C41230', fontFamily: 'var(--font-geist-mono, monospace)', marginBottom: 8, fontWeight: 700 }}>◆ PROFILE ACTIVE — THE MACHINE IS RUNNING</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-geist-sans, sans-serif)', marginBottom: 4 }}>Every contract below is scored against YOUR profile.</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-geist-sans, sans-serif)', lineHeight: 1.6 }}>Save one that looks winnable — that starts your pipeline, unlocks deadline alerts, and teaches the matcher what you like. Check RECOMPETES for contracts expiring in your space.</div>
          </div>
          <button onClick={dismissWelcome} style={{ flexShrink: 0, padding: '9px 16px', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', fontFamily: 'var(--font-geist-mono, monospace)' }}>
            GOT IT ✓
          </button>
        </div>
      )}

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

      <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', padding: '18px 20px', marginBottom: 24 }}>
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
        {(q || agency || type || setAside || dueWithin) && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 9, letterSpacing: '0.12em', color: 'rgba(0,0,0,0.3)', fontFamily: 'var(--font-geist-mono, monospace)' }}>
              {contracts.length} RESULT{contracts.length === 1 ? '' : 'S'}
            </span>
            <button
              onClick={() => { setSearchInput(''); setAgency(''); setType(''); setSetAside(''); setDueWithin('') }}
              style={{ fontSize: 9, letterSpacing: '0.1em', fontWeight: 700, color: '#C41230', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-geist-mono, monospace)', padding: '2px 4px' }}
            >
              ✕ CLEAR FILTERS
            </button>
          </div>
        )}
      </div>

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
          {contracts[0]?.id?.startsWith('mock-') && (
            <div style={{ marginBottom: 16, padding: '12px 16px', border: '1px solid rgba(196,18,48,0.35)', background: 'rgba(196,18,48,0.05)', fontSize: 11, color: '#C41230', fontFamily: 'var(--font-geist-sans, sans-serif)', lineHeight: 1.6 }}>
              <strong>SAMPLE DATA</strong> — the live SAM.gov feed is unavailable right now (missing API key or daily
              rate limit exhausted). These are example contracts, not real opportunities. Live data resumes automatically
              once the feed recovers.
            </div>
          )}
          <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.25)', letterSpacing: '0.1em', marginBottom: 16 }}>{contracts.length} OPPORTUNITIES FOUND</div>
          <style>{`
            @keyframes fadeSlideIn {
              from { opacity: 0; transform: translateY(12px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
            {contracts.map((contract, i) => (
              <ContractCard
                key={contract.id}
                contract={contract}
                onSave={handleSave}
                isSaved={savedIds.has(contract.id)}
                saving={saving === contract.id}
                index={i}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
