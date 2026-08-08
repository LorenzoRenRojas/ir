import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getViewedIds, markViewed } from '@/lib/viewed'

export const dynamic = 'force-dynamic'

// GET  → the ids of contracts this user has already opened (for the UNVIEWED badge).
// POST → mark ids as viewed (body: { ids: string[] } or { contractId: string }).
//        The detail page marks server-side on open; this lets the client mark too.
export async function GET() {
  const session = await auth().catch(() => null)
  if (!session?.user?.id) return NextResponse.json({ viewed: [] })
  const viewed = await getViewedIds(session.user.id)
  return NextResponse.json({ viewed })
}

export async function POST(req: Request) {
  const session = await auth().catch(() => null)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: { ids?: string[]; contractId?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  const ids = Array.isArray(body.ids) ? body.ids : body.contractId ? [body.contractId] : []
  await markViewed(session.user.id, ids.filter((x): x is string => typeof x === 'string').slice(0, 200))
  return NextResponse.json({ ok: true })
}
