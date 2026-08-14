import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Watchlist keywords — terms the user wants flagged in their daily digest
// regardless of profile score. Stored in Kv (one JSON array per user) to
// match the existing per-user set pattern and avoid a schema migration.

const MAX_TERMS = 12
const MAX_TERM_LEN = 60
const key = (userId: string) => `watch:${userId}`

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    try {
      const row = await prisma.kv.findUnique({ where: { key: key(session.user.id) } })
      const parsed = row ? JSON.parse(row.value) : []
      const terms = Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : []
      return NextResponse.json({ terms })
    } catch {
      return NextResponse.json({ terms: [] })
    }
  } catch (err) {
    console.error('Watchlist GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await req.json()
    if (!Array.isArray(body.terms)) {
      return NextResponse.json({ error: 'terms must be an array of strings' }, { status: 400 })
    }
    const terms = [...new Set(
      (body.terms as unknown[])
        .filter((t): t is string => typeof t === 'string')
        .map(t => t.trim().slice(0, MAX_TERM_LEN))
        .filter(t => t.length >= 3)
    )].slice(0, MAX_TERMS)

    await prisma.kv.upsert({
      where: { key: key(session.user.id) },
      update: { value: JSON.stringify(terms) },
      create: { key: key(session.user.id), value: JSON.stringify(terms) },
    })
    return NextResponse.json({ terms })
  } catch (err) {
    console.error('Watchlist POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
