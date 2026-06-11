import { unstable_cache } from 'next/cache'
import type { CompanyProfile } from './matching'

export interface Contract {
  id: string
  noticeId: string
  title: string
  solicitationNumber: string
  agency: string
  subAgency?: string
  naicsCode: string
  naicsDescription: string
  setAsideType: string
  setAsideDescription: string
  type: string
  typeDescription: string
  value?: number
  valueFormatted: string
  responseDeadline: string
  postedDate: string
  placeOfPerformance: string
  description: string
  link: string
  matchScore?: number
  matchBreakdown?: {
    naicsScore: number
    setAsideScore: number
    contractSizeScore: number
    geoScore: number
  }
}

interface SamGovOpportunity {
  noticeId: string
  title: string
  solicitationNumber?: string
  fullParentPathName?: string
  departmentName?: string
  subtierName?: string
  naicsCode?: string
  naicsDescription?: string
  typeOfSetAsideDescription?: string
  typeOfSetAside?: string
  type?: string
  award?: { amount?: number }
  responseDeadLine?: string
  postedDate?: string
  placeOfPerformance?: {
    city?: { name?: string }
    state?: { code?: string; name?: string }
    country?: { code?: string; name?: string }
  }
  description?: string
  uiLink?: string
}

// Mock data for when API key is not available
const MOCK_CONTRACTS: Contract[] = [
  {
    id: 'mock-1',
    noticeId: 'W91QF125Q0042',
    title: 'IT Support Services for Army Installation',
    solicitationNumber: 'W91QF125Q0042',
    agency: 'Department of Defense',
    subAgency: 'Department of the Army',
    naicsCode: '541512',
    naicsDescription: 'Computer Systems Design Services',
    setAsideType: 'SBA',
    setAsideDescription: 'Total Small Business Set-Aside',
    type: 'Solicitation',
    typeDescription: 'Combined Synopsis/Solicitation',
    value: 180000,
    valueFormatted: '$180,000',
    responseDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    postedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    placeOfPerformance: 'Fort Meade, MD',
    description: 'The Department of the Army is seeking qualified small businesses to provide IT support services including helpdesk support, network administration, and cybersecurity monitoring for a U.S. Army installation in Maryland.',
    link: 'https://sam.gov/opp/W91QF125Q0042',
  },
  {
    id: 'mock-2',
    noticeId: 'VA11825R0103',
    title: 'Healthcare IT Systems Integration',
    solicitationNumber: 'VA11825R0103',
    agency: 'Department of Veterans Affairs',
    subAgency: 'Veterans Health Administration',
    naicsCode: '541519',
    naicsDescription: 'Other Computer Related Services',
    setAsideType: 'SDVOSBC',
    setAsideDescription: 'Service-Disabled Veteran-Owned Small Business',
    type: 'Solicitation',
    typeDescription: 'Request for Proposal',
    value: 4500000,
    valueFormatted: '$4,500,000',
    responseDeadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
    postedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    placeOfPerformance: 'Washington, DC',
    description: 'The VA seeks experienced contractors to integrate electronic health record systems across multiple VA medical centers. Work includes systems analysis, data migration, API development, and end-user training.',
    link: 'https://sam.gov/opp/VA11825R0103',
  },
  {
    id: 'mock-3',
    noticeId: 'DHS-FY25-CYBER-001',
    title: 'Cybersecurity Operations Center Support',
    solicitationNumber: 'DHS-FY25-CYBER-001',
    agency: 'Department of Homeland Security',
    subAgency: 'Cybersecurity and Infrastructure Security Agency',
    naicsCode: '541690',
    naicsDescription: 'Other Scientific and Technical Consulting Services',
    setAsideType: 'WOSB',
    setAsideDescription: 'Women-Owned Small Business Set-Aside',
    type: 'Solicitation',
    typeDescription: 'Request for Proposal',
    value: 2200000,
    valueFormatted: '$2,200,000',
    responseDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    postedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    placeOfPerformance: 'Arlington, VA',
    description: 'CISA requires cybersecurity operations center (SOC) support services including 24/7 monitoring, incident response, threat intelligence, and vulnerability assessments for critical infrastructure protection.',
    link: 'https://sam.gov/opp/DHS-FY25-CYBER-001',
  },
  {
    id: 'mock-4',
    noticeId: 'GSA-FAS-ITC-25-0156',
    title: 'Cloud Migration and Modernization Services',
    solicitationNumber: 'GSA-FAS-ITC-25-0156',
    agency: 'General Services Administration',
    subAgency: 'Federal Acquisition Service',
    naicsCode: '541512',
    naicsDescription: 'Computer Systems Design Services',
    setAsideType: '8A',
    setAsideDescription: '8(a) Competitive',
    type: 'Solicitation',
    typeDescription: 'Request for Proposal',
    value: 8750000,
    valueFormatted: '$8,750,000',
    responseDeadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    postedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    placeOfPerformance: 'Multiple Locations, CONUS',
    description: 'GSA seeks contractors to support federal agencies in migrating legacy systems to FedRAMP-authorized cloud environments. Services include assessment, planning, migration execution, and post-migration optimization.',
    link: 'https://sam.gov/opp/GSA-FAS-ITC-25-0156',
  },
  {
    id: 'mock-5',
    noticeId: 'DOT-OST-2025-0089',
    title: 'Transportation Data Analytics Platform',
    solicitationNumber: 'DOT-OST-2025-0089',
    agency: 'Department of Transportation',
    subAgency: 'Office of the Secretary',
    naicsCode: '541511',
    naicsDescription: 'Custom Computer Programming Services',
    setAsideType: 'HUBZONE',
    setAsideDescription: 'HUBZone Set-Aside',
    type: 'Solicitation',
    typeDescription: 'Request for Quote',
    value: 495000,
    valueFormatted: '$495,000',
    responseDeadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    postedDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    placeOfPerformance: 'Washington, DC',
    description: 'DOT requires development of a data analytics platform to process and visualize transportation safety data from multiple sources. Platform should support real-time dashboards, predictive analytics, and regulatory reporting.',
    link: 'https://sam.gov/opp/DOT-OST-2025-0089',
  },
  {
    id: 'mock-6',
    noticeId: 'EPA-R9-2025-CONSULT',
    title: 'Environmental Consulting and Remediation Services',
    solicitationNumber: 'EPA-R9-2025-CONSULT',
    agency: 'Environmental Protection Agency',
    subAgency: 'Region 9',
    naicsCode: '541620',
    naicsDescription: 'Environmental Consulting Services',
    setAsideType: 'SBA',
    setAsideDescription: 'Total Small Business Set-Aside',
    type: 'Solicitation',
    typeDescription: 'Request for Proposal',
    value: 1200000,
    valueFormatted: '$1,200,000',
    responseDeadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
    postedDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    placeOfPerformance: 'San Francisco, CA',
    description: 'EPA Region 9 seeks environmental consulting services for Superfund site assessments, remediation planning, and community engagement in California, Arizona, Nevada, and Hawaii.',
    link: 'https://sam.gov/opp/EPA-R9-2025-CONSULT',
  },
  {
    id: 'mock-7',
    noticeId: 'NIH-25-BIOINFO-002',
    title: 'Bioinformatics Software Development',
    solicitationNumber: 'NIH-25-BIOINFO-002',
    agency: 'Department of Health and Human Services',
    subAgency: 'National Institutes of Health',
    naicsCode: '541715',
    naicsDescription: 'Research and Development in the Physical, Engineering, and Life Sciences',
    setAsideType: 'NONE',
    setAsideDescription: 'No Set-Aside Used',
    type: 'Solicitation',
    typeDescription: 'Request for Proposal',
    value: 12500000,
    valueFormatted: '$12,500,000',
    responseDeadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    postedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    placeOfPerformance: 'Bethesda, MD',
    description: 'NIH requires development of bioinformatics software tools for genomic data analysis, including pipeline development for next-generation sequencing, variant calling, and cloud-based data storage solutions.',
    link: 'https://sam.gov/opp/NIH-25-BIOINFO-002',
  },
  {
    id: 'mock-8',
    noticeId: 'USACE-MVP-25-R-0023',
    title: 'Construction Management for Flood Control Project',
    solicitationNumber: 'USACE-MVP-25-R-0023',
    agency: 'Department of Defense',
    subAgency: 'U.S. Army Corps of Engineers',
    naicsCode: '237990',
    naicsDescription: 'Other Heavy and Civil Engineering Construction',
    setAsideType: 'NONE',
    setAsideDescription: 'No Set-Aside Used',
    type: 'Solicitation',
    typeDescription: 'Request for Proposal',
    value: 45000000,
    valueFormatted: '$45,000,000',
    responseDeadline: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
    postedDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    placeOfPerformance: 'New Orleans, LA',
    description: 'USACE Mississippi Valley Division seeks contractors for construction management services for a major flood control infrastructure project including levee construction, pump station upgrades, and drainage improvements.',
    link: 'https://sam.gov/opp/USACE-MVP-25-R-0023',
  },
  {
    id: 'mock-9',
    noticeId: 'USAF-AFLCMC-25-IT-077',
    title: 'Software Development and Maintenance - Air Force Systems',
    solicitationNumber: 'USAF-AFLCMC-25-IT-077',
    agency: 'Department of Defense',
    subAgency: 'Department of the Air Force',
    naicsCode: '541511',
    naicsDescription: 'Custom Computer Programming Services',
    setAsideType: 'SBA',
    setAsideDescription: 'Total Small Business Set-Aside',
    type: 'Solicitation',
    typeDescription: 'Combined Synopsis/Solicitation',
    value: 250000,
    valueFormatted: '$250,000',
    responseDeadline: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
    postedDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    placeOfPerformance: 'Wright-Patterson AFB, OH',
    description: 'AFLCMC requires software development and maintenance support for logistics management systems. Work includes bug fixes, feature enhancements, testing, and documentation for classified Air Force systems.',
    link: 'https://sam.gov/opp/USAF-AFLCMC-25-IT-077',
  },
  {
    id: 'mock-10',
    noticeId: 'ED-OIT-2025-SaaS-001',
    title: 'Learning Management System Implementation',
    solicitationNumber: 'ED-OIT-2025-SaaS-001',
    agency: 'Department of Education',
    subAgency: 'Office of Information Technology',
    naicsCode: '541519',
    naicsDescription: 'Other Computer Related Services',
    setAsideType: '8A',
    setAsideDescription: '8(a) Sole Source',
    type: 'Solicitation',
    typeDescription: 'Request for Quote',
    value: 780000,
    valueFormatted: '$780,000',
    responseDeadline: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(),
    postedDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    placeOfPerformance: 'Washington, DC',
    description: 'Department of Education seeks implementation of a modern Learning Management System for internal training programs, including custom course development, user onboarding, and technical support.',
    link: 'https://sam.gov/opp/ED-OIT-2025-SaaS-001',
  },
  {
    id: 'mock-11',
    noticeId: 'FEMA-2025-EM-LOGISTICS',
    title: 'Emergency Management Logistics Support',
    solicitationNumber: 'FEMA-2025-EM-LOGISTICS',
    agency: 'Department of Homeland Security',
    subAgency: 'Federal Emergency Management Agency',
    naicsCode: '561210',
    naicsDescription: 'Facilities Support Services',
    setAsideType: 'WOSB',
    setAsideDescription: 'Women-Owned Small Business',
    type: 'Solicitation',
    typeDescription: 'Request for Proposal',
    value: 3300000,
    valueFormatted: '$3,300,000',
    responseDeadline: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000).toISOString(),
    postedDate: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    placeOfPerformance: 'Nationwide, CONUS',
    description: 'FEMA requires logistics support services for disaster response operations, including warehousing, distribution, supply chain management, and rapid deployment of emergency supplies to disaster-affected areas.',
    link: 'https://sam.gov/opp/FEMA-2025-EM-LOGISTICS',
  },
  {
    id: 'mock-12',
    noticeId: 'USDA-AMS-25-AGTECH',
    title: 'Agricultural Technology Research and Development',
    solicitationNumber: 'USDA-AMS-25-AGTECH',
    agency: 'Department of Agriculture',
    subAgency: 'Agricultural Marketing Service',
    naicsCode: '541720',
    naicsDescription: 'Research and Development in the Social Sciences and Humanities',
    setAsideType: 'SBA',
    setAsideDescription: 'Total Small Business Set-Aside',
    type: 'Solicitation',
    typeDescription: 'Sources Sought',
    value: 650000,
    valueFormatted: '$650,000',
    responseDeadline: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000).toISOString(),
    postedDate: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
    placeOfPerformance: 'Washington, DC',
    description: 'USDA AMS seeks research and development services for precision agriculture technologies, including drone-based crop monitoring, IoT sensor integration, and machine learning for yield prediction.',
    link: 'https://sam.gov/opp/USDA-AMS-25-AGTECH',
  },
]

function formatContractValue(value?: number): string {
  if (!value) return 'TBD'
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return `$${value.toLocaleString()}`
}

function transformSamOpportunity(opp: SamGovOpportunity): Contract {
  const value = opp.award?.amount
  return {
    id: opp.noticeId || Math.random().toString(36).substring(7),
    noticeId: opp.noticeId || '',
    title: opp.title || 'Untitled Opportunity',
    solicitationNumber: opp.solicitationNumber || '',
    agency: opp.departmentName || opp.fullParentPathName?.split('|')[0] || 'Unknown Agency',
    subAgency: opp.subtierName,
    naicsCode: opp.naicsCode || '',
    naicsDescription: opp.naicsDescription || '',
    setAsideType: opp.typeOfSetAside || 'NONE',
    setAsideDescription: opp.typeOfSetAsideDescription || 'No Set-Aside',
    type: opp.type || 'Solicitation',
    typeDescription: opp.type || 'Solicitation',
    value,
    valueFormatted: formatContractValue(value),
    responseDeadline: opp.responseDeadLine || new Date().toISOString(),
    postedDate: opp.postedDate || new Date().toISOString(),
    placeOfPerformance: [
      opp.placeOfPerformance?.city?.name,
      opp.placeOfPerformance?.state?.code,
    ].filter(Boolean).join(', ') || 'TBD',
    description: opp.description || '',
    link: opp.uiLink || `https://sam.gov/opp/${opp.noticeId}`,
  }
}

async function fetchContractsFromSam(naicsCode?: string): Promise<Contract[]> {
  const apiKey = process.env.SAM_GOV_API_KEY
  if (!apiKey) return MOCK_CONTRACTS

  const params = new URLSearchParams({
    api_key: apiKey,
    limit: '25',
    offset: '0',
    active: 'true',
  })
  if (naicsCode) params.set('naicsCode', naicsCode)

  const response = await fetch(
    `https://api.sam.gov/opportunities/v2/search?${params.toString()}`,
    { cache: 'no-store' }
  )

  if (!response.ok) {
    console.error('SAM.gov API error:', response.status, response.statusText)
    return MOCK_CONTRACTS
  }

  const data = await response.json()
  const opportunities: SamGovOpportunity[] = data.opportunitiesData || []
  if (opportunities.length === 0) return MOCK_CONTRACTS

  return opportunities.map(transformSamOpportunity)
}

const getCachedContracts = unstable_cache(
  fetchContractsFromSam,
  ['sam-gov-contracts'],
  { revalidate: 3600 }
)

export async function fetchContracts(profile?: CompanyProfile): Promise<Contract[]> {
  const apiKey = process.env.SAM_GOV_API_KEY
  if (!apiKey) return MOCK_CONTRACTS

  try {
    const naicsCode = profile?.naicsCodes?.[0]
    return await getCachedContracts(naicsCode)
  } catch (error) {
    console.error('Failed to fetch from SAM.gov:', error)
    return MOCK_CONTRACTS
  }
}

export async function fetchContractById(noticeId: string): Promise<Contract | null> {
  const apiKey = process.env.SAM_GOV_API_KEY

  if (!apiKey) {
    return MOCK_CONTRACTS.find(c => c.id === noticeId || c.noticeId === noticeId) || null
  }

  // Try direct noticeId lookup first
  try {
    const response = await fetch(
      `https://api.sam.gov/opportunities/v2/search?api_key=${apiKey}&noticeid=${encodeURIComponent(noticeId)}&limit=1`,
      { next: { revalidate: 3600 } }
    )

    if (response.ok) {
      const data = await response.json()
      const opportunities: SamGovOpportunity[] = data.opportunitiesData || []
      if (opportunities.length > 0) {
        return transformSamOpportunity(opportunities[0])
      }
    }
  } catch {
    // fall through to list search
  }

  // Fallback: search recent active contracts and find by noticeId
  try {
    const response = await fetch(
      `https://api.sam.gov/opportunities/v2/search?api_key=${apiKey}&limit=100&active=true`,
      { next: { revalidate: 3600 } }
    )

    if (response.ok) {
      const data = await response.json()
      const opportunities: SamGovOpportunity[] = data.opportunitiesData || []
      const match = opportunities.find(o => o.noticeId === noticeId)
      if (match) return transformSamOpportunity(match)
    }
  } catch {
    // fall through
  }

  return MOCK_CONTRACTS.find(c => c.id === noticeId || c.noticeId === noticeId) || null
}

export { MOCK_CONTRACTS }
