import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateProposal } from '@/lib/documents'
import type { CompanyData, ProposalContext } from '@/lib/documents'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const subscriptionTier = session.user.subscriptionTier ?? 'free'
    if (subscriptionTier === 'free') {
      return NextResponse.json(
        { error: 'Upgrade your plan to generate proposals.' },
        { status: 403 }
      )
    }

    if (subscriptionTier === 'starter') {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      const monthlyCount = await prisma.generatedDocument.count({
        where: { userId: session.user.id, createdAt: { gte: startOfMonth } },
      })
      if (monthlyCount >= 3) {
        return NextResponse.json(
          { error: "You've reached your monthly proposal limit. Upgrade to Pro for unlimited proposals." },
          { status: 403 }
        )
      }
    }

    const body = await req.json()
    const { contractTitle, agencyName, solicitationNumber, issuingOffice, responseDeadline, estimatedValue, placeOfPerformance, noticeId } = body

    if (!contractTitle || !agencyName) {
      return NextResponse.json({ error: 'Contract title and agency name are required.' }, { status: 400 })
    }

    const [dbProfile, user] = await Promise.all([
      prisma.companyProfile.findUnique({ where: { userId: session.user.id } }),
      prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true } }),
    ])

    const parseArr = (s: string | undefined | null): string[] => {
      try {
        const v = JSON.parse(s ?? '[]')
        return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
      } catch {
        return []
      }
    }
    const companyData: CompanyData = {
      companyName: dbProfile?.companyName ?? 'Your Company',
      uei: dbProfile?.uei ?? undefined,
      website: dbProfile?.website ?? undefined,
      yearFounded: dbProfile?.yearFounded ?? undefined,
      businessTypes: parseArr(dbProfile?.businessTypes),
      naicsCodes: parseArr(dbProfile?.naicsCodes),
      certifications: parseArr(dbProfile?.certifications),
      clearanceLevel: dbProfile?.clearanceLevel ?? undefined,
      contactName: user?.name ?? undefined,
      contactEmail: user?.email ?? undefined,
    }

    const ctx: ProposalContext = {
      contractTitle,
      agencyName,
      solicitationNumber: solicitationNumber || undefined,
      issuingOffice: issuingOffice || undefined,
      responseDeadline: responseDeadline || undefined,
      estimatedValue: estimatedValue || undefined,
      placeOfPerformance: placeOfPerformance || undefined,
    }

    const content = generateProposal(companyData, ctx)
    const title = `Proposal — ${contractTitle}`

    const doc = await prisma.generatedDocument.create({
      data: {
        userId: session.user.id,
        type: 'proposal',
        title,
        content,
        noticeId: noticeId || null,
        contractTitle,
        agencyName,
      },
    })

    return NextResponse.json({ document: doc, content })
  } catch (err) {
    console.error('Proposal generate error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const docs = await prisma.generatedDocument.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, type: true, title: true, contractTitle: true, agencyName: true, noticeId: true, createdAt: true } as const,
    })

    return NextResponse.json({ documents: docs })
  } catch (err) {
    console.error('Proposals GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
