import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TOP_NAICS_CODES } from '@/lib/naics'
import { fetchRegulatoryEvents } from '@/lib/federal-register'

export const dynamic = 'force-dynamic'

// Turn a company's NAICS sectors into Federal Register full-text search terms,
// so the regulatory feed reflects the rules most likely to drive demand in
// their space. Broad on purpose — this is market awareness, not a per-contract
// signal.
const SECTOR_TERMS: Record<string, string> = {
  'Information Technology': 'cybersecurity information technology',
  'Professional Services': 'management services',
  'Engineering': 'engineering infrastructure',
  'Security & Defense': 'defense security',
  'Research & Development': 'research development',
  'Healthcare': 'health medical',
  'Construction': 'construction',
  'Environmental': 'environmental',
  'Logistics': 'logistics supply chain',
  'Facilities Management': 'facilities',
}

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const p = JSON.parse(value)
    return Array.isArray(p) ? p.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ events: [], term: '' }, { status: 200 })
    }

    // Derive the search term from the company's NAICS sectors.
    let term = ''
    try {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { companyProfile: { select: { naicsCodes: true } } },
      })
      const codes = parseJsonArray(user?.companyProfile?.naicsCodes)
      const sectors = new Set<string>()
      for (const code of codes) {
        const entry = TOP_NAICS_CODES.find((n) => n.code === code)
        if (entry) sectors.add(entry.sector)
      }
      const terms = [...sectors]
        .map((s) => SECTOR_TERMS[s])
        .filter(Boolean)
        .slice(0, 2) // keep the query focused
      term = terms.join(' ')
    } catch {
      /* profile unreadable — fall back to the general recent-rules feed */
    }

    const events = await fetchRegulatoryEvents(term, 6, 60)
    return NextResponse.json({ events, term }, { status: 200 })
  } catch {
    // Never let this feature break the dashboard — worst case, empty feed.
    return NextResponse.json({ events: [], term: '' }, { status: 200 })
  }
}
