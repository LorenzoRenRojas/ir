import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isEmbeddingEnabled, embedTexts, updatePreferenceVector, embeddingCacheKey } from '@/lib/embeddings'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { contractId, samNoticeId, title, agency, value, deadline, matchScore } = body

    if (!contractId || !title || !agency) {
      return NextResponse.json({ error: 'contractId, title, and agency are required' }, { status: 400 })
    }

    const saved = await prisma.savedContract.upsert({
      where: { userId_contractId: { userId: session.user.id, contractId } },
      // Don't reset status on re-save — it would wipe the user's pipeline stage
      update: { matchScore },
      create: {
        userId: session.user.id,
        contractId,
        samNoticeId: samNoticeId ?? null,
        title,
        agency,
        value: value ?? null,
        deadline: deadline ? new Date(deadline) : null,
        matchScore: matchScore ?? null,
      },
    })

    // Update learned preference vector in background (non-blocking)
    if (isEmbeddingEnabled() && samNoticeId) {
      updateUserPreference(session.user.id, samNoticeId, body.contractText).catch(
        (err) => console.error('Preference update error (non-fatal):', err)
      )
    }

    return NextResponse.json({ saved })
  } catch (err) {
    console.error('Save contract error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find user's team membership, checking watchlist permission
    const membership = await prisma.teamMember.findFirst({
      where: { userId: session.user.id },
      include: { team: { include: { members: true } } },
    })

    let teamUserIds: string[]
    if (!membership) {
      teamUserIds = [session.user.id]
    } else {
      const perms = JSON.parse(membership.permissions as string) as { canManageWatchlist?: boolean }
      if (perms.canManageWatchlist === false) {
        // No watchlist access — only show their own saves
        teamUserIds = [session.user.id]
      } else {
        teamUserIds = membership.team.members.map((m: { userId: string }) => m.userId)
      }
    }

    let saved
    try {
      saved = await prisma.savedContract.findMany({
        where: { userId: { in: teamUserIds } },
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, email: true } } },
      })
    } catch {
      // Pre-migration DB without the notes column — select explicitly and default it
      const rows = await prisma.savedContract.findMany({
        where: { userId: { in: teamUserIds } },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, userId: true, contractId: true, samNoticeId: true, title: true,
          agency: true, value: true, deadline: true, matchScore: true, status: true,
          createdAt: true, user: { select: { name: true, email: true } },
        },
      })
      saved = rows.map((r: (typeof rows)[number]) => ({ ...r, notes: null }))
    }

    // Deduplicate by contractId, keeping latest
    const seen = new Set<string>()
    const deduplicated = saved.filter((c: (typeof saved)[number]) => {
      if (seen.has(c.contractId)) return false
      seen.add(c.contractId)
      return true
    })

    return NextResponse.json({ saved: deduplicated })
  } catch (err) {
    console.error('Get saved contracts error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function updateUserPreference(userId: string, noticeId: string, contractText?: string) {
  // Get or compute the contract's embedding
  let contractEmb: number[] | null = null
  const cacheKey = embeddingCacheKey(noticeId)
  const cached = await prisma.contractEmbedding.findUnique({ where: { noticeId: cacheKey } })
  if (cached) {
    contractEmb = JSON.parse(cached.embedding)
  } else if (contractText) {
    const [vec] = await embedTexts([contractText])
    contractEmb = vec
    await prisma.contractEmbedding.upsert({
      where: { noticeId: cacheKey },
      update: { embedding: JSON.stringify(vec) },
      create: { noticeId: cacheKey, embedding: JSON.stringify(vec) },
    })
  }
  if (!contractEmb) return

  // Update EMA preference vector
  const current = await prisma.userEmbedding.findUnique({ where: { userId } })
  const currentVec = current ? JSON.parse(current.preferenceEmbedding) as number[] : null
  const updated = updatePreferenceVector(currentVec, contractEmb)

  await prisma.userEmbedding.upsert({
    where: { userId },
    update: {
      preferenceEmbedding: JSON.stringify(updated),
      saveCount: { increment: 1 },
    },
    create: {
      userId,
      preferenceEmbedding: JSON.stringify(updated),
      saveCount: 1,
    },
  })
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

    // deleteMany: a double-click or stale UI on an already-removed row is a
    // no-op, not a P2025 throw → 500
    await prisma.savedContract.deleteMany({
      where: { userId: session.user.id, contractId },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete saved contract error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const PIPELINE_STAGES = ['saved', 'pursuing', 'submitted', 'won', 'lost'] as const

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { contractId, status, notes } = await req.json()
    if (!contractId || (status === undefined && notes === undefined)) {
      return NextResponse.json({ error: 'contractId and a status or notes update are required' }, { status: 400 })
    }
    if (status !== undefined && !PIPELINE_STAGES.includes(status)) {
      return NextResponse.json({ error: `status must be one of: ${PIPELINE_STAGES.join(', ')}` }, { status: 400 })
    }
    if (notes !== undefined && (typeof notes !== 'string' || notes.length > 10_000)) {
      return NextResponse.json({ error: 'notes must be a string under 10k characters' }, { status: 400 })
    }

    let updated
    try {
      updated = await prisma.savedContract.update({
        where: { userId_contractId: { userId: session.user.id, contractId } },
        data: {
          ...(status !== undefined ? { status } : {}),
          ...(notes !== undefined ? { notes } : {}),
        },
      })
    } catch (err) {
      if ((err as { code?: string })?.code === 'P2025') {
        return NextResponse.json({ error: 'Contract is no longer in your pipeline' }, { status: 404 })
      }
      throw err
    }

    return NextResponse.json({ saved: updated })
  } catch (err) {
    console.error('Update saved contract status error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
