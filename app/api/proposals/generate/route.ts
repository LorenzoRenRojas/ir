import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateFullProposal } from '@/lib/documents'
import type { CompanyData, FullProposalQuestionnaire } from '@/lib/documents'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const subscriptionTier = session.user.subscriptionTier ?? 'free'
    if (subscriptionTier === 'free') {
      return NextResponse.json({ error: 'Upgrade your plan to generate proposals.' }, { status: 403 })
    }

    if (subscriptionTier === 'starter') {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      const count = await prisma.generatedDocument.count({
        where: { userId: session.user.id, createdAt: { gte: startOfMonth } },
      })
      if (count >= 3) {
        return NextResponse.json(
          { error: "You've reached your monthly proposal limit. Upgrade to Pro for unlimited proposals." },
          { status: 403 }
        )
      }
    }

    const questionnaire = (await req.json()) as FullProposalQuestionnaire

    if (!questionnaire.contractTitle || !questionnaire.agencyName) {
      return NextResponse.json({ error: 'Contract title and agency name are required.' }, { status: 400 })
    }

    const [dbProfile, user] = await Promise.all([
      prisma.companyProfile.findUnique({ where: { userId: session.user.id } }),
      prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true } }),
    ])

    const companyData: CompanyData = {
      companyName: dbProfile?.companyName ?? 'Your Company',
      uei: dbProfile?.uei ?? undefined,
      website: dbProfile?.website ?? undefined,
      yearFounded: dbProfile?.yearFounded ?? undefined,
      businessTypes: dbProfile ? (JSON.parse(dbProfile.businessTypes) as string[]) : [],
      naicsCodes: dbProfile ? (JSON.parse(dbProfile.naicsCodes) as string[]) : [],
      certifications: dbProfile ? (JSON.parse(dbProfile.certifications) as string[]) : [],
      clearanceLevel: dbProfile?.clearanceLevel ?? undefined,
      contactName: user?.name ?? undefined,
      contactEmail: user?.email ?? undefined,
    }

    const content = generateFullProposal(companyData, questionnaire)

    const doc = await prisma.generatedDocument.create({
      data: {
        userId: session.user.id,
        type: 'proposal_full',
        title: `Proposal — ${questionnaire.contractTitle}`,
        content,
        contractTitle: questionnaire.contractTitle,
        agencyName: questionnaire.agencyName,
        noticeId: null,
      },
    })

    return NextResponse.json({ document: doc, content })
  } catch (err) {
    console.error('Full proposal generate error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
