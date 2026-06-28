import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendProposalEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { documentId } = await req.json()
    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required.' }, { status: 400 })
    }

    // Load the proposal
    const doc = await prisma.generatedDocument.findFirst({
      where: { id: documentId, userId: session.user.id },
    })
    if (!doc) {
      return NextResponse.json({ error: 'Proposal not found.' }, { status: 404 })
    }

    // Get the sender's name
    const sender = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    })
    const senderName = sender?.name ?? sender?.email ?? 'Your colleague'

    // Find all team members in all teams this user belongs to
    const memberships = await prisma.teamMember.findMany({
      where: { userId: session.user.id },
      select: { teamId: true },
    })

    const teamIds = memberships.map((m) => m.teamId)

    if (teamIds.length === 0) {
      return NextResponse.json({ error: 'You have no team members to send to. Invite team members from the Team page first.', sent: 0 })
    }

    const allMembers = await prisma.teamMember.findMany({
      where: {
        teamId: { in: teamIds },
        userId: { not: session.user.id },
      },
      include: { user: { select: { email: true, name: true } } },
    })

    // Deduplicate by email
    const seen = new Set<string>()
    const recipients = allMembers
      .map((m) => m.user)
      .filter((u) => {
        if (!u.email || seen.has(u.email)) return false
        seen.add(u.email)
        return true
      })

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No other team members found. Invite people from the Team page first.', sent: 0 })
    }

    const baseUrl = process.env.NEXTAUTH_URL ?? 'https://ir-gov.app'
    const viewUrl = `${baseUrl}/documents`

    const results = await Promise.allSettled(
      recipients.map((u) =>
        sendProposalEmail(
          u.email!,
          senderName,
          doc.title,
          doc.contractTitle ?? doc.title,
          doc.agencyName ?? '',
          doc.content,
          viewUrl
        )
      )
    )

    const sent = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.length - sent

    return NextResponse.json({
      sent,
      failed,
      total: recipients.length,
      recipients: recipients.map((u) => u.email),
    })
  } catch (err) {
    console.error('Proposal email error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
