'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { PageHeader } from '@/components/layout/PageHeader'

const mono = 'var(--font-geist-mono, monospace)'
const sans = 'var(--font-geist-sans, sans-serif)'
const crimson = '#C41230'

// In-app playbook — the tactical, do-this-now checklist. Different in kind from
// the public /how-to-win page (which sells the strategy): this one reflects the
// user's real state, links straight into each feature, and is written like a
// coach standing over your shoulder. Beginner-first, but useful to anyone.

interface StepState { onboardingDone: boolean; savedCount: number; docCount: number }

type Step = {
  id: string
  title: string
  do: string
  href: string
  cta: string
  // Auto-complete when the app state proves it's done; otherwise the user ticks it.
  auto?: (s: StepState) => boolean
}

const STEPS: Step[] = [
  { id: 'profile', title: 'Complete your company profile', do: 'Add your NAICS codes, certifications, and capability statement. This is the yardstick every contract is scored against — nothing works well without it.', href: '/settings', cta: 'OPEN PROFILE', auto: (s) => s.onboardingDone },
  { id: 'find', title: 'Find your first winnable match', do: 'Open your feed, turn on “Contracts I can prime,” and read the top match’s breakdown — see exactly why it scored.', href: '/dashboard', cta: 'OPEN FEED' },
  { id: 'save', title: 'Save one to your pipeline', do: 'Save a contract that looks winnable. That starts your pipeline, unlocks deadline alerts, and teaches the matcher what you like.', href: '/dashboard', cta: 'GO SAVE ONE', auto: (s) => s.savedCount > 0 },
  { id: 'radar', title: 'Scan the Recompete Radar', do: 'Find a contract in your space expiring in 6–18 months and note the incumbent. That’s your pipeline before the RFP exists — start the relationship now.', href: '/recompetes', cta: 'OPEN RADAR' },
  { id: 'decide', title: 'Run a bid / no-bid', do: 'On a saved contract, weigh the win probability and incumbent, then fill the scorecard. Only spend real hours on work you can actually win.', href: '/saved', cta: 'OPEN PIPELINE' },
  { id: 'docs', title: 'Generate your capability statement', do: 'One click in the Doc Suite. Every contracting officer asks for one — have it ready before you need it.', href: '/documents', cta: 'OPEN DOC SUITE', auto: (s) => s.docCount > 0 },
  { id: 'notify', title: 'Turn on your alerts', do: 'Switch on the daily match digest and deadline reminders so a winnable contract never slips past a due date.', href: '/settings', cta: 'OPEN SETTINGS' },
]

// ─── Capture Command — the analyst read on your live pipeline ──────────────────
// Everything here is computed from real pipeline data (stage, deadline, match,
// and the same bid/no-bid scorecard the deal carries). No AI, no invented
// numbers — a deterministic capture read in a top analyst's language.

interface Pursuit {
  id: string
  contractId: string
  title: string
  agency: string
  value: number | null
  deadline: string | null
  matchScore: number | null
  status: string
  scorecard: string | null
}

// Mirrors the pipeline scorecard exactly (0=weak,1=ok,2=strong, weighted).
const BID_FACTORS = [
  { key: 'customer', w: 3 }, { key: 'fit', w: 3 }, { key: 'pastPerf', w: 2 },
  { key: 'competition', w: 2 }, { key: 'resources', w: 2 }, { key: 'price', w: 2 },
] as const
const BID_MAX = BID_FACTORS.reduce((s, f) => s + f.w * 2, 0)

function bidGate(scorecard: string | null): { complete: boolean; rated: number; pct: number | null; verdict: string; tone: 'do' | 'watch' | 'stop' } {
  let r: Record<string, number> = {}
  try { if (scorecard) r = JSON.parse(scorecard) as Record<string, number> } catch { /* malformed */ }
  const rated = BID_FACTORS.filter(f => typeof r[f.key] === 'number').length
  const complete = rated === BID_FACTORS.length
  if (!complete) return { complete, rated, pct: null, verdict: `GATE ${rated}/${BID_FACTORS.length}`, tone: 'watch' }
  const pct = Math.round((BID_FACTORS.reduce((s, f) => s + (r[f.key] ?? 0) * f.w, 0) / BID_MAX) * 100)
  if (pct >= 70) return { complete, rated, pct, verdict: `GO · ${pct}`, tone: 'do' }
  if (pct >= 45) return { complete, rated, pct, verdict: `REVIEW · ${pct}`, tone: 'watch' }
  return { complete, rated, pct, verdict: `NO-BID · ${pct}`, tone: 'stop' }
}

const CAPTURE_PHASE: Record<string, { phase: string; move: string }> = {
  saved:     { phase: 'QUALIFICATION',    move: 'Run the bid/no-bid gate before you commit B&P hours — score customer intimacy, capability fit, and the competitive field. Clear the gate, then advance it to capture.' },
  pursuing:  { phase: 'CAPTURE PLANNING', move: 'You’re in active capture. Lock your win themes and discriminators, decide prime vs. teaming from the market concentration, and shape the customer before the solicitation drops — draft early, don’t wait for the RFP.' },
  submitted: { phase: 'AWAITING AWARD',   move: 'Proposal is in. Stand by for evaluation notices or a request for a Final Proposal Revision (FPR), and log the outcome so your win-rate model sharpens.' },
  won:       { phase: 'AWARDED',          move: 'Transition to performance and secure a strong CPARS past-performance reference — it compounds your probability of win on every future bid in this NAICS.' },
  lost:      { phase: 'DEBRIEF',          move: 'Request a formal debrief. The evaluators’ strengths and weaknesses are the single highest-value input to your next capture.' },
}
const ACTIVE_STATUSES = ['saved', 'pursuing', 'submitted']
const STAGE_WEIGHT: Record<string, number> = { saved: 0.15, pursuing: 0.35, submitted: 0.5 }

function daysUntil(d: string | null): number | null {
  if (!d) return null
  const t = new Date(d).getTime()
  return isNaN(t) ? null : Math.ceil((t - Date.now()) / 86_400_000)
}
function money(v: number | null): string {
  if (!v) return '—'
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`
  return `$${Math.round(v)}`
}
const TONE_COLOR = { do: '#16a34a', watch: '#b45309', stop: crimson, info: 'rgba(0,0,0,0.4)' } as const

function CaptureCommand({ pursuits, loaded }: { pursuits: Pursuit[]; loaded: boolean }) {
  const [memo, setMemo] = useState<{ html: string; mode: string } | null>(null)
  const [memoLoading, setMemoLoading] = useState(false)
  const [memoError, setMemoError] = useState(false)

  async function generateMemo() {
    setMemoLoading(true); setMemoError(false)
    try {
      const r = await fetch('/api/playbook/memo', { method: 'POST' })
      const d = await r.json()
      if (r.ok && d.memo) setMemo({ html: d.memo, mode: d.mode })
      else setMemoError(true)
    } catch { setMemoError(true) } finally { setMemoLoading(false) }
  }

  const active = pursuits.filter(p => ACTIVE_STATUSES.includes(p.status))

  // Don't flash the empty state before the pipeline has loaded.
  if (!loaded) return null

  // Visible empty state — so the feature is discoverable even with no pursuits.
  if (active.length === 0) {
    return (
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.16em', color: crimson, fontFamily: mono, marginBottom: 12, fontWeight: 700 }}>◆ CAPTURE COMMAND · YOUR LIVE PIPELINE</div>
        <div style={{ background: '#fff', border: '1px dashed rgba(0,0,0,0.16)', borderRadius: 12, padding: '22px 24px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: sans, marginBottom: 6 }}>Your capture read appears here once you have a live pursuit.</div>
          <p style={{ fontSize: 12.5, color: 'rgba(0,0,0,0.5)', fontFamily: sans, lineHeight: 1.6, margin: '0 0 14px' }}>Save a contract to your pipeline and IR gives you the analyst view — portfolio metrics, a bid/no-bid verdict, and the next capture move on every deal, plus a one-click capture memo.</p>
          <Link href="/dashboard" style={{ display: 'inline-block', padding: '7px 14px', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', fontFamily: mono, color: crimson, border: '1px solid rgba(196,18,48,0.35)', borderRadius: 8, textDecoration: 'none' }}>FIND A CONTRACT TO SAVE →</Link>
        </div>
      </div>
    )
  }

  const totalValue = active.reduce((s, p) => s + (p.value ?? 0), 0)
  const weighted = active.reduce((s, p) => s + (p.value ?? 0) * (STAGE_WEIGHT[p.status] ?? 0.2), 0)
  const matches = active.map(p => p.matchScore).filter((m): m is number => typeof m === 'number')
  const avgMatch = matches.length ? Math.round(matches.reduce((a, b) => a + b, 0) / matches.length) : null
  const closing14 = active.filter(p => { const d = daysUntil(p.deadline); return d !== null && d >= 0 && d <= 14 }).length
  const gatesRun = active.filter(p => bidGate(p.scorecard).complete).length

  // Urgency-first: soonest deadline leads, undated deals last.
  const ordered = [...active].sort((a, b) => {
    const da = daysUntil(a.deadline), db = daysUntil(b.deadline)
    if (da === null) return 1
    if (db === null) return -1
    return da - db
  })

  const chip = (label: string, value: string, accent?: string) => (
    <div style={{ background: '#fff', padding: '12px 16px' }}>
      <div style={{ fontSize: 8, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.3)', fontFamily: mono }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 800, color: accent ?? '#0A0A0A', fontFamily: sans, marginTop: 2 }}>{value}</div>
    </div>
  )

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 10, letterSpacing: '0.16em', color: crimson, fontFamily: mono, marginBottom: 12, fontWeight: 700 }}>◆ CAPTURE COMMAND · YOUR LIVE PIPELINE</div>

      {/* Portfolio read */}
      <div style={{ background: '#0A0A0A', borderRadius: 12, padding: '20px 22px', marginBottom: 14 }}>
        <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>PORTFOLIO READ</div>
        <p style={{ fontFamily: sans, fontSize: 14.5, color: '#fff', lineHeight: 1.65, margin: 0 }}>
          You’re carrying <strong>{active.length} active pursuit{active.length === 1 ? '' : 's'}</strong> worth <strong style={{ color: '#fff' }}>{money(totalValue)}</strong> (<span style={{ color: crimson }}>{money(weighted)}</span> probability-weighted by stage).{' '}
          {closing14 > 0
            ? <><strong style={{ color: '#fff' }}>{closing14}</strong> {closing14 === 1 ? 'has' : 'have'} a response deadline inside two weeks — those lead your effort. </>
            : <>No response deadlines inside two weeks. </>}
          <strong style={{ color: '#fff' }}>{gatesRun}/{active.length}</strong> {gatesRun === active.length ? 'pursuits have cleared a bid/no-bid gate — disciplined.' : 'have cleared a bid/no-bid gate; score the rest before you sink proposal hours into them.'}
        </p>
      </div>

      {/* Metric strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 1, background: 'rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
        {chip('ACTIVE PURSUITS', String(active.length))}
        {chip('PIPELINE VALUE', money(totalValue))}
        {chip('WEIGHTED', money(weighted), crimson)}
        {chip('AVG MATCH', avgMatch === null ? '—' : `${avgMatch}%`, avgMatch !== null && avgMatch >= 70 ? '#16a34a' : undefined)}
        {chip('DUE ≤14D', String(closing14), closing14 > 0 ? crimson : undefined)}
        {chip('GATES RUN', `${gatesRun}/${active.length}`)}
      </div>

      {/* Per-deal capture reads */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {ordered.map(p => {
          const phase = CAPTURE_PHASE[p.status] ?? { phase: p.status.toUpperCase(), move: '' }
          const gate = bidGate(p.scorecard)
          const days = daysUntil(p.deadline)
          const urgent = days !== null && days >= 0 && days <= 7
          const gateColor = TONE_COLOR[gate.tone]
          return (
            <Link key={p.id} href={`/saved?focus=${encodeURIComponent(p.contractId)}`} className="deal-card" style={{ display: 'block', textDecoration: 'none', color: 'inherit', cursor: 'pointer', background: '#fff', border: `1px solid ${urgent ? 'rgba(196,18,48,0.3)' : 'rgba(0,0,0,0.08)'}`, borderLeft: `3px solid ${gateColor}`, borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.12em', color: crimson, fontFamily: mono, border: '1px solid rgba(196,18,48,0.25)', padding: '2px 7px', borderRadius: 4 }}>{phase.phase}</span>
                <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em', color: '#fff', background: gateColor, fontFamily: mono, padding: '3px 7px', borderRadius: 4 }}>{gate.verdict}</span>
                {days !== null && days >= 0 && (
                  <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.08em', color: urgent ? crimson : 'rgba(0,0,0,0.4)', fontFamily: mono }}>DUE IN {days}D</span>
                )}
                {typeof p.matchScore === 'number' && (
                  <span style={{ fontSize: 8.5, letterSpacing: '0.08em', color: 'rgba(0,0,0,0.35)', fontFamily: mono, marginLeft: 'auto' }}>MATCH {p.matchScore}% · {money(p.value)}</span>
                )}
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0A0A0A', fontFamily: sans, lineHeight: 1.45, marginBottom: 4, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.title}</div>
              <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', fontFamily: sans, marginBottom: 10 }}>{p.agency}</div>
              <p style={{ fontSize: 12.5, color: 'rgba(0,0,0,0.6)', fontFamily: sans, lineHeight: 1.65, margin: 0 }}>
                <span style={{ color: gateColor, fontWeight: 700 }}>Next move — </span>
                {!gate.complete && p.status === 'saved'
                  ? phase.move
                  : gate.tone === 'stop'
                    ? `The gate scored this a no-bid (${gate.pct}). Your hours are your scarcest asset — reallocate to a better-positioned pursuit unless something off-the-record changes the odds.`
                    : phase.move}
              </p>
              <span style={{ display: 'inline-block', marginTop: 10, padding: '6px 12px', fontSize: 8.5, fontWeight: 700, letterSpacing: '0.08em', fontFamily: mono, color: crimson, border: '1px solid rgba(196,18,48,0.3)', borderRadius: 8 }}>
                {gate.complete ? 'OPEN DEAL →' : 'RUN THE GATE →'}
              </span>
            </Link>
          )
        })}
      </div>

      {/* Analyst capture memo — deterministic today, AI-written once credits are added */}
      <div style={{ marginTop: 16 }}>
        {!memo && (
          <button onClick={generateMemo} disabled={memoLoading} style={{ padding: '10px 18px', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', fontFamily: mono, cursor: memoLoading ? 'default' : 'pointer', background: '#0A0A0A', color: '#fff', border: 'none', borderRadius: 8 }}>
            {memoLoading ? 'WRITING THE MEMO…' : '✎ GENERATE CAPTURE MEMO'}
          </button>
        )}
        {memoError && <div style={{ marginTop: 10, fontSize: 12, color: crimson, fontFamily: sans }}>Couldn’t generate the memo — try again.</div>}
        {memo && (
          <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 12, padding: '4px 24px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16 }}>
              <span style={{ fontSize: 9, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.35)', fontFamily: mono, fontWeight: 700 }}>CAPTURE MEMO</span>
              <span style={{ fontSize: 8, letterSpacing: '0.1em', fontFamily: mono, fontWeight: 700, padding: '3px 8px', borderRadius: 4, color: memo.mode === 'ai' ? '#16a34a' : 'rgba(0,0,0,0.4)', border: `1px solid ${memo.mode === 'ai' ? 'rgba(22,163,74,0.3)' : 'rgba(0,0,0,0.15)'}` }}>{memo.mode === 'ai' ? 'AI-WRITTEN' : 'TEMPLATE'}</span>
            </div>
            <div className="capture-memo" dangerouslySetInnerHTML={{ __html: memo.html }} />
            <button onClick={generateMemo} disabled={memoLoading} style={{ marginTop: 6, padding: '6px 12px', fontSize: 8.5, fontWeight: 700, letterSpacing: '0.08em', fontFamily: mono, cursor: 'pointer', background: 'transparent', color: 'rgba(0,0,0,0.45)', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8 }}>{memoLoading ? 'REGENERATING…' : '↻ REGENERATE'}</button>
          </div>
        )}
        <style>{`
          .capture-memo { font-family: var(--font-geist-sans, sans-serif); color: rgba(0,0,0,0.75); }
          .capture-memo h2 { font-size: 17px; font-weight: 800; color: #0A0A0A; letter-spacing: -0.01em; margin: 14px 0 8px; }
          .capture-memo h3 { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${crimson}; margin: 16px 0 6px; }
          .capture-memo p { font-size: 13px; line-height: 1.7; margin: 0 0 10px; }
          .capture-memo ul, .capture-memo ol { margin: 0 0 10px; padding-left: 18px; }
          .capture-memo li { font-size: 12.5px; line-height: 1.6; margin-bottom: 6px; }
          .capture-memo strong { color: #0A0A0A; font-weight: 600; }
          .capture-memo em { color: rgba(0,0,0,0.45); }
          .deal-card { transition: box-shadow 0.2s ease, transform 0.2s ease; }
          .deal-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.08); transform: translateY(-1px); }
        `}</style>
      </div>
    </div>
  )
}

const LS_KEY = 'ir-playbook-done'

export default function PlaybookPage() {
  const { data: session } = useSession()
  const [state, setState] = useState<StepState>({ onboardingDone: false, savedCount: 0, docCount: 0 })
  const [manual, setManual] = useState<Set<string>>(new Set())
  const [pursuits, setPursuits] = useState<Pursuit[]>([])
  const [pursuitsLoaded, setPursuitsLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) setManual(new Set(JSON.parse(raw)))
    } catch { /* private mode */ }
  }, [])

  useEffect(() => {
    setState((s) => ({ ...s, onboardingDone: !!session?.user?.onboardingDone }))
  }, [session])

  useEffect(() => {
    Promise.all([
      fetch('/api/contracts/saved').then((r) => r.json()).catch(() => ({})),
      fetch('/api/documents/generate').then((r) => r.json()).catch(() => ({})),
    ]).then(([saved, docs]) => {
      setPursuits(saved.saved ?? [])
      setPursuitsLoaded(true)
      setState((s) => ({
        ...s,
        savedCount: (saved.saved ?? []).length,
        docCount: (docs.documents ?? []).length,
      }))
    })
  }, [])

  function isDone(step: Step): boolean {
    if (step.auto && step.auto(state)) return true
    return manual.has(step.id)
  }
  function toggle(id: string) {
    setManual((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      try { localStorage.setItem(LS_KEY, JSON.stringify([...next])) } catch { /* ignore */ }
      return next
    })
  }

  const doneCount = STEPS.filter(isDone).length
  const pct = Math.round((doneCount / STEPS.length) * 100)
  const allDone = doneCount === STEPS.length

  return (
    <div style={{ padding: '30px 40px 48px', minHeight: '100vh', maxWidth: 820 }}>
      <PageHeader
        kicker="YOUR PLAYBOOK"
        title={allDone ? 'You’re running the full play.' : 'Your first win, step by step.'}
        subtitle="Seven moves that take you from a cold profile to a submitted bid. Do them in order — each one links straight to where it happens."
      />

      <CaptureCommand pursuits={pursuits} loaded={pursuitsLoaded} />

      {/* Progress */}
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.03)', padding: '18px 22px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.4)' }}>{allDone ? 'PLAY COMPLETE ✓' : `${doneCount} OF ${STEPS.length} DONE`}</span>
          <span style={{ fontFamily: sans, fontSize: 22, fontWeight: 800, color: allDone ? '#16a34a' : crimson, letterSpacing: '-0.02em' }}>{pct}%</span>
        </div>
        <div style={{ height: 6, background: 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: allDone ? '#16a34a' : crimson, borderRadius: 3, transition: 'width 0.5s cubic-bezier(0.22,1,0.36,1)' }} />
        </div>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {STEPS.map((step, i) => {
          const done = isDone(step)
          const autoDone = !!(step.auto && step.auto(state))
          return (
            <div key={step.id} style={{ background: '#fff', border: `1px solid ${done ? 'rgba(22,163,74,0.3)' : 'rgba(0,0,0,0.08)'}`, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.03)', padding: '18px 20px', display: 'flex', gap: 16, alignItems: 'flex-start', transition: 'border-color 0.2s ease' }}>
              {/* Check */}
              <button
                onClick={() => !autoDone && toggle(step.id)}
                title={autoDone ? 'Completed automatically' : done ? 'Mark not done' : 'Mark done'}
                style={{ flexShrink: 0, width: 26, height: 26, borderRadius: '50%', border: done ? 'none' : '2px solid rgba(0,0,0,0.15)', background: done ? (autoDone ? '#16a34a' : '#16a34a') : 'transparent', color: '#fff', cursor: autoDone ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, marginTop: 2 }}
              >
                {done ? '✓' : ''}
              </button>
              {/* Body */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: mono, fontSize: 10, color: 'rgba(0,0,0,0.25)', letterSpacing: '0.1em' }}>{String(i + 1).padStart(2, '0')}</span>
                  <span style={{ fontFamily: sans, fontSize: 15, fontWeight: 700, color: done ? 'rgba(0,0,0,0.4)' : '#0A0A0A', textDecoration: done ? 'line-through' : 'none' }}>{step.title}</span>
                  {autoDone && <span style={{ fontFamily: mono, fontSize: 8, letterSpacing: '0.1em', color: '#16a34a', border: '1px solid rgba(22,163,74,0.3)', padding: '2px 6px', borderRadius: 4 }}>DONE</span>}
                </div>
                <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.5)', margin: '0 0 12px', fontFamily: sans, lineHeight: 1.6 }}>{step.do}</p>
                <Link href={step.href} style={{ display: 'inline-block', padding: '7px 14px', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', fontFamily: mono, color: done ? 'rgba(0,0,0,0.4)' : crimson, border: `1px solid ${done ? 'rgba(0,0,0,0.12)' : 'rgba(196,18,48,0.35)'}`, borderRadius: 8, textDecoration: 'none' }}>
                  {step.cta} →
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {allDone && (
        <div style={{ marginTop: 20, background: '#0A0A0A', borderRadius: 12, padding: '24px 26px', textAlign: 'center' }}>
          <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.16em', color: '#4ADE80', marginBottom: 10 }}>THE MACHINE IS RUNNING ✓</div>
          <div style={{ fontFamily: sans, fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 6 }}>You’re positioned. Now keep the pipeline full.</div>
          <div style={{ fontFamily: sans, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>Check the feed daily, work the Radar weekly, and every recompete you track becomes next year’s win.</div>
        </div>
      )}
    </div>
  )
}
