import { prisma } from './prisma'

// Global daily budget for SAM.gov API requests, shared across ALL serverless
// instances via the Kv table. Personal SAM.gov keys have a limited daily quota;
// exhausting it silently degrades the whole platform to stored/mock data. Every
// code path that would hit api.sam.gov must reserve budget here first.
//
// Two layers of protection let you safely raise the cap toward SAM's real max:
//
//   1. Auto-clamp — we record SAM.gov's own reported rate limit (from response
//      headers, or empirically from a 429) and never let the effective budget
//      exceed it. So you can set SAM_DAILY_BUDGET very high ("push to the max")
//      and the system physically won't try more calls than SAM allows; it just
//      clamps and serves the warm store.
//
//   2. Sync reserve — on-demand lookups (UEI autofill at signup, contract
//      descriptions) can only spend down to a floor, so the twice-daily
//      full-market sync — the call that keeps everyone's feed fresh — always
//      has budget even on a busy signup day.
//
// Spend priorities: market sync (critical) > on-demand lookups (leave reserve).
const DEFAULT_DAILY_BUDGET = 20
// Reserve enough for two full-market syncs (3 pages each). On-demand callers
// leave this untouched so a surge of signups can't starve the market refresh.
const SYNC_RESERVE = 6

// Only a header-reported daily limit is trusted as a persistent clamp (it's SAM
// telling us the real ceiling). A 429 is treated as a *today-only* backoff — a
// transient burst 429 must never permanently starve the market sync. (The old
// 'sam-rate-limit' key is intentionally no longer read, so any low value a past
// 429 wrote there can't keep clamping us.)
const DAILY_LIMIT_KEY = 'sam-daily-limit'     // from response headers; reliable
const RATE_REMAINING_KEY = 'sam-rate-remaining'
// A 429-derived cap can't drop the effective budget below this — enough for one
// full market sync (3 pages) plus a health probe.
const MIN_SYNC_FLOOR = 4

function todayKey(): string {
  return `sam-quota:${new Date().toISOString().slice(0, 10)}`
}
function hitKey(): string {
  return `sam-rate-hit:${new Date().toISOString().slice(0, 10)}`
}

function configuredBudget(): number {
  const fromEnv = parseInt(process.env.SAM_DAILY_BUDGET ?? '', 10)
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_DAILY_BUDGET
}

async function readNumberKv(key: string): Promise<number | null> {
  try {
    const row = await prisma.kv.findUnique({ where: { key }, select: { value: true } })
    if (!row) return null
    const n = Number(row.value)
    return Number.isFinite(n) && n > 0 ? n : null
  } catch {
    return null
  }
}

async function setNumberKv(key: string, value: number): Promise<void> {
  try {
    await prisma.kv.upsert({ where: { key }, update: { value: String(value) }, create: { key, value: String(value) } })
  } catch { /* pre-migration or DB hiccup — measurement simply won't persist */ }
}

// Effective budget = your configured cap, clamped to the header-reported daily
// limit (trusted) and to a today-only 429 backoff (floored so it can't starve
// the sync).
async function effectiveBudget(): Promise<number> {
  let eff = configuredBudget()
  const headerLimit = await readNumberKv(DAILY_LIMIT_KEY)
  if (headerLimit) eff = Math.min(eff, headerLimit)
  const todayHit = await readNumberKv(hitKey())
  if (todayHit) eff = Math.min(eff, Math.max(todayHit, MIN_SYNC_FLOOR))
  return eff
}

// Reserve n requests from today's budget. Returns false when the budget is
// spent — callers must then skip the live call and use stored/cached data.
// `critical` (the market sync) may use the full budget; everything else leaves
// SYNC_RESERVE so the sync is never starved. Fails open pre-migration.
export async function tryConsumeSamRequests(n: number, opts?: { critical?: boolean }): Promise<boolean> {
  const key = todayKey()
  const budget = await effectiveBudget()
  const ceiling = opts?.critical ? budget : Math.max(0, budget - SYNC_RESERVE)
  try {
    // Atomic claim: ensure the counter row exists, then increment it only if
    // the post-claim total stays within the ceiling. A read-modify-write here
    // would let two concurrent instances both pass the check and overspend.
    await prisma.$executeRaw`INSERT INTO "Kv" ("key", "value", "updatedAt") VALUES (${key}, '0', CURRENT_TIMESTAMP) ON CONFLICT ("key") DO NOTHING`
    const claimed = await prisma.$executeRaw`UPDATE "Kv" SET "value" = CAST(CAST("value" AS INTEGER) + ${n} AS TEXT), "updatedAt" = CURRENT_TIMESTAMP WHERE "key" = ${key} AND CAST("value" AS INTEGER) + ${n} <= ${ceiling}`
    return claimed > 0
  } catch {
    return true
  }
}

// Record SAM.gov's own rate-limit headers so we can clamp to the real ceiling
// and show it in the admin dashboard. api.data.gov-fronted endpoints send
// X-RateLimit-*; best-effort, never throws.
export async function recordSamRateLimit(headers: Headers): Promise<void> {
  try {
    const limit = headers.get('x-ratelimit-limit') ?? headers.get('ratelimit-limit')
    const remaining = headers.get('x-ratelimit-remaining') ?? headers.get('ratelimit-remaining')
    if (limit && Number.isFinite(Number(limit)) && Number(limit) > 0) await setNumberKv(DAILY_LIMIT_KEY, Number(limit))
    if (remaining !== null && Number.isFinite(Number(remaining))) await setNumberKv(RATE_REMAINING_KEY, Number(remaining))
  } catch { /* headers absent or unreadable — clamp simply won't engage */ }
}

// Back off for the REST OF TODAY when SAM 429s — a dated key that self-heals at
// midnight, so a transient burst limit never becomes a permanent clamp.
export async function recordSamRateLimitHit(): Promise<void> {
  try {
    const row = await prisma.kv.findUnique({ where: { key: todayKey() }, select: { value: true } })
    const used = row ? parseInt(row.value, 10) || 0 : 0
    if (used > 0) await setNumberKv(hitKey(), used)
  } catch { /* best-effort */ }
}

export async function samQuotaStatus(): Promise<{ used: number; budget: number; configured: number; reportedLimit: number | null; reportedRemaining: number | null }> {
  const configured = configuredBudget()
  const reportedLimit = await readNumberKv(DAILY_LIMIT_KEY)
  const reportedRemaining = await readNumberKv(RATE_REMAINING_KEY)
  const budget = await effectiveBudget()
  try {
    const row = await prisma.kv.findUnique({ where: { key: todayKey() } })
    return { used: row ? parseInt(row.value, 10) || 0 : 0, budget, configured, reportedLimit, reportedRemaining }
  } catch {
    return { used: 0, budget, configured, reportedLimit, reportedRemaining }
  }
}
