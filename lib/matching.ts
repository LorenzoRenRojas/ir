import type { Contract } from './sam-api'

export interface CompanyProfile {
  naicsCodes: string[]
  businessTypes: string[]
  contractSizePrefs: string[]
  contractTypePrefs: string[]
  geoPrefs: string[]
  certifications: string[]
  clearanceLevel?: string
}

export type FactorVerdict = 'full' | 'partial' | 'neutral' | 'miss'

// One scoring factor, fully explained: what it's worth, what the profile
// says, what the contract says, and a plain-English verdict sentence.
export interface FactorBreakdown {
  key: 'naics' | 'setAside' | 'size' | 'geo'
  label: string
  score: number
  max: number
  verdict: FactorVerdict
  explanation: string
  yours: string
  theirs: string
}

export interface MatchScoreBreakdown {
  total: number
  naicsScore: number
  setAsideScore: number
  contractSizeScore: number
  geoScore: number
  factors: FactorBreakdown[]
  details: {
    naics: string
    setAside: string
    contractSize: string
    geo: string
  }
}

// Set-aside codes and their corresponding certifications/business types
const SET_ASIDE_MAPPINGS: Record<string, string[]> = {
  'SBA': ['Small Business'],
  'SDVOSBC': ['SDVOSB'],
  'WOSB': ['WOSB'],
  '8A': ['8(a)'],
  'HUBZONE': ['HUBZone'],
  'EDWOSB': ['WOSB'],
  'SBP': ['Small Business'],
  'ISBEE': ['Small Business'],
  'VOSBC': ['SDVOSB'],
}

// Contract value ranges — matched by keyword so both legacy keys ("micro")
// and onboarding labels ("Micro (<$10K)", "Mid ($250K–$5M)") resolve
const SIZE_RANGES: { pattern: RegExp; range: [number, number] }[] = [
  { pattern: /micro/i, range: [0, 10_000] },
  { pattern: /simplified/i, range: [10_000, 250_000] },
  { pattern: /mid/i, range: [250_000, 5_000_000] },
  { pattern: /large/i, range: [5_000_000, 50_000_000] },
  { pattern: /major/i, range: [50_000_000, Infinity] },
]

function sizeScoreFor(prefs: string[], value: number | undefined): { score: number; detail: string; verdict: FactorVerdict } {
  if (prefs.length === 0) {
    return { score: 10, verdict: 'neutral', detail: 'No size preference set — neutral credit. Add one in settings for sharper scoring.' }
  }
  if (prefs.some(p => /any/i.test(p))) {
    return { score: 20, verdict: 'full', detail: 'You pursue contracts of any size — full credit.' }
  }
  // SAM.gov rarely publishes estimates on open solicitations — an unknown
  // value must be neutral, never a penalty
  if (!value) {
    return { score: 12, verdict: 'neutral', detail: 'The government didn\'t post an estimated value, so no size penalty applies. Check the incumbent\'s previous award for a hint.' }
  }
  const bandOf = (v: number) => SIZE_RANGES.findIndex(r => v >= r.range[0] && v < r.range[1])
  const valueBand = bandOf(value)
  let bestDistance = Infinity
  for (const pref of prefs) {
    const legacyLarge = pref.toLowerCase() === 'large' && value >= 250_000
    if (legacyLarge) { bestDistance = 0; break }
    const idx = SIZE_RANGES.findIndex(r => r.pattern.test(pref))
    if (idx >= 0 && valueBand >= 0) bestDistance = Math.min(bestDistance, Math.abs(idx - valueBand))
  }
  if (bestDistance === 0) {
    return { score: 20, verdict: 'full', detail: `$${value.toLocaleString()} sits squarely in your preferred size range — you can staff and finance this.` }
  }
  if (bestDistance === 1) {
    return { score: 10, verdict: 'partial', detail: `$${value.toLocaleString()} is one size band away from your preference — a stretch, but often a deliberate one.` }
  }
  return { score: 0, verdict: 'miss', detail: `$${value.toLocaleString()} is far outside the contract sizes you pursue.` }
}

export function calculateMatchScore(
  contract: Contract,
  profile: CompanyProfile
): MatchScoreBreakdown {
  // ── NAICS: 40 pts, graduated by code specificity ──────────────────────────
  const contractNaics = contract.naicsCode || ''
  const yourCodes = profile.naicsCodes
  let naicsScore = 0
  let naicsVerdict: FactorVerdict = 'miss'
  let naicsExplanation = `NAICS ${contractNaics || 'not listed'} doesn't overlap any of your registered codes.`
  if (contractNaics && yourCodes.includes(contractNaics)) {
    naicsScore = 40; naicsVerdict = 'full'
    naicsExplanation = `Exact match — ${contractNaics} is one of your registered codes. You can credibly bid this as core work.`
  } else if (contractNaics) {
    const match4 = yourCodes.find(c => c.slice(0, 4) === contractNaics.slice(0, 4))
    const match3 = yourCodes.find(c => c.slice(0, 3) === contractNaics.slice(0, 3))
    const match2 = yourCodes.find(c => c.slice(0, 2) === contractNaics.slice(0, 2))
    if (match4) {
      naicsScore = 28; naicsVerdict = 'partial'
      naicsExplanation = `Same industry group — this is ${contractNaics}, you hold ${match4}. Close adjacency; expect to justify the fit in your proposal.`
    } else if (match3) {
      naicsScore = 20; naicsVerdict = 'partial'
      naicsExplanation = `Same subsector — this is ${contractNaics}, you hold ${match3}. Plausible stretch if your past performance supports it.`
    } else if (match2) {
      naicsScore = 10; naicsVerdict = 'partial'
      naicsExplanation = `Same broad sector only — this is ${contractNaics}, your nearest is ${match2}. A long stretch without strong past performance.`
    }
  }

  // ── Set-aside: 25 pts, eligibility gate ────────────────────────────────────
  const setAsideCode = contract.setAsideType || ''
  const requiredCerts = SET_ASIDE_MAPPINGS[setAsideCode] || []
  const yourStatuses = [...profile.businessTypes, ...profile.certifications]
  let setAsideScore = 0
  let setAsideVerdict: FactorVerdict = 'miss'
  let setAsideExplanation = ''
  const isOpen = setAsideCode === '' || setAsideCode === 'NONE' || setAsideCode === 'FULL'
  if (isOpen) {
    setAsideScore = 25; setAsideVerdict = 'full'
    setAsideExplanation = 'Open competition — no set-aside restriction, so you\'re fully eligible. Note: everyone else is too, so expect a wider field.'
  } else if (requiredCerts.some(cert => yourStatuses.some(t => t.includes(cert)))) {
    const held = requiredCerts.find(cert => yourStatuses.some(t => t.includes(cert)))
    setAsideScore = 25; setAsideVerdict = 'full'
    setAsideExplanation = `Restricted to ${contract.setAsideDescription || setAsideCode} — and your ${held} status qualifies. The competition just shrank to a fraction of the market.`
  } else if (requiredCerts.length === 0) {
    setAsideScore = 15; setAsideVerdict = 'neutral'
    setAsideExplanation = `Set-aside type "${contract.setAsideDescription || setAsideCode}" isn't one we can map to your certifications — verify eligibility on the notice before investing time.`
  } else {
    setAsideExplanation = `Restricted to ${contract.setAsideDescription || setAsideCode} — requires ${requiredCerts.join(' or ')}, which isn't on your profile. You'd need to team with an eligible prime.`
  }

  // ── Size: 20 pts, distance-graduated, unknown is neutral ─────────────────
  const size = sizeScoreFor(profile.contractSizePrefs, contract.value)
  const contractSizeScore = size.score

  // ── Geography: 15 pts ─────────────────────────────────────────────────────
  const geo = geoScoreFor(profile.geoPrefs, contract.placeOfPerformance || '')
  const geoScore = geo.score

  const total = naicsScore + setAsideScore + contractSizeScore + geoScore

  const factors: FactorBreakdown[] = [
    {
      key: 'naics', label: 'NAICS ALIGNMENT', score: naicsScore, max: 40,
      verdict: naicsVerdict, explanation: naicsExplanation,
      yours: yourCodes.length ? `Registered: ${yourCodes.slice(0, 6).join(', ')}${yourCodes.length > 6 ? '…' : ''}` : 'No NAICS codes on profile',
      theirs: contractNaics ? `${contractNaics} — ${contract.naicsDescription || 'no description'}` : 'Not listed on notice',
    },
    {
      key: 'setAside', label: 'SET-ASIDE ELIGIBILITY', score: setAsideScore, max: 25,
      verdict: setAsideVerdict, explanation: setAsideExplanation,
      yours: yourStatuses.length ? `Your statuses: ${yourStatuses.slice(0, 5).join(', ')}${yourStatuses.length > 5 ? '…' : ''}` : 'No set-aside statuses on profile',
      theirs: contract.setAsideDescription || 'Open competition (no set-aside)',
    },
    {
      key: 'size', label: 'CONTRACT SIZE FIT', score: contractSizeScore, max: 20,
      verdict: size.verdict, explanation: size.detail,
      yours: profile.contractSizePrefs.length ? `You pursue: ${profile.contractSizePrefs.join(', ')}` : 'No size preference set',
      theirs: contract.value ? `Estimated value $${contract.value.toLocaleString()}` : 'Value not posted on notice',
    },
    {
      key: 'geo', label: 'GEOGRAPHY', score: geoScore, max: 15,
      verdict: geo.verdict, explanation: geo.detail,
      yours: profile.geoPrefs.length ? `You work: ${profile.geoPrefs.slice(0, 5).join(', ')}${profile.geoPrefs.length > 5 ? '…' : ''}` : 'No geographic preference set',
      theirs: contract.placeOfPerformance && contract.placeOfPerformance !== 'TBD' ? `Performance in ${contract.placeOfPerformance}` : 'Place of performance not specified',
    },
  ]

  return {
    total,
    naicsScore,
    setAsideScore,
    contractSizeScore,
    geoScore,
    factors,
    details: {
      naics: naicsExplanation,
      setAside: setAsideExplanation,
      contractSize: size.detail,
      geo: geo.detail,
    },
  }
}

// Onboarding stores labels like "CONUS (Continental US)", "DC Metro Area",
// "Texas" — while SAM.gov places arrive as "City, ST" with state CODES.
// Map both worlds so geo scoring actually fires.
const GEO_REGION_CODES: { pattern: RegExp; codes: string[] }[] = [
  { pattern: /dc metro/i, codes: ['DC', 'VA', 'MD'] },
  { pattern: /northeast/i, codes: ['ME', 'NH', 'VT', 'MA', 'RI', 'CT', 'NY', 'NJ', 'PA'] },
  { pattern: /mid-?atlantic/i, codes: ['DE', 'MD', 'DC', 'VA', 'WV', 'NJ', 'PA'] },
  { pattern: /southeast/i, codes: ['NC', 'SC', 'GA', 'FL', 'AL', 'MS', 'TN', 'KY', 'AR', 'LA'] },
  { pattern: /midwest/i, codes: ['OH', 'IN', 'IL', 'MI', 'WI', 'MN', 'IA', 'MO', 'ND', 'SD', 'NE', 'KS'] },
  { pattern: /southwest/i, codes: ['TX', 'OK', 'NM', 'AZ'] },
  { pattern: /west coast/i, codes: ['CA', 'OR', 'WA'] },
  { pattern: /texas/i, codes: ['TX'] },
  { pattern: /california/i, codes: ['CA'] },
  { pattern: /virginia/i, codes: ['VA'] },
  { pattern: /maryland/i, codes: ['MD'] },
  { pattern: /florida/i, codes: ['FL'] },
]

function geoScoreFor(prefs: string[], place: string): { score: number; detail: string; verdict: FactorVerdict } {
  if (prefs.length === 0) {
    return { score: 8, verdict: 'neutral', detail: 'No geographic preference set — neutral credit. Add regions in settings for sharper scoring.' }
  }
  const overseas = /overseas|oconus/i.test(place)
  if (prefs.some(p => /worldwide|remote|virtual/i.test(p))) {
    return { score: 15, verdict: 'full', detail: 'You work remotely / anywhere — location is no constraint.' }
  }
  if (prefs.some(p => /conus/i.test(p)) && !overseas) {
    return { score: 15, verdict: 'full', detail: 'Performance is within the continental U.S., which you cover.' }
  }
  if (!place || place === 'TBD') {
    return { score: 8, verdict: 'neutral', detail: 'Place of performance isn\'t specified on the notice — no penalty applied.' }
  }
  const codeMatch = place.match(/,\s*([A-Z]{2})\b/)
  const placeCode = codeMatch?.[1]
  for (const pref of prefs) {
    if (placeCode) {
      const region = GEO_REGION_CODES.find(r => r.pattern.test(pref))
      if (region?.codes.includes(placeCode)) {
        return { score: 15, verdict: 'full', detail: `${place} falls inside your "${pref}" coverage area.` }
      }
    }
    if (place.toLowerCase().includes(pref.toLowerCase())) {
      return { score: 15, verdict: 'full', detail: `${place} directly matches your preference "${pref}".` }
    }
  }
  return { score: 0, verdict: 'miss', detail: `${place} is outside the regions you work in — factor in travel or remote delivery.` }
}
