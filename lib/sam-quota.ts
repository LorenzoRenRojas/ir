import { prisma } from './prisma'

// Global daily budget for SAM.gov API requests, shared across ALL serverless
// instances via the Kv table. Personal SAM.gov keys have a small daily quota;
// exhausting it silently degrades the whole platform to mock data. Every code
// path that would hit api.sam.gov must reserve budget here first.
//
// Budget spend, by priority:
//   3 — daily full-market sync (cron) — the one that matters
//   1 — health probe (max 1/day via this gate + 6h instance throttle)
//   remainder — on-demand lookups (contract detail, UEI, legacy fallback)
const DEFAULT_DAILY_BUDGET = 8

function todayKey(): string {
  return `sam-quota:${new Date().toISOString().slice(0, 10)}`
}

function dailyBudget(): number {
  const fromEnv = parseInt(process.env.SAM_DAILY_BUDGET ?? '', 10)
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_DAILY_BUDGET
}

// Reserve n requests from today's budget. Returns false when the budget is
// spent — callers must then skip the live call and use stored/cached data.
// If the Kv table doesn't exist yet (pre-migration), fail open so the app
// still works; the migration adds enforcement.
export async function tryConsumeSamRequests(n: number): Promise<boolean> {
  const key = todayKey()
  try {
    const row = await prisma.kv.findUnique({ where: { key } })
    const used = row ? parseInt(row.value, 10) || 0 : 0
    if (used + n > dailyBudget()) return false
    await prisma.kv.upsert({
      where: { key },
      update: { value: String(used + n) },
      create: { key, value: String(n) },
    })
    return true
  } catch {
    return true
  }
}

export async function samQuotaStatus(): Promise<{ used: number; budget: number }> {
  const budget = dailyBudget()
  try {
    const row = await prisma.kv.findUnique({ where: { key: todayKey() } })
    return { used: row ? parseInt(row.value, 10) || 0 : 0, budget }
  } catch {
    return { used: 0, budget }
  }
}
