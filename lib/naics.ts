export interface NaicsCode {
  code: string
  description: string
  sector: string
}

// Top 30 government-relevant NAICS codes
export const TOP_NAICS_CODES: NaicsCode[] = [
  // Information Technology
  { code: '541511', description: 'Custom Computer Programming Services', sector: 'Information Technology' },
  { code: '541512', description: 'Computer Systems Design Services', sector: 'Information Technology' },
  { code: '541513', description: 'Computer Facilities Management Services', sector: 'Information Technology' },
  { code: '541519', description: 'Other Computer Related Services', sector: 'Information Technology' },
  { code: '518210', description: 'Computing Infrastructure Providers, Data Processing, Web Hosting, and Related Services', sector: 'Information Technology' },

  // Professional Services
  { code: '541611', description: 'Administrative Management and General Management Consulting Services', sector: 'Professional Services' },
  { code: '541612', description: 'Human Resources Consulting Services', sector: 'Professional Services' },
  { code: '541614', description: 'Process, Physical Distribution, and Logistics Consulting Services', sector: 'Professional Services' },
  { code: '541618', description: 'Other Management Consulting Services', sector: 'Professional Services' },
  { code: '541690', description: 'Other Scientific and Technical Consulting Services', sector: 'Professional Services' },

  // Engineering
  { code: '541310', description: 'Architectural Services', sector: 'Engineering' },
  { code: '541330', description: 'Engineering Services', sector: 'Engineering' },
  { code: '541380', description: 'Testing Laboratories and Services', sector: 'Engineering' },
  { code: '541490', description: 'Other Specialized Design Services', sector: 'Engineering' },

  // Security & Defense
  { code: '561612', description: 'Security Guards and Patrol Services', sector: 'Security & Defense' },
  { code: '541990', description: 'All Other Professional, Scientific, and Technical Services', sector: 'Security & Defense' },

  // Research & Development
  { code: '541715', description: 'Research and Development in the Physical, Engineering, and Life Sciences', sector: 'Research & Development' },
  { code: '541720', description: 'Research and Development in the Social Sciences and Humanities', sector: 'Research & Development' },

  // Healthcare
  { code: '621111', description: 'Offices of Physicians (except Mental Health Specialists)', sector: 'Healthcare' },
  { code: '621610', description: 'Home Health Care Services', sector: 'Healthcare' },
  { code: '621910', description: 'Ambulance Services', sector: 'Healthcare' },

  // Construction
  { code: '236220', description: 'Commercial and Institutional Building Construction', sector: 'Construction' },
  { code: '237310', description: 'Highway, Street, and Bridge Construction', sector: 'Construction' },
  { code: '237990', description: 'Other Heavy and Civil Engineering Construction', sector: 'Construction' },
  { code: '238210', description: 'Electrical Contractors and Other Wiring Installation Contractors', sector: 'Construction' },

  // Logistics & Transportation
  { code: '488510', description: 'Freight Transportation Arrangement', sector: 'Logistics' },
  { code: '493110', description: 'General Warehousing and Storage', sector: 'Logistics' },

  // Environmental
  { code: '562910', description: 'Remediation Services', sector: 'Environmental' },
  { code: '541620', description: 'Environmental Consulting Services', sector: 'Environmental' },

  // Facilities
  { code: '561210', description: 'Facilities Support Services', sector: 'Facilities Management' },
]

export function searchNaicsCodes(query: string): NaicsCode[] {
  const q = query.toLowerCase()
  return TOP_NAICS_CODES.filter(
    n =>
      n.code.includes(q) ||
      n.description.toLowerCase().includes(q) ||
      n.sector.toLowerCase().includes(q)
  )
}

export function getNaicsDescription(code: string): string {
  return TOP_NAICS_CODES.find(n => n.code === code)?.description || code
}
