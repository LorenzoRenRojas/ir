// Opportunity Signals — the "capture analyst" layer.
//
// Our match score answers "does this fit me?". A seasoned capture manager also
// asks the two questions that decide whether to MOVE: is this real/forming yet
// (so I can shape it), and is now the moment (timing)? This module derives those
// signals from data we ALREADY capture on every contract — no new API calls, no
// SAM quota cost — and, per our rule, every signal carries a one-sentence,
// user-facing explanation. We never fabricate the human factors (relationship
// strength, solution differentiation); those stay the user's to own.
//
// Grounding (see docs/HANDBOOK.md → Opportunity Signals):
//  - Sources Sought / RFI / Presolicitation are the pre-RFP "shaping" window;
//    responding early can influence requirements and even trigger a set-aside.
//  - Federal spending concentrates hard at fiscal year-end (Sept 30): Jul–Sep is
//    ~33% of annual spending, September alone ~16%, and the final week runs ~5x a
//    normal week. A deadline in that window is disproportionately year-end money.

import type { Contract } from './sam-api'

export type SignalKind = 'early' | 'timing' | 'deadline'
export type SignalTone = 'act-now' | 'positive' | 'info'

export interface OpportunitySignal {
  kind: SignalKind
  tone: SignalTone
  label: string   // short badge text, e.g. "SHAPE IT"
  detail: string  // one-sentence explanation — our explainability rule
}

// Normalize the SAM notice type/description into a lowercased haystack.
function noticeText(c: Contract): string {
  return `${c.type ?? ''} ${c.typeDescription ?? ''}`.toLowerCase()
}

// REAL / FORMING — is this a pre-solicitation signal we can act on early?
// Returns the strongest single early signal, or null for a normal live solicitation.
export function earlySignal(c: Contract): OpportunitySignal | null {
  const t = noticeText(c)

  // Sources Sought (and RFIs, which often ride the same notice type) are the
  // highest-leverage moment: the requirement isn't locked, so a good response
  // can shape it — and strong small-business interest can get it set aside.
  if (t.includes('sources sought') || t.includes('request for information') || /\brfi\b/.test(t)) {
    return {
      kind: 'early',
      tone: 'positive',
      label: 'SHAPE IT',
      detail:
        'Pre-RFP Sources Sought / RFI — respond now to influence the requirements before they lock, and strong small-business interest can push it toward a set-aside.',
    }
  }

  // Presolicitation: the RFP is coming but hasn't dropped. Time to position.
  if (t.includes('presolicitation') || t.includes('pre-solicitation')) {
    return {
      kind: 'early',
      tone: 'positive',
      label: 'FORMING',
      detail: 'Presolicitation — the RFP is coming but not yet released. Position with the agency now, before competitors are watching.',
    }
  }

  // Special Notice: often industry days / pre-RFP information — worth a look early.
  if (t.includes('special notice')) {
    return {
      kind: 'early',
      tone: 'info',
      label: 'EARLY LOOK',
      detail: 'Special Notice — frequently an industry day or pre-RFP heads-up. An early read on what the agency is planning.',
    }
  }

  return null
}

// MOVE NOW — fiscal-calendar urgency. Federal FY ends Sept 30, and spending
// concentrates massively in that window. We key off the contract's OWN response
// deadline (stable for caching), not the wall clock, so the signal is about the
// opportunity, not when the page was rendered.
export function timingSignal(c: Contract, now: number = Date.now()): OpportunitySignal | null {
  const dl = new Date(c.responseDeadline)
  if (isNaN(dl.getTime())) return null

  // Only a live, near-term deadline can be a year-end signal. A deadline that
  // has already passed, or is more than ~13 months out, is not "act now" — its
  // September/August month is coincidental, not the fiscal-year-end surge.
  const days = (dl.getTime() - now) / 86_400_000
  if (days < 0 || days > 400) return null

  const month = dl.getUTCMonth() // 0=Jan … 8=Sep

  // September: the peak of the year-end obligation surge.
  if (month === 8) {
    return {
      kind: 'timing',
      tone: 'act-now',
      label: 'FY-END PUSH',
      detail: 'Deadline lands in the September year-end window, when agencies obligate ~16% of their annual spending to avoid returning funds.',
    }
  }
  // August: the surge is ramping — agencies are lining up what they must award.
  if (month === 7) {
    return {
      kind: 'timing',
      tone: 'positive',
      label: 'YEAR-END RAMP',
      detail: 'Deadline falls in August, the run-up to the Sept 30 fiscal year-end — agencies are racing to obligate remaining budget.',
    }
  }
  return null
}

// OPERATIONAL urgency — how close is the response deadline? Pure "move now".
export function deadlineSignal(c: Contract, now: number = Date.now()): OpportunitySignal | null {
  const dl = new Date(c.responseDeadline).getTime()
  if (isNaN(dl)) return null
  const days = Math.ceil((dl - now) / 86_400_000)
  if (days < 0) return null

  if (days <= 3) {
    return {
      kind: 'deadline',
      tone: 'act-now',
      label: days <= 1 ? 'DUE ≤24H' : `DUE IN ${days}D`,
      detail: `Response deadline is ${days <= 1 ? 'within a day' : `in ${days} days`} — this is a decide-and-move window, not a research one.`,
    }
  }
  if (days <= 7) {
    return {
      kind: 'deadline',
      tone: 'positive',
      label: `${days}D LEFT`,
      detail: `Response deadline is in ${days} days — enough time to bid if you decide now.`,
    }
  }
  return null
}

// The full signal set for a contract, strongest/most-actionable first, capped so
// a card never turns into a wall of badges. Order: hard deadline → early-shaping
// → year-end timing.
export function opportunitySignals(c: Contract, now: number = Date.now()): OpportunitySignal[] {
  const signals: OpportunitySignal[] = []
  const deadline = deadlineSignal(c, now)
  const early = earlySignal(c)
  const timing = timingSignal(c, now)

  if (deadline) signals.push(deadline)
  if (early) signals.push(early)
  if (timing) signals.push(timing)

  return signals.slice(0, 3)
}
