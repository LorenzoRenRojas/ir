import type { Contract } from './sam-api'
import type { IncumbentData } from './usaspending'

interface Profile {
  businessTypes: string[]
  naicsCodes: string[]
  certifications: string[]
  contractVehicles: string[]
  annualRevenue?: string | null
  agencyHistory?: string[]
}

export interface WinProbabilityResult {
  score: number        // 0-100
  label: 'HIGH' | 'MEDIUM' | 'LOW' | 'INELIGIBLE'
  topFactor: string    // single most important reason
  // The capture manager's bid/no-bid gate, in their own language. Grounded in
  // the standard PWin thresholds (<40% walk away, >70% full pursuit). Our score
  // is a heuristic, not a literal probability, so the verdict is framed as a
  // pursuit recommendation, never as a promised win percentage.
  verdict: 'PURSUE' | 'CONDITIONAL' | 'LONG SHOT' | 'INELIGIBLE'
  verdictDetail: string
}

// Map the heuristic score onto the capture manager's decision gate.
function verdictFor(score: number): { verdict: WinProbabilityResult['verdict']; verdictDetail: string } {
  if (score >= 70) {
    return {
      verdict: 'PURSUE',
      verdictDetail: 'Strong position on the factors we can measure — this is where capture teams commit full effort. Your relationships and pricing decide the rest.',
    }
  }
  if (score >= 40) {
    return {
      verdict: 'CONDITIONAL',
      verdictDetail: 'Winnable, but not a lock — worth investing to strengthen your position (team up, engage the agency early) before you commit real proposal hours.',
    }
  }
  return {
    verdict: 'LONG SHOT',
    verdictDetail: 'Steep odds against the field on the measurable factors — bid only if it’s strategic or you have an edge we can’t see from the data.',
  }
}

const REVENUE_CEILINGS: Record<string, number> = {
  'Under $500K':      500_000,
  '$500K – $1M':    1_000_000,
  '$1M – $5M':      5_000_000,
  '$5M – $25M':    25_000_000,
  '$25M – $100M': 100_000_000,
  '$100M+':        Infinity,
}

const SET_ASIDE_ELIGIBILITY: Record<string, string[]> = {
  'SBA':      ['Small Business'],
  'SBP':      ['Small Business'], // partial small-business set-aside
  '8A':       ['8(a) Certified'],
  '8AN':      ['8(a) Certified'], // 8(a) sole source
  'SDVOSBC':  ['SDVOSB'],
  'SDVOSBS':  ['SDVOSB'], // sole source
  'WOSB':     ['WOSB'],
  'WOSBSS':   ['WOSB'], // sole source
  'EDWOSB':   ['WOSB'],
  'HUBZONE':  ['HUBZone'],
  'HZC':      ['HUBZone'],
  'HZS':      ['HUBZone'], // sole source
}

export function calculateWinProbability(
  contract: Contract,
  profile: Profile,
  incumbent: IncumbentData | null | undefined,
  // Fraction of recent awards in this NAICS won by small businesses
  // (fetchSmallBizShares) — null/omitted degrades to incumbent-size only
  smallBizShare?: number | null
): WinProbabilityResult {
  let score = 0

  // ── 1. Set-aside eligibility (40 pts) ────────────────────────────────────
  const required = SET_ASIDE_ELIGIBILITY[contract.setAsideType]
  if (required) {
    const eligible = profile.businessTypes.some((bt) => required.includes(bt))
    if (!eligible) {
      return {
        score: 0,
        label: 'INELIGIBLE',
        topFactor: `Not eligible: ${contract.setAsideDescription}`,
        verdict: 'INELIGIBLE',
        verdictDetail: `This is set aside for ${contract.setAsideDescription} — you can’t prime it. Team as a subcontractor, or skip.`,
      }
    }
    score += 40
  } else {
    // Open competition — anyone can bid, but harder to win
    score += 15
  }

  // ── 2. NAICS match (20 pts) ───────────────────────────────────────────────
  if (contract.naicsCode && profile.naicsCodes.includes(contract.naicsCode)) {
    score += 20
  } else if (contract.naicsCode) {
    // Partial match on 4-digit prefix (empty code must NOT award points —
    // startsWith('') is true for everything)
    const prefix = contract.naicsCode.slice(0, 4)
    if (profile.naicsCodes.some((n) => n.startsWith(prefix))) {
      score += 10
    }
  }

  // ── 3. Contract size vs revenue (20 pts) ─────────────────────────────────
  if (profile.annualRevenue && contract.value) {
    const ceiling = REVENUE_CEILINGS[profile.annualRevenue]
    if (ceiling) {
      const maxBid = ceiling * 2 // rule of thumb: can bid up to 2x annual revenue
      if (contract.value <= maxBid) score += 20
      else if (contract.value <= maxBid * 4) score += 8
      // else 0 — contract too large
    }
  } else {
    score += 10 // no data, neutral
  }

  // ── 4. Competition signal (15 pts) ───────────────────────────────────────
  // Who wins in this market: the top player's award size, blended with the
  // share of recent awards actually won by small businesses. A market where
  // small shops win 60% of awards is beatable even if one big award exists.
  let compPts: number
  if (!incumbent) {
    compPts = 12 // new requirement — no entrenched player
  } else if (incumbent.amount < 2_000_000) {
    compPts = 15 // small players, easier to compete
  } else if (incumbent.amount < 20_000_000) {
    compPts = 8
  } else {
    compPts = 2 // large prime dominates
  }
  if (typeof smallBizShare === 'number') {
    compPts = Math.round(0.5 * compPts + 0.5 * (smallBizShare * 15))
  }
  score += compPts

  // ── 5. Agency relationship (5 pts) ───────────────────────────────────────
  if (profile.agencyHistory?.some((a) =>
    contract.agency.toLowerCase().includes(a.toLowerCase()) ||
    a.toLowerCase().includes(contract.agency.toLowerCase())
  )) {
    score += 5
  }

  const clamped = Math.min(100, Math.max(0, score))

  // Top factor for display — a strong small-business win share is the most
  // actionable message we can show, so it outranks the generic labels
  let topFactor: string
  if (typeof smallBizShare === 'number' && smallBizShare >= 0.4) {
    topFactor = `Small businesses win ${Math.round(smallBizShare * 100)}% of this market`
  } else if (!required) topFactor = 'Open competition'
  else if (score >= 70) topFactor = `Eligible set-aside + NAICS match`
  else if (profile.naicsCodes.includes(contract.naicsCode)) topFactor = 'Strong NAICS alignment'
  else if (!incumbent) topFactor = 'No incumbent — fresh competition'
  else topFactor = 'Open set-aside competition'

  return {
    score: clamped,
    label: clamped >= 65 ? 'HIGH' : clamped >= 35 ? 'MEDIUM' : 'LOW',
    topFactor,
    ...verdictFor(clamped),
  }
}
