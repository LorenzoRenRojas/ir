import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCron } from '@/lib/cron'
import { maybeSyncContracts } from '@/lib/contract-refresh'

// Scheduled full-market refresh of the ContractCache store. Runs on its own
// schedule (see vercel.json) so the store stays warm even with zero traffic —
// the dashboard then always reads a populated store, never a cold live fetch.
// The daily digest cron also refreshes the store at its own hour; both go
// through maybeSyncContracts so the shared throttle/lock keeps total SAM.gov
// spend inside the daily budget.
export const maxDuration = 300

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await maybeSyncContracts({ force: true })
  return NextResponse.json({ ok: true, ...result })
}
