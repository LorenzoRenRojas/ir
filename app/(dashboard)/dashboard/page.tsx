'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import type { Contract } from '@/lib/sam-api'

function formatValue(v?: number): string {
  if (!v) return 'TBD'
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
  return `$${v.toLocaleString()}`
}

function formatDate(d: string): string {
  if (!d) return '—'
  const date = new Date(d)
  if (isNaN(date.getTime())) return d
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function scoreColor(score?: number) {
  if (!score) return '#64748b'
  if (score >= 80) return '#4ADE80'
  if (score >= 60) return '#C8A96E'
  return '#64748b'
}

function ContractCard({ contract, onSave, saving }: { contract: Contract; onSave: (c: Contract) => void; saving: boolean }) {
  const color = scoreColor(contract.matchScore)
  return (
    <div style={{ background: '#0F0F10', border: '1px solid rgba(255,255,255,0.07)', padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {contract.matchScore !== undefined && (
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 8px', background: `${color}15`, color, border: `1px solid ${color}30`, fontFamily: 'var(--font-geist-mono, monospace)' }}>
              {contract.matchScore}% MATCH
            </span>
          )}
          {contract.setAsideDescription && contract.setAsideDescription !== 'No Set-Aside' && contract.setAsideDescription !== 'No Set-Aside Used' && contract.setAsideDescription !== 'NONE' && (
            <span style={{ fontSize: 10, padding: '2px 8px', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'var(--font-geist-mono, monospace)' }}>
              {contract.setAsideDescription}
            </span>
          )}
        </div>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em', flexShrink: 0, fontFamily: 'var(--font-geist-mono, monospace)' }}>{contract.type}</span>
      </div>

      <h3 style={{ fontSize: 13, fontWeight: 600, color: '#E2E8F0', lineHeight: 1.4, margin: 0, fontFamily: 'var(--font-geist-sans, sans-serif)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {contract.title}
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{contract.agency}</div>
        <div style={{ display: 'flex', gap: 16 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{formatValue(contract.value)}</span>
          {contract.responseDeadline && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Due {formatDate(contract.responseDeadline)}</span>
          )}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.06em' }}>NAICS {contract.naicsCode}</div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <button
          onClick={() => onSave(contract)}
          disabled={saving}
          style={{ padding: '7px 12px', fontSize: 10, letterSpacing: '0.08em', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1, fontFamily: 'var(--font-geist-mono, monospace)' }}
        >
          ♡ SAVE
        </button>
        <Link
          href={`/contracts/${contract.id}`}
          style={{ flex: 1, textAlign: 'center', padding: '7px 12px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', background: '#C8A96E', color: '#0A0A0B', textDecoration: 'none', fontFamily: 'var(--font-geist-mono, monospace)' }}
        >
          VIEW →
        </Link>
      </div>
    </div>
  )
}

const selectStyle = {
  padding: '8px 12px',
  background: '#0F0F10',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'rgba(255,255,255,0.6)',
  fontSize: 11,
  fontFamily: 'var(--font-geist-mono, monospace)',
  outline: 'none',
}

const inputFilterStyle = {
  padding: '8px 12px',
  background: '#0F0F10',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#E2E8F0',
  fontSize: 11,
  fontFamily: 'var(--font-geist-mono, monospace)',
  outline: 'none',
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [searchInput, setSearchInput] = useState('')
  const [q, setQ] = useState('')
  const [agency, setAgency] = useState('')
  const [type, setType] = useState('')
  const [minValue, setMinValue] = useState('')
  const [maxValue, setMaxValue] = useState('')

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
      setContracts(data.contracts ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [q, agency, type, minValue, maxValue])

  useEffect(() => { fetchContracts() }, [fetchContracts])

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
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.25)', marginBottom: 10 }}>CONTRACT INTELLIGENCE</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#E2E8F0', letterSpacing: '-0.02em', margin: 0, fontFamily: 'var(--font-geist-sans, sans-serif)' }}>Matched Opportunities</h1>
      </div>

      {/* Onboarding banner */}
      {!onboardingDone && (
        <div style={{ marginBottom: 24, padding: '16px 20px', background: 'rgba(200,169,110,0.05)', border: '1px solid rgba(200,169,110,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#C8A96E', marginBottom: 4 }}>Complete your profile to see personalized matches</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Add NAICS codes, business type, and preferences to improve match scores.</div>
          </div>
          <Link href="/onboarding" style={{ flexShrink: 0, padding: '8px 16px', background: '#C8A96E', color: '#0A0A0B', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            COMPLETE SETUP →
          </Link>
        </div>
      )}

      {/* Filters */}
      <div style={{ background: '#0F0F10', border: '1px solid rgba(255,255,255,0.07)', padding: '16px', marginBottom: 24 }}>
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
            <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.25)', marginBottom: 12 }}>LOADING CONTRACTS…</div>
            <div style={{ width: 120, height: 1, background: 'rgba(200,169,110,0.3)', margin: '0 auto', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: '#C8A96E', animation: 'pulse 1.5s ease-in-out infinite' }} />
            </div>
          </div>
        </div>
      ) : contracts.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingBottom: 80, textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.2)', marginBottom: 12 }}>NO RESULTS</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>No contracts match your filters. Try broadening your search.</div>
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', marginBottom: 16 }}>{contracts.length} OPPORTUNITIES FOUND</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 1, background: 'rgba(255,255,255,0.05)' }}>
            {contracts.map((contract) => (
              <ContractCard key={contract.id} contract={contract} onSave={handleSave} saving={saving === contract.id} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
