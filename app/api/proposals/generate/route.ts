import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { draftProposal } from '@/lib/proposal-engine'
import type { CompanyData, FullProposalQuestionnaire } from '@/lib/documents'

// A Claude-drafted 4-volume proposal streams for a while — give the route
// real headroom instead of the Hobby ~10s default
export const maxDuration = 300

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

    // Sanitize the raw body against a complete default shape — clients restore
    // drafts from localStorage wholesale, so a draft saved before a field was
    // added arrives with that field missing, and the generator would either
    // crash (.map/.split on undefined) or bake the literal string "undefined"
    // into a federal proposal document
    const raw = (await req.json()) as Partial<FullProposalQuestionnaire>
    const str = (v: unknown): string => (typeof v === 'string' ? v : '')
    const phase = (v: unknown) => {
      const p = (v ?? {}) as Record<string, unknown>
      return { name: str(p.name), timeline: str(p.timeline), deliverables: str(p.deliverables), approach: str(p.approach) }
    }
    const person = (v: unknown) => {
      const p = (v ?? {}) as Record<string, unknown>
      return { name: str(p.name), title: str(p.title), clearance: str(p.clearance), experience: str(p.experience), quals: str(p.quals) }
    }
    const questionnaire: FullProposalQuestionnaire = {
      contractTitle: str(raw.contractTitle), agencyName: str(raw.agencyName),
      solicitationNumber: str(raw.solicitationNumber), issuingOffice: str(raw.issuingOffice),
      responseDeadline: str(raw.responseDeadline), estimatedValue: str(raw.estimatedValue),
      contractType: str(raw.contractType), naicsCode: str(raw.naicsCode),
      placeOfPerformance: str(raw.placeOfPerformance), requirementSummary: str(raw.requirementSummary),
      keyObjectives: str(raw.keyObjectives), overallApproach: str(raw.overallApproach),
      phase1: phase(raw.phase1), phase2: phase(raw.phase2), phase3: phase(raw.phase3),
      toolsTechnologies: str(raw.toolsTechnologies), qualityApproach: str(raw.qualityApproach),
      risks: Array.isArray(raw.risks)
        ? raw.risks.map(r => ({ description: str(r?.description), likelihood: str(r?.likelihood), impact: str(r?.impact), mitigation: str(r?.mitigation) }))
        : [],
      pm: person(raw.pm), techLead: person(raw.techLead),
      additionalPersonnel: str(raw.additionalPersonnel),
      subName: str(raw.subName), subRole: str(raw.subRole),
      subPercent: str(raw.subPercent), primePercent: str(raw.primePercent),
      pp: Array.isArray(raw.pp)
        ? raw.pp.map(p => ({
            title: str(p?.title), agency: str(p?.agency), contractNumber: str(p?.contractNumber),
            contractType: str(p?.contractType), value: str(p?.value), startDate: str(p?.startDate),
            endDate: str(p?.endDate), description: str(p?.description), relevance: str(p?.relevance),
            outcomes: str(p?.outcomes), refName: str(p?.refName), refTitle: str(p?.refTitle),
            refPhone: str(p?.refPhone), refEmail: str(p?.refEmail),
          }))
        : [],
      baseYear: str(raw.baseYear), oy1: str(raw.oy1), oy2: str(raw.oy2),
      oy3: str(raw.oy3), oy4: str(raw.oy4), totalPrice: str(raw.totalPrice),
      amendments: str(raw.amendments),
    }

    if (!questionnaire.contractTitle || !questionnaire.agencyName) {
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

    const { content, mode } = await draftProposal(companyData, questionnaire)

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
      select: { id: true, title: true, content: true, createdAt: true },
    })

    // mode tells the UI whether Claude drafted this or the template did, so it
    // can badge the result honestly ("AI-drafted" vs "Template draft")
    return NextResponse.json({ document: doc, content, mode })
  } catch (err) {
    console.error('Full proposal generate error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
