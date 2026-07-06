import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { fetchContractById } from '@/lib/sam-api'
import { rateLimit } from '@/lib/rate-limit'

// Auth required: a cache miss here can fall through to a live SAM.gov lookup,
// and the daily quota is tiny — an anonymous loop over random IDs would drain
// it and push the whole platform onto stale data.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { allowed } = rateLimit(`contract-detail:${session.user.id}`, 60, 60_000)
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })
    }

    const { id } = await params
    const contract = await fetchContractById(id)
    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }
    return NextResponse.json({ contract })
  } catch (err) {
    console.error('Contract by ID error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
