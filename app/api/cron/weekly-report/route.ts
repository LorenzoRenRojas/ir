import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWeeklyReportEmail, sendAdminAlertEmail, type WeeklyReportStats } from '@/lib/email'
import { isAuthorizedCron, ADMIN_EMAIL } from '@/lib/cron'

export const maxDuration = 300

const ACTIVE = ['saved', 'pursuing', 'submitted']

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://ir-gov.app'
  // problems → pages the admin; degraded → logged only (see daily-digest).
  const problems: string[] = []
  const degraded: string[] = []
  let sent = 0
  let processed = 0
  let sendFailures = 0
  const startedAt = Date.now()
  const timeLeft = () => 240_000 - (Date.now() - startedAt)

  // Market context, computed once for everyone: opportunities posted this week.
  let newThisWeek = 0
  try {
    newThisWeek = await prisma.contractCache.count({
      where: { postedDate: { gte: new Date(Date.now() - 7 * 86_400_000) } },
    })
  } catch { /* pre-migration / DB hiccup — report 0 */ }

  try {
    // Only users who opted into digests, are verified, and have a pipeline.
    const users = await prisma.user.findMany({
      where: { emailVerified: { not: null }, notifyDigest: true, savedContracts: { some: {} } },
      select: {
        id: true, email: true, name: true,
        savedContracts: { select: { title: true, agency: true, value: true, deadline: true, status: true } },
      },
    })

    const now = Date.now()
    const twoWeeks = now + 14 * 86_400_000

    for (const user of users) {
      if (timeLeft() < 15_000) { degraded.push(`Stopped early at time budget — ${users.length - processed} users deferred`); break }
      processed++

      const active = user.savedContracts.filter((c) => ACTIVE.includes(c.status))
      if (active.length === 0) continue // nothing worth summarizing

      const activeValue = active.reduce((s, c) => s + (c.value ?? 0), 0)
      const wonValue = user.savedContracts
        .filter((c) => c.status === 'won')
        .reduce((s, c) => s + (c.value ?? 0), 0)

      const deadlines = active
        .filter((c) => c.deadline)
        .map((c) => ({ title: c.title, agency: c.agency, ts: new Date(c.deadline as Date).getTime() }))
        .filter((d) => !isNaN(d.ts) && d.ts >= now && d.ts <= twoWeeks)
        .sort((a, b) => a.ts - b.ts)
        .slice(0, 5)
        .map((d) => ({ title: d.title, agency: d.agency, days: Math.ceil((d.ts - now) / 86_400_000) }))

      const stats: WeeklyReportStats = {
        activeCount: active.length,
        activeValue,
        wonValue,
        deadlines,
        newThisWeek,
      }

      try {
        await sendWeeklyReportEmail(user.email, user.name, stats, baseUrl, user.id)
        sent++
      } catch (err) {
        sendFailures++
        degraded.push(`Weekly report to ${user.email} failed: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  } catch (err) {
    problems.push(`Weekly report query failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  // Every send failing with none succeeding is systemic — page for that.
  if (sendFailures > 0 && sent === 0) {
    problems.push(`All ${sendFailures} weekly report(s) failed to send with none succeeding — likely a systemic email problem (Resend key or quota).`)
  }

  if (degraded.length > 0) {
    console.warn('[weekly-report] degraded (non-paging):', degraded)
  }

  // Founder brief — admin only. Rides this cron rather than claiming another
  // slot, and is deliberately last: a failure here must never affect a single
  // user's weekly report.
  let founderBriefSent = false
  if (ADMIN_EMAIL) {
    try {
      const { buildFounderBrief, briefTalkingPoints } = await import('@/lib/founder-brief')
      const { sendFounderBriefEmail } = await import('@/lib/email')
      const brief = await buildFounderBrief()
      await sendFounderBriefEmail(
        ADMIN_EMAIL,
        brief,
        briefTalkingPoints(brief),
        process.env.ENGAGEMENT_PACK_URL ?? `${baseUrl}/admin`,
        baseUrl
      )
      founderBriefSent = true
    } catch (err) {
      degraded.push(`Founder brief failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  if (problems.length > 0 && ADMIN_EMAIL) {
    const body = degraded.length > 0
      ? [...problems, '—', 'Also degraded this run (informational, not the alert cause):', ...degraded]
      : problems
    try { await sendAdminAlertEmail(ADMIN_EMAIL, 'Weekly report cron', body) } catch { /* best-effort */ }
  }

  return NextResponse.json({ ok: problems.length === 0, processed, sent, newThisWeek, founderBriefSent, problems, degraded })
}
