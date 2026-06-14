'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface SavedContract {
  id: string
  contractId: string
  title: string
  agency: string
  value: number | null
  deadline: string | null
  matchScore: number | null
  createdAt: string
  status: string
}

function formatValue(v: number | null): string {
  if (!v) return 'TBD'
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
  return `$${v.toLocaleString()}`
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  const date = new Date(d)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function SavedContractsPage() {
  const [contracts, setContracts] = useState<SavedContract[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)

  async function loadSaved() {
    try {
      const res = await fetch('/api/contracts/saved')
      const data = await res.json()
      setContracts(data.saved ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSaved()
  }, [])

  async function handleRemove(contractId: string) {
    setRemoving(contractId)
    try {
      const res = await fetch(`/api/contracts/saved?contractId=${encodeURIComponent(contractId)}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setContracts((prev) => prev.filter((c) => c.contractId !== contractId))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Saved Contracts</h1>
        <p className="text-slate-400">Contracts you&apos;ve bookmarked for later</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <p className="text-slate-400">Loading…</p>
        </div>
      ) : contracts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-4xl mb-4">📌</p>
          <p className="text-xl font-semibold text-white mb-2">No saved contracts yet</p>
          <p className="text-slate-400 mb-6">Browse the dashboard and save contracts you want to track.</p>
          <Link
            href="/dashboard"
            className="px-6 py-2.5 rounded-lg font-semibold text-slate-950"
            style={{ background: '#C8A96E' }}
          >
            Browse Contracts
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map((c) => (
            <div
              key={c.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4 hover:border-slate-700 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {c.matchScore != null && (
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: 'rgba(200,169,110,0.15)',
                        color: '#C8A96E',
                        border: '1px solid rgba(200,169,110,0.3)',
                      }}
                    >
                      {c.matchScore}% Match
                    </span>
                  )}
                  <span className="text-xs text-slate-500">Saved {formatDate(c.createdAt)}</span>
                </div>
                <h3 className="text-sm font-semibold text-white truncate">{c.title}</h3>
                <div className="flex gap-4 mt-1">
                  <span className="text-xs text-slate-400">{c.agency}</span>
                  <span className="text-xs text-slate-400">{formatValue(c.value)}</span>
                  {c.deadline && (
                    <span className="text-xs text-slate-400">Due: {formatDate(c.deadline)}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Link
                  href={`/contracts/${c.contractId}`}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-950"
                  style={{ background: '#C8A96E' }}
                >
                  View
                </Link>
                <button
                  onClick={() => handleRemove(c.contractId)}
                  disabled={removing === c.contractId}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700 text-slate-400 hover:border-red-700 hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  {removing === c.contractId ? '…' : 'Remove'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
