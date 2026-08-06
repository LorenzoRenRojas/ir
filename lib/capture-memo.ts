// ─── Capture memo engine ──────────────────────────────────────────────────────
// A portfolio-level analyst memo over the user's live pipeline. Two backends,
// same contract as the proposal engine:
//
//   • TEMPLATE (live today) — a deterministic memo assembled from real pipeline
//     metrics. Useful on its own, invents nothing.
//   • AI (activates when ANTHROPIC_API_KEY + credits exist) — Claude elevates
//     the same metrics into a senior-capture-manager narrative, STRICTLY grounded
//     in the numbers it's given. Turning it on is one env var + funding.
//
// The AI path is deliberately fact-constrained: the model rewrites and reasons
// over the provided metrics but may not introduce contract details, companies,
// or numbers that aren't in the input — same honesty rule as the rest of IR.

export interface PursuitSummary {
  title: string
  agency: string
  value: number | null
  deadlineDays: number | null
  matchScore: number | null
  status: string
  phase: string
  gateVerdict: string
  gatePct: number | null
}

export interface PortfolioSummary {
  activeCount: number
  totalValue: number
  weightedValue: number
  avgMatch: number | null
  closing14: number
  gatesRun: number
  pursuits: PursuitSummary[]
}

export type MemoMode = 'ai' | 'template'
export interface MemoResult { memo: string; mode: MemoMode }

// ─── Shared pipeline math (server-side twin of the playbook page's logic) ──────
const BID_FACTORS = [
  { key: 'customer', w: 3 }, { key: 'fit', w: 3 }, { key: 'pastPerf', w: 2 },
  { key: 'competition', w: 2 }, { key: 'resources', w: 2 }, { key: 'price', w: 2 },
] as const
const BID_MAX = BID_FACTORS.reduce((s, f) => s + f.w * 2, 0)
const CAPTURE_PHASE: Record<string, string> = {
  saved: 'Qualification', pursuing: 'Capture Planning', submitted: 'Awaiting Award',
  won: 'Awarded', lost: 'Debrief',
}
const ACTIVE_STATUSES = ['saved', 'pursuing', 'submitted']
const STAGE_WEIGHT: Record<string, number> = { saved: 0.15, pursuing: 0.35, submitted: 0.5 }

interface RawSaved {
  title: string; agency: string; value: number | null
  deadline: Date | string | null; matchScore: number | null
  status: string; scorecard: string | null
}

function gateFor(scorecard: string | null): { verdict: string; pct: number | null } {
  let r: Record<string, number> = {}
  try { if (scorecard) r = JSON.parse(scorecard) as Record<string, number> } catch { /* malformed */ }
  const rated = BID_FACTORS.filter(f => typeof r[f.key] === 'number').length
  if (rated < BID_FACTORS.length) return { verdict: `Gate pending (${rated}/${BID_FACTORS.length})`, pct: null }
  const pct = Math.round((BID_FACTORS.reduce((s, f) => s + (r[f.key] ?? 0) * f.w, 0) / BID_MAX) * 100)
  return { verdict: pct >= 70 ? 'GO' : pct >= 45 ? 'REVIEW' : 'NO-BID', pct }
}

function daysUntil(d: Date | string | null): number | null {
  if (!d) return null
  const t = new Date(d).getTime()
  return isNaN(t) ? null : Math.ceil((t - Date.now()) / 86_400_000)
}

// Build the portfolio summary the memo is written from — the single source of
// truth so template and AI backends reason over identical numbers.
export function computePortfolio(rows: RawSaved[]): PortfolioSummary {
  const active = rows.filter(r => ACTIVE_STATUSES.includes(r.status))
  const totalValue = active.reduce((s, r) => s + (r.value ?? 0), 0)
  const weightedValue = active.reduce((s, r) => s + (r.value ?? 0) * (STAGE_WEIGHT[r.status] ?? 0.2), 0)
  const matches = active.map(r => r.matchScore).filter((m): m is number => typeof m === 'number')
  const avgMatch = matches.length ? Math.round(matches.reduce((a, b) => a + b, 0) / matches.length) : null
  const closing14 = active.filter(r => { const d = daysUntil(r.deadline); return d !== null && d >= 0 && d <= 14 }).length
  const gatesRun = active.filter(r => gateFor(r.scorecard).pct !== null).length

  const pursuits: PursuitSummary[] = active
    .map(r => {
      const g = gateFor(r.scorecard)
      return {
        title: r.title, agency: r.agency, value: r.value,
        deadlineDays: daysUntil(r.deadline), matchScore: r.matchScore,
        status: r.status, phase: CAPTURE_PHASE[r.status] ?? r.status,
        gateVerdict: g.verdict, gatePct: g.pct,
      }
    })
    .sort((a, b) => {
      if (a.deadlineDays === null) return 1
      if (b.deadlineDays === null) return -1
      return a.deadlineDays - b.deadlineDays
    })

  return { activeCount: active.length, totalValue, weightedValue, avgMatch, closing14, gatesRun, pursuits }
}

function money(v: number | null): string {
  if (!v) return 'undisclosed value'
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`
  return `$${Math.round(v)}`
}
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// ─── Template backend ─────────────────────────────────────────────────────────
function buildTemplateMemo(p: PortfolioSummary): string {
  const priorities = p.pursuits.slice(0, 6).map(d => {
    const due = d.deadlineDays === null ? 'no set deadline' : d.deadlineDays <= 0 ? 'deadline passed' : `due in ${d.deadlineDays} day${d.deadlineDays === 1 ? '' : 's'}`
    const rec = d.gateVerdict === 'NO-BID'
      ? 'gate returns no-bid — reallocate B&P hours unless the customer picture changes'
      : d.gateVerdict.startsWith('Gate pending')
        ? 'run the bid/no-bid gate before committing proposal hours'
        : d.phase === 'Awaiting Award'
          ? 'submitted — prepare for evaluation notices / FPR and log the outcome'
          : d.phase === 'Capture Planning'
            ? 'lock win themes and prime/teaming posture; draft early'
            : 'clear the gate, then advance to capture'
    return `<li><strong>${esc(d.title)}</strong> — ${esc(d.agency)} · ${money(d.value)} · ${esc(d.phase)} · ${esc(d.gateVerdict)} · ${due}. Recommendation: ${esc(rec)}.</li>`
  }).join('')

  return [
    '<h2>Capture portfolio memo</h2>',
    `<p>The portfolio holds <strong>${p.activeCount} active pursuit${p.activeCount === 1 ? '' : 's'}</strong> with a combined ceiling of <strong>${money(p.totalValue)}</strong>, or <strong>${money(p.weightedValue)}</strong> on a stage-weighted basis. Average profile match across active pursuits is ${p.avgMatch === null ? 'not yet scored' : p.avgMatch + '%'}. ${p.closing14} pursuit${p.closing14 === 1 ? ' carries' : 's carry'} a response deadline inside two weeks. ${p.gatesRun} of ${p.activeCount} have cleared a formal bid/no-bid gate.</p>`,
    `<p><strong>Assessment.</strong> ${p.gatesRun < p.activeCount ? 'Bid/no-bid discipline is incomplete — the unscored pursuits are consuming attention without a go/no-go decision. Run those gates first.' : 'Bid/no-bid discipline is in place across the portfolio.'} ${p.closing14 > 0 ? 'Near-term deadlines should sequence the work; treat everything inside two weeks as the priority tier.' : 'With no imminent deadlines, this is a capture-planning window — invest in customer shaping and win-theme development.'}</p>`,
    '<h3>Priorities, by urgency</h3>',
    `<ul>${priorities}</ul>`,
    '<p><em>Prepared from live pipeline data. Figures reflect what is recorded in the pipeline; relationship strength and pricing remain the capture lead’s judgment.</em></p>',
  ].join('')
}

// ─── AI backend ───────────────────────────────────────────────────────────────
async function enhanceMemoWithClaude(p: PortfolioSummary, templateMemo: string): Promise<string> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic()

  const system = [
    'You are a senior capture manager at a federal contractor, writing a concise portfolio capture memo for a small-business owner.',
    'You are given a JSON summary of their live pipeline and a deterministic template memo assembled from it.',
    'Rewrite it into a sharp, professional capture memo in the voice of a top analyst. Rules:',
    '- Use ONLY the facts, names, numbers, phases, and gate verdicts provided. Never invent contracts, companies, dollar figures, competitors, or deadlines.',
    '- Reason like a capture professional: prioritization, bid/no-bid discipline, win themes, teaming vs. prime, past performance, B&P resource allocation, FPR, debriefs.',
    '- Be direct and specific to these pursuits — no generic filler.',
    '- Return a valid HTML fragment using only these tags: <h2> <h3> <p> <ul> <ol> <li> <strong> <em>. No <html>, <head>, <body>, <style>, tables, inline styles, or Markdown code fences.',
    '- Do not fabricate a probability of win as a percentage; speak to relative positioning only.',
  ].join('\n')

  const user = [
    'PIPELINE SUMMARY (JSON):',
    JSON.stringify(p),
    '',
    'Deterministic template memo to elevate (preserve every fact):',
    '',
    templateMemo,
  ].join('\n')

  const stream = client.messages.stream({
    model: 'claude-opus-4-8',
    max_tokens: 4000,
    system,
    messages: [{ role: 'user', content: user }],
  })
  const message = await stream.finalMessage()
  const text = message.content.map((b) => (b.type === 'text' ? b.text : '')).join('\n').trim()
  if (!text) throw new Error('Claude returned empty memo')
  return text
}

export function isCaptureMemoAiConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}

// Generate the memo. Always returns usable content: AI when configured, funded,
// and successful; the template memo in every other case. Never throws.
export async function generateCaptureMemo(summary: PortfolioSummary): Promise<MemoResult> {
  const template = buildTemplateMemo(summary)
  if (!isCaptureMemoAiConfigured()) return { memo: template, mode: 'template' }

  const { tryConsumeAiDraft, releaseAiDraft } = await import('./ai-budget')
  if (!(await tryConsumeAiDraft())) return { memo: template, mode: 'template' }

  try {
    const ai = await enhanceMemoWithClaude(summary, template)
    return { memo: ai, mode: 'ai' }
  } catch (err) {
    console.error('AI capture memo failed, falling back to template:', err)
    await releaseAiDraft()
    return { memo: template, mode: 'template' }
  }
}
