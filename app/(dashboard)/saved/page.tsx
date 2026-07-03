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

const mono = 'var(--font-geist-mono, monospace)'
const sans = 'var(--font-geist-sans, sans-serif)'

const STAGES = [
  { key: 'saved',     label: 'SAVED',     color: '#64748b' },
  { key: 'pursuing',  label: 'PURSUING',  color: '#b45309' },
  { key: 'submitted', label: 'SUBMITTED', color: '#C41230' },
  { key: 'won',       label: 'WON',       color: '#16a34a' },
  { key: 'lost',      label: 'LOST',      color: 'rgba(0,0,0,0.25)' },
] as const

function stageOf(status: string) {
  return STAGES.find(s => s.key === status) ?? STAGES[0]
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

export default function PipelinePage() {
  const [contracts, setContracts] = useState<SavedContract[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

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

  async function handleStageChange(contractId: string, status: string) {
    // Optimistic update — revert on failure
    const prev = contracts
    setContracts(cs => cs.map(c => (c.contractId === contractId ? { ...c, status } : c)))
    try {
      const res = await fetch('/api/contracts/saved', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId, status }),
      })
      if (!res.ok) setContracts(prev)
    } catch {
      setContracts(prev)
    }
  }

  const visible = filter === 'all' ? contracts : contracts.filter(c => c.status === filter)

  const activeValue = contracts
    .filter(c => ['saved', 'pursuing', 'submitted'].includes(c.status))
    .reduce((sum, c) => sum + (c.value ?? 0), 0)
  const wonValue = contracts
    .filter(c => c.status === 'won')
    .reduce((sum, c) => sum + (c.value ?? 0), 0)

  return (
    <div style={{ padding: '32px 40px', minHeight: '100vh' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.25)', marginBottom: 10, fontFamily: mono }}>BID PIPELINE</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.02em', margin: 0, fontFamily: sans }}>Pipeline</h1>
      </div>

      {/* Pipeline value strip */}
      {!loading && contracts.length > 0 && (
        <div style={{ display: 'flex', gap: 1, background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.08)', marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ background: '#fff', padding: '16px 24px', flex: '1 1 140px' }}>
            <div style={{ fontSize: 8, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.3)', fontFamily: mono }}>ACTIVE PIPELINE</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#0A0A0A', fontFamily: sans }}>{formatValue(activeValue)}</div>
          </div>
          <div style={{ background: '#fff', padding: '16px 24px', flex: '1 1 140px' }}>
            <div style={{ fontSize: 8, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.3)', fontFamily: mono }}>WON</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#16a34a', fontFamily: sans }}>{formatValue(wonValue)}</div>
          </div>
          {STAGES.map(s => {
            const n = contracts.filter(c => c.status === s.key).length
            return (
              <div key={s.key} style={{ background: '#fff', padding: '16px 24px', flex: '1 1 100px' }}>
                <div style={{ fontSize: 8, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.3)', fontFamily: mono }}>{s.label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: n > 0 ? s.color : 'rgba(0,0,0,0.15)', fontFamily: sans }}>{n}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Stage filter tabs */}
      {!loading && contracts.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {[{ key: 'all', label: 'ALL', color: '#0A0A0A' }, ...STAGES].map(s => (
            <button
              key={s.key}
              onClick={() => setFilter(s.key)}
              style={{
                padding: '6px 14px', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', fontFamily: mono,
                cursor: 'pointer',
                background: filter === s.key ? '#0A0A0A' : 'transparent',
                color: filter === s.key ? '#fff' : 'rgba(0,0,0,0.4)',
                border: `1px solid ${filter === s.key ? '#0A0A0A' : 'rgba(0,0,0,0.12)'}`,
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', paddingTop: 80, fontSize: 10, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.25)', fontFamily: mono }}>LOADING…</div>
      ) : contracts.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 80, textAlign: 'center', gap: 16 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.2)', fontFamily: mono }}>PIPELINE EMPTY</div>
          <div style={{ fontSize: 14, color: 'rgba(0,0,0,0.4)', fontFamily: sans, maxWidth: 340 }}>
            Save contracts from the dashboard to start tracking your bids from first look to award.
          </div>
          <Link href="/dashboard" style={{ marginTop: 8, padding: '10px 20px', background: '#C41230', color: '#ffffff', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none', fontFamily: mono }}>
            BROWSE CONTRACTS →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visible.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', fontSize: 11, color: 'rgba(0,0,0,0.3)', fontFamily: mono, letterSpacing: '0.08em' }}>
              NOTHING IN THIS STAGE
            </div>
          )}
          {visible.map((c) => {
            const stage = stageOf(c.status)
            return (
              <div key={c.id} style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderLeft: `3px solid ${stage.color}`, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                    {c.matchScore != null && (
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 8px', background: 'rgba(196,18,48,0.07)', color: '#C41230', border: '1px solid rgba(196,18,48,0.2)', fontFamily: mono }}>
                        {c.matchScore}% MATCH
                      </span>
                    )}
                    <span style={{ fontSize: 9, color: 'rgba(0,0,0,0.2)', letterSpacing: '0.06em', fontFamily: mono }}>SAVED {formatDate(c.createdAt).toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: sans, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)' }}>{c.agency}</span>
                    <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.5)', fontWeight: 600 }}>{formatValue(c.value)}</span>
                    {c.deadline && <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.25)' }}>Due {formatDate(c.deadline)}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                  <select
                    value={c.status}
                    onChange={(e) => handleStageChange(c.contractId, e.target.value)}
                    style={{ padding: '7px 10px', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', fontFamily: mono, color: stage.color, border: `1px solid ${stage.color}`, background: 'transparent', cursor: 'pointer' }}
                  >
                    {STAGES.map(s => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                  <Link href={`/contracts/${encodeURIComponent(c.contractId)}`} style={{ padding: '7px 14px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', background: '#C41230', color: '#ffffff', textDecoration: 'none', fontFamily: mono }}>
                    VIEW →
                  </Link>
                  <button
                    onClick={() => handleRemove(c.contractId)}
                    disabled={removing === c.contractId}
                    style={{ padding: '7px 12px', fontSize: 10, letterSpacing: '0.08em', border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', color: 'rgba(0,0,0,0.35)', cursor: removing === c.contractId ? 'not-allowed' : 'pointer', opacity: removing === c.contractId ? 0.5 : 1, fontFamily: mono }}
                  >
                    {removing === c.contractId ? '…' : 'REMOVE'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
