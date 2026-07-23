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

    // Sanitize every value crossing into the DB — a bad type here is the
    // classic silent 500. A malformed/date-only deadline becomes an Invalid
    // Date that Prisma rejects; a float matchScore rejects on the Int column.
    const d = deadline ? new Date(deadline) : null
    const safeDeadline = d && !isNaN(d.getTime()) ? d : null
    const safeMatchScore =
      typeof matchScore === 'number' && Number.isFinite(matchScore) ? Math.round(matchScore) : null
    const safeValue = typeof value === 'number' && Number.isFinite(value) ? value : null

    // find → update/create instead of upsert: upsert's ON CONFLICT depends on
    // the DB carrying the composite unique index, which may not have applied
    // cleanly; a plain find works regardless. P2002 on create (a concurrent
    // double-save) falls back to update, keeping double-click safety.
    const existing = await prisma.savedContract.findUnique({
      where: { userId_contractId: { userId: session.user.id, contractId } },
      select: { id: true },
    })

    let saved
    if (existing) {
      // Don't reset status on re-save — it would wipe the user's pipeline stage
      saved = await prisma.savedContract.update({
        where: { id: existing.id },
        data: { matchScore: safeMatchScore },
        select: { id: true, contractId: true, status: true },
      })
    } else {
      try {
        saved = await prisma.savedContract.create({
          data: {
            userId: session.user.id,
            contractId,
            samNoticeId: samNoticeId ?? null,
            title,
            agency,
            value: safeValue,
            deadline: safeDeadline,
            matchScore: safeMatchScore,
          },
          select: { id: true, contractId: true, status: true },
        })
      } catch (err) {
        if ((err as { code?: string })?.code === 'P2002') {
          // Raced with another save of the same contract — treat as success
          saved = await prisma.savedContract.update({
            where: { userId_contractId: { userId: session.user.id, contractId } },
            data: { matchScore: safeMatchScore },
            select: { id: true, contractId: true, status: true },
          })
        } else {
          throw err
        }
      }
    }

    // Update learned preference vector in background (non-blocking)
    if (isEmbeddingEnabled() && samNoticeId) {
      updateUserPreference(session.user.id, samNoticeId, body.contractText).catch(
        (err) => console.error('Preference update error (non-fatal):', err)
      )
    }

    return NextResponse.json({ saved })
  } catch (err) {
    console.error('Save contract error:', err)
    // Surface the real error to admins so a production save failure is
    // diagnosable from the dashboard, without Vercel log access
    let detail: string | undefined
    try {
      const { requireAdmin } = await import('@/lib/admin')
      if (await requireAdmin()) {
        detail = err instanceof Error ? `${err.name}: ${err.message}`.slice(0, 400) : String(err).slice(0, 400)
      }
    } catch { /* admin check unavailable */ }
    return NextResponse.json({ error: 'Internal server error', ...(detail ? { detail } : {}) }, { status: 500 })
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

// Outcome learning — the algorithm learns from RESULTS, not just interest.
// A WIN is the strongest possible signal of "more like this" (alpha 0.4 vs
// 0.25 for a save, and counts double toward blend confidence). A LOSS nudges
// the vector away (alpha -0.15): gentle, because losses have many causes
// besides bad fit — price, a stronger incumbent, a thin proposal.
async function applyOutcomeToPreference(userId: string, noticeId: string, outcome: 'won' | 'lost') {
  const cached = await prisma.contractEmbedding.findUnique({
    where: { noticeId: embeddingCacheKey(noticeId) },
  })
  if (!cached) return // never embedded — nothing safe to learn from
  const contractEmb = JSON.parse(cached.embedding) as number[]

  const current = await prisma.userEmbedding.findUnique({ where: { userId } })
  const currentVec = current ? (JSON.parse(current.preferenceEmbedding) as number[]) : null

  // A LOSS with no existing vector must NOT initialize the preference TO the
  // lost contract (updatePreferenceVector's null-fallback would do exactly that)
  if (outcome === 'lost' && (!currentVec || currentVec.length !== contractEmb.length)) return

  const alpha = outcome === 'won' ? 0.4 : -0.15
  const updated = updatePreferenceVector(currentVec, contractEmb, alpha)

  await prisma.userEmbedding.upsert({
    where: { userId },
    update: {
      preferenceEmbedding: JSON.stringify(updated),
      ...(outcome === 'won' ? { saveCount: { increment: 2 } } : {}),
    },
    create: {
      userId,
      preferenceEmbedding: JSON.stringify(updated),
      saveCount: 2,
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

    const { contractId, status, notes, scorecard } = await req.json()
    if (!contractId || (status === undefined && notes === undefined && scorecard === undefined)) {
      return NextResponse.json({ error: 'contractId and a status, notes, or scorecard update are required' }, { status: 400 })
    }
    if (status !== undefined && !PIPELINE_STAGES.includes(status)) {
      return NextResponse.json({ error: `status must be one of: ${PIPELINE_STAGES.join(', ')}` }, { status: 400 })
    }
    if (notes !== undefined && (typeof notes !== 'string' || notes.length > 10_000)) {
      return NextResponse.json({ error: 'notes must be a string under 10k characters' }, { status: 400 })
    }
    // Scorecard: object of factor→0|1|2 ratings, stored as a JSON string
    let scorecardJson: string | undefined
    if (scorecard !== undefined) {
      if (scorecard === null) {
        scorecardJson = undefined // treat null as "no change" — clearing isn't a flow
      } else if (typeof scorecard === 'object' && !Array.isArray(scorecard)) {
        const entries = Object.entries(scorecard as Record<string, unknown>)
          .filter(([k, v]) => typeof k === 'string' && k.length <= 20 && typeof v === 'number' && [0, 1, 2].includes(v))
          .slice(0, 10)
        scorecardJson = JSON.stringify(Object.fromEntries(entries))
      } else {
        return NextResponse.json({ error: 'scorecard must be an object of 0–2 ratings' }, { status: 400 })
      }
    }

    // Prior state — outcome learning must fire only on a real transition,
    // not on every repeat PATCH to the same stage
    const existing = await prisma.savedContract.findUnique({
      where: { userId_contractId: { userId: session.user.id, contractId } },
      select: { status: true, samNoticeId: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Contract is no longer in your pipeline' }, { status: 404 })
    }

    let updated
    try {
      updated = await prisma.savedContract.update({
        where: { userId_contractId: { userId: session.user.id, contractId } },
        data: {
          ...(status !== undefined ? { status } : {}),
          ...(notes !== undefined ? { notes } : {}),
          ...(scorecardJson !== undefined ? { scorecard: scorecardJson } : {}),
        },
      })
    } catch (err) {
      if ((err as { code?: string })?.code === 'P2025') {
        return NextResponse.json({ error: 'Contract is no longer in your pipeline' }, { status: 404 })
      }
      throw err
    }

    // Outcome learning: a WIN pulls the taste vector toward this contract
    // much harder than a mere save; a LOSS nudges it away. This is what makes
    // the algorithm learn from results, not just interest. Non-blocking.
    if (
      isEmbeddingEnabled() &&
      existing.samNoticeId &&
      status !== undefined &&
      status !== existing.status &&
      (status === 'won' || status === 'lost')
    ) {
      applyOutcomeToPreference(session.user.id, existing.samNoticeId, status).catch(
        (err) => console.error('Outcome learning error (non-fatal):', err)
      )
    }

    return NextResponse.json({ saved: updated })
  } catch (err) {
    console.error('Update saved contract status error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
