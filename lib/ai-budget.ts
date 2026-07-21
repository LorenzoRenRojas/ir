import { prisma } from './prisma'

// Global daily cap on AI proposal drafts, shared across all serverless
// instances via the Kv table — the same discipline as the SAM.gov quota.
// Anthropic credits are real money; without a cap, one user (or a bug) in a
// loop could drain the balance overnight. Every code path that spends Claude
// tokens for a user-triggered draft must reserve budget here first.
//
// Default is deliberately conservative for launch. Raise via env once credit
// spend is understood and predictable.
const DEFAULT_DAILY_AI_DRAFTS = 50

function todayKey(): string {
  return `ai-drafts:${new Date().toISOString().slice(0, 10)}`
}

function dailyBudget(): number {
  const fromEnv = parseInt(process.env.AI_DAILY_DRAFT_BUDGET ?? '', 10)
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_DAILY_AI_DRAFTS
}

// Reserve one AI draft from today's budget. Returns false when spent — the
// caller must then fall back to the template path (never fail the user's
// request). Atomic claim so concurrent instances can't overspend. Kv missing
// pre-migration → fail OPEN is wrong here (it's real money), so fail CLOSED:
// if we can't confirm budget, don't spend credits — use the template.
export async function tryConsumeAiDraft(): Promise<boolean> {
  const key = todayKey()
  const budget = dailyBudget()
  try {
    await prisma.$executeRaw`INSERT INTO "Kv" ("key", "value", "updatedAt") VALUES (${key}, '0', CURRENT_TIMESTAMP) ON CONFLICT ("key") DO NOTHING`
    const claimed = await prisma.$executeRaw`UPDATE "Kv" SET "value" = CAST(CAST("value" AS INTEGER) + 1 AS TEXT), "updatedAt" = CURRENT_TIMESTAMP WHERE "key" = ${key} AND CAST("value" AS INTEGER) + 1 <= ${budget}`
    return claimed > 0
  } catch {
    return false // can't confirm budget → don't spend money
  }
}

// Best-effort release — if the AI call fails after we reserved budget, give
// the slot back so a transient error doesn't burn a day's allowance.
export async function releaseAiDraft(): Promise<void> {
  const key = todayKey()
  try {
    await prisma.$executeRaw`UPDATE "Kv" SET "value" = CAST(MAX(CAST("value" AS INTEGER) - 1, 0) AS TEXT), "updatedAt" = CURRENT_TIMESTAMP WHERE "key" = ${key}`
  } catch { /* non-fatal */ }
}

export async function aiDraftStatus(): Promise<{ used: number; budget: number }> {
  const budget = dailyBudget()
  try {
    const row = await prisma.kv.findUnique({ where: { key: todayKey() } })
    return { used: row ? parseInt(row.value, 10) || 0 : 0, budget }
  } catch {
    return { used: 0, budget }
  }
}
