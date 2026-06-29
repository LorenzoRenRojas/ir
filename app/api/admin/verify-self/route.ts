import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// One-time endpoint to manually verify the logged-in user's email.
// Hit this once at /api/admin/verify-self then delete this file.
export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { emailVerified: new Date() },
  })

  return NextResponse.json({ ok: true, email: session.user.email })
}
