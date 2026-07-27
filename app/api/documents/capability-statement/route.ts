import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateCapabilityStatement } from '@/lib/documents'
import type { CompanyData, CapabilityExtras } from '@/lib/documents'

// One-click capability statement from the company profile. Available on all
// tiers — it's the hook that shows the document engine's value.
export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [dbProfile, user] = await Promise.all([
      prisma.companyProfile.findUnique({ where: { userId: session.user.id } }),
      prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true } }),
    ])

    if (!dbProfile) {
      return NextResponse.json(
        { error: 'Complete your company profile first — the capability statement is generated from it.' },
        { status: 400 }
      )
    }

    const parseArr = (s: string): string[] => {
      try {
        const v = JSON.parse(s)
        return Array.isArray(v) ? v : []
      } catch {
        return []
      }
    }

    const company: CompanyData = {
      companyName: dbProfile.companyName,
      uei: dbProfile.uei ?? undefined,
      website: dbProfile.website ?? undefined,
      yearFounded: dbProfile.yearFounded ?? undefined,
      businessTypes: parseArr(dbProfile.businessTypes),
      naicsCodes: parseArr(dbProfile.naicsCodes),
      certifications: parseArr(dbProfile.certifications),
      clearanceLevel: dbProfile.clearanceLevel ?? undefined,
      contactName: user?.name ?? undefined,
      contactEmail: user?.email ?? undefined,
    }

    const extras: CapabilityExtras = {
      capabilityStatement: dbProfile.capabilityStatement,
      pastPerformance: dbProfile.pastPerformance,
      contractVehicles: parseArr(dbProfile.contractVehicles),
      agencyHistory: parseArr(dbProfile.agencyHistory),
      orgSize: dbProfile.orgSize,
      annualRevenue: dbProfile.annualRevenue,
    }

    const content = generateCapabilityStatement(company, extras)

    const doc = await prisma.generatedDocument.create({
      data: {
        userId: session.user.id,
        type: 'capability',
        title: `Capability Statement — ${dbProfile.companyName}`,
        content,
      },
      select: { id: true, title: true },
    })

    return NextResponse.json({ id: doc.id, title: doc.title, content })
  } catch (err) {
    console.error('POST /api/documents/capability-statement error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
