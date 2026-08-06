import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computePortfolio, generateCaptureMemo } from '@/lib/capture-memo'

export const dynamic = 'force-dynamic'

// POST /api/playbook/memo — generate the analyst capture memo over the user's
// live pipeline. AI-written when Claude is configured and funded, deterministic
// template otherwise. Grounded server-side in the user's own saved contracts.
export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rows = await prisma.savedContract.findMany({
      where: { userId: session.user.id },
      // Explicit select: tolerate a pre-migration DB missing the scorecard column
      select: {
        title: true, agency: true, value: true, deadline: true,
        matchScore: true, status: true, scorecard: true,
      },
    })

    const summary = computePortfolio(rows)
    if (summary.activeCount === 0) {
      return NextResponse.json({ memo: null, mode: 'template', empty: true })
    }

    const { memo, mode } = await generateCaptureMemo(summary)
    return NextResponse.json({ memo, mode })
  } catch (err) {
    console.error('Capture memo error:', err)
    return NextResponse.json({ error: 'Could not generate the memo. Try again.' }, { status: 500 })
  }
}
