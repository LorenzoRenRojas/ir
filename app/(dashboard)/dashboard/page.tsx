'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import type { Contract } from '@/lib/sam-api'

interface AIHint { id: string; aiScore: number; aiReason: string }
type ContractWithAI = Contract & { aiHint?: AIHint }

function formatValue(v?: number): string {
  if (!v) return 'TBD'
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

function ContractCard({ contract, onSave, isSaved, saving }: { contract: ContractWithAI; onSave: (c: Contract) => void; isSaved: boolean; saving: boolean }) {
  const reason = topMatchReason(contract)
  const hasScore = contract.matchScore !== undefined

  const noSetAside = !contract.setAsideDescription ||
    contract.setAsideDescription === 'No Set-Aside' ||
    contract.setAsideDescription === 'No Set-Aside Used' ||
    contract.setAsideDescription === 'NONE'

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10, transition: 'border-color 0.15s' }}>

      {/* Match bar + badges row */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {hasScore && <MatchBar score={contract.matchScore!} />}
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

      {/* AI hint */}
      {contract.aiHint && (
        <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.4)', fontFamily: 'var(--font-geist-sans, sans-serif)', display: 'flex', alignItems: 'flex-start', gap: 6, padding: '6px 8px', background: 'rgba(0,0,0,0.02)', borderLeft: '2px solid rgba(0,0,0,0.08)' }}>
          <span style={{ fontSize: 8, letterSpacing: '0.1em', color: 'rgba(0,0,0,0.2)', flexShrink: 0, paddingTop: 1, fontFamily: 'var(--font-geist-mono, monospace)' }}>AI</span>
          <span style={{ lineHeight: 1.5 }}>{contract.aiHint.aiReason}</span>
        </div>
      )}

      {/* Agency + location */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.55)', fontWeight: 500, fontFamily: 'var(--font-geist-sans, sans-serif)' }}>{contract.agency}</div>
        {contract.subAgency && contract.subAgency !== contract.agency && (
          <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.3)', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>↳ {contract.subAgency}</div>
        )}
        <div style={{ display: 'flex', gap: 12, marginTop: 2, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: '#0A0A0A', fontWeight: 700, fontFamily: 'var(--font-geist-mono, monospace)' }}>{formatValue(contract.value)}</span>
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

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 2, paddingTop: 10, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <button
          onClick={() => onSave(contract)}
          disabled={saving || isSaved}
          style={{ padding: '7px 12px', fontSize: 10, letterSpacing: '0.08em', border: '1px solid rgba(0,0,0,0.1)', background: isSaved ? 'rgba(196,18,48,0.05)' : 'transparent', color: isSaved ? '#C41230' : 'rgba(0,0,0,0.4)', cursor: saving || isSaved ? 'default' : 'pointer', opacity: saving ? 0.5 : 1, fontFamily: 'var(--font-geist-mono, monospace)', transition: 'all 0.15s' }}
        >
          {isSaved ? '♥ SAVED' : '♡ SAVE'}
        </button>
        <Link
          href={`/contracts/${contract.id}`}
          style={{ flex: 1, textAlign: 'center', padding: '7px 12px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', background: '#C41230', color: '#ffffff', textDecoration: 'none', fontFamily: 'var(--font-geist-mono, monospace)' }}
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
  const [contracts, setContracts] = useState<ContractWithAI[]>([])
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [q, setQ] = useState('')
  const [agency, setAgency] = useState('')
  const [type, setType] = useState('')
  const [minValue, setMinValue] = useState('')
  const [maxValue, setMaxValue] = useState('')

  const refreshAge = useRefreshAge(fetchedAt)

  useEffect(() => {
    const t = setTimeout(() => setQ(searchInput), 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const fetchContracts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (agency) params.set('agency', agency)
      if (type) params.set('type', type)
      if (minValue) params.set('minValue', minValue)
      if (maxValue) params.set('maxValue', maxValue)
      const res = await fetch(`/api/contracts?${params.toString()}`)
      const data = await res.json()
      const loaded: ContractWithAI[] = data.contracts ?? []
      setContracts(loaded)
      setFetchedAt(new Date())

      // Enrich with AI hints in background (top 20)
      if (loaded.length > 0 && process.env.NEXT_PUBLIC_AI_HINTS !== 'false') {
        setAiLoading(true)
        fetch('/api/ai/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contracts: loaded.slice(0, 20) }),
        })
          .then(r => r.json())
          .then(({ results }: { results: AIHint[] }) => {
            if (!Array.isArray(results)) return
            const map = new Map(results.map(h => [h.id, h]))
            setContracts(prev => prev.map(c => ({ ...c, aiHint: map.get(c.id) })))
          })
          .catch(() => {})
          .finally(() => setAiLoading(false))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [q, agency, type, minValue, maxValue])

  useEffect(() => { fetchContracts() }, [fetchContracts])

  // Load already-saved IDs on mount
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
        body: JSON.stringify({ contractId: contract.id, samNoticeId: contract.noticeId, title: contract.title, agency: contract.agency, value: contract.value, deadline: contract.responseDeadline, matchScore: contract.matchScore }),
      })
      if (res.ok) setSavedIds((prev) => new Set([...prev, contract.id]))
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(null)
    }
  }

  const onboardingDone = session?.user?.onboardingDone

  return (
    <div style={{ padding: '32px 40px', minHeight: '100vh' }}>
      {/* Header */}
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

      {/* Onboarding banner */}
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

      {/* Filters */}
      <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', padding: '16px', marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 8 }}>
          <input type="text" placeholder="Search contracts…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={inputFilterStyle} />
          <input type="text" placeholder="Agency" value={agency} onChange={(e) => setAgency(e.target.value)} style={inputFilterStyle} />
          <select value={type} onChange={(e) => setType(e.target.value)} style={selectStyle}>
            <option value="">All Types</option>
            <option value="Solicitation">Solicitation</option>
            <option value="Sources Sought">Sources Sought</option>
            <option value="Request for Quote">RFQ</option>
            <option value="Request for Proposal">RFP</option>
            <option value="Broad Agency">BAA</option>
          </select>
          <input type="number" placeholder="Min value ($)" value={minValue} onChange={(e) => setMinValue(e.target.value)} style={inputFilterStyle} />
          <input type="number" placeholder="Max value ($)" value={maxValue} onChange={(e) => setMaxValue(e.target.value)} style={inputFilterStyle} />
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingBottom: 80 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.25)', marginBottom: 12 }}>LOADING CONTRACTS…</div>
            <div style={{ width: 120, height: 1, background: 'rgba(196,18,48,0.2)', margin: '0 auto', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: '#C41230', animation: 'pulse 1.5s ease-in-out infinite' }} />
            </div>
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
          <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.25)', letterSpacing: '0.1em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span>{contracts.length} OPPORTUNITIES FOUND</span>
            {aiLoading && <span style={{ color: 'rgba(0,0,0,0.2)', fontSize: 9 }}>· AI ANALYZING…</span>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
            {contracts.map((contract) => (
              <ContractCard
                key={contract.id}
                contract={contract}
                onSave={handleSave}
                isSaved={savedIds.has(contract.id)}
                saving={saving === contract.id}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
