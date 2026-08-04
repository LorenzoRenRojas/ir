// Federal agency directory — powers the /agencies programmatic SEO pages.
//
// "Selling to the VA", "GSA contract opportunities", "how to sell to DHS" are
// high-volume searches from small businesses trying to break into a specific
// buyer. Each entry is a live-contract filter (matched against Contract.agency)
// plus a genuinely useful explainer of what the agency buys and how to win work
// there — the content that earns the ranking and answers the searcher.

import type { Contract } from './sam-api'

export interface Agency {
  slug: string
  name: string        // full agency name
  abbr: string        // short badge, e.g. "VA"
  keywords: string[]  // lowercase substrings matched against Contract.agency
  tagline: string     // one-line summary for cards + hero
  overview: string    // plain-English explainer paragraph
  buys: string[]      // what small businesses commonly sell them
  howToWin: string[]  // concrete tips for winning work at this agency
}

export const AGENCIES: Agency[] = [
  {
    slug: 'department-of-defense',
    name: 'Department of Defense',
    abbr: 'DoD',
    keywords: ['defense', 'army', 'navy', 'air force', 'marine corps', 'defense logistics', 'darpa', 'space force'],
    tagline: 'The largest buyer in the federal government, across every industry imaginable.',
    overview:
      'The Department of Defense is by far the biggest federal buyer, spending hundreds of billions a year through the Army, Navy, Air Force, Marine Corps, Space Force, and defense agencies like DLA and DARPA. Its needs run far beyond weapons — IT, logistics, facilities, professional services, research, and everyday supplies all flow through DoD contracting.',
    buys: [
      'IT services, software, and cybersecurity',
      'Logistics, supply chain, and maintenance',
      'Facilities, construction, and base operations',
      'Professional, engineering, and research services',
      'Medical, training, and administrative support',
    ],
    howToWin: [
      'Target the specific command or installation that buys what you sell — DoD is many buyers, not one',
      'Small-business set-asides are heavily used here; make sure your certifications are current',
      'Register for the DoD’s procurement forecasts and watch each service branch’s small-business office',
    ],
  },
  {
    slug: 'veterans-affairs',
    name: 'Department of Veterans Affairs',
    abbr: 'VA',
    keywords: ['veterans affairs', 'veterans', 'va medical', 'veteran'],
    tagline: 'A major buyer of healthcare, IT, and services — with strong veteran-owned preferences.',
    overview:
      'The Department of Veterans Affairs runs one of the largest healthcare systems in the country, which makes it a huge buyer of medical services, IT, facilities, and professional support. The VA also gives the strongest preference in government to verified veteran-owned and service-disabled veteran-owned small businesses under its "Vets First" contracting program.',
    buys: [
      'Healthcare staffing, medical supplies, and equipment',
      'IT modernization and health-record systems',
      'Facilities maintenance and construction',
      'Professional and administrative services',
    ],
    howToWin: [
      'If you’re veteran-owned, get verified through SBA VetCert — it’s decisive at the VA',
      'Target individual VA medical centers and networks (VISNs), which buy locally',
      'Watch for recompetes on expiring healthcare and IT support vehicles',
    ],
  },
  {
    slug: 'homeland-security',
    name: 'Department of Homeland Security',
    abbr: 'DHS',
    keywords: ['homeland security', 'customs and border', 'cbp', 'ice', 'tsa', 'fema', 'coast guard', 'cisa', 'secret service'],
    tagline: 'Security, technology, and emergency-response spending across a dozen component agencies.',
    overview:
      'The Department of Homeland Security buys through components like CBP, ICE, TSA, FEMA, the Coast Guard, CISA, and the Secret Service. Its mission drives heavy demand for security technology, IT and cybersecurity, screening and detection, and disaster-response goods and services.',
    buys: [
      'Cybersecurity and IT services',
      'Screening, detection, and surveillance technology',
      'Emergency management and disaster response support',
      'Professional services and mission support',
    ],
    howToWin: [
      'Each component buys differently — decide whether you’re selling to CBP, FEMA, TSA, etc.',
      'DHS runs an active small-business program; set-asides are common on services',
      'FEMA demand spikes around disaster declarations — be registered and ready in advance',
    ],
  },
  {
    slug: 'general-services-administration',
    name: 'General Services Administration',
    abbr: 'GSA',
    keywords: ['general services administration', 'gsa', 'federal acquisition service', 'public buildings'],
    tagline: 'The government’s buying and real-estate arm — and the home of the GSA Schedule.',
    overview:
      'The General Services Administration is how much of the government buys commercial products and services. Beyond its own needs in real estate and facilities, GSA runs the Multiple Award Schedule (the "GSA Schedule") — a pre-negotiated contract that lets every federal agency buy from you more easily once you’re on it.',
    buys: [
      'Commercial products and services via the GSA Schedule',
      'Facilities, real estate, and building services',
      'IT hardware, software, and telecommunications',
      'Professional and management services',
    ],
    howToWin: [
      'Getting on the GSA Schedule (MAS) turns every agency into a potential customer',
      'A Schedule is a hunting license, not a guarantee — you still market to buyers directly',
      'Start with a strong past-performance record; GSA scrutinizes it during onboarding',
    ],
  },
  {
    slug: 'health-and-human-services',
    name: 'Department of Health and Human Services',
    abbr: 'HHS',
    keywords: ['health and human services', 'hhs', 'nih', 'cdc', 'fda', 'cms', 'indian health'],
    tagline: 'Health, research, and social-services spending through NIH, CDC, FDA, CMS, and more.',
    overview:
      'The Department of Health and Human Services buys through agencies like NIH, CDC, FDA, and CMS. It’s a major purchaser of research support, health IT, scientific and laboratory services, and program administration for the nation’s largest health programs.',
    buys: [
      'Health IT and data systems',
      'Scientific, laboratory, and research support',
      'Program administration and analytics',
      'Professional and communications services',
    ],
    howToWin: [
      'Identify the operating division (NIH vs. CDC vs. CMS) that matches your capability',
      'Research and health-IT vehicles are common entry points for small firms',
      'Watch NIH and CDC recompetes for support-services contracts',
    ],
  },
  {
    slug: 'nasa',
    name: 'National Aeronautics and Space Administration',
    abbr: 'NASA',
    keywords: ['nasa', 'aeronautics', 'space administration', 'jet propulsion'],
    tagline: 'Engineering, research, and IT contracting across the nation’s space centers.',
    overview:
      'NASA contracts through centers like Goddard, Johnson, Kennedy, and JPL. Its work drives demand well beyond spaceflight — engineering and technical services, IT and data, research, and facilities support are all regularly competed, including through small-business set-asides.',
    buys: [
      'Engineering and technical services',
      'IT, data science, and software',
      'Research and mission support',
      'Facilities and ground operations',
    ],
    howToWin: [
      'Target a specific NASA center — each runs its own procurements',
      'Technical past performance matters; partner or subcontract to build it',
      'Watch center-level small-business offices and forecasts',
    ],
  },
  {
    slug: 'department-of-agriculture',
    name: 'Department of Agriculture',
    abbr: 'USDA',
    keywords: ['agriculture', 'usda', 'forest service', 'farm service', 'rural development'],
    tagline: 'Rural, land, and food-program spending with a strong small-business footprint.',
    overview:
      'The Department of Agriculture buys through agencies like the Forest Service, Farm Service Agency, and Rural Development. Its needs span land management, IT, professional services, construction, and food-program support — often in rural areas where small and local businesses are well positioned.',
    buys: [
      'Land and natural-resource management services',
      'IT and program-administration support',
      'Construction and facilities work',
      'Professional and scientific services',
    ],
    howToWin: [
      'Local presence helps — much USDA work is tied to specific regions and forests',
      'Set-asides are common; HUBZone and small-business status are advantages',
      'Watch Forest Service seasonal and recurring service contracts',
    ],
  },
  {
    slug: 'department-of-energy',
    name: 'Department of Energy',
    abbr: 'DOE',
    keywords: ['energy', 'doe', 'national laboratory', 'national nuclear', 'nnsa'],
    tagline: 'Research, environmental, and technical spending across the national labs.',
    overview:
      'The Department of Energy contracts heavily through its national laboratories and the NNSA. It buys environmental cleanup, scientific and engineering services, IT, and specialized technical support — including significant subcontracting opportunities under the labs’ large management contracts.',
    buys: [
      'Scientific, engineering, and technical services',
      'Environmental remediation and safety',
      'IT, cybersecurity, and data',
      'Facilities and construction',
    ],
    howToWin: [
      'Much DOE work flows as subcontracts under the lab management contractors',
      'Specialized technical certifications and safety records carry weight',
      'Target the specific lab or site aligned to your capability',
    ],
  },
  {
    slug: 'department-of-justice',
    name: 'Department of Justice',
    abbr: 'DOJ',
    keywords: ['justice', 'doj', 'fbi', 'dea', 'bureau of prisons', 'atf', 'us marshals'],
    tagline: 'Law-enforcement, IT, and professional-services spending through the FBI, DEA, BOP, and more.',
    overview:
      'The Department of Justice buys through components like the FBI, DEA, Bureau of Prisons, ATF, and U.S. Marshals. Demand centers on IT and cybersecurity, professional and litigation support, facilities and detention services, and security technology.',
    buys: [
      'IT, cybersecurity, and data systems',
      'Professional, administrative, and litigation support',
      'Facilities, detention, and security services',
      'Forensics and specialized equipment',
    ],
    howToWin: [
      'Decide which component you’re selling to — their buying is decentralized',
      'Cleared personnel and security compliance are frequently required',
      'Watch Bureau of Prisons facilities and services recompetes',
    ],
  },
  {
    slug: 'department-of-transportation',
    name: 'Department of Transportation',
    abbr: 'DOT',
    keywords: ['transportation', 'dot', 'faa', 'federal highway', 'federal aviation', 'federal railroad', 'maritime administration'],
    tagline: 'Infrastructure, aviation, and technical spending through the FAA, FHWA, and more.',
    overview:
      'The Department of Transportation contracts through the FAA, Federal Highway Administration, Federal Railroad Administration, and others. It’s a strong buyer of engineering, IT and air-traffic systems, research, and professional services supporting the nation’s transportation infrastructure.',
    buys: [
      'Engineering and infrastructure services',
      'Aviation and air-traffic technology',
      'IT, data, and research support',
      'Professional and program-management services',
    ],
    howToWin: [
      'The FAA uses its own acquisition system — learn it if you’re targeting aviation',
      'Engineering and technical past performance is central',
      'Watch for infrastructure-driven demand tied to federal funding cycles',
    ],
  },
]

export function getAgency(slug: string): Agency | undefined {
  return AGENCIES.find((a) => a.slug === slug)
}

// Does this live contract belong to a given agency? Case-insensitive substring
// match against Contract.agency covers the many ways SAM.gov names departments
// and their sub-components.
export function contractMatchesAgency(contract: Contract, entry: Agency): boolean {
  const a = (contract.agency || '').toLowerCase()
  return a.length > 0 && entry.keywords.some((k) => a.includes(k))
}
