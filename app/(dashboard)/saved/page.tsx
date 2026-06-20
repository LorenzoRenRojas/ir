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

  useEffect(() => { loadSaved() }, [])

  async function handleRemove(contractId: string) {
    setRemoving(contractId)
    try {
      const res = await fetch(`/api/contracts/saved?contractId=${encodeURIComponent(contractId)}`, { method: 'DELETE' })
      if (res.ok) setContracts((prev) => prev.filter((c) => c.contractId !== contractId))
    } catch (err) {
      console.error(err)
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div style={{ padding: '32px 40px', minHeight: '100vh' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.25)', marginBottom: 10 }}>WATCHLIST</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.02em', margin: 0, fontFamily: 'var(--font-geist-sans, sans-serif)' }}>Saved Contracts</h1>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', paddingTop: 80, fontSize: 10, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.25)' }}>LOADING…</div>
      ) : contracts.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 80, textAlign: 'center', gap: 16 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.2)' }}>WATCHLIST EMPTY</div>
          <div style={{ fontSize: 14, color: 'rgba(0,0,0,0.4)', fontFamily: 'var(--font-geist-sans, sans-serif)', maxWidth: 320 }}>
            Browse the dashboard and save contracts you want to track.
          </div>
          <Link href="/dashboard" style={{ marginTop: 8, padding: '10px 20px', background: '#C41230', color: '#ffffff', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none' }}>
            BROWSE CONTRACTS →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {contracts.map((c) => (
            <div key={c.id} style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                  {c.matchScore != null && (
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 8px', background: 'rgba(196,18,48,0.07)', color: '#C41230', border: '1px solid rgba(196,18,48,0.2)', fontFamily: 'var(--font-geist-mono, monospace)' }}>
                      {c.matchScore}% MATCH
                    </span>
                  )}
                  <span style={{ fontSize: 9, color: 'rgba(0,0,0,0.2)', letterSpacing: '0.06em' }}>SAVED {formatDate(c.createdAt).toUpperCase()}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: 'var(--font-geist-sans, sans-serif)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</div>
                <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)' }}>{c.agency}</span>
                  <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.5)', fontWeight: 600 }}>{formatValue(c.value)}</span>
                  {c.deadline && <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.25)' }}>Due {formatDate(c.deadline)}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <Link href={`/contracts/${c.contractId}`} style={{ padding: '7px 14px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', background: '#C41230', color: '#ffffff', textDecoration: 'none', fontFamily: 'var(--font-geist-mono, monospace)' }}>
                  VIEW →
                </Link>
                <button
                  onClick={() => handleRemove(c.contractId)}
                  disabled={removing === c.contractId}
                  style={{ padding: '7px 12px', fontSize: 10, letterSpacing: '0.08em', border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', color: 'rgba(0,0,0,0.35)', cursor: removing === c.contractId ? 'not-allowed' : 'pointer', opacity: removing === c.contractId ? 0.5 : 1, fontFamily: 'var(--font-geist-mono, monospace)' }}
                >
                  {removing === c.contractId ? '…' : 'REMOVE'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
