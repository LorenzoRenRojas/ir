'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

interface SavedContract {
  id: string
  contractId: string
  samNoticeId: string | null
  title: string
  agency: string
  value: number | null
  deadline: string | null
  matchScore: number | null
  createdAt: string
  status: string
  notes: string | null
}

interface Proposal {
  id: string
  type: string
  title: string
  contractTitle: string | null
  agencyName: string | null
  noticeId: string | null
  createdAt: string
}

const mono = 'var(--font-geist-mono, monospace)'
const sans = 'var(--font-geist-sans, sans-serif)'
const crimson = '#C41230'

const STAGES = [
  { key: 'saved',     label: 'SAVED',     color: '#64748b' },
  { key: 'pursuing',  label: 'PURSUING',  color: '#b45309' },
  { key: 'submitted', label: 'SUBMITTED', color: crimson },
  { key: 'won',       label: 'WON',       color: '#16a34a' },
  { key: 'lost',      label: 'LOST',      color: 'rgba(0,0,0,0.25)' },
] as const

function stageOf(status: string) {
  return STAGES.find(s => s.key === status) ?? STAGES[0]
}

function formatValue(v: number | null): string {
  if (!v) return 'Not posted'
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

function daysLeft(d: string | null): number | null {
  if (!d) return null
  const diff = new Date(d).getTime() - Date.now()
  return Math.ceil(diff / 86_400_000)
}

const btn: React.CSSProperties = {
  padding: '8px 14px', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
  border: '1px solid rgba(0,0,0,0.12)', background: 'transparent',
  color: 'rgba(0,0,0,0.55)', cursor: 'pointer', fontFamily: mono, textDecoration: 'none',
  display: 'inline-flex', alignItems: 'center', gap: 6,
}
const btnPrimary: React.CSSProperties = { ...btn, background: crimson, color: '#fff', border: 'none' }

export default function PipelinePage() {
  const [contracts, setContracts] = useState<SavedContract[]>([])
  const [proposals, setProposals] = useState<Proposal[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [drafting, setDrafting] = useState<string | null>(null)
  const [panelMsg, setPanelMsg] = useState<Record<string, string>>({})
  const [capGenerating, setCapGenerating] = useState(false)
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  async function loadProposals() {
    try {
      const res = await fetch('/api/documents/generate')
      const data = await res.json()
      setProposals(data.documents ?? [])
    } catch {
      setProposals([])
    }
  }

  useEffect(() => { loadSaved() }, [])

  function toggleExpand(contractId: string) {
    const next = expanded === contractId ? null : contractId
    setExpanded(next)
    if (next && proposals === null) loadProposals()
  }

  function proposalsFor(c: SavedContract): Proposal[] {
    if (!proposals) return []
    return proposals.filter(p =>
      (c.samNoticeId && p.noticeId === c.samNoticeId) ||
      (p.contractTitle && p.contractTitle === c.title)
    )
  }

  async function handleRemove(contractId: string) {
    setRemoving(contractId)
    try {
      const res = await fetch(`/api/contracts/saved?contractId=${encodeURIComponent(contractId)}`, { method: 'DELETE' })
      if (res.ok) setContracts(prev => prev.filter(c => c.contractId !== contractId))
    } finally {
      setRemoving(null)
    }
  }

  async function patchSaved(contractId: string, body: Record<string, unknown>) {
    const res = await fetch('/api/contracts/saved', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contractId, ...body }),
    })
    return res.ok
  }

  function handleStageChange(contractId: string, status: string) {
    const prev = contracts
    setContracts(cs => cs.map(c => (c.contractId === contractId ? { ...c, status } : c)))
    patchSaved(contractId, { status }).then(ok => { if (!ok) setContracts(prev) })
  }

  function handleNotesChange(contractId: string, notes: string) {
    setContracts(cs => cs.map(c => (c.contractId === contractId ? { ...c, notes } : c)))
    if (notesTimer.current) clearTimeout(notesTimer.current)
    notesTimer.current = setTimeout(() => { patchSaved(contractId, { notes }) }, 800)
  }

  async function handleQuickDraft(c: SavedContract) {
    setDrafting(c.contractId)
    setPanelMsg(m => ({ ...m, [c.contractId]: '' }))
    try {
      const res = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractTitle: c.title,
          agencyName: c.agency,
          responseDeadline: c.deadline ?? undefined,
          estimatedValue: c.value ? `$${c.value.toLocaleString()}` : undefined,
          noticeId: c.samNoticeId ?? undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPanelMsg(m => ({ ...m, [c.contractId]: data.error ?? 'Draft failed.' }))
        return
      }
      setPanelMsg(m => ({ ...m, [c.contractId]: 'Draft created ✓' }))
      loadProposals()
    } catch {
      setPanelMsg(m => ({ ...m, [c.contractId]: 'Network error.' }))
    } finally {
      setDrafting(null)
    }
  }

  async function handleDownloadProposal(p: Proposal) {
    const res = await fetch(`/api/documents/${p.id}`)
    const data = await res.json()
    if (!data.content) return
    const blob = new Blob([data.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${p.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleSendToOfficer(c: SavedContract, p: Proposal) {
    setPanelMsg(m => ({ ...m, [c.contractId]: '' }))
    try {
      const preview = await fetch('/api/proposals/send-to-officer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: p.id, dryRun: true }),
      })
      const pd = await preview.json()
      if (!preview.ok) {
        setPanelMsg(m => ({ ...m, [c.contractId]: pd.error ?? 'No contracting officer found.' }))
        return
      }
      const ok = window.confirm(`Send "${p.title}" to the government point of contact?\n\n${pd.contact.name}\n${pd.contact.email}\n\nReplies go to your email. This cannot be undone.`)
      if (!ok) return
      const res = await fetch('/api/proposals/send-to-officer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: p.id }),
      })
      const data = await res.json()
      setPanelMsg(m => ({ ...m, [c.contractId]: res.ok ? `Sent to ${data.to} ✓` : (data.error ?? 'Send failed.') }))
    } catch {
      setPanelMsg(m => ({ ...m, [c.contractId]: 'Network error.' }))
    }
  }

  async function handleCapabilityStatement() {
    setCapGenerating(true)
    try {
      const res = await fetch('/api/documents/capability-statement', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { alert(data.error ?? 'Generation failed'); return }
      const blob = new Blob([data.content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'capability-statement.txt'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setCapGenerating(false)
    }
  }

  const visible = filter === 'all' ? contracts : contracts.filter(c => c.status === filter)
  const activeValue = contracts.filter(c => ['saved', 'pursuing', 'submitted'].includes(c.status)).reduce((s, c) => s + (c.value ?? 0), 0)
  const wonValue = contracts.filter(c => c.status === 'won').reduce((s, c) => s + (c.value ?? 0), 0)

  return (
    <div style={{ padding: '32px 40px', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.25)', marginBottom: 10, fontFamily: mono }}>BID PIPELINE — YOUR PURSUIT WORKSPACE</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.02em', margin: 0, fontFamily: sans }}>Pipeline</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={handleCapabilityStatement} disabled={capGenerating} style={btn}>
            {capGenerating ? 'GENERATING…' : '⚡ CAPABILITY STATEMENT'}
          </button>
          <Link href="/documents" style={btn}>☰ ALL PROPOSALS</Link>
          <Link href="/proposals/new" style={btnPrimary}>+ FULL QUESTIONNAIRE →</Link>
        </div>
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
                padding: '6px 14px', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', fontFamily: mono, cursor: 'pointer',
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
            Save contracts from the dashboard — then run the whole pursuit from here: drafts, notes, and delivery.
          </div>
          <Link href="/dashboard" style={{ ...btnPrimary, padding: '10px 20px', fontSize: 10 }}>BROWSE CONTRACTS →</Link>
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
            const isOpen = expanded === c.contractId
            const dLeft = daysLeft(c.deadline)
            const cProposals = proposalsFor(c)
            const msg = panelMsg[c.contractId]
            return (
              <div key={c.id} style={{ background: '#FFFFFF', border: `1px solid ${isOpen ? 'rgba(196,18,48,0.3)' : 'rgba(0,0,0,0.08)'}`, borderLeft: `3px solid ${stage.color}`, transition: 'border-color 0.2s ease' }}>
                {/* Row header — click to open the workspace */}
                <div
                  onClick={() => toggleExpand(c.contractId)}
                  style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', cursor: 'pointer' }}
                >
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                      {c.matchScore != null && (
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 8px', background: 'rgba(196,18,48,0.07)', color: crimson, border: '1px solid rgba(196,18,48,0.2)', fontFamily: mono }}>
                          {c.matchScore}% MATCH
                        </span>
                      )}
                      {dLeft !== null && dLeft >= 0 && (
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 7px', fontFamily: mono, color: dLeft <= 3 ? crimson : dLeft <= 7 ? '#b45309' : 'rgba(0,0,0,0.3)', border: `1px solid ${dLeft <= 3 ? 'rgba(196,18,48,0.25)' : 'rgba(0,0,0,0.1)'}` }}>
                          {dLeft === 0 ? 'DUE TODAY' : `${dLeft}D LEFT`}
                        </span>
                      )}
                      {cProposals.length > 0 && (
                        <span style={{ fontSize: 9, letterSpacing: '0.08em', color: 'rgba(0,0,0,0.35)', fontFamily: mono }}>
                          ☰ {cProposals.length} DRAFT{cProposals.length > 1 ? 'S' : ''}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: sans }}>{c.title}</div>
                    <div style={{ display: 'flex', gap: 16, marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)' }}>{c.agency}</span>
                      <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.5)', fontWeight: 600 }}>{formatValue(c.value)}</span>
                      {c.deadline && <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.25)' }}>Due {formatDate(c.deadline)}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                    <select
                      value={c.status}
                      onChange={(e) => handleStageChange(c.contractId, e.target.value)}
                      style={{ padding: '7px 10px', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', fontFamily: mono, color: stage.color, border: `1px solid ${stage.color}`, background: 'transparent', cursor: 'pointer' }}
                    >
                      {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                    <button onClick={() => toggleExpand(c.contractId)} style={{ ...btn, borderColor: isOpen ? crimson : 'rgba(0,0,0,0.12)', color: isOpen ? crimson : 'rgba(0,0,0,0.55)' }}>
                      {isOpen ? '▴ CLOSE' : '▾ WORKSPACE'}
                    </button>
                  </div>
                </div>

                {/* The pursuit workspace */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, background: '#FAFAF9' }}>
                    {/* Drafts */}
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.3)', fontFamily: mono, marginBottom: 12 }}>PROPOSAL DRAFTS</div>
                      {proposals === null ? (
                        <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.3)', fontFamily: mono }}>LOADING…</div>
                      ) : cProposals.length === 0 ? (
                        <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', fontFamily: sans, margin: '0 0 12px', lineHeight: 1.6 }}>
                          No drafts yet for this contract.
                        </p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                          {cProposals.map(p => (
                            <div key={p.id} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', padding: '10px 12px' }}>
                              <div style={{ fontSize: 11.5, fontWeight: 600, color: '#0A0A0A', fontFamily: sans, marginBottom: 6 }}>{p.title}</div>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                <button onClick={() => handleDownloadProposal(p)} style={{ ...btn, padding: '5px 10px', fontSize: 8 }}>↓ DOWNLOAD</button>
                                {c.samNoticeId && (
                                  <button onClick={() => handleSendToOfficer(c, p)} style={{ ...btn, padding: '5px 10px', fontSize: 8, borderColor: 'rgba(196,18,48,0.35)', color: crimson }}>SEND TO PO →</button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={() => handleQuickDraft(c)} disabled={drafting === c.contractId} style={btnPrimary}>
                          {drafting === c.contractId ? 'DRAFTING…' : '⚡ QUICK DRAFT'}
                        </button>
                        <Link href="/proposals/new" style={btn}>FULL QUESTIONNAIRE →</Link>
                      </div>
                      {msg && (
                        <div style={{ marginTop: 10, fontSize: 10, fontFamily: mono, color: msg.endsWith('✓') ? '#16a34a' : crimson }}>{msg}</div>
                      )}
                    </div>

                    {/* Notes */}
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.3)', fontFamily: mono, marginBottom: 12 }}>
                        PURSUIT NOTES <span style={{ color: 'rgba(0,0,0,0.2)', fontWeight: 400 }}>· AUTOSAVES</span>
                      </div>
                      <textarea
                        value={c.notes ?? ''}
                        onChange={e => handleNotesChange(c.contractId, e.target.value)}
                        placeholder="CO conversations, teaming ideas, questions for the site visit, pricing thoughts…"
                        style={{ width: '100%', minHeight: 120, padding: 12, fontSize: 12, fontFamily: sans, lineHeight: 1.6, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', color: '#0A0A0A', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>

                    {/* Contract actions */}
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.3)', fontFamily: mono, marginBottom: 12 }}>CONTRACT</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <Link href={`/contracts/${encodeURIComponent(c.contractId)}`} style={{ ...btn, justifyContent: 'center' }}>
                          ◈ MATCH ANALYSIS + DETAILS
                        </Link>
                        {c.samNoticeId && (
                          <a href={`https://sam.gov/opp/${c.samNoticeId}`} target="_blank" rel="noopener noreferrer" style={{ ...btn, justifyContent: 'center' }}>
                            ↗ OFFICIAL NOTICE ON SAM.GOV
                          </a>
                        )}
                        <button
                          onClick={() => handleRemove(c.contractId)}
                          disabled={removing === c.contractId}
                          style={{ ...btn, justifyContent: 'center', color: 'rgba(0,0,0,0.35)' }}
                        >
                          {removing === c.contractId ? '…' : '✕ REMOVE FROM PIPELINE'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
