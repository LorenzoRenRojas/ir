import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateDocument, DOCUMENT_TEMPLATES } from '@/lib/documents'
import type { CompanyData } from '@/lib/documents'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { type, contractTitle, agency } = body

    if (!type) {
      return NextResponse.json({ error: 'Document type is required' }, { status: 400 })
    }

    // Subscription tier enforcement
    const subscriptionTier = session.user.subscriptionTier ?? 'free'

    if (subscriptionTier === 'free') {
      return NextResponse.json(
        { error: 'Upgrade your plan to generate documents' },
        { status: 403 }
      )
    }

    if (subscriptionTier === 'starter') {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const monthlyCount = await prisma.generatedDocument.count({
        where: {
          userId: session.user.id,
          createdAt: { gte: startOfMonth },
        },
      })

      if (monthlyCount >= 3) {
        return NextResponse.json(
          { error: "You've reached your monthly document limit. Upgrade to Pro for unlimited documents." },
          { status: 403 }
        )
      }
    }

    // Load company profile
    const dbProfile = await prisma.companyProfile.findUnique({
      where: { userId: session.user.id },
    })

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    })

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

    const content = generateDocument(type, companyData, { title: contractTitle, agency })

    const template = DOCUMENT_TEMPLATES.find((t) => t.type === type)
    const title = `${template?.name ?? type} — ${contractTitle ?? new Date().toLocaleDateString()}`

    // Save to DB
    const doc = await prisma.generatedDocument.create({
      data: {
        userId: session.user.id,
        type,
        title,
        content,
      },
    })

    return NextResponse.json({ document: doc, content })
  } catch (err) {
    console.error('Document generate error:', err)
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
      select: { id: true, type: true, title: true, createdAt: true },
    })

    return NextResponse.json({ documents: docs })
  } catch (err) {
    console.error('Documents GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
