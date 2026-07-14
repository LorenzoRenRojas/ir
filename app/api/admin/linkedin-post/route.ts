import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { prisma } from '@/lib/prisma'
import type { Contract } from '@/lib/sam-api'
import { getNaicsDescription } from '@/lib/naics'

// Prefer the description SAM.gov shipped with the notice; the local NAICS
// table only covers the top codes and echoes the code back when unknown
function naicsLabel(code: string, fromPayload?: string): string {
  const desc = fromPayload || getNaicsDescription(code)
  return desc && desc !== code ? `${code} — ${desc}` : code
}

export const maxDuration = 60

// The Content Engine (GROWTH_PLAN): weekly LinkedIn posts drafted from our
// own ContractCache — numbers and specifics, zero SaaS-speak. Copy rules:
// never "empower/unlock/seamless/game-changer"; always a number, a date, or
// an artifact; published values only, honestly labeled.

const SET_ASIDE_GROUPS: { label: string; codes: string[] }[] = [
  { label: 'Total Small Business', codes: ['SBA', 'SBP'] },
  { label: '8(a)', codes: ['8A', '8AN'] },
  { label: 'SDVOSB', codes: ['SDVOSBC', 'SDVOSBS'] },
  { label: 'WOSB', codes: ['WOSB', 'WOSBSS', 'EDWOSB'] },
  { label: 'HUBZone', codes: ['HUBZONE', 'HZC', 'HZS'] },
]
const SMALL_BIZ_CODES = new Set(SET_ASIDE_GROUPS.flatMap(g => g.codes))

const fmtMoney = (v: number) =>
  v >= 1_000_000_000 ? `$${(v / 1_000_000_000).toFixed(1)}B`
  : v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M`
  : `$${Math.round(v / 1000)}K`

const fmtDay = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export async function POST() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 86_400_000)
    const in14 = new Date(now.getTime() + 14 * 86_400_000)

    const rows = await prisma.contractCache.findMany({
      select: { payload: true, setAside: true, naicsCode: true, postedDate: true, deadline: true },
    })
    if (rows.length === 0) {
      return NextResponse.json({ ok: false, error: 'Contract store is empty — run SYNC CONTRACTS NOW first.' })
    }

    type Row = (typeof rows)[number] & { contract: Contract | null }
    const parsed: Row[] = rows.map(r => {
      try {
        return { ...r, contract: JSON.parse(r.payload) as Contract }
      } catch {
        return { ...r, contract: null }
      }
    })

    const thisWeek = parsed.filter(r => r.postedDate && r.postedDate >= weekAgo)
    const weekSmallBiz = thisWeek.filter(r => SMALL_BIZ_CODES.has(r.setAside ?? ''))
    const setAsideCounts = SET_ASIDE_GROUPS
      .map(g => ({ label: g.label, n: thisWeek.filter(r => g.codes.includes(r.setAside ?? '')).length }))
      .filter(g => g.n > 0)

    const naicsCounts = new Map<string, { n: number; desc?: string }>()
    for (const r of thisWeek) {
      if (!r.naicsCode) continue
      const entry = naicsCounts.get(r.naicsCode) ?? { n: 0, desc: undefined }
      entry.n++
      entry.desc ||= r.contract?.naicsDescription || undefined
      naicsCounts.set(r.naicsCode, entry)
    }
    const topNaics = [...naicsCounts.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 5)

    const weekPostedValue = thisWeek.reduce((s, r) => s + (r.contract?.value ?? 0), 0)
    const closingSoon = parsed.filter(r => r.deadline && r.deadline >= now && r.deadline <= in14)
    const closingSmallBiz = closingSoon.filter(r => SMALL_BIZ_CODES.has(r.setAside ?? ''))

    const biggestThisWeek = thisWeek
      .filter(r => r.contract?.value)
      .sort((a, b) => (b.contract!.value ?? 0) - (a.contract!.value ?? 0))
      .slice(0, 5)

    const fyEnd = new Date(now.getFullYear(), 8, 30, 23, 59, 59)
    if (fyEnd < now) fyEnd.setFullYear(fyEnd.getFullYear() + 1)
    const daysToFyEnd = Math.ceil((fyEnd.getTime() - now.getTime()) / 86_400_000)

    const posts: { label: string; text: string }[] = []

    // ── Post 1: the weekly data drop ──────────────────────────────────────
    posts.push({
      label: 'WEEKLY DATA DROP',
      text: [
        `This week in federal contracting (${fmtDay(weekAgo)}–${fmtDay(now)}):`,
        '',
        `→ ${thisWeek.length.toLocaleString()} new opportunities posted to SAM.gov`,
        `→ ${weekSmallBiz.length.toLocaleString()} carry small-business set-asides:`,
        ...setAsideCounts.map(g => `   · ${g.n} ${g.label}`),
        ...(topNaics.length > 0
          ? ['→ Busiest industries:',
             ...topNaics.map(([code, { n, desc }], i) =>
               `   ${i + 1}. NAICS ${naicsLabel(code, desc)} (${n})`)]
          : []),
        ...(weekPostedValue > 0
          ? [`→ ${fmtMoney(weekPostedValue)} in published value — and most solicitations don't publish an estimate, so the real number is higher`]
          : []),
        '',
        `${daysToFyEnd} days until FY money expires on Sept 30.`,
        '',
        'ir-gov.app',
      ].join('\n'),
    })

    // ── Post 2: FY-end countdown ──────────────────────────────────────────
    posts.push({
      label: 'FY-END COUNTDOWN',
      text: [
        `${daysToFyEnd} days until September 30.`,
        '',
        ...(fyEnd.getFullYear() === 2026
          ? ['FY2026 is not a normal year: a 42-day shutdown froze its start and full appropriations only landed in February — but agencies still lose every unspent dollar on Sept 30. A year of buying, squeezed into seven months.', '']
          : []),
        'Right now on SAM.gov:',
        `→ ${parsed.length.toLocaleString()} active opportunities (last 45 days)`,
        `→ ${closingSoon.length.toLocaleString()} close within 14 days`,
        `→ ${closingSmallBiz.length.toLocaleString()} of those are small-business set-asides`,
        '',
        "If you're a small contractor, this is the quarter you don't sit out.",
        '',
        'ir-gov.app',
      ].join('\n'),
    })

    // ── Post 3: top 5 by published value ──────────────────────────────────
    if (biggestThisWeek.length >= 3) {
      posts.push({
        label: 'TOP 5 BY VALUE',
        text: [
          'The largest opportunities posted this week, by published value:',
          '',
          ...biggestThisWeek.map((r, i) => {
            const c = r.contract!
            const due = r.deadline ? ` — due ${fmtDay(r.deadline)}` : ''
            return `${i + 1}. ${fmtMoney(c.value!)} — ${c.title.slice(0, 80)} (${c.agency})${due}`
          }),
          '',
          "Published values only — most federal solicitations don't post estimates.",
          '',
          'ir-gov.app',
        ].join('\n'),
      })
    }

    return NextResponse.json({ ok: true, posts })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    )
  }
}
