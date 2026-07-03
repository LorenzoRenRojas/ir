import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { syncContractsToDb } from '@/lib/sam-api'

export const maxDuration = 300

// Manual full-market sync — same job the daily cron runs, on demand.
export async function POST() {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const stats = await syncContractsToDb()
    return NextResponse.json({ ok: true, ...stats })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    )
  }
}
