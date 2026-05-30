import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateDocument } from '@/lib/documents'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const documents = await prisma.generatedDocument.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ documents })
  } catch (err) {
    console.error('Documents GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { type, contractTitle, contractAgency } = body

    if (!type) {
      return NextResponse.json({ error: 'Document type is required' }, { status: 400 })
    }

    // Get company profile
    const profile = await prisma.companyProfile.findUnique({
      where: { userId: session.user.id },
    })

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    })

    const companyData = {
      companyName: profile?.companyName || 'Your Company',
      uei: profile?.uei || undefined,
      website: profile?.website || undefined,
      yearFounded: profile?.yearFounded || undefined,
      businessTypes: profile ? (JSON.parse(profile.businessTypes) as string[]) : [],
      naicsCodes: profile ? (JSON.parse(profile.naicsCodes) as string[]) : [],
      certifications: profile ? (JSON.parse(profile.certifications) as string[]) : [],
      clearanceLevel: profile?.clearanceLevel || undefined,
      contactName: user?.name || undefined,
      contactEmail: user?.email || undefined,
    }

    const content = generateDocument(type, companyData, {
      title: contractTitle,
      agency: contractAgency,
    })

    const typeNames: Record<string, string> = {
      capability_statement: 'Capability Statement',
      letter_of_intent: 'Letter of Intent',
      past_performance: 'Past Performance Summary',
      rfi_response: 'RFI/Sources Sought Response',
      teaming_agreement: 'Teaming Agreement',
    }

    const document = await prisma.generatedDocument.create({
      data: {
        userId: session.user.id,
        type,
        title: typeNames[type] || type,
        content,
      },
    })

    return NextResponse.json({ document }, { status: 201 })
  } catch (err) {
    console.error('Documents POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
