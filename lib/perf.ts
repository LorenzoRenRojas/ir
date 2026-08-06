import { prisma } from './prisma'

// Lightweight feed-performance readout, surfaced on the admin board so the
// speed of the progressive-enrichment split is visible without browser
// devtools. Written from the contracts API via after() (post-response, off the
// critical path), smoothed with an EWMA so one slow cold start doesn't dominate.

const KEY = 'perf:feed'

export interface FeedPerf {
  fastMs: number     // time to the scored feed (what first paint now waits on)
  enrichMs: number   // time the USAspending enrichment adds (now backgrounded)
  updatedAt: number
  samples: number
}

const ewma = (old: number, sample: number) =>
  old > 0 ? Math.round(0.7 * old + 0.3 * sample) : Math.round(sample)

export async function recordFeedPerf(sample: { fastMs?: number; enrichMs?: number }): Promise<void> {
  try {
    const row = await prisma.kv.findUnique({ where: { key: KEY } })
    const cur: FeedPerf = row
      ? (JSON.parse(row.value) as FeedPerf)
      : { fastMs: 0, enrichMs: 0, updatedAt: 0, samples: 0 }
    if (typeof sample.fastMs === 'number') cur.fastMs = ewma(cur.fastMs, sample.fastMs)
    if (typeof sample.enrichMs === 'number') cur.enrichMs = ewma(cur.enrichMs, sample.enrichMs)
    cur.updatedAt = Date.now()
    cur.samples = (cur.samples ?? 0) + 1
    await prisma.kv.upsert({
      where: { key: KEY },
      update: { value: JSON.stringify(cur) },
      create: { key: KEY, value: JSON.stringify(cur) },
    })
  } catch { /* best-effort — perf telemetry must never affect the request */ }
}

export async function getFeedPerf(): Promise<FeedPerf | null> {
  try {
    const row = await prisma.kv.findUnique({ where: { key: KEY } })
    return row ? (JSON.parse(row.value) as FeedPerf) : null
  } catch {
    return null
  }
}
