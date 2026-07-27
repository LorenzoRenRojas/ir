import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  generateSourcesSought,
  generateCoverLetter,
  type CompanyData,
} from '@/lib/documents'

// Generic generator for the shorter, all-tier document types (Sources Sought
// responses, cover letters). Pre-fills from the company profile so the user
// only supplies the notice-specific fields. Proposals and capability statements
// keep their own routes.
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const docType: string = body.docType

    const [dbProfile, user] = await Promise.all([
      prisma.companyProfile.findUnique({ where: { userId: session.user.id } }),
      prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true } }),
    ])

    if (!dbProfile) {
      return NextResponse.json(
        { error: 'Complete your company profile first — documents are generated from it.' },
        { status: 400 }
      )
    }

    const parseArr = (s: string | null | undefined): string[] => {
      try {
        const v = JSON.parse(s ?? '[]')
        return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
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

    let content: string
    let title: string
    let type: string

    if (docType === 'sources_sought') {
      const noticeTitle = (body.noticeTitle ?? '').trim()
      const agencyName = (body.agencyName ?? '').trim()
      if (!noticeTitle || !agencyName) {
        return NextResponse.json({ error: 'Notice title and agency are required.' }, { status: 400 })
      }
      content = generateSourcesSought(company, {
        noticeTitle,
        agencyName,
        solicitationNumber: body.solicitationNumber || undefined,
        requirementSummary: body.requirementSummary || undefined,
      })
      title = `Sources Sought Response — ${noticeTitle}`
      type = 'sources_sought'
    } else if (docType === 'cover_letter') {
      const contractTitle = (body.contractTitle ?? '').trim()
      const agencyName = (body.agencyName ?? '').trim()
      if (!contractTitle || !agencyName) {
        return NextResponse.json({ error: 'Contract title and agency are required.' }, { status: 400 })
      }
      content = generateCoverLetter(company, {
        contractTitle,
        agencyName,
        solicitationNumber: body.solicitationNumber || undefined,
        officerName: body.officerName || undefined,
      })
      title = `Cover Letter — ${contractTitle}`
      type = 'cover_letter'
    } else {
      return NextResponse.json({ error: 'Unknown document type.' }, { status: 400 })
    }

    const doc = await prisma.generatedDocument.create({
      data: { userId: session.user.id, type, title, content },
      select: { id: true, title: true },
    })

    return NextResponse.json({ id: doc.id, title: doc.title, content })
  } catch (err) {
    console.error('Document create error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
