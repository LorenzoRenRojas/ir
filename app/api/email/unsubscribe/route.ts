import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyUnsubToken, type EmailKind } from '@/lib/unsub'

const KINDS: EmailKind[] = ['digest', 'deadlines', 'radar', 'all']

function page(title: string, body: string, ok: boolean) {
  return new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head>
<body style="margin:0;background:#0A0A0A;color:#fff;font-family:monospace;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px;">
<div><div style="color:#C41230;font-size:22px;font-weight:700;margin-bottom:20px;">ᛁ</div>
<div style="font-size:10px;letter-spacing:0.2em;color:${ok ? '#4ADE80' : '#C41230'};margin-bottom:14px;">${title.toUpperCase()}</div>
<p style="font-size:13px;color:rgba(255,255,255,0.5);line-height:1.7;max-width:380px;font-family:sans-serif;">${body}</p>
<a href="https://ir-gov.app/settings" style="display:inline-block;margin-top:22px;padding:11px 22px;background:#C41230;color:#fff;font-size:10px;font-weight:700;letter-spacing:0.1em;text-decoration:none;">MANAGE PREFERENCES</a>
</div></body></html>`,
    { status: ok ? 200 : 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('u') ?? ''
  const kind = (searchParams.get('k') ?? '') as EmailKind
  const token = searchParams.get('t') ?? ''

  if (!userId || !KINDS.includes(kind) || !verifyUnsubToken(userId, kind, token)) {
    return page('Invalid link', 'This unsubscribe link is invalid or has been tampered with. You can manage all notification preferences from your account settings.', false)
  }

  const data =
    kind === 'all'
      ? { notifyDigest: false, notifyDeadlines: false, notifyRadar: false }
      : kind === 'digest'
      ? { notifyDigest: false }
      : kind === 'deadlines'
      ? { notifyDeadlines: false }
      : { notifyRadar: false }

  try {
    await prisma.user.update({ where: { id: userId }, data, select: { id: true } })
  } catch {
    return page('Something went wrong', 'We could not update your preferences. Try again, or manage them from your account settings.', false)
  }

  const what =
    kind === 'all' ? 'all IR notification emails'
    : kind === 'digest' ? 'the daily match digest'
    : kind === 'deadlines' ? 'deadline reminders'
    : 'Recompete Radar alerts'

  return page('Unsubscribed', `You will no longer receive ${what}. You can turn them back on any time in settings.`, true)
}
