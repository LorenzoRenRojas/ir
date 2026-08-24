import { prisma } from './prisma'

// MARKET BASE RATES
//
// The bridge between raw outcomes and a score anyone can defend. Every number
// here is an aggregate over awards that actually happened, and every number
// carries the count it was computed from — so a claim can always be traced to
// its evidence, and a thin segment can be reported as thin rather than
// dressed up as a finding.
//
// Deliberately no machine learning. At this layer the honest answer is
// arithmetic over ground truth: "of 412 awards in this segment, here is what
// happened." A model can refine the ranking later; it cannot make a base rate
// more true.

// Below this, a segment is a rumour rather than a rate.
const MIN_SAMPLE = 8
// Statistical matches are useful in aggregate but too loose to quote as fact.
const QUOTABLE_CONFIDENCE = 55

export interface BaseRate {
  segment: string          // human-readable description of what was measured
  sample: number           // how many real awards this is computed from
  confident: boolean       // sample large enough to state plainly?
  medianAward: number | null
  awardVsEstimate: number | null // median ratio of award to advertised value
  medianDaysToAward: number | null
  smallBusinessShare: number | null // fraction of awards under a small set-aside
}

interface OutcomeRow {
  estimatedValue: number | null
  awardAmount: number | null
  deadline: Date | null
  awardDate: Date | null
  setAside: string
}

const SMALL_BIZ_SET_ASIDES = new Set([
  'SBA', 'SBP', '8A', '8AN', 'SDVOSBC', 'SDVOSBS', 'WOSB', 'WOSBSS',
  'EDWOSB', 'EDWOSBSS', 'HZC', 'HZS', 'VSA', 'VSS',
])

function median(nums: number[]): number | null {
  if (nums.length === 0) return null
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function summarize(segment: string, rows: OutcomeRow[]): BaseRate {
  const amounts = rows.map(r => r.awardAmount).filter((n): n is number => n !== null && n > 0)

  const ratios = rows
    .filter(r => r.estimatedValue && r.estimatedValue > 0 && r.awardAmount && r.awardAmount > 0)
    .map(r => r.awardAmount! / r.estimatedValue!)
    // Drop absurd ratios: those are mismatches or IDIQ ceilings, not pricing signal
    .filter(r => r > 0.05 && r < 20)

  const days = rows
    .filter(r => r.deadline && r.awardDate)
    .map(r => Math.round((r.awardDate!.getTime() - r.deadline!.getTime()) / 86_400_000))
    .filter(d => d >= 0 && d < 900)

  const setAsideCount = rows.filter(r => SMALL_BIZ_SET_ASIDES.has((r.setAside || '').toUpperCase())).length

  const ratioMedian = median(ratios)

  return {
    segment,
    sample: rows.length,
    confident: rows.length >= MIN_SAMPLE,
    medianAward: median(amounts),
    awardVsEstimate: ratioMedian !== null ? +ratioMedian.toFixed(3) : null,
    medianDaysToAward: median(days),
    smallBusinessShare: rows.length > 0 ? +(setAsideCount / rows.length).toFixed(3) : null,
  }
}

/**
 * Base rates for the market a contract sits in.
 *
 * Widens the segment definition until there is enough evidence to say
 * something: NAICS + agency first, then NAICS alone, then the 4-digit NAICS
 * family. The returned `segment` states exactly which one answered, so the UI
 * never implies more precision than the data supports.
 */
export async function segmentBaseRate(
  naicsCode: string,
  agency: string
): Promise<BaseRate | null> {
  if (!naicsCode) return null

  const select = {
    estimatedValue: true, awardAmount: true, deadline: true, awardDate: true, setAside: true,
  } as const
  const confident = { matchConfidence: { gte: QUOTABLE_CONFIDENCE } }

  try {
    // Narrowest: this NAICS at this agency.
    if (agency) {
      const rows = await prisma.contractOutcome.findMany({
        where: { naicsCode, agency: { contains: agency.split(' ')[0] }, ...confident },
        select, take: 500,
      })
      if (rows.length >= MIN_SAMPLE) {
        return summarize(`NAICS ${naicsCode} at ${agency}`, rows)
      }
    }

    // Wider: this NAICS, any agency.
    const byNaics = await prisma.contractOutcome.findMany({
      where: { naicsCode, ...confident }, select, take: 500,
    })
    if (byNaics.length >= MIN_SAMPLE) {
      return summarize(`NAICS ${naicsCode}, all agencies`, byNaics)
    }

    // Widest: the 4-digit NAICS family.
    const prefix = naicsCode.slice(0, 4)
    if (prefix.length === 4) {
      const family = await prisma.contractOutcome.findMany({
        where: { naicsCode: { startsWith: prefix }, ...confident }, select, take: 500,
      })
      if (family.length > 0) {
        return summarize(`NAICS ${prefix}xx family`, family)
      }
    }

    // Something is better than nothing, but say how thin it is.
    if (byNaics.length > 0) return summarize(`NAICS ${naicsCode}, all agencies`, byNaics)
    return null
  } catch {
    // Pre-migration or DB hiccup — scoring falls back to the heuristic.
    return null
  }
}

export interface CoverageReport {
  outcomes: number
  quotable: number
  naicsCovered: number
  readyForCalibration: boolean
  readyForTraining: boolean
}

// Honest status of the evidence layer — surfaced on the admin board and used
// to decide what the product is allowed to claim.
export async function coverage(): Promise<CoverageReport> {
  try {
    const [outcomes, quotable, distinct] = await Promise.all([
      prisma.contractOutcome.count(),
      prisma.contractOutcome.count({ where: { matchConfidence: { gte: QUOTABLE_CONFIDENCE } } }),
      prisma.contractOutcome.findMany({ select: { naicsCode: true }, distinct: ['naicsCode'], take: 1000 }),
    ])
    return {
      outcomes,
      quotable,
      naicsCovered: distinct.length,
      // Enough to check whether the score predicts anything.
      readyForCalibration: quotable >= 500,
      // Enough that a learning-to-rank model would beat the heuristic.
      readyForTraining: quotable >= 5000,
    }
  } catch {
    return { outcomes: 0, quotable: 0, naicsCovered: 0, readyForCalibration: false, readyForTraining: false }
  }
}
