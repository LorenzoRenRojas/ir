import { prisma } from './prisma'

// Per-user "viewed" contract tracking — the honest inbox-unread model. A
// contract counts as viewed once the user OPENS it (its detail page). Everything
// else is genuinely unviewed — real opportunities they haven't looked at, not
// contracts we're dishonestly relabeling as "new".
//
// Stored in Kv (one JSON array per user, capped) to match the existing per-user
// set pattern (digest-sent, recompete-alerted) and avoid a schema migration.

const CAP = 5000
const key = (userId: string) => `viewed:${userId}`

export async function getViewedIds(userId: string): Promise<string[]> {
  try {
    const row = await prisma.kv.findUnique({ where: { key: key(userId) } })
    if (!row) return []
    const parsed = JSON.parse(row.value)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export async function markViewed(userId: string, ids: string[]): Promise<void> {
  const clean = ids.filter(Boolean)
  if (clean.length === 0) return
  try {
    const existing = await getViewedIds(userId)
    // Most-recent-last, deduped, capped — old views age out naturally, which is
    // fine since contracts expire anyway.
    const merged = [...new Set([...existing, ...clean])].slice(-CAP)
    await prisma.kv.upsert({
      where: { key: key(userId) },
      update: { value: JSON.stringify(merged) },
      create: { key: key(userId), value: JSON.stringify(merged) },
    })
  } catch {
    /* best-effort — a failed view-mark must never break the page */
  }
}
