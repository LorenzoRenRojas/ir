import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const saved = await prisma.savedContract.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ saved })
  } catch (err) {
    console.error('Saved contracts GET error:', err)
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
    const { contractId, samNoticeId, title, agency, value, deadline, matchScore } = body

    if (!contractId || !title) {
      return NextResponse.json({ error: 'contractId and title are required' }, { status: 400 })
    }

    const saved = await prisma.savedContract.upsert({
      where: {
        userId_contractId: {
          userId: session.user.id,
          contractId,
        },
      },
      update: {
        status: 'saved',
        matchScore: matchScore || null,
      },
      create: {
        userId: session.user.id,
        contractId,
        samNoticeId: samNoticeId || null,
        title,
        agency: agency || '',
        value: value || null,
        deadline: deadline ? new Date(deadline) : null,
        matchScore: matchScore || null,
        status: 'saved',
      },
    })

    return NextResponse.json({ saved }, { status: 201 })
  } catch (err) {
    console.error('Saved contracts POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const contractId = searchParams.get('contractId')

    if (!contractId) {
      return NextResponse.json({ error: 'contractId is required' }, { status: 400 })
    }

    await prisma.savedContract.deleteMany({
      where: { userId: session.user.id, contractId },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Saved contracts DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
