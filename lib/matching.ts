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

// Contract value ranges
const CONTRACT_SIZE_RANGES: Record<string, [number, number]> = {
  'micro': [0, 10000],
  'simplified': [10000, 250000],
  'large': [250000, Infinity],
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
  } else if (requiredCerts.some(cert => profile.businessTypes.includes(cert) || profile.certifications.includes(cert))) {
    setAsideScore = 25
  } else if (requiredCerts.length === 0) {
    setAsideScore = 15
  }

  // Contract size in preferred range: +20 points
  const contractValue = contract.value || 0
  for (const sizePref of profile.contractSizePrefs) {
    const range = CONTRACT_SIZE_RANGES[sizePref]
    if (range && contractValue >= range[0] && contractValue < range[1]) {
      contractSizeScore = 20
      break
    }
  }

  // If no size pref set, give partial credit
  if (profile.contractSizePrefs.length === 0) {
    contractSizeScore = 10
  }

  // Geographic match: +15 points
  const contractPlace = contract.placeOfPerformance || ''
  if (profile.geoPrefs.includes('worldwide')) {
    geoScore = 15
  } else if (profile.geoPrefs.includes('CONUS') && !contractPlace.toLowerCase().includes('overseas')) {
    geoScore = 15
  } else if (profile.geoPrefs.some(geo => contractPlace.toLowerCase().includes(geo.toLowerCase()))) {
    geoScore = 15
  } else if (profile.geoPrefs.length === 0) {
    geoScore = 8
  }

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
      contractSize: contractSizeScore === 20
        ? `Contract value $${contractValue.toLocaleString()} is in your preferred range`
        : `Contract value outside your preferred range`,
      geo: geoScore === 15
        ? `Location matches your geographic preferences`
        : `Location may not match your preferences`,
    },
  }
}

export function sortByMatchScore<T extends { matchScore?: number }>(contracts: T[]): T[] {
  return [...contracts].sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
}
