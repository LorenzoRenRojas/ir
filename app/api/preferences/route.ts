import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Notification + feed-appearance preferences. Kept separate from the heavy
// /api/settings route so the dashboard can read feed defaults cheaply and so
// toggles can auto-save one field at a time.
//
// Defensive by design: the feed* columns are added by a manual DB migration
// that may not have run yet in production. Reads fall back to defaults and
// writes degrade to the always-present notify* columns instead of 500-ing.

const DEFAULTS = {
  notifyDigest: true,
  notifyDeadlines: true,
  notifyRadar: true,
  notifyInstant: false,
  feedEligibleOnly: true,
  feedHideSaved: true,
  feedDensity: 'comfortable',
  feedDefaultDueWithin: '',
  feedMinMatch: 0,
}

const NOTIFY_KEYS = ['notifyDigest', 'notifyDeadlines', 'notifyRadar', 'notifyInstant'] as const
const FEED_KEYS = ['feedEligibleOnly', 'feedHideSaved', 'feedDensity', 'feedDefaultDueWithin', 'feedMinMatch'] as const

const FULL_SELECT = {
  notifyDigest: true, notifyDeadlines: true, notifyRadar: true, notifyInstant: true,
  feedEligibleOnly: true, feedHideSaved: true, feedDensity: true,
  feedDefaultDueWithin: true, feedMinMatch: true,
} as const
const NOTIFY_SELECT = {
  notifyDigest: true, notifyDeadlines: true, notifyRadar: true, notifyInstant: true,
} as const

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const where = { id: session.user.id }
    let row: Record<string, unknown> | null = null
    try {
      row = await prisma.user.findUnique({ where, select: FULL_SELECT })
    } catch {
      // Feed columns not migrated yet — read what exists, default the rest.
      row = await prisma.user.findUnique({ where, select: NOTIFY_SELECT })
    }
    return NextResponse.json({ preferences: { ...DEFAULTS, ...(row ?? {}) } })
  } catch (err) {
    console.error('Preferences GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await req.json().catch(() => ({}))

    // Whitelist + coerce each provided field to its expected type.
    const data: Record<string, unknown> = {}
    for (const k of NOTIFY_KEYS) if (typeof body[k] === 'boolean') data[k] = body[k]
    if (typeof body.feedEligibleOnly === 'boolean') data.feedEligibleOnly = body.feedEligibleOnly
    if (typeof body.feedHideSaved === 'boolean') data.feedHideSaved = body.feedHideSaved
    if (body.feedDensity === 'comfortable' || body.feedDensity === 'compact') data.feedDensity = body.feedDensity
    if (['', '7', '14', '30', '60'].includes(body.feedDefaultDueWithin)) data.feedDefaultDueWithin = body.feedDefaultDueWithin
    if (Number.isInteger(body.feedMinMatch) && body.feedMinMatch >= 0 && body.feedMinMatch <= 100) data.feedMinMatch = body.feedMinMatch

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid preference fields provided.' }, { status: 400 })
    }

    const where = { id: session.user.id }
    try {
      await prisma.user.update({ where, data, select: { id: true } })
      return NextResponse.json({ ok: true })
    } catch {
      // A feed column is probably missing — persist the notify subset so
      // email preferences still stick, and flag that a migration is needed.
      const notifyOnly: Record<string, unknown> = {}
      for (const k of NOTIFY_KEYS) if (k in data) notifyOnly[k] = data[k]
      if (Object.keys(notifyOnly).length) {
        try { await prisma.user.update({ where, data: notifyOnly, select: { id: true } }) } catch { /* noop */ }
      }
      return NextResponse.json({ ok: true, needsMigration: true })
    }
  } catch (err) {
    console.error('Preferences PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
