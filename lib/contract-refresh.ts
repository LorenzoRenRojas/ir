import { prisma } from './prisma'

// ─── Keep-the-store-warm coordinator ──────────────────────────────────────────
// The dashboard reads the ContractCache store, which is refreshed by
// syncContractsToDb(). To eliminate cold starts — a login that lands on an
// empty or stale store and has to wait on a live SAM.gov fetch — we keep the
// store warm from two sides:
//
//   1. Scheduled crons call maybeSyncContracts({ force: true }) twice a day.
//   2. Real dashboard traffic opportunistically triggers a background refresh
//      (via Next's after()) when the store is stale — the user is never blocked.
//
// Everything is coordinated through the shared Kv table so that many serverless
// instances don't stampede SAM.gov's tiny daily budget: a timestamp throttle
// plus a short-lived lock mean at most one sync runs per interval, globally.

const LAST_SYNC_KEY = 'contracts:last-sync-attempt'
const LOCK_KEY = 'contracts:sync-lock'

// Don't auto-refresh more than once per interval (SAM.gov budget is ~8 req/day
// and one sync costs 3). Scheduled crons pass force:true; the store still can't
// be synced more than the daily budget allows — syncContractsToDb no-ops when
// the budget is spent.
const MIN_INTERVAL_MS = 6 * 60 * 60 * 1000
const LOCK_TTL_MS = 5 * 60 * 1000
// Below this many live contracts the store is "starved" and must refresh on the
// next request regardless of the interval throttle — otherwise a store that has
// drained (e.g. crons not running because CRON_SECRET is unset) can get stuck
// thin, since a non-empty store would otherwise read as "fresh".
const MIN_HEALTHY_STORE = 400

async function kvGetNumber(key: string): Promise<number | null> {
  try {
    const row = await prisma.kv.findUnique({ where: { key }, select: { value: true } })
    if (!row) return null
    const n = Number(row.value)
    return Number.isFinite(n) ? n : null
  } catch {
    return null // Kv table missing pre-migration — treat as "no record"
  }
}

async function kvSetNumber(key: string, value: number): Promise<void> {
  try {
    await prisma.kv.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    })
  } catch { /* pre-migration or DB hiccup — throttling simply won't persist */ }
}

async function storeIsThin(): Promise<boolean> {
  try {
    const count = await prisma.contractCache.count({
      where: { OR: [{ deadline: { gte: new Date() } }, { deadline: null }] },
    })
    return count < MIN_HEALTHY_STORE
  } catch {
    return false // can't tell — assume warm rather than force a sync
  }
}

export interface RefreshResult {
  ran: boolean
  reason?: 'fresh' | 'locked' | 'error' | 'no-key'
  stats?: Awaited<ReturnType<typeof import('./sam-api').syncContractsToDb>>
}

// Refresh the contract store if it's stale (or empty), unless another sync is
// already running or the last one was recent. Never throws — safe to call from
// a fire-and-forget background task.
export async function maybeSyncContracts(opts?: { force?: boolean }): Promise<RefreshResult> {
  if (!process.env.SAM_GOV_API_KEY) return { ran: false, reason: 'no-key' }

  const now = Date.now()

  // Interval throttle — but a STARVED store always warrants an immediate sync,
  // even inside the interval (that's the cold/thin start we exist to prevent).
  if (!opts?.force) {
    const last = await kvGetNumber(LAST_SYNC_KEY)
    if (last && now - last < MIN_INTERVAL_MS && !(await storeIsThin())) {
      return { ran: false, reason: 'fresh' }
    }
  }

  // Global lock so concurrent instances don't run overlapping syncs.
  const lock = await kvGetNumber(LOCK_KEY)
  if (lock && now - lock < LOCK_TTL_MS) return { ran: false, reason: 'locked' }
  await kvSetNumber(LOCK_KEY, now)
  // Record the attempt up front so a failure still counts against the interval
  // (a broken sync shouldn't be retried on every single request).
  await kvSetNumber(LAST_SYNC_KEY, now)

  try {
    const { syncContractsToDb } = await import('./sam-api')
    const stats = await syncContractsToDb()
    return { ran: true, stats }
  } catch (err) {
    console.error('maybeSyncContracts: sync failed:', err)
    return { ran: false, reason: 'error' }
  } finally {
    await kvSetNumber(LOCK_KEY, 0) // release the lock
  }
}
