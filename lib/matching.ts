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

export interface MatchScoreBreakdown {
  total: number
  naicsScore: number
  setAsideScore: number
  contractSizeScore: number
  geoScore: number
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

function sizeScoreFor(prefs: string[], value: number | undefined): { score: number; detail: string } {
  if (prefs.length === 0) {
    return { score: 10, detail: 'No size preference set — neutral credit' }
  }
  if (prefs.some(p => /any/i.test(p))) {
    return { score: 20, detail: 'You pursue contracts of any size' }
  }
  // SAM.gov rarely publishes estimates on open solicitations — an unknown
  // value must be neutral, never a penalty
  if (!value) {
    return { score: 12, detail: 'Value not posted — no size penalty applied' }
  }
  for (const pref of prefs) {
    // Legacy key "large" meant 250K+ — treat as mid-and-up
    const legacyLarge = pref.toLowerCase() === 'large' && value >= 250_000
    const matched = legacyLarge || SIZE_RANGES.some(
      s => s.pattern.test(pref) && value >= s.range[0] && value < s.range[1]
    )
    if (matched) {
      return { score: 20, detail: `Value $${value.toLocaleString()} is in your preferred range` }
    }
  }
  return { score: 0, detail: `Value $${value.toLocaleString()} is outside your preferred range` }
}

export function calculateMatchScore(
  contract: Contract,
  profile: CompanyProfile
): MatchScoreBreakdown {
  let naicsScore = 0
  let setAsideScore = 0
  let contractSizeScore = 0
  let geoScore = 0

  // NAICS code match: +40 points
  const contractNaics = contract.naicsCode || ''
  if (profile.naicsCodes.includes(contractNaics)) {
    naicsScore = 40
  } else if (profile.naicsCodes.some(code => contractNaics.startsWith(code.substring(0, 3)))) {
    // Partial match (same sector)
    naicsScore = 20
  }

  // Set-aside type matches company certifications: +25 points
  const setAsideCode = contract.setAsideType || ''
  const requiredCerts = SET_ASIDE_MAPPINGS[setAsideCode] || []

  if (setAsideCode === '' || setAsideCode === 'NONE' || setAsideCode === 'FULL') {
    // Open competition — everyone qualifies
    setAsideScore = 25
  } else if (
    // Substring match: profiles store labels like "8(a) Certified" while the
    // mapping uses the bare cert name ("8(a)") — exact equality missed these
    requiredCerts.some(cert =>
      [...profile.businessTypes, ...profile.certifications].some(t => t.includes(cert))
    )
  ) {
    setAsideScore = 25
  } else if (requiredCerts.length === 0) {
    setAsideScore = 15
  }

  // Contract size in preferred range: +20 points (unknown value = neutral)
  const size = sizeScoreFor(profile.contractSizePrefs, contract.value)
  contractSizeScore = size.score

  // Geographic match: +15 points
  const geo = geoScoreFor(profile.geoPrefs, contract.placeOfPerformance || '')
  geoScore = geo.score

  const total = naicsScore + setAsideScore + contractSizeScore + geoScore

  return {
    total,
    naicsScore,
    setAsideScore,
    contractSizeScore,
    geoScore,
    details: {
      naics: naicsScore === 40
        ? `NAICS ${contractNaics} matches your profile`
        : naicsScore === 20
        ? `NAICS ${contractNaics} is in your sector`
        : `NAICS ${contractNaics} not in your codes`,
      setAside: setAsideScore === 25
        ? `You qualify for ${setAsideCode || 'open competition'}`
        : `Set-aside ${setAsideCode} may not match your certifications`,
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

function geoScoreFor(prefs: string[], place: string): { score: number; detail: string } {
  if (prefs.length === 0) {
    return { score: 8, detail: 'No geographic preference set — neutral credit' }
  }
  const overseas = /overseas|oconus/i.test(place)
  if (prefs.some(p => /worldwide|remote|virtual/i.test(p))) {
    return { score: 15, detail: 'You work remotely / anywhere' }
  }
  if (prefs.some(p => /conus/i.test(p)) && !overseas) {
    return { score: 15, detail: 'Location is within the continental U.S.' }
  }
  // Unknown place shouldn't punish
  if (!place || place === 'TBD') {
    return { score: 8, detail: 'Place of performance not specified — no penalty' }
  }
  // Extract the state code from "City, ST"
  const codeMatch = place.match(/,\s*([A-Z]{2})\b/)
  const placeCode = codeMatch?.[1]
  for (const pref of prefs) {
    if (placeCode) {
      const region = GEO_REGION_CODES.find(r => r.pattern.test(pref))
      if (region?.codes.includes(placeCode)) {
        return { score: 15, detail: `${place} is in your preferred region (${pref})` }
      }
    }
    if (place.toLowerCase().includes(pref.toLowerCase())) {
      return { score: 15, detail: `${place} matches your preference` }
    }
  }
  return { score: 0, detail: `${place} is outside your preferred regions` }
}

export function sortByMatchScore<T extends { matchScore?: number }>(contracts: T[]): T[] {
  return [...contracts].sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
}
