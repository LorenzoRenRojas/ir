import type { Contract } from './sam-api'
import type { BaseRate } from './base-rates'
import type { FirmEvidence, FitEvidence } from './firm-history'
import { evidenceFit } from './firm-history'

// EVIDENCE-BASED SCORING
//
// The rule this layer exists to enforce: no point may appear in a score
// without a stated reason and a source. A number nobody can defend is worse
// than no number, because a contractor will act on it.
//
// Three tiers of evidence, ranked by how much weight they deserve:
//
//   MEASURED   — counted from awards that actually happened (base rates,
//                this firm's own award history)
//   STRUCTURAL — a rule, not a guess: set-aside eligibility is binary and
//                published in the FAR
//   HEURISTIC  — reasoned, unvalidated. Currently most of the score. Labelled
//                as such rather than dressed up.
//
// Every component carries its tier, so both the UI and an eventual
// calibration report can distinguish what is known from what is assumed.
// As outcome data accumulates, components migrate from HEURISTIC to MEASURED
// and the score becomes progressively more defensible without a rewrite.

export type EvidenceTier = 'measured' | 'structural' | 'heuristic'

export interface ScoreComponent {
  factor: string
  points: number
  tier: EvidenceTier
  explanation: string
  /** How many real awards back this component, when it is measured. */
  sample?: number
}

export interface EvidenceScore {
  total: number
  components: ScoreComponent[]
  /** Share of the score backed by counted outcomes rather than assumption. */
  measuredShare: number
  /** Plain-language summary of what is and is not yet proven. */
  confidenceNote: string
  disqualified: boolean
}

const SET_ASIDE_ELIGIBILITY: Record<string, string[]> = {
  SBA: ['Small Business'], SBP: ['Small Business'],
  '8A': ['8(a) Certified'], '8AN': ['8(a) Certified'],
  SDVOSBC: ['SDVOSB'], SDVOSBS: ['SDVOSB'],
  WOSB: ['WOSB'], WOSBSS: ['WOSB'], EDWOSB: ['WOSB'],
  HUBZONE: ['HUBZone'], HZC: ['HUBZone'], HZS: ['HUBZone'],
}

const fmt = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${Math.round(n / 1000)}K`

/**
 * Score a contract for a firm, showing the work.
 *
 * `baseRate` and `firm` are optional: when either is absent the score falls
 * back to structural and heuristic components and says so, rather than
 * silently pretending the same confidence.
 */
export function scoreWithEvidence(
  contract: Contract,
  profile: { businessTypes: string[]; naicsCodes: string[] },
  baseRate: BaseRate | null,
  firm: FirmEvidence | null
): EvidenceScore {
  const components: ScoreComponent[] = []

  // ── STRUCTURAL: eligibility is a rule, not a prediction ─────────────────
  const required = SET_ASIDE_ELIGIBILITY[(contract.setAsideType || '').toUpperCase()]
  if (required) {
    const eligible = profile.businessTypes.some(bt => required.includes(bt))
    if (!eligible) {
      return {
        total: 0,
        components: [{
          factor: 'Set-aside eligibility',
          points: 0,
          tier: 'structural',
          explanation: `Reserved for ${contract.setAsideDescription}. You cannot bid this as prime — the restriction is in the solicitation, not an estimate.`,
        }],
        measuredShare: 1,
        confidenceNote: 'Disqualifying rule. No estimation involved.',
        disqualified: true,
      }
    }
    components.push({
      factor: 'Set-aside eligibility',
      points: 30,
      tier: 'structural',
      explanation: `Set aside for ${contract.setAsideDescription}, which you qualify for. The competitive field is limited to firms with the same status.`,
    })
  } else {
    components.push({
      factor: 'Open competition',
      points: 10,
      tier: 'structural',
      explanation: 'Full and open. Anyone may bid, including large primes, so the field is wider.',
    })
  }

  // ── MEASURED: this firm's own award history ─────────────────────────────
  const fit: FitEvidence = evidenceFit(firm, {
    naicsCode: contract.naicsCode,
    agency: contract.agency,
    value: contract.value ?? null,
  })

  if (fit.naicsMatch) {
    const pts = Math.min(25, 10 + fit.naicsMatch.won * 3)
    components.push({
      factor: 'Proven in this work',
      points: pts,
      tier: 'measured',
      sample: fit.naicsMatch.won,
      explanation: `You have won ${fit.naicsMatch.won} federal award${fit.naicsMatch.won === 1 ? '' : 's'} in this NAICS code, totalling ${fmt(fit.naicsMatch.value)}. Counted from public award records, not self-reported.`,
    })
  } else if (profile.naicsCodes.includes(contract.naicsCode)) {
    components.push({
      factor: 'NAICS alignment',
      points: 12,
      tier: 'heuristic',
      explanation: 'This code is on your profile, but no federal award history in it was found. Stated capability, not proven past performance.',
    })
  }

  if (fit.agencyMatch) {
    const pts = Math.min(15, 6 + fit.agencyMatch.won * 2)
    components.push({
      factor: 'Relationship with this buyer',
      points: pts,
      tier: 'measured',
      sample: fit.agencyMatch.won,
      explanation: `You have won ${fit.agencyMatch.won} award${fit.agencyMatch.won === 1 ? '' : 's'} from this agency. Incumbency and familiarity measurably raise win rates.`,
    })
  }

  if (fit.sizeFit !== 'unknown') {
    const pts = fit.sizeFit === 'within' ? 15 : fit.sizeFit === 'stretch' ? 6 : 0
    components.push({
      factor: 'Capacity to deliver',
      points: pts,
      tier: 'measured',
      explanation: fit.reasons.find(r => r.startsWith('At ')) ?? 'Judged against the largest award you have delivered.',
    })
  }

  // ── MEASURED where data allows: what actually happens in this market ────
  if (baseRate && baseRate.confident) {
    if (baseRate.smallBusinessShare !== null) {
      const share = baseRate.smallBusinessShare
      const pts = Math.round(share * 15)
      components.push({
        factor: 'Market openness to small business',
        points: pts,
        tier: 'measured',
        sample: baseRate.sample,
        explanation: `${Math.round(share * 100)}% of the ${baseRate.sample} awards we have recorded in ${baseRate.segment} went out under small-business set-asides.`,
      })
    }
    if (baseRate.awardVsEstimate !== null) {
      components.push({
        factor: 'Pricing signal',
        points: 0,
        tier: 'measured',
        sample: baseRate.sample,
        explanation: `Awards in ${baseRate.segment} land at a median of ${Math.round(baseRate.awardVsEstimate * 100)}% of the advertised value. Informational — it shapes your bid, not your odds.`,
      })
    }
  } else {
    components.push({
      factor: 'Market base rate',
      points: 0,
      tier: 'heuristic',
      explanation: baseRate
        ? `Only ${baseRate.sample} recorded outcome${baseRate.sample === 1 ? '' : 's'} in ${baseRate.segment} so far — too thin to score against. Accumulating.`
        : 'No outcome history recorded for this market yet. The collector builds this over time.',
    })
  }

  // ── HEURISTIC: competition proxy, honestly labelled ─────────────────────
  if (contract.incumbent) {
    const amt = contract.incumbent.amount
    const pts = amt < 2_000_000 ? 12 : amt < 20_000_000 ? 6 : 2
    components.push({
      factor: 'Incumbent strength',
      points: pts,
      tier: 'heuristic',
      explanation: `The largest recent award in this space went to ${contract.incumbent.awardee} at ${fmt(amt)}. Award size is a rough proxy for how entrenched the competition is — reasoned, not yet validated against outcomes.`,
    })
  } else {
    components.push({
      factor: 'No visible incumbent',
      points: 10,
      tier: 'heuristic',
      explanation: 'No dominant recent award found in this space, which usually means a fresh requirement. Inference, not measurement.',
    })
  }

  const total = Math.max(0, Math.min(100, components.reduce((s, c) => s + c.points, 0)))
  const measuredPoints = components.filter(c => c.tier === 'measured').reduce((s, c) => s + c.points, 0)
  const structuralPoints = components.filter(c => c.tier === 'structural').reduce((s, c) => s + c.points, 0)
  const measuredShare = total > 0 ? +((measuredPoints + structuralPoints) / total).toFixed(2) : 0

  const measuredCount = components.filter(c => c.tier === 'measured').length
  const confidenceNote =
    measuredCount === 0
      ? 'This score is currently reasoning, not measurement. Add your UEI and it will be scored against your real award history.'
      : measuredShare >= 0.6
      ? `${Math.round(measuredShare * 100)}% of this score comes from counted evidence: your award history and recorded market outcomes.`
      : `${Math.round(measuredShare * 100)}% of this score is evidence-backed. The rest is reasoned and marked as such below.`

  return { total, components, measuredShare, confidenceNote, disqualified: false }
}
