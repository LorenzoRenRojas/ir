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
  incumbent: IncumbentData | null | undefined
): WinProbabilityResult {
  let score = 0

  // ── 1. Set-aside eligibility (40 pts) ────────────────────────────────────
  const required = SET_ASIDE_ELIGIBILITY[contract.setAsideType]
  if (required) {
    const eligible = profile.businessTypes.some((bt) => required.includes(bt))
    if (!eligible) {
      return { score: 0, label: 'INELIGIBLE', topFactor: `Not eligible: ${contract.setAsideDescription}` }
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

  // ── 4. Incumbent signal (15 pts) ─────────────────────────────────────────
  if (!incumbent) {
    score += 12 // new requirement — no entrenched incumbent
  } else if (incumbent.amount < 2_000_000) {
    score += 15 // small incumbent, easier to compete
  } else if (incumbent.amount < 20_000_000) {
    score += 8
  } else {
    score += 2 // large prime holds it
  }

  // ── 5. Agency relationship (5 pts) ───────────────────────────────────────
  if (profile.agencyHistory?.some((a) =>
    contract.agency.toLowerCase().includes(a.toLowerCase()) ||
    a.toLowerCase().includes(contract.agency.toLowerCase())
  )) {
    score += 5
  }

  const clamped = Math.min(100, Math.max(0, score))

  // Top factor for display
  let topFactor: string
  if (!required) topFactor = 'Open competition'
  else if (score >= 70) topFactor = `Eligible set-aside + NAICS match`
  else if (profile.naicsCodes.includes(contract.naicsCode)) topFactor = 'Strong NAICS alignment'
  else if (!incumbent) topFactor = 'No incumbent — fresh competition'
  else topFactor = 'Open set-aside competition'

  return {
    score: clamped,
    label: clamped >= 65 ? 'HIGH' : clamped >= 35 ? 'MEDIUM' : 'LOW',
    topFactor,
  }
}
