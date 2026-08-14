import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Referral link support. GET returns (and lazily creates) the caller's
// referral code plus how many signups it has brought in. Every query is
// guarded so a pre-migration DB (no referralCode column yet) degrades to
// { available: false } instead of a 500.

function newCode(): string {
  // 8 hex chars — short enough for a business-card URL, random enough that
  // guessing another user's code buys nothing anyway (it only credits them).
  return crypto.randomBytes(4).toString('hex')
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let code: string | null = null
    try {
      const me = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { referralCode: true },
      })
      code = me?.referralCode ?? null

      if (!code) {
        // Lazy generation; retry once on the (astronomically unlikely) unique
        // collision rather than looping forever.
        for (let attempt = 0; attempt < 2 && !code; attempt++) {
          const candidate = newCode()
          try {
            await prisma.user.update({
              where: { id: session.user.id },
              data: { referralCode: candidate },
              select: { id: true },
            })
            code = candidate
          } catch (err) {
            if ((err as { code?: string })?.code !== 'P2002') throw err
          }
        }
      }

      const referredCount = await prisma.user.count({
        where: { referredBy: session.user.id },
      })

      const baseUrl = process.env.NEXTAUTH_URL ?? 'https://ir-gov.app'
      return NextResponse.json({
        available: true,
        code,
        link: `${baseUrl}/register?ref=${code}`,
        referredCount,
      })
    } catch {
      // Column not migrated yet — the UI hides the card instead of erroring
      return NextResponse.json({ available: false })
    }
  } catch (err) {
    console.error('Referral GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
