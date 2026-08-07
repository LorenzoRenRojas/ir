import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit, ipKey } from '@/lib/rate-limit'
import { sendAdminAlertEmail } from '@/lib/email'
import { ADMIN_EMAIL } from '@/lib/cron'

// POST /api/feedback — in-app feedback from beta testers. Emails the founder
// immediately (so friction actually gets seen) and logs to Kv best-effort.
// Deliberately lightweight: no schema migration, no new table.
export async function POST(req: NextRequest) {
  const { allowed } = rateLimit(ipKey(req, 'feedback'), 5, 60_000)
  if (!allowed) {
    return NextResponse.json({ error: 'Slow down a moment and try again.' }, { status: 429 })
  }

  let body: { message?: string; page?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const message = (body.message ?? '').trim().slice(0, 4000)
  const page = (body.page ?? '').trim().slice(0, 200)
  if (message.length < 2) {
    return NextResponse.json({ error: 'Add a little more detail.' }, { status: 400 })
  }

  const session = await auth().catch(() => null)
  const who = session?.user?.email ?? 'anonymous'

  // Log to Kv best-effort — one key per entry, no migration needed.
  try {
    await prisma.kv.create({
      data: { key: `feedback:${Date.now()}:${who}`.slice(0, 191), value: JSON.stringify({ message, page, who, at: new Date().toISOString() }) },
    })
  } catch { /* Kv unique/collision or pre-migration — email still delivers */ }

  // Email the founder so nothing sits unseen during the beta.
  if (ADMIN_EMAIL) {
    try {
      await sendAdminAlertEmail(ADMIN_EMAIL, 'Beta feedback', [
        message,
        '—',
        `From: ${who}`,
        page ? `On: ${page}` : 'On: (unspecified)',
      ])
    } catch (err) {
      console.error('Feedback email failed:', err)
      // Don't fail the request — the Kv log still captured it.
    }
  }

  return NextResponse.json({ ok: true })
}
