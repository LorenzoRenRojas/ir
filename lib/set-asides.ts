// Set-aside program directory — powers the /set-asides programmatic SEO pages.
//
// Small businesses self-identify by set-aside status ("we're an 8(a)", "we're
// SDVOSB"), and they search for opportunities that way. Each entry is both a
// live-contract filter AND a genuinely useful explainer of the program, which
// is what earns the page a ranking and converts the visitor.
//
// samCodes map to SAM.gov's setAsideType field; keywords are a fallback match
// against the human-readable setAsideDescription when the code is absent.

import type { Contract } from './sam-api'

export interface SetAside {
  slug: string
  name: string            // full program name
  abbr: string            // short badge, e.g. "8(a)"
  samCodes: string[]      // SAM.gov setAsideType codes that map to this program
  keywords: string[]      // lowercase substrings to match in setAsideDescription
  tagline: string         // one-line summary for cards + hero
  whatItIs: string        // plain-English explainer paragraph
  whoQualifies: string[]  // eligibility bullets
  certPath: string        // how to get certified / registered
}

export const SET_ASIDES: SetAside[] = [
  {
    slug: 'small-business',
    name: 'Total Small Business Set-Aside',
    abbr: 'SB',
    samCodes: ['SBA', 'SBP'],
    keywords: ['total small business', 'small business set-aside'],
    tagline: 'Contracts reserved for any qualifying small business.',
    whatItIs:
      'The most common set-aside. When a contracting officer reserves a requirement as a Total Small Business Set-Aside, only small businesses may compete. Most federal purchases between the micro-purchase threshold and the simplified acquisition threshold are set aside for small business by default when two or more capable small firms are expected to bid.',
    whoQualifies: [
      'Meet the SBA size standard for the contract’s NAICS code (by employees or annual receipts)',
      'Registered and active in SAM.gov',
      'No separate certification required — you self-certify your size',
    ],
    certPath:
      'No formal certification needed. Confirm your size standard for each NAICS code at sba.gov, then keep your SAM.gov registration active and your size self-certification current.',
  },
  {
    slug: '8a',
    name: '8(a) Business Development Program',
    abbr: '8(a)',
    samCodes: ['8A', '8AN'],
    keywords: ['8(a)', '8a competitive', '8a sole', '8 a '],
    tagline: 'A nine-year runway of set-aside and sole-source access for disadvantaged firms.',
    whatItIs:
      'The 8(a) program is the SBA’s flagship business-development track for small firms owned by socially and economically disadvantaged individuals. Certified companies get access to 8(a)-reserved competitions, sole-source awards up to defined thresholds, mentorship, and a nine-year term to build past performance and scale.',
    whoQualifies: [
      'At least 51% owned and controlled by U.S. citizens who are socially and economically disadvantaged',
      'Personal net worth, income, and total assets under the program limits',
      'A small business under the relevant NAICS size standard',
      'Demonstrated potential for success (typically two years in business, with exceptions)',
    ],
    certPath:
      'Apply through the SBA at certify.SBA.gov. Approval grants a nine-year term. Budget several months for the application and keep annual reviews current.',
  },
  {
    slug: 'wosb',
    name: 'Women-Owned Small Business (WOSB)',
    abbr: 'WOSB',
    samCodes: ['WOSB', 'WOSBSS'],
    keywords: ['women-owned', 'women owned', 'wosb'],
    tagline: 'Set-aside access in industries where women-owned firms are underrepresented.',
    whatItIs:
      'The WOSB Federal Contracting Program reserves certain contracts for women-owned small businesses in NAICS codes where they are substantially underrepresented. It is one of the fastest set-asides to certify into and a common entry point to federal work.',
    whoQualifies: [
      'At least 51% owned and controlled by one or more women who are U.S. citizens',
      'A small business under the relevant NAICS size standard',
      'The set-aside applies in designated underrepresented industries',
    ],
    certPath:
      'Certify free through the SBA at certify.SBA.gov, or use an SBA-approved third-party certifier. Self-certification is no longer accepted for WOSB set-aside awards.',
  },
  {
    slug: 'edwosb',
    name: 'Economically Disadvantaged Women-Owned Small Business (EDWOSB)',
    abbr: 'EDWOSB',
    samCodes: ['EDWOSB', 'EDWOSBSS'],
    keywords: ['economically disadvantaged women', 'edwosb'],
    tagline: 'A WOSB tier for economically disadvantaged owners, with broader set-aside eligibility.',
    whatItIs:
      'EDWOSB is a subset of the WOSB program for women-owned firms whose owners also meet economic-disadvantage thresholds. EDWOSB-certified firms can compete for both EDWOSB and WOSB set-asides, and the EDWOSB designation opens set-asides in additional NAICS codes.',
    whoQualifies: [
      'Meets all WOSB requirements',
      'Owner’s personal net worth, adjusted gross income, and total assets fall under the economic-disadvantage limits',
      'A small business under the relevant NAICS size standard',
    ],
    certPath:
      'Certify through the SBA at certify.SBA.gov (or an approved third-party certifier) and complete the economic-disadvantage portion of the application.',
  },
  {
    slug: 'sdvosb',
    name: 'Service-Disabled Veteran-Owned Small Business (SDVOSB)',
    abbr: 'SDVOSB',
    samCodes: ['SDVOSBC', 'SDVOSBS'],
    keywords: ['service-disabled veteran', 'service disabled veteran', 'sdvosb'],
    tagline: 'Set-aside and sole-source access reserved for service-disabled veteran owners.',
    whatItIs:
      'SDVOSB set-asides reserve contracts for firms owned and controlled by service-disabled veterans. The VA gives strong preference to SDVOSBs under its "Vets First" authority, and the designation carries government-wide set-aside and sole-source eligibility.',
    whoQualifies: [
      'At least 51% owned and controlled by one or more service-disabled veterans',
      'The service-disabled veteran manages daily operations and long-term decisions',
      'A small business under the relevant NAICS size standard',
    ],
    certPath:
      'Certification is handled by the SBA through the VetCert system at veterans.certify.SBA.gov. Certification is required to win SDVOSB set-aside and sole-source awards.',
  },
  {
    slug: 'vosb',
    name: 'Veteran-Owned Small Business (VOSB)',
    abbr: 'VOSB',
    samCodes: ['VSA', 'VSS'],
    keywords: ['veteran-owned', 'veteran owned', 'vosb'],
    tagline: 'Veteran-owned set-aside access, strongest at the Department of Veterans Affairs.',
    whatItIs:
      'VOSB set-asides reserve contracts for veteran-owned small businesses. The preference is most powerful at the VA, which prioritizes verified veteran-owned firms under its "Vets First" contracting program.',
    whoQualifies: [
      'At least 51% owned and controlled by one or more veterans',
      'A veteran manages daily operations and long-term decisions',
      'A small business under the relevant NAICS size standard',
    ],
    certPath:
      'Certify through the SBA VetCert system at veterans.certify.SBA.gov. Verification is required to compete for VOSB set-asides at the VA.',
  },
  {
    slug: 'hubzone',
    name: 'HUBZone Program',
    abbr: 'HUBZone',
    samCodes: ['HZC', 'HZS'],
    keywords: ['hubzone', 'hub zone'],
    tagline: 'Set-aside and price-evaluation preference for firms in underutilized areas.',
    whatItIs:
      'The HUBZone program helps small businesses in Historically Underutilized Business Zones win federal work. Certified firms get access to HUBZone set-asides, sole-source awards, and a 10% price-evaluation preference in full-and-open competitions.',
    whoQualifies: [
      'Principal office located in a designated HUBZone',
      'At least 35% of employees live in a HUBZone',
      'At least 51% owned and controlled by U.S. citizens',
      'A small business under the relevant NAICS size standard',
    ],
    certPath:
      'Apply through the SBA at certify.SBA.gov. Recertify annually and keep your HUBZone employee residency and office location current.',
  },
]

export function getSetAside(slug: string): SetAside | undefined {
  return SET_ASIDES.find((s) => s.slug === slug)
}

// Does this live contract belong under a given set-aside program? Match on the
// SAM.gov code first (precise), then fall back to a keyword scan of the
// human-readable description (covers postings with a missing/nonstandard code).
export function contractMatchesSetAside(contract: Contract, entry: SetAside): boolean {
  const code = (contract.setAsideType || '').toUpperCase().trim()
  if (code && entry.samCodes.includes(code)) return true
  const desc = (contract.setAsideDescription || '').toLowerCase()
  return desc.length > 0 && entry.keywords.some((k) => desc.includes(k))
}
