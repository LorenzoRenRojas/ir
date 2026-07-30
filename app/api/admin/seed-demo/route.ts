import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'
import { generateCapabilityStatement, type CompanyData, type CapabilityExtras } from '@/lib/documents'

// One-click demo account for live pitches (e.g. the APEX convention). Creates —
// or resets — a fully populated Pro account so a demo never depends on live
// data cooperating: complete company profile, a multi-stage bid pipeline, and a
// generated capability statement. Idempotent; safe to re-run before every demo.
//
// The feed itself stays real (the warm ContractCache), and the dashboard
// suppresses the SAMPLE-DATA banner for this account, so even if SAM.gov is
// down mid-pitch the demo still looks clean.
export const DEMO_EMAIL = 'demo@ir-gov.app'
const DEMO_PASSWORD = 'IRDemo!2026'

const DEMO_COMPANY: CompanyData = {
  companyName: 'Meridian Federal Solutions LLC',
  uei: 'MERIDIANFED01',
  cageCode: '9XYZ4',
  website: 'https://meridianfed.example',
  yearFounded: 2018,
  businessTypes: ['Small Business', '8(a) Certified', 'SDVOSB'],
  naicsCodes: ['541512', '541519', '541611', '541690'],
  certifications: ['ISO 27001', 'CMMI Level 3', 'Secret Clearance'],
  clearanceLevel: 'Secret',
  contactName: 'Jordan Ellis',
  contactEmail: DEMO_EMAIL,
  contactPhone: '(407) 555-0142',
  address: '2200 Innovation Way, Orlando, FL 32801',
}

const DEMO_EXTRAS: CapabilityExtras = {
  capabilityStatement:
    'Meridian Federal Solutions delivers cloud modernization, cybersecurity operations, and IT systems integration for civilian and defense agencies. We specialize in AWS GovCloud migrations, 24/7 SOC support, and zero-trust architecture for small-footprint agency environments.',
  pastPerformance:
    'Delivered a $2.1M SOC modernization for a DHS component across 14 field offices with zero CPARS findings; migrated 40+ legacy applications to AWS GovCloud for a VA medical center program.',
  contractVehicles: ['GSA MAS', '8(a) STARS III'],
  agencyHistory: ['Department of Homeland Security', 'Department of Veterans Affairs', 'General Services Administration'],
  orgSize: '11 – 50',
  annualRevenue: '$5M – $25M',
}

// A realistic, multi-stage pipeline. Deadlines are relative to "now" so the
// demo always shows live-looking countdowns.
const days = (n: number) => new Date(Date.now() + n * 86_400_000)
const DEMO_PIPELINE = [
  { contractId: 'demo-c1', title: 'Cloud Migration & Modernization Services', agency: 'General Services Administration', value: 3200000, deadline: days(18), matchScore: 92, status: 'pursuing' },
  { contractId: 'demo-c2', title: 'Cybersecurity Operations Center Support', agency: 'Department of Homeland Security', value: 2200000, deadline: days(11), matchScore: 88, status: 'submitted' },
  { contractId: 'demo-c3', title: 'Healthcare IT Systems Integration', agency: 'Department of Veterans Affairs', value: 4500000, deadline: days(26), matchScore: 81, status: 'saved' },
  { contractId: 'demo-c4', title: 'Zero-Trust Architecture Implementation', agency: 'Department of the Air Force', value: 1650000, deadline: days(9), matchScore: 79, status: 'pursuing' },
  { contractId: 'demo-c5', title: 'Enterprise Help Desk & Network Support', agency: 'Department of the Army', value: 980000, deadline: days(-4), matchScore: 84, status: 'won' },
  { contractId: 'demo-c6', title: 'Data Center Consolidation Study', agency: 'Department of Energy', value: 540000, deadline: days(-12), matchScore: 63, status: 'lost' },
]

function J(v: string[]): string { return JSON.stringify(v) }

export async function POST() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const password = await bcrypt.hash(DEMO_PASSWORD, 12)

    // 1) The user — Pro, verified, onboarded.
    const user = await prisma.user.upsert({
      where: { email: DEMO_EMAIL },
      update: { password, name: DEMO_COMPANY.contactName, subscriptionTier: 'pro', onboardingDone: true, emailVerified: new Date() },
      create: { email: DEMO_EMAIL, password, name: DEMO_COMPANY.contactName, subscriptionTier: 'pro', onboardingDone: true, emailVerified: new Date() },
      select: { id: true },
    })

    // 2) Company profile.
    const profileData = {
      companyName: DEMO_COMPANY.companyName,
      uei: DEMO_COMPANY.uei ?? null,
      website: DEMO_COMPANY.website ?? null,
      yearFounded: DEMO_COMPANY.yearFounded ?? null,
      businessTypes: J(DEMO_COMPANY.businessTypes),
      naicsCodes: J(DEMO_COMPANY.naicsCodes),
      contractSizePrefs: J(['Mid ($250K–$5M)']),
      contractTypePrefs: J(['Services', 'IT/Technology']),
      geoPrefs: J(['CONUS', 'DC Metro Area', 'Florida']),
      certifications: J(DEMO_COMPANY.certifications),
      clearanceLevel: DEMO_COMPANY.clearanceLevel ?? null,
      contractVehicles: J(DEMO_EXTRAS.contractVehicles ?? []),
      agencyHistory: J(DEMO_EXTRAS.agencyHistory ?? []),
      orgSize: DEMO_EXTRAS.orgSize ?? null,
      annualRevenue: DEMO_EXTRAS.annualRevenue ?? null,
      capabilityStatement: DEMO_EXTRAS.capabilityStatement ?? null,
      pastPerformance: DEMO_EXTRAS.pastPerformance ?? null,
    }
    await prisma.companyProfile.upsert({
      where: { userId: user.id },
      update: profileData,
      create: { userId: user.id, ...profileData },
      select: { id: true },
    })

    // 3) Pipeline — reset then seed across every stage.
    await prisma.savedContract.deleteMany({ where: { userId: user.id } })
    for (const c of DEMO_PIPELINE) {
      await prisma.savedContract.create({
        data: {
          userId: user.id,
          contractId: c.contractId,
          samNoticeId: c.contractId,
          title: c.title,
          agency: c.agency,
          value: c.value,
          deadline: c.deadline,
          matchScore: c.matchScore,
          status: c.status,
        },
        select: { id: true },
      })
    }

    // 4) A generated capability statement in the Doc Suite.
    await prisma.generatedDocument.deleteMany({ where: { userId: user.id } })
    await prisma.generatedDocument.create({
      data: {
        userId: user.id,
        type: 'capability',
        title: `Capability Statement — ${DEMO_COMPANY.companyName}`,
        content: generateCapabilityStatement(DEMO_COMPANY, DEMO_EXTRAS),
      },
      select: { id: true },
    })

    return NextResponse.json({
      success: true,
      login: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
      seeded: { pipeline: DEMO_PIPELINE.length, documents: 1 },
    })
  } catch (err) {
    console.error('Seed demo error:', err)
    return NextResponse.json({ error: 'Internal server error', detail: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
