import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { sendAdminAlertEmail } from '@/lib/email'

// One-tap Resend diagnostic: sends a test email to the logged-in admin and
// returns the exact error if the send fails, instead of failing silently.
export async function POST() {
  const session = await requireAdmin()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { sent: false, error: 'RESEND_API_KEY is not set in this environment. Add it in Vercel → Settings → Environment Variables, then REDEPLOY (env changes only apply to new deployments).' },
      { status: 200 }
    )
  }

  try {
    await sendAdminAlertEmail(session.user.email, 'Test email — Resend is working', [
      'If you are reading this, outbound email from ir-gov.app is functioning correctly.',
      `Sent at ${new Date().toISOString()}`,
    ])
    return NextResponse.json({ sent: true })
  } catch (err) {
    return NextResponse.json(
      { sent: false, error: err instanceof Error ? err.message : String(err) },
      { status: 200 }
    )
  }
}
