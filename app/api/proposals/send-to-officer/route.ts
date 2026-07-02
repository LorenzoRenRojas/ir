import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchContractById } from '@/lib/sam-api'
import { sendProposalToOfficerEmail } from '@/lib/email'

// POST { documentId, dryRun? }
// dryRun: true  → resolve and return the contracting officer contact (no send)
// dryRun: false → send the proposal to that contact, replies routed to the user
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { documentId, dryRun = false } = await req.json()
    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 })
    }

    const doc = await prisma.generatedDocument.findFirst({
      where: { id: documentId, userId: session.user.id },
    })
    if (!doc) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }
    if (!doc.noticeId) {
      return NextResponse.json(
        { error: 'This proposal is not linked to a SAM.gov notice, so there is no contracting officer on file.' },
        { status: 400 }
      )
    }

    const contract = await fetchContractById(doc.noticeId)
    const contact = contract?.pointsOfContact?.[0]
    if (!contact) {
      return NextResponse.json(
        { error: 'SAM.gov does not list a point-of-contact email for this notice. Check the notice on sam.gov directly.' },
        { status: 404 }
      )
    }

    if (dryRun) {
      return NextResponse.json({ contact, contractTitle: contract!.title })
    }

    const profile = await prisma.companyProfile.findUnique({
      where: { userId: session.user.id },
      select: { companyName: true },
    })

    try {
      await sendProposalToOfficerEmail(
        contact.email,
        contact.name,
        session.user.name ?? session.user.email,
        session.user.email,
        profile?.companyName ?? session.user.name ?? 'Our company',
        doc.contractTitle ?? contract!.title,
        contract!.solicitationNumber,
        doc.content
      )
    } catch (err) {
      return NextResponse.json(
        { error: `Send failed: ${err instanceof Error ? err.message : 'unknown error'}` },
        { status: 502 }
      )
    }

    return NextResponse.json({ sent: true, to: contact.email })
  } catch (err) {
    console.error('POST /api/proposals/send-to-officer error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
