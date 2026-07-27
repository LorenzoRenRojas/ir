import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'

const TIERS = ['free', 'starter', 'pro', 'enterprise'] as const

// Set a user's subscription tier by email. The clean way to (a) grant yourself
// Pro to test paid features before Stripe is live, and (b) comp founding
// members and APEX counselors to Pro without a Stripe checkout. Admin-only.
//
// Note: the user must sign out/in for the change to take effect — the tier
// lives in the JWT, which the auth callback refreshes on next token issue.
export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let email: string, tier: string
  try {
    const body = await req.json()
    email = (body.email ?? '').toLowerCase().trim()
    tier = body.tier
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 })
  if (!TIERS.includes(tier as (typeof TIERS)[number])) {
    return NextResponse.json({ error: `tier must be one of: ${TIERS.join(', ')}` }, { status: 400 })
  }

  try {
    const user = await prisma.user.update({
      where: { email },
      data: { subscriptionTier: tier },
      select: { email: true, subscriptionTier: true },
    })
    return NextResponse.json({ success: true, user })
  } catch {
    return NextResponse.json({ error: `No account found for ${email}` }, { status: 404 })
  }
}
