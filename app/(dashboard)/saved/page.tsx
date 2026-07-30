'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import MetatronIcon from '@/components/MetatronIcon'
import MetatronLoader from '@/components/MetatronLoader'
import { PageHeader, StatStrip } from '@/components/layout/PageHeader'

interface SavedContract {
  id: string
  contractId: string
  samNoticeId: string | null
  user?: { name: string | null; email: string } | null
  title: string
  agency: string
  value: number | null
  deadline: string | null
  matchScore: number | null
  createdAt: string
  status: string
  notes: string | null
  scorecard: string | null
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

// ─── Bid/No-Bid scorecard ─────────────────────────────────────────────────────
// The capture-discipline tool APEX advisors teach: rate the pursuit on the six
// factors that decide wins BEFORE spending 40 hours writing. Weighted toward
// customer relationship and capability fit — the two that actually predict.
const BID_FACTORS = [
  { key: 'customer', label: 'CUSTOMER RELATIONSHIP', hint: 'Have you worked with or at least talked to this buyer?', w: 3 },
  { key: 'fit', label: 'CAPABILITY FIT', hint: 'Core work for you — not a stretch?', w: 3 },
  { key: 'pastPerf', label: 'PAST PERFORMANCE', hint: 'Two or three similar, referenceable projects?', w: 2 },
  { key: 'competition', label: 'COMPETITIVE FIELD', hint: 'Beatable incumbent, or a set-aside lane you hold?', w: 2 },
  { key: 'resources', label: 'CAPACITY TO RESPOND', hint: 'Team and hours to write a real response by the deadline?', w: 2 },
  { key: 'price', label: 'PRICE POSITION', hint: 'Competitive without buying the job?', w: 2 },
] as const
const BID_MAX = BID_FACTORS.reduce((s, f) => s + f.w * 2, 0)
const RATING_LABELS = ['WEAK', 'OK', 'STRONG'] as const

function parseScorecard(s: string | null): Record<string, number> {
  if (!s) return {}
  try {
    const v = JSON.parse(s)
    return v && typeof v === 'object' ? (v as Record<string, number>) : {}
  } catch {
    return {}
  }
}

function BidScorecard({ ratings, onRate }: { ratings: Record<string, number>; onRate: (factor: string, val: number) => void }) {
  const ratedCount = BID_FACTORS.filter(f => typeof ratings[f.key] === 'number').length
  const total = BID_FACTORS.reduce((s, f) => s + (ratings[f.key] ?? 0) * f.w, 0)
  const pct = Math.round((total / BID_MAX) * 100)
  const complete = ratedCount === BID_FACTORS.length
  const verdict = !complete
    ? { label: `${ratedCount}/${BID_FACTORS.length} RATED`, color: 'rgba(0,0,0,0.35)', bg: 'rgba(0,0,0,0.03)', note: 'Rate every factor for a verdict.' }
    : pct >= 70
      ? { label: `GO — ${pct}`, color: '#16a34a', bg: 'rgba(22,163,74,0.07)', note: 'Strong position. Commit and write to win.' }
      : pct >= 45
        ? { label: `REVIEW — ${pct}`, color: '#b45309', bg: 'rgba(180,83,9,0.07)', note: 'Winnable with a plan — shore up the weak factors before committing.' }
        : { label: `NO-BID — ${pct}`, color: crimson, bg: 'rgba(196,18,48,0.06)', note: 'Your hours are your scarcest asset. Spend them on a better-positioned pursuit.' }

  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.3)', fontFamily: mono, marginBottom: 12 }}>
        BID / NO-BID SCORECARD <span style={{ color: 'rgba(0,0,0,0.2)', fontWeight: 400 }}>· AUTOSAVES</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
        {BID_FACTORS.map(f => (
          <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 220px', minWidth: 200 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#0A0A0A', fontFamily: mono }}>{f.label} <span style={{ color: 'rgba(0,0,0,0.25)', fontWeight: 400 }}>×{f.w}</span></div>
              <div style={{ fontSize: 10.5, color: 'rgba(0,0,0,0.35)', fontFamily: sans, marginTop: 1 }}>{f.hint}</div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {RATING_LABELS.map((lbl, val) => {
                const active = ratings[f.key] === val
                const activeColor = val === 2 ? '#16a34a' : val === 1 ? '#b45309' : crimson
                return (
                  <button
                    key={lbl}
                    onClick={() => onRate(f.key, val)}
                    style={{
                      padding: '5px 10px', fontSize: 8.5, fontWeight: 700, letterSpacing: '0.08em', fontFamily: mono, cursor: 'pointer',
                      background: active ? activeColor : 'transparent',
                      color: active ? '#fff' : 'rgba(0,0,0,0.35)',
                      border: `1px solid ${active ? activeColor : 'rgba(0,0,0,0.12)'}`,
                    }}
                  >
                    {lbl}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '10px 14px', background: verdict.bg, border: `1px solid ${verdict.color}33`, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: verdict.color, fontFamily: mono }}>{verdict.label}</span>
        <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', fontFamily: sans, lineHeight: 1.5 }}>{verdict.note}</span>
      </div>
    </div>
  )
}

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
  const { data: session } = useSession()
  const [contracts, setContracts] = useState<SavedContract[]>([])
  const [proposals, setProposals] = useState<Proposal[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [panelMsg, setPanelMsg] = useState<Record<string, string>>({})
  // One debounce timer PER contract — a single shared timer meant editing
  // contract A then clicking into B within 800ms cancelled A's save forever
  const notesTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  // Notes typed but not yet persisted, so unmount can flush them
  const pendingNotes = useRef<Record<string, string>>({})

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

  function handleScorecardRate(contractId: string, factor: string, val: number) {
    let nextRatings: Record<string, number> = {}
    setContracts(cs => cs.map(c => {
      if (c.contractId !== contractId) return c
      nextRatings = { ...parseScorecard(c.scorecard), [factor]: val }
      return { ...c, scorecard: JSON.stringify(nextRatings) }
    }))
    patchSaved(contractId, { scorecard: nextRatings })
  }

  function handleNotesChange(contractId: string, notes: string) {
    setContracts(cs => cs.map(c => (c.contractId === contractId ? { ...c, notes } : c)))
    pendingNotes.current[contractId] = notes
    if (notesTimers.current[contractId]) clearTimeout(notesTimers.current[contractId])
    notesTimers.current[contractId] = setTimeout(() => {
      patchSaved(contractId, { notes })
      delete pendingNotes.current[contractId]
    }, 800)
  }

  // Flush any pending note saves on unmount so navigating away within the
  // debounce window doesn't lose the last edit
  useEffect(() => {
    const timers = notesTimers.current
    const pending = pendingNotes.current
    return () => {
      Object.values(timers).forEach(clearTimeout)
      for (const [contractId, notes] of Object.entries(pending)) {
        patchSaved(contractId, { notes })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleDownloadPdf(p: Proposal) {
    const res = await fetch(`/api/documents/${p.id}`)
    const data = await res.json()
    if (!data.content) return
    const filename = `${p.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`
    const { downloadHtmlAsPdf, downloadTextAsPdf } = await import('@/lib/pdf')
    // New documents are HTML; older ones may be plain text.
    if (/^\s*</.test(data.content)) await downloadHtmlAsPdf(p.title, data.content, filename)
    else await downloadTextAsPdf(p.title, data.content, filename)
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

  const visible = filter === 'all' ? contracts : contracts.filter(c => c.status === filter)
  const activeContracts = contracts.filter(c => ['saved', 'pursuing', 'submitted'].includes(c.status))
  const activeValue = activeContracts.reduce((s, c) => s + (c.value ?? 0), 0)
  const wonValue = contracts.filter(c => c.status === 'won').reduce((s, c) => s + (c.value ?? 0), 0)

  return (
    <div style={{ padding: '30px 40px 48px', minHeight: '100vh' }}>
      <PageHeader
        kicker="BID PIPELINE — YOUR PURSUIT WORKSPACE"
        title="Pipeline"
        subtitle="Track every pursuit from first look to award, with live value and deadlines."
        right={<Link href="/documents" style={btn}>DOC SUITE →</Link>}
      />

      {/* Pipeline readout */}
      {!loading && contracts.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <StatStrip items={[
            { label: 'ACTIVE PIPELINE', value: activeValue ? formatValue(activeValue) : '$0' },
            { label: 'WON', value: wonValue ? formatValue(wonValue) : '$0', accent: 'green' },
            { label: 'ACTIVE BIDS', value: String(activeContracts.length), accent: 'muted' },
            { label: 'TOTAL TRACKED', value: String(contracts.length), accent: 'muted' },
          ]} />
        </div>
      )}

      {/* Stage filter tabs — each carries its own count */}
      {!loading && contracts.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {[{ key: 'all', label: 'ALL', color: '#0A0A0A' }, ...STAGES].map(s => {
            const n = s.key === 'all' ? contracts.length : contracts.filter(c => c.status === s.key).length
            const on = filter === s.key
            return (
              <button
                key={s.key}
                onClick={() => setFilter(s.key)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  padding: '7px 14px', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', fontFamily: mono, cursor: 'pointer', borderRadius: 8,
                  background: on ? '#0A0A0A' : '#FFFFFF',
                  color: on ? '#fff' : 'rgba(0,0,0,0.45)',
                  border: `1px solid ${on ? '#0A0A0A' : 'rgba(0,0,0,0.12)'}`,
                  transition: 'all 0.15s ease',
                }}
              >
                {s.label}
                <span style={{ fontSize: 9, fontWeight: 700, color: on ? 'rgba(255,255,255,0.55)' : (n > 0 ? s.color : 'rgba(0,0,0,0.25)') }}>{n}</span>
              </button>
            )
          })}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
          <MetatronLoader size={140} label="LOADING PIPELINE…" />
        </div>
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
              <div key={c.id} style={{ background: '#FFFFFF', border: `1px solid ${isOpen ? 'rgba(196,18,48,0.3)' : 'rgba(0,0,0,0.08)'}`, borderLeft: `3px solid ${stage.color}`, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.03)', transition: 'border-color 0.2s ease' }}>
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
                      {c.user && session?.user?.email && c.user.email !== session.user.email && (
                        <span style={{ fontSize: 9, letterSpacing: '0.08em', color: '#b45309', fontFamily: mono, border: '1px solid rgba(180,83,9,0.25)', padding: '2px 7px' }}>
                          BY {(c.user.name ?? c.user.email).split(' ')[0].toUpperCase()}
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
                    {/* Delivery — send an existing draft to the officer.
                        Document GENERATION lives in the Doc Suite; the pipeline
                        is for pursuing and delivering. */}
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.3)', fontFamily: mono, marginBottom: 12 }}>DELIVERY</div>
                      {proposals === null ? (
                        <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.3)', fontFamily: mono }}>LOADING…</div>
                      ) : cProposals.length === 0 ? (
                        <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', fontFamily: sans, margin: '0 0 12px', lineHeight: 1.6 }}>
                          No documents for this contract yet. <Link href="/documents" style={{ color: crimson, textDecoration: 'none', fontWeight: 600 }}>Generate one in the Doc Suite →</Link>
                        </p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                          {cProposals.map(p => (
                            <div key={p.id} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', padding: '10px 12px' }}>
                              <div style={{ fontSize: 11.5, fontWeight: 600, color: '#0A0A0A', fontFamily: sans, marginBottom: 6 }}>{p.title}</div>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                <button onClick={() => handleDownloadPdf(p)} style={{ ...btn, padding: '5px 10px', fontSize: 8 }}>↓ PDF</button>
                                {c.samNoticeId && (
                                  <button onClick={() => handleSendToOfficer(c, p)} style={{ ...btn, padding: '5px 10px', fontSize: 8, borderColor: 'rgba(196,18,48,0.35)', color: crimson }}>SEND TO PO →</button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {msg && (
                        <div style={{ marginTop: 10, fontSize: 10, fontFamily: mono, color: msg.endsWith('✓') ? '#16a34a' : crimson }}>{msg}</div>
                      )}
                    </div>

                    {/* Bid/No-Bid scorecard */}
                    <BidScorecard
                      ratings={parseScorecard(c.scorecard)}
                      onRate={(factor, val) => handleScorecardRate(c.contractId, factor, val)}
                    />

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
                        {c.contractId.startsWith('recompete-') ? (
                          <div style={{ padding: '10px 12px', border: '1px dashed rgba(180,83,9,0.4)', fontSize: 10, lineHeight: 1.6, color: '#b45309', fontFamily: sans }}>
                            <strong style={{ fontFamily: mono, letterSpacing: '0.08em' }}>◎ PRE-RFP PURSUIT</strong> — this came from Recompete Radar.
                            The solicitation doesn&apos;t exist yet; when it posts to SAM.gov, save the live notice and it gains full match analysis.
                          </div>
                        ) : (
                          <Link href={`/contracts/${encodeURIComponent(c.contractId)}`} style={{ ...btn, justifyContent: 'center' }}>
                            <MetatronIcon size={11} /> MATCH ANALYSIS + DETAILS
                          </Link>
                        )}
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
