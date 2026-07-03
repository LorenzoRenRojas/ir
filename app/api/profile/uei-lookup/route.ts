import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { rateLimit, ipKey } from '@/lib/rate-limit'

// SAM.gov business-type codes → the certification labels our matching uses
const BUSINESS_TYPE_MAP: Record<string, string> = {
  '2X': 'Small Business',
  '8W': 'WOSB',
  '27': 'SDVOSB',
  'A2': 'WOSB',
  'A5': 'SDVOSB',
  'QF': 'SDVOSB',
  'XX': 'HUBZone',
  'A8': '8(a)',
  'JT': '8(a)',
  'NB': 'Small Business',
}

// GET /api/profile/uei-lookup?uei=XXXXXXXXXXXX
// Pulls the company's official SAM.gov registration and returns profile
// fields ready to prefill: name, website, NAICS codes, certifications.
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { allowed } = rateLimit(ipKey(req, 'uei'), 10, 10 * 60_000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many lookups. Please wait a moment.' }, { status: 429 })
  }

  const uei = new URL(req.url).searchParams.get('uei')?.trim().toUpperCase()
  if (!uei || !/^[A-Z0-9]{12}$/.test(uei)) {
    return NextResponse.json({ error: 'A valid 12-character UEI is required.' }, { status: 400 })
  }

  const apiKey = process.env.SAM_GOV_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'SAM.gov lookup is not configured on this environment.' }, { status: 503 })
  }

  try {
    const res = await fetch(
      `https://api.sam.gov/entity-information/v3/entities?api_key=${apiKey}&ueiSAM=${uei}&includeSections=entityRegistration,coreData,assertions`,
      { cache: 'no-store', signal: AbortSignal.timeout(15_000) }
    )

    if (!res.ok) {
      const body = await res.text()
      console.error('SAM entity API error:', res.status, body.slice(0, 300))
      return NextResponse.json(
        { error: res.status === 429 ? 'SAM.gov rate limit hit — try again in a minute.' : 'SAM.gov lookup failed. Check the UEI and try again.' },
        { status: 502 }
      )
    }

    const data = await res.json()
    const entity = data.entityData?.[0]
    if (!entity) {
      return NextResponse.json(
        { error: 'No SAM.gov registration found for this UEI. Make sure your registration is active and public.' },
        { status: 404 }
      )
    }

    const reg = entity.entityRegistration ?? {}
    const core = entity.coreData ?? {}
    const assertions = entity.assertions ?? {}

    const naicsList: { naicsCode?: string; sbaSmallBusiness?: string }[] =
      assertions.goodsAndServices?.naicsList ?? []
    const naicsCodes: string[] = Array.from(
      new Set(naicsList.map(n => n.naicsCode).filter((c): c is string => !!c))
    )

    const businessTypeList: { businessTypeCode?: string; businessTypeDesc?: string }[] =
      core.businessTypes?.businessTypeList ?? []
    const certifications: string[] = Array.from(
      new Set(
        businessTypeList
          .map(b => (b.businessTypeCode && BUSINESS_TYPE_MAP[b.businessTypeCode]) || null)
          .filter((c): c is string => !!c)
      )
    )

    const startDate: string | undefined = core.entityInformation?.entityStartDate
    const yearFounded = startDate ? parseInt(startDate.slice(0, 4), 10) : undefined

    return NextResponse.json({
      found: true,
      profile: {
        companyName: reg.legalBusinessName ?? null,
        dbaName: reg.dbaName ?? null,
        uei,
        cageCode: reg.cageCode ?? null,
        website: core.entityInformation?.entityURL ?? null,
        yearFounded: yearFounded && !isNaN(yearFounded) ? yearFounded : null,
        naicsCodes,
        certifications,
        registrationStatus: reg.registrationStatus ?? null,
        physicalAddress: core.physicalAddress
          ? [core.physicalAddress.city, core.physicalAddress.stateOrProvinceCode].filter(Boolean).join(', ')
          : null,
      },
    })
  } catch (err) {
    console.error('UEI lookup error:', err)
    return NextResponse.json({ error: 'SAM.gov lookup timed out. Try again.' }, { status: 504 })
  }
}
