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

function ScoreBadge({ score }: { score?: number }) {
  if (score === undefined) return null
  const color =
    score >= 80 ? '#4ade80' : score >= 60 ? '#C8A96E' : score >= 40 ? '#94a3b8' : '#64748b'
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
    >
      {score}% Match
    </span>
  )
}

function SetAsideBadge({ label }: { label?: string }) {
  if (!label || label === 'No Set-Aside' || label === 'No Set-Aside Used' || label === 'NONE') return null
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
      {label}
    </span>
  )
}

function ContractCard({
  contract,
  onSave,
  saving,
}: {
  contract: Contract
  onSave: (c: Contract) => void
  saving: boolean
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-3 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <ScoreBadge score={contract.matchScore} />
          <SetAsideBadge label={contract.setAsideDescription} />
        </div>
        <span className="text-xs text-slate-500 flex-shrink-0">{contract.type}</span>
      </div>

      <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2">
        {contract.title}
      </h3>

      <div className="space-y-1">
        <p className="text-xs text-slate-400 flex items-center gap-1.5">
          <span>🏛</span> {contract.agency}
          {contract.subAgency && <span className="text-slate-600"> · {contract.subAgency}</span>}
        </p>
        <div className="flex gap-4">
          <p className="text-xs text-slate-400">
            <span className="font-medium text-slate-300">{formatValue(contract.value)}</span>
          </p>
          {contract.responseDeadline && (
            <p className="text-xs text-slate-400">
              Due: <span className="font-medium text-slate-300">{formatDate(contract.responseDeadline)}</span>
            </p>
          )}
        </div>
        <p className="text-xs text-slate-500">NAICS {contract.naicsCode}</p>
      </div>

      <div className="flex gap-2 mt-auto pt-2 border-t border-slate-800">
        <button
          onClick={() => onSave(contract)}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white transition-colors disabled:opacity-50"
        >
          ♡ Save
        </button>
        <Link
          href={`/contracts/${contract.id}`}
          className="flex-1 text-center px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-950 transition-colors"
          style={{ background: '#C8A96E' }}
        >
          View Details
        </Link>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  // Filters
  const [searchInput, setSearchInput] = useState('')
  const [q, setQ] = useState('')
  const [agency, setAgency] = useState('')
  const [type, setType] = useState('')
  const [setAside, setSetAside] = useState('')
  const [minValue, setMinValue] = useState('')
  const [maxValue, setMaxValue] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(searchInput)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  const fetchContracts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (agency) params.set('agency', agency)
      if (type) params.set('type', type)
      if (setAside) params.set('setAside', setAside)
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
  }, [q, agency, type, setAside, minValue, maxValue])

  useEffect(() => {
    fetchContracts()
  }, [fetchContracts])

  async function handleSave(contract: Contract) {
    setSaving(contract.id)
    try {
      const res = await fetch('/api/contracts/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: contract.id,
          samNoticeId: contract.noticeId,
          title: contract.title,
          agency: contract.agency,
          value: contract.value,
          deadline: contract.responseDeadline,
          matchScore: contract.matchScore,
        }),
      })
      if (res.ok) {
        setSavedIds((prev) => new Set([...prev, contract.id]))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(null)
    }
  }

  const onboardingDone = session?.user?.onboardingDone

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Contract Matches</h1>
        <p className="text-slate-400">Opportunities matched to your company profile</p>
      </div>

      {/* Onboarding banner */}
      {!onboardingDone && (
        <div
          className="mb-6 p-4 rounded-xl border flex items-center justify-between"
          style={{ background: 'rgba(200,169,110,0.08)', border: '1px solid rgba(200,169,110,0.3)' }}
        >
          <div>
            <p className="font-semibold" style={{ color: '#C8A96E' }}>Complete your profile to see personalized matches</p>
            <p className="text-sm text-slate-400 mt-0.5">Add your NAICS codes, business type, and preferences to improve match scores.</p>
          </div>
          <Link
            href="/onboarding"
            className="flex-shrink-0 ml-4 px-4 py-2 rounded-lg text-sm font-semibold text-slate-950"
            style={{ background: '#C8A96E' }}
          >
            Complete Setup
          </Link>
        </div>
      )}

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <input
            type="text"
            placeholder="Search contracts…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="col-span-2 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
          />
          <input
            type="text"
            placeholder="Agency"
            value={agency}
            onChange={(e) => setAgency(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-slate-500"
          >
            <option value="">All Types</option>
            <option value="Solicitation">Solicitation</option>
            <option value="Sources Sought">Sources Sought</option>
            <option value="Request for Quote">RFQ</option>
            <option value="Request for Proposal">RFP</option>
            <option value="Broad Agency">BAA</option>
          </select>
          <input
            type="number"
            placeholder="Min value ($)"
            value={minValue}
            onChange={(e) => setMinValue(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
          />
          <input
            type="number"
            placeholder="Max value ($)"
            value={maxValue}
            onChange={(e) => setMaxValue(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
          />
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="text-4xl mb-4 animate-spin">⊙</div>
            <p className="text-slate-400">Loading contracts…</p>
          </div>
        </div>
      ) : contracts.length === 0 ? (
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <p className="text-2xl mb-2">🔍</p>
            <p className="text-white font-semibold mb-1">No contracts found</p>
            <p className="text-slate-400 text-sm">Try adjusting your filters or broadening your search.</p>
          </div>
        </div>
      ) : (
        <>
          <p className="text-slate-400 text-sm mb-4">{contracts.length} opportunities found</p>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {contracts.map((contract) => (
              <ContractCard
                key={contract.id}
                contract={contract}
                onSave={handleSave}
                saving={saving === contract.id}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
