import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendDeadlineReminderEmail, sendAdminAlertEmail } from '@/lib/email'
import { isAuthorizedCron, ADMIN_EMAIL } from '@/lib/cron'

export const maxDuration = 300

const DAY_MS = 24 * 60 * 60 * 1000

// Runs once daily. Two one-day-wide windows mean each saved contract gets
// exactly two reminders without needing a "reminded" flag in the schema:
// one when the deadline is ~3 days out, one when it's ~1 day out.
const REMINDER_WINDOWS = [
  { daysLeft: 3, from: 2 * DAY_MS, to: 3 * DAY_MS },
  { daysLeft: 1, from: 0, to: 1 * DAY_MS },
]

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const problems: string[] = []
  let emailsSent = 0
  const now = Date.now()

  try {
    const upcoming = await prisma.savedContract.findMany({
      where: {
        deadline: { gte: new Date(now), lte: new Date(now + 3 * DAY_MS) },
        status: { notIn: ['submitted', 'won', 'lost', 'archived'] },
      },
      // Explicit select, never include/default: schema columns are added in
      // code before RUN DB MIGRATION creates them in prod, and a default
      // SELECT * over a not-yet-migrated column crashes the whole cron
      select: {
        title: true,
        agency: true,
        deadline: true,
        user: { select: { id: true, email: true, name: true, emailVerified: true, notifyDeadlines: true } },
      },
    })

    const baseUrl = process.env.NEXTAUTH_URL ?? 'https://ir-gov.app'

    for (const saved of upcoming) {
      if (!saved.deadline || !saved.user.emailVerified || !saved.user.notifyDeadlines) continue
      const remaining = saved.deadline.getTime() - now
      const window = REMINDER_WINDOWS.find(w => remaining > w.from && remaining <= w.to)
      if (!window) continue

      try {
        await sendDeadlineReminderEmail(
          saved.user.email,
          saved.user.name,
          saved.title,
          saved.agency,
          saved.deadline,
          window.daysLeft,
          baseUrl,
          saved.user.id
        )
        emailsSent++
      } catch (err) {
        problems.push(`Reminder to ${saved.user.email} for "${saved.title}" failed: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  } catch (err) {
    problems.push(`Deadline reminder cron crashed: ${err instanceof Error ? err.message : String(err)}`)
  }

  if (problems.length > 0 && ADMIN_EMAIL) {
    try {
      await sendAdminAlertEmail(ADMIN_EMAIL, 'Deadline reminder cron had failures', problems)
    } catch (alertErr) {
      console.error('Admin alert failed:', alertErr)
    }
  }

  return NextResponse.json({ ok: problems.length === 0, emailsSent, problems })
}
