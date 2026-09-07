import { prisma } from './prisma'
import { TOP_NAICS_CODES } from './naics'

// DATA-DRIVEN POST DRAFTS
//
// IR watches the whole federal market every night. Almost nobody publishes
// what that market is doing week to week, which makes it the one thing IR can
// say on LinkedIn that no consultant, competitor, or commentator can copy.
//
// Two rules hold this honest, and they are load-bearing:
//
//   1. Every number is computed from records actually in the store. Nothing is
//      estimated, rounded up, or illustrative.
//   2. Every draft carries a `dataNote` stating exactly what was counted and
//      over what window, so a claim can be defended if someone challenges it —
//      and a draft with too thin a sample is withheld rather than softened.
//
// These are drafts, not scheduled posts. A human reads and edits before
// anything is published under their name.
//
// COVERAGE, and this constrains every number below: SAM.gov returns ~1000
// records per query and offset paging past the first page returns nothing, so
// a single sync cannot pull a full window. The store accumulates coverage over
// days within a per-run request budget. It is therefore a SUBSET of the federal
// market, not a census. Every volume claim must be phrased as what IR tracked,
// never as what exists. "1,247 contracts were posted" would be a false claim;
// "IR tracked 1,247" is true and still useful.

export type PostKind =
  | 'weekly-pulse'
  | 'sector-heat'
  | 'agency-spotlight'
  | 'deadline-pressure'
  | 'set-aside-share'
  | 'pricing-reality'
  | 'capability-loop'
  | 'capability-evidence'
  | 'founder-build'
  | 'founder-contrarian'
  // Topical, each with its own expiry — see topicalPosts()
  | 'founder-prereq'
  | 'fy-end'
  | 'company-fy-end'
  | 'cr-window'
  | 'company-cr-window'
  | 'cas-noise'
  | 'sba-deadline'
  | 'company-sba-deadline'
  | 'sba-thesis'
  | 'founder-article-why'

/**
 * Who is speaking.
 *
 * `company` is IR's own page: plural, institutional, but written like a person
 * runs it — willing to hold an opinion, no corporate mush.
 * `founder` is Lorenzo's profile: first person, specific, opinionated. People
 * follow people, and the two must not sound like the same author.
 */
export type Audience = 'company' | 'founder'

/**
 * Optional artwork spec.
 *
 * `stat` renders a square 1200x1200 built around one headline number, which is
 * what works in a feed. `article` renders a 1920x1080 cover built around a
 * headline, which is what LinkedIn's article editor wants. Different jobs,
 * different shapes, so they are different modes rather than one compromise.
 */
export type PostImage =
  | { mode?: 'stat'; stat: string; label: string; sub: string }
  | { mode: 'article'; headline: string; eyebrow: string; deck: string }

export interface GeneratedPost {
  kind: PostKind
  audience: Audience
  label: string        // internal name for the admin list
  body: string         // paste-ready
  hashtags: string
  /**
   * The call to action that goes IN the post. Never a URL.
   *
   * LinkedIn penalises external links in the body (19-60% reach loss depending
   * on the study), and the old link-in-first-comment workaround is now
   * throttled as "bridge behaviour" too. So posts carry no link at all: the CTA
   * points at a DM or the profile's Featured section, which converts without
   * paying a reach penalty — and sidesteps the suspicious-link interstitial on
   * the domain entirely.
   */
  cta: string
  /** Where the link actually lives. Author reference, not post content. */
  reference?: string
  dataNote: string     // what was counted, so the claim is defensible
  image?: PostImage
  /** Long-form. LinkedIn articles take a headline separate from the body. */
  format?: 'post' | 'article'
  title?: string
}

const SMALL_BIZ_SET_ASIDES = new Set([
  'SBA', 'SBP', '8A', '8AN', 'SDVOSBC', 'SDVOSBS', 'WOSB', 'WOSBSS',
  'EDWOSB', 'EDWOSBSS', 'HZC', 'HZS', 'VSA', 'VSS',
])

const naicsName = (code: string): string =>
  TOP_NAICS_CODES.find(n => n.code === code)?.description ?? `NAICS ${code}`

const n = (x: number) => x.toLocaleString('en-US')
const usd = (v: number) =>
  v >= 1_000_000_000 ? `$${(v / 1_000_000_000).toFixed(1)}B`
  : v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M`
  : `$${Math.round(v / 1000)}K`

interface Row {
  naicsCode: string
  setAside: string
  payload: string
  deadline: Date | null
}

interface Parsed {
  naicsCode: string
  setAside: string
  agency: string
  title: string
  value: number | null
  deadline: Date | null
}

function parse(rows: Row[]): Parsed[] {
  const out: Parsed[] = []
  for (const r of rows) {
    try {
      const c = JSON.parse(r.payload) as { agency?: string; title?: string; value?: number }
      out.push({
        naicsCode: r.naicsCode,
        setAside: r.setAside,
        agency: c.agency ?? '',
        title: c.title ?? '',
        value: typeof c.value === 'number' && Number.isFinite(c.value) ? c.value : null,
        deadline: r.deadline,
      })
    } catch { /* one bad payload must not sink the batch */ }
  }
  return out
}

function tally(items: string[], limit: number): { key: string; count: number }[] {
  const acc = new Map<string, number>()
  for (const k of items) {
    if (!k) continue
    acc.set(k, (acc.get(k) ?? 0) + 1)
  }
  return [...acc.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

/**
 * Build this week's drafts from live market data.
 *
 * Each generator returns null when its sample is too thin to state honestly.
 * An empty result means the store has nothing worth publishing, which is a
 * legitimate answer — better than shipping a post built on eleven records.
 */
export async function generatePosts(): Promise<GeneratedPost[]> {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000)
  const now = new Date()
  const posts: GeneratedPost[] = []

  let week: Parsed[] = []
  let live: Parsed[] = []
  try {
    const [weekRows, liveRows] = await Promise.all([
      prisma.contractCache.findMany({
        where: { postedDate: { gte: weekAgo } },
        select: { naicsCode: true, setAside: true, payload: true, deadline: true },
        take: 5000,
      }),
      prisma.contractCache.findMany({
        where: { OR: [{ deadline: { gte: now } }, { deadline: null }] },
        select: { naicsCode: true, setAside: true, payload: true, deadline: true },
        take: 5000,
      }),
    ])
    week = parse(weekRows)
    live = parse(liveRows)
  } catch {
    // Do NOT bail. Only the data-driven drafts below need the store, and each
    // one is already guarded on a minimum sample, so they skip themselves when
    // `week`/`live` stay empty. The topical and evergreen drafts need no
    // database whatsoever. Returning early here meant a single DB hiccup — or
    // an unmigrated table — emptied the entire studio, which reads as "the
    // posts never changed" rather than as an outage.
  }

  // ── 1. The week, after subtraction ───────────────────────────────────────
  // Reframed away from a raw volume count. A big number is a vanity metric in
  // this market; the useful move is showing how fast it collapses once you
  // apply the filters a real firm applies.
  if (week.length >= 25) {
    const setAside = week.filter(c => SMALL_BIZ_SET_ASIDES.has(c.setAside.toUpperCase())).length
    const pct = Math.round((setAside / week.length) * 100)
    const narrow = week.filter(c => {
      const code = c.setAside.toUpperCase()
      return code.startsWith('8A') || code.startsWith('SDVOSB') || code.startsWith('WOSB')
        || code.startsWith('EDWOSB') || code.startsWith('HZ') || code.startsWith('VS')
    }).length
    posts.push({
      kind: 'weekly-pulse',
      audience: 'company',
      label: 'The week, after subtraction',
      body: [
        `IR tracked ${n(week.length)} new federal solicitations this week. That number is almost useless on its own, so here is what happens to it.`,
        ``,
        `${n(setAside)} of them, ${pct}%, carry a small-business set-aside. Everything else puts you against firms with proposal departments.`,
        ``,
        `${n(narrow)} go further than that and are restricted to a specific certification: 8(a), SDVOSB, WOSB, EDWOSB, HUBZone or VOSB. Those are the smallest pools and the shortest competitor lists, and they are closed to you unless you hold the certification.`,
        ``,
        `Then subtract the wrong NAICS codes, the wrong geography, the wrong contract size, and the ones with a prerequisite you cannot meet on submission day.`,
        ``,
        `What is left is usually a handful. That is not a disappointing number, it is the real one, and it is the difference between a pipeline and a list.`,
        ``,
        `The opportunities were never the scarce part.`,
      ].join('\n'),
      hashtags: '#GovCon #FederalContracting #SmallBusiness',
      cta: 'Tell us your NAICS code and set-aside status and we will show you what survives the subtraction.',
      reference: 'ir-gov.app',
      dataNote: `Counted ${n(week.length)} solicitations in IR's store with a posted date in the last 7 days; ${n(setAside)} carried any small-business set-aside code and ${n(narrow)} carried a certification-specific code (8(a), SDVOSB, WOSB/EDWOSB, HUBZone, VOSB). IR's store is a synced subset of SAM.gov, not a census, which is why the post says "IR tracked".`,
      image: { stat: n(narrow), label: 'NEED A CERTIFICATION YOU MAY NOT HOLD', sub: `Of ${n(week.length)} tracked this week. ${n(setAside)} carry any set-aside at all.` },
    })
  }

  // ── 2. Concentration ─────────────────────────────────────────────────────
  // Same tally, different question: not "which codes were busy" but "how
  // unevenly was the week distributed", which is the part that tells a reader
  // whether their code being absent means anything.
  const topNaics = tally(week.map(c => c.naicsCode), 5)
  if (topNaics.length >= 3 && topNaics[0].count >= 8) {
    const topSum = topNaics.reduce((s, t) => s + t.count, 0)
    const share = Math.round((topSum / week.length) * 100)
    const lines = topNaics.map((t, i) => `${i + 1}. ${naicsName(t.key)} — ${n(t.count)}`)
    posts.push({
      kind: 'sector-heat',
      audience: 'company',
      label: 'How concentrated the week was',
      body: [
        `Federal buying is not spread evenly, and this week is a clean illustration.`,
        ``,
        `Five NAICS codes accounted for ${share}% of everything IR tracked:`,
        ``,
        ...lines,
        ``,
        `If your code is on that list, this was a busy week for you and it is worth an hour of attention.`,
        ``,
        `If it is not, that is not bad news and it is not a reason to widen your search. Federal requirements arrive in waves driven by fiscal calendars, program cycles and expiring contracts. A quiet week in your code is normal, and chasing work outside it because this week looked slow is how firms end up bidding things they cannot win.`,
        ``,
        `This is posting volume, not dollars. A code can be busy with small requirements or quiet with one large one.`,
      ].join('\n'),
      hashtags: '#GovCon #FederalContracting #NAICS',
      cta: 'Ask us what your NAICS code looked like this week.',
      reference: 'ir-gov.app',
      dataNote: `Grouped ${n(week.length)} solicitations in IR's store, posted in the last 7 days, by NAICS code. The top ${topNaics.length} codes accounted for ${n(topSum)} of them, or ${share}%. Counts are solicitations tracked, not award dollars, and the store is a synced subset of SAM.gov.`,
      image: { stat: `${share}%`, label: 'OF THE WEEK IN FIVE NAICS CODES', sub: 'Federal buying arrives in waves, not evenly.' },
    })
  }

  // ── 3. Who is still buying ───────────────────────────────────────────────
  // Re-angled onto the CR. Under a continuing resolution new starts are
  // constrained, which makes "who is still putting requirements on the
  // street" a more interesting question than raw activity.
  const topAgency = tally(week.map(c => c.agency), 1)[0]
  if (topAgency && topAgency.count >= 10) {
    const theirs = week.filter(c => c.agency === topAgency.key)
    const theirSetAside = theirs.filter(c => SMALL_BIZ_SET_ASIDES.has(c.setAside.toUpperCase())).length
    const pct = Math.round((theirSetAside / theirs.length) * 100)
    posts.push({
      kind: 'agency-spotlight',
      audience: 'company',
      label: `Who is still buying: ${topAgency.key}`,
      body: [
        `Agencies are operating under a continuing resolution through December 11, at last year's funding levels, with new starts generally restricted. So the useful question this quarter is not how much is being bought. It is who is still putting requirements on the street.`,
        ``,
        `The most active buyer in what IR tracked this week was ${topAgency.key}, with ${n(topAgency.count)} solicitations. ${pct}% of them carry a small-business set-aside.`,
        ``,
        `An agency still publishing under a CR is generally publishing continuing work rather than new starts: recompetes of existing requirements, follow-ons, and orders against vehicles that already exist. Which is exactly the kind of work a small firm can realistically win, because the requirement is already understood and the incumbent is visible.`,
        ``,
        `If you sell to this agency, this is a week to be in front of them rather than waiting for the new fiscal year to unlock something.`,
      ].join('\n'),
      hashtags: '#GovCon #FederalContracting #SmallBusiness',
      cta: 'Ask us which agencies are most active in your NAICS code right now.',
      reference: 'ir-gov.app',
      dataNote: `${topAgency.key} accounted for ${n(topAgency.count)} of ${n(week.length)} solicitations in IR's store over 7 days; ${n(theirSetAside)} carried small-business set-aside codes. "Most active" is scoped to IR's synced subset and to solicitation count, not award value. Agency strings come from SAM.gov and are grouped verbatim, so sub-agency naming variants may split a count. CR context: enacted 2026-09-02, funding at FY2026 levels through 2026-12-11; the restriction on new starts is a general feature of continuing resolutions.`,
      image: { stat: n(topAgency.count), label: `SOLICITATIONS FROM ${topAgency.key.toUpperCase().slice(0, 28)}`, sub: `${pct}% carry a small-business set-aside` },
    })
  }

  // ── 4. The arithmetic of a seven-day window ──────────────────────────────
  const soon = live.filter(c => {
    if (!c.deadline) return false
    const days = (c.deadline.getTime() - now.getTime()) / 86_400_000
    return days >= 0 && days <= 7
  })
  if (soon.length >= 20) {
    const soonSetAside = soon.filter(c => SMALL_BIZ_SET_ASIDES.has(c.setAside.toUpperCase())).length
    posts.push({
      kind: 'deadline-pressure',
      audience: 'founder',
      label: 'The arithmetic of a seven-day window',
      body: [
        `${n(soon.length)} contracts IR is tracking close in the next seven days. ${n(soonSetAside)} carry small-business set-asides.`,
        ``,
        `Now do the arithmetic that actually matters.`,
        ``,
        `A serious proposal is forty to eighty hours. In seven days, working nights around delivery, you might have room for one. Possibly two if you are already positioned and reusing recent content.`,
        ``,
        `So the real question is never which of these you could bid. It is which single one you would still be glad you chose after losing.`,
        ``,
        `And here is the uncomfortable part. If you are seeing a requirement for the first time with a week left, you are usually already late. The firms that win were talking to that program office during market research, months before anything was published, and the requirement was shaped while they were in the room.`,
        ``,
        `Bidding what closes this week is not a strategy. Knowing what closes next quarter is.`,
      ].join('\n'),
      hashtags: '#GovCon #CaptureManagement #FederalContracting',
      cta: 'DM me your NAICS code and I will tell you what is closing in it next quarter, not this week.',
      dataNote: `Counted ${n(soon.length)} solicitations in IR's store with response deadlines within 7 days; ${n(soonSetAside)} carried small-business set-aside codes. Scoped to IR's synced subset. The 40 to 80 hour proposal range is a widely cited industry figure, not an IR measurement.`,
      image: { stat: n(soon.length), label: 'CLOSING IN SEVEN DAYS', sub: 'You have time for one. Choose the one you would not regret losing.' },
    })
  }

  // ── 5. The split the SBA rule would change ───────────────────────────────
  if (live.length >= 200) {
    const buckets: Record<string, number> = {}
    for (const c of live) {
      const code = c.setAside.toUpperCase()
      if (!SMALL_BIZ_SET_ASIDES.has(code)) continue
      // SBP is a PARTIAL small-business set-aside and must not be folded in
      // with total set-asides — they are different competitive situations.
      const label =
        code.startsWith('8A') ? '8(a)'
        : code.startsWith('SDVOSB') ? 'SDVOSB'
        : code.startsWith('WOSB') || code.startsWith('EDWOSB') ? 'WOSB / EDWOSB'
        : code.startsWith('HZ') ? 'HUBZone'
        : code.startsWith('VS') ? 'VOSB'
        : code === 'SBP' ? 'Partial Small Business'
        : 'Total Small Business'
      buckets[label] = (buckets[label] ?? 0) + 1
    }
    const rows = Object.entries(buckets).sort((a, b) => b[1] - a[1])
    const total = rows.reduce((s, [, v]) => s + v, 0)
    const certOnly = rows
      .filter(([l]) => l !== 'Total Small Business' && l !== 'Partial Small Business')
      .reduce((s, [, v]) => s + v, 0)
    if (total >= 50) {
      posts.push({
        kind: 'set-aside-share',
        audience: 'company',
        label: 'The split the SBA rule would change',
        body: [
          `${n(total)} of the open contracts IR is tracking carry small-business set-asides. The split:`,
          ``,
          ...rows.map(([label, count]) => `${label} — ${n(count)}`),
          ``,
          `Hold that shape in mind against the SBA size standards proposal, which would make 114,541 more firms eligible as small businesses. It is proposed, not law.`,
          ``,
          `If it is adopted, the general small business line gets more crowded. The ${n(certOnly)} contracts restricted to a specific certification do not, because 8(a), SDVOSB, WOSB and HUBZone gate on ownership, control and geography rather than on a revenue threshold. Those gates do not move when a size standard moves.`,
          ``,
          `Which is the argument for checking what you qualify for now rather than later. A certification you already hold would get more valuable, not less.`,
        ].join('\n'),
        hashtags: '#GovCon #SmallBusiness #8a #SDVOSB #WOSB #HUBZone',
        cta: 'The free eligibility check is on our page. Five questions, no signup.',
        reference: 'ir-gov.app/eligibility',
        dataNote: `Grouped ${n(total)} open solicitations in IR's store by set-aside code, out of ${n(live.length)} live records tracked; ${n(certOnly)} carry a certification-specific code. Scoped to IR's synced subset, not the full federal market. SBA figure of 114,541 additional eligible firms is from the proposed rule, RIN 3245-AI67, which is proposed and not adopted.`,
        image: { stat: n(certOnly), label: 'RESERVED FOR A SPECIFIC CERTIFICATION', sub: `Of ${n(total)} tracked set-aside contracts open right now.` },
      })
    }
  }

  // ── 6. What the advertised number is actually worth ──────────────────────
  try {
    // 75+ means the award record actually cites the solicitation. Lower
    // confidences are statistical guesses — fine for internal aggregates,
    // not fine to publish a pricing claim on.
    const outcomes = await prisma.contractOutcome.findMany({
      where: { matchConfidence: { gte: 75 }, awardAmount: { gt: 0 }, estimatedValue: { gt: 0 } },
      select: { estimatedValue: true, awardAmount: true },
      take: 1000,
    })
    const ratios = outcomes
      .map(o => o.awardAmount! / o.estimatedValue!)
      .filter(r => r > 0.05 && r < 20)
      .sort((a, b) => a - b)
    if (ratios.length >= 40) {
      const mid = ratios[Math.floor(ratios.length / 2)]
      const pct = Math.round(mid * 100)
      const over = ratios.filter(r => r > 1).length
      const overPct = Math.round((over / ratios.length) * 100)
      posts.push({
        kind: 'pricing-reality',
        audience: 'company',
        label: 'What the advertised number is actually worth',
        body: [
          `Every solicitation carries an estimated value, and a lot of firms treat it as a price signal. We have been checking whether it is one.`,
          ``,
          `Across ${n(ratios.length)} awards we matched back to their original solicitation, the median landed at ${pct}% of the advertised value. ${overPct}% came in above the advertised figure.`,
          ``,
          `That spread is the whole point. If the advertised number reliably predicted the award, there would be no spread to report.`,
          ``,
          `Two caveats we would rather state than have pointed out. This is our sample, not the market. And advertised value is often a ceiling rather than an estimate, particularly on IDIQs, so landing under it is not automatically a discount.`,
          ``,
          `What survives both caveats: estimated value is a planning figure. Pricing to it, or walking away because it looks too small, are both decisions made on a number that was never meant to carry that weight.`,
        ].join('\n'),
        hashtags: '#GovCon #FederalContracting #Pricing',
        cta: 'Ask us what awards have looked like against advertised value in your NAICS code.',
        reference: 'ir-gov.app',
        dataNote: `Median of ${n(ratios.length)} solicitation-to-award matches at confidence 75+ (the award record cites the solicitation number, not a statistical guess), comparing award amount to advertised value; ${n(over)} of ${n(ratios.length)} exceeded the advertised figure. Ratios outside 0.05-20x are excluded as mismatches or IDIQ ceilings. Sample is IR's records only.`,
        image: { stat: `${pct}%`, label: 'MEDIAN AWARD VS ADVERTISED VALUE', sub: `${overPct}% came in above the advertised figure. IR-matched awards only.` },
      })
    }
  } catch { /* outcomes table not migrated yet — skip this draft */ }

  // ── 7. Capability + positioning + founder voice ──────────────────────────
  // These do not depend on a weekly sample, so they always have something to
  // publish, but they still quote live counts where they can.
  posts.push(...evergreenPosts({ live: live.length, week: week.length }))
  posts.push(...topicalPosts())

  return posts
}

// ── TOPICAL: what is actually happening in the market right now ────────────
//
// These are the drafts with a shelf life. Each carries its own expiry, because
// a post about a comment window that has already closed, or a fiscal year that
// has already ended, reads as someone who is not paying attention. Better to
// serve nothing than to serve stale.
//
// SOURCING RULE for everything below: a figure appears only if it was verified
// against the primary document or cross-checked across independent summaries,
// and the sourceNote records which. A proposed rule is always called proposed.

// SBA size-standards overhaul. Proposed 2026-08-20, Docket SBA-2026-0199,
// RIN 3245-AI67. PROPOSED, not adopted.
const SBA_COMMENT_DEADLINE = new Date('2026-09-21T23:59:59Z')
const SBA_RELEVANCE_END = new Date('2027-03-01T00:00:00Z')

// Federal fiscal year end. The single most reliably useful date in this
// market, and it resets itself every year.
function fiscalYearEnd(now: Date): Date {
  const y = now.getUTCFullYear()
  const thisYearEnd = new Date(Date.UTC(y, 8, 30, 23, 59, 59)) // Sept 30
  return now <= thisYearEnd ? thisYearEnd : new Date(Date.UTC(y + 1, 8, 30, 23, 59, 59))
}

/**
 * Whole calendar days from today until a deadline.
 *
 * Deliberately not a timestamp subtraction. Dividing the millisecond delta and
 * rounding gives a different answer depending on what time of day the draft is
 * generated — "14 days left" in the morning becomes "15 days left" at
 * midnight, off the same deadline. These counts go into public posts next to a
 * date the reader can check, so they are computed on calendar days: the count
 * is how many days remain including the deadline day itself.
 */
function calendarDaysUntil(deadline: Date, now: Date): number {
  const a = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const b = Date.UTC(deadline.getUTCFullYear(), deadline.getUTCMonth(), deadline.getUTCDate())
  return Math.round((b - a) / 86_400_000)
}

/** "3 days" / "1 day" / "0 days" — pluralisation only, no framing. */
const dayCount = (d: number) => `${d} ${d === 1 ? 'day' : 'days'}`

// CAS deregulation. Final rule published 2026-09-01, effective 2026-10-01.
const CAS_EFFECTIVE = new Date('2026-10-01T00:00:00Z')
const CAS_RELEVANCE_END = new Date('2026-12-31T00:00:00Z')

// Continuing resolution enacted 2026-09-02, funding agencies at FY2026 levels
// through 2026-12-11. Averted the Oct 1 shutdown; the cliff simply moved.
// When this is superseded by full-year appropriations or another CR, update
// the date here and the drafts re-aim themselves.
const CR_EXPIRY = new Date('2026-12-11T23:59:59Z')

const SBA_SOURCE =
  'SBA proposed rule published 2026-08-20 in the Federal Register, RIN 3245-AI67 / Docket No. SBA-2026-0199. SBA issued TWO companion rules that day (industry size standards, and a revised methodology); these figures are from the rule carrying this RIN. Verified: 995 existing size standards consolidated to 338; 114,541 additional firms become eligible, of which about 37,002 are FY2025 federal contractors holding 105,655 contracts worth more than $71 billion; total eligible small businesses rise from 6,344,967 to 6,459,508 (+1.8%); 24 industry groups see a reduction totalling fewer than 200 firms; comments due 2026-09-21. Cross-checked across Pillsbury, Holland & Knight, Hunton, Schwabe and Potomac Law summaries plus SBA Office of Advocacy. PROPOSED, not adopted.'

function topicalPosts(): GeneratedPost[] {
  const now = new Date()
  const out: GeneratedPost[] = []

  const daysToFy = calendarDaysUntil(fiscalYearEnd(now), now)
  const daysToComment = calendarDaysUntil(SBA_COMMENT_DEADLINE, now)
  const daysToCr = calendarDaysUntil(CR_EXPIRY, now)
  const daysToCas = calendarDaysUntil(CAS_EFFECTIVE, now)

  // ── FOUNDER: the disqualifier nobody scores ──────────────────────────────
  // Came out of a real comment thread with a capture practitioner. The most
  // original thing on this list, because it is not in anybody's newsletter.
  out.push({
    kind: 'founder-prereq',
    audience: 'founder',
    label: 'The one word that disqualifies you',
    body: [
      `Someone who has clearly run capture for a living left a comment on my last post, and it named the thing I have been circling for weeks.`,
      ``,
      `Most small firms can read a solicitation fine. What they cannot do is decide quickly whether it is winnable.`,
      ``,
      `And the fastest way to be wrong about that is not pricing. It is a prerequisite that has to be in place at submission rather than at award.`,
      ``,
      `Here is what makes it brutal. The difference is usually one word.`,
      ``,
      `"Offeror shall possess a facility clearance."`,
      `"Contractor shall obtain a facility clearance."`,
      ``,
      `Same paragraph. Opposite answer. The first one means you are out today. The second means you have until award to get there.`,
      ``,
      `And it is rarely anywhere convenient. It sits in Section L, or an attachment, or a page of a PDF nobody scrolled to.`,
      ``,
      `Clearance level. CMMC. Bonding capacity. Key personnel who must already be named and qualified. Each one quietly removes more small businesses from the field than price ever does, and most of them find out after they have spent the weekend writing.`,
      ``,
      `We do not parse for this yet. Right now the only thing IR hard-disqualifies on is set-aside status, because that arrives as clean structured data and the rest does not.`,
      ``,
      `Saying that out loud because I would rather be honest about the gap than pretend the product is further along than it is.`,
      ``,
      `If you bid federal work: what is the prerequisite that has burned you?`,
    ].join('\n'),
    hashtags: '#GovCon #CaptureManagement #SmallBusiness',
    cta: 'Reply with the one that got you. I am collecting them.',
    dataNote:
      'Opinion and product transparency. The two quoted phrasings are illustrative examples of standard solicitation language, not quotations from a specific solicitation. The claim about what IR currently disqualifies on is accurate as of this writing: set-aside eligibility is the only hard disqualifier in the scoring layer.',
    image: {
      stat: '1',
      label: 'WORD BETWEEN BIDDABLE AND NOT',
      sub: '"Shall possess" vs "shall obtain." Same paragraph, opposite answer.',
    },
  })

  // ── FISCAL YEAR END ──────────────────────────────────────────────────────
  if (daysToFy <= 45 && daysToFy >= 0) {
    const fyStat = daysToFy === 0 ? 'TODAY' : `${daysToFy}`

    out.push({
      kind: 'fy-end',
      audience: 'founder',
      label: `Fiscal year end (${daysToFy === 0 ? 'today' : `${dayCount(daysToFy)} out`})`,
      body: [
        daysToFy === 0
          ? `Today is September 30, the last day of the federal fiscal year.`
          : `${dayCount(daysToFy)} until September 30.`,
        ``,
        `If you are new to federal work, here is why everyone gets tense around now. Most annual appropriations stop being available for new obligations after that date. Money that is not committed does not roll over, and an office that gives it back has a harder argument next year.`,
        ``,
        `So the last weeks of September are the densest buying window in the federal calendar.`,
        ``,
        `The mistake I see is treating that as a reason to bid more. It is not. Volume against work you were never positioned for is how a ten person firm loses a quarter.`,
        ``,
        `What it actually changes is speed. Turnarounds get shorter, simplified acquisitions get used more, and a contracting officer who already knows your name has an easier time moving quickly than one meeting you for the first time on a proposal.`,
        ``,
        `Which means the highest-value thing you can do right now is not writing. It is being findable and already known.`,
        ``,
        `Capability statement current. SAM registration active and accurate. A short note to the contracting officers you have already worked with, telling them what you have capacity for right now.`,
        ``,
        `The bidding decision is still subtraction. The calendar just moved the deadline.`,
      ].join('\n'),
      hashtags: '#GovCon #FederalContracting #SmallBusiness',
      cta: 'DM me your NAICS code and I will tell you what I am seeing close in it.',
      dataNote:
        'The federal fiscal year ends September 30 and most annual appropriations expire for new obligations after that date. That is a structural fact of appropriations law, not an IR measurement. No volume or dollar claims are made.',
      image: {
        stat: fyStat,
        label: daysToFy === 0 ? 'FISCAL YEAR ENDS' : 'DAYS TO FISCAL YEAR END',
        sub: 'Most annual appropriations expire for new obligations after September 30.',
      },
    })

    out.push({
      kind: 'company-fy-end',
      audience: 'company',
      label: `Company: fiscal year end (${daysToFy === 0 ? 'today' : `${dayCount(daysToFy)} out`})`,
      body: [
        daysToFy === 0
          ? `The federal fiscal year ends today.`
          : `${dayCount(daysToFy)} until the federal fiscal year ends.`,
        ``,
        `The mechanic behind the September surge is simple. Most annual appropriations are available for new obligations only until September 30. Unobligated money does not carry forward, and an agency that returns it weakens its own case in the next budget cycle.`,
        ``,
        `The practical consequence for a small contractor is not that there is more work. It is that the work moves faster. Response windows compress, simplified acquisition procedures get used more heavily, and prior familiarity with a contracting office matters more than it does in March.`,
        ``,
        `Which is why we keep saying the same unglamorous thing at this time of year. Being findable beats being fast. A current capability statement and an accurate SAM registration are worth more in the last three weeks of September than any amount of proposal effort started from scratch.`,
        ``,
        `We are tracking what closes between now and the 30th across the set-aside categories, and posting what the data actually shows rather than what the season is supposed to feel like.`,
      ].join('\n'),
      hashtags: '#GovCon #FederalContracting #SmallBusiness',
      cta: 'Tell us your NAICS code and we will send you what we are tracking in it.',
      reference: 'ir-gov.app',
      dataNote:
        'Describes appropriations mechanics, which are structural rather than measured. No claim is made about the volume or value of what is closing; any such figure must come from the data-driven drafts, which state that they count only what IR tracked.',
      image: {
        stat: fyStat,
        label: daysToFy === 0 ? 'FISCAL YEAR ENDS' : 'DAYS TO FISCAL YEAR END',
        sub: 'Response windows compress. Being findable beats being fast.',
      },
    })
  }

  // ── THE CR WINDOW — funding certainty with an expiry date ────────────────
  // Enacted 2026-09-02, funds agencies at FY2026 levels through 2026-12-11.
  // The most decision-relevant date in the market after Sept 30, and almost
  // nothing written for small contractors explains what it changes for them.
  if (daysToCr >= 0) {
    const crStat = daysToCr === 0 ? 'TODAY' : `${daysToCr}`

    out.push({
      kind: 'cr-window',
      audience: 'founder',
      label: `The CR window (${daysToCr === 0 ? 'expires today' : `${dayCount(daysToCr)} left`})`,
      body: [
        `There was going to be a shutdown on October 1. There is not, and I think most small contractors have not worked out what that actually means for them.`,
        ``,
        `Congress passed a continuing resolution on September 2. It funds agencies at last year's levels through December 11. None of the twelve full-year appropriations bills for FY2027 have been enacted.`,
        ``,
        `${daysToCr === 0 ? `That window closes today.` : `That leaves ${dayCount(daysToCr)} of funding certainty.`}`,
        ``,
        `Here is the part that matters if you sell to the government. A continuing resolution is not the same as being funded. Agencies operate at prior-year rates, and new starts, meaning programs that did not exist in last year's budget, are generally restricted.`,
        ``,
        `So the October to December market skews toward continuations, recompetes, and orders on vehicles that already exist. If you have been waiting on a brand new requirement to be funded, the realistic expectation is that it does not move until this is resolved.`,
        ``,
        `That is not a reason to stop. It is a reason to point your effort at the recompete calendar instead of the new-program pipeline for the next quarter.`,
        ``,
        `Every contract has a known expiry date. In a quarter where new starts are constrained, an existing requirement coming up for renewal is not a new start, and that is where the winnable opportunities are.`,
      ].join('\n'),
      hashtags: '#GovCon #FederalContracting #SmallBusiness',
      cta: 'DM me your NAICS code and I will tell you what is expiring in it before December.',
      dataNote:
        'Continuing resolution enacted 2026-09-02, funding federal agencies at FY2026 levels through 2026-12-11. As of that date none of the twelve FY2027 appropriations bills had been enacted; three had passed the House and none had been reported from Senate Appropriations. Verified via Congress.gov and CSIS appropriations tracking. The new-start prohibition is a standard feature of continuing resolutions (CRS R46595 describes it as prohibiting new production of items not funded for production in prior fiscal years), and is described here as general CR practice rather than as a quoted provision of this one. Note the distinction the drafts rely on: a recompete of an existing requirement is continuing work, not a new start.',
      image: {
        stat: crStat,
        label: daysToCr === 0 ? 'LAST DAY OF THE CR' : 'DAYS OF FUNDING CERTAINTY',
        sub: 'CR runs to December 11 at FY2026 levels. No FY2027 bills enacted.',
      },
    })

    out.push({
      kind: 'company-cr-window',
      audience: 'company',
      label: `Company: the CR window (${daysToCr === 0 ? 'expires today' : `${dayCount(daysToCr)} left`})`,
      body: [
        `A continuing resolution enacted on September 2 funds federal agencies at FY2026 levels through December 11. No shutdown on October 1, and ${daysToCr === 0 ? 'the window closes today' : `${dayCount(daysToCr)} of funding certainty from today`}.`,
        ``,
        `What that changes for the small business market is worth stating plainly, because most coverage of a CR is written for people who follow appropriations rather than people who bid.`,
        ``,
        `Under a continuing resolution agencies generally operate at prior-year rates and new starts are restricted. The practical effect is a quarter weighted toward continuations, recompetes, and orders against existing vehicles rather than newly funded requirements.`,
        ``,
        `For a small firm deciding where to spend limited capture time between now and December, that is a real signal. A brand new program you have been tracking is less likely to move. A contract expiring in your NAICS code is a continuing requirement rather than a new start, so it is far less exposed to this.`,
        ``,
        `None of the twelve FY2027 appropriations bills have been enacted. December 11 is the next decision point, and it is worth putting on a calendar now rather than discovering it in December.`,
      ].join('\n'),
      hashtags: '#GovCon #FederalContracting #SmallBusiness',
      cta: 'Our recompete tracking is free to try. Ask us what is expiring in your NAICS code.',
      reference: 'ir-gov.app',
      dataNote:
        'Continuing resolution enacted 2026-09-02, funding at FY2026 levels through 2026-12-11; none of the twelve FY2027 appropriations bills enacted as of that date. Verified via Congress.gov and CSIS appropriations tracking. The restriction on new starts is described as a general feature of continuing resolutions, not as a quoted provision.',
      image: {
        stat: crStat,
        label: daysToCr === 0 ? 'LAST DAY OF THE CR' : 'DAYS OF FUNDING CERTAINTY',
        sub: 'Continuations and recompetes over new starts until December 11.',
      },
    })
  }

  // ── CAS: the loudest story that does not apply to this audience ──────────
  if (now < CAS_RELEVANCE_END) {
    out.push({
      kind: 'cas-noise',
      audience: 'founder',
      label: `The CAS news that does not apply to you${daysToCas >= 0 ? ` (effective in ${dayCount(daysToCas)})` : ''}`,
      body: [
        `Half the government contracting newsletters this week are about Cost Accounting Standards. CAS 407 was rescinded almost entirely in a final rule published September 1${daysToCas > 0 ? `, effective October 1, which is ${dayCount(daysToCas)} away` : ', effective October 1'}, after the board found most of its requirements now duplicate GAAP. It follows a July rule that rescinded four more standards.`,
        ``,
        `If you are a small business, here is the useful part.`,
        ``,
        `Small businesses are exempt from CAS. It does not apply to you. None of it.`,
        ``,
        `I am posting this because filtering is most of the value in this industry and nobody does it for the small end of the market. There is an enormous amount of GovCon content written for firms with a compliance department, and it gets read by people who do not have one, and it makes an already intimidating market feel more intimidating than it is.`,
        ``,
        `What actually deserves your attention right now, in date order: the SBA size standards comment window closing September 21, the fiscal year ending September 30, and the continuing resolution running out on December 11.`,
        ``,
        `Not everything that is real news is your news. Knowing the difference is worth more than reading everything.`,
      ].join('\n'),
      hashtags: '#GovCon #SmallBusiness #FederalContracting',
      cta: 'What GovCon news have you been told to care about that turned out not to apply to you?',
      dataNote:
        'CAS 407: final rule published 2026-09-01 by the CAS Board, effective 2026-10-01, rescinding CAS 407 in near entirety after finding 12 of its 16 requirements duplicative of GAAP and CAS 401, with a narrow production-unit remnant relocated to CAS 418. A separate final rule of 2026-07-08 rescinded CAS 404, 408, 409 and 411. The small business exemption is codified at 48 CFR 9903.201-1(b)(3): contracts and subcontracts with small business concerns are exempt from all CAS requirements. Re-verified 2026-09-07 against the eCFR text, plus the Federal Register and Crowell, Hunton and Covington summaries.',
      image: {
        stat: '0',
        label: 'CAS RULES THAT APPLY TO YOU',
        sub: 'Small businesses are exempt from Cost Accounting Standards entirely.',
      },
    })
  }

  // ── SBA: the deadline push, gated on the window ─────────────────────────
  if (now <= SBA_COMMENT_DEADLINE) {
    const sbaStat = daysToComment === 0 ? 'TODAY' : `${daysToComment}`

    out.push({
      kind: 'sba-deadline',
      audience: 'founder',
      label: `SBA comment deadline (${daysToComment === 0 ? 'closes today' : `${dayCount(daysToComment)} left`})`,
      body: [
        daysToComment === 0
          ? `Today is the last day to comment on the SBA size standards proposal, and I want to make one thing easy.`
          : `${dayCount(daysToComment)} left to comment on the SBA size standards proposal, and I want to make one thing easy.`,
        ``,
        `The proposal would consolidate 995 size standards into 338 and, by SBA's own estimate, make 114,541 more firms eligible as small businesses. Roughly 37,002 of those already hold federal contracts. It is proposed, not law.`,
        ``,
        `Whatever you think of it, the comment record is thin compared to the number of firms it would affect, and agencies are required to respond to substantive comments before finalizing.`,
        ``,
        `So I built a free comment builder. No signup, nothing stored, and it works whether you support the rule, oppose it, or land somewhere in between. I was not willing to ship a version that only helped one side, because that is lobbying wearing a public service costume.`,
        ``,
        `It assembles a properly formatted comment in about two minutes. The part that matters most is the free text box, because identical form comments carry far less weight than one specific example from your business.`,
        ``,
        `Comments close September 21. It is in my featured section.`,
      ].join('\n'),
      hashtags: '#GovCon #SmallBusiness #SBA',
      cta: 'The comment builder is pinned in my Featured section. Search Docket SBA-2026-0199 on regulations.gov to file directly.',
      reference: 'ir-gov.app/sba-comment',
      dataNote: SBA_SOURCE,
      image: {
        stat: sbaStat,
        label: daysToComment === 0 ? 'LAST DAY TO COMMENT' : 'DAYS TO COMMENT ON THE SBA RULE',
        sub: 'Proposed, not law. Free builder, no signup, any position.',
      },
    })

    out.push({
      kind: 'company-sba-deadline',
      audience: 'company',
      label: `Company: SBA comment deadline (${daysToComment === 0 ? 'closes today' : `${dayCount(daysToComment)} left`})`,
      body: [
        daysToComment === 0
          ? `The comment window on the SBA size standards proposal closes today.`
          : `${dayCount(daysToComment)} remain to comment on the SBA size standards proposal.`,
        ``,
        `The proposal would consolidate 995 industry size standards into 338 and, by SBA's estimate, make 114,541 additional firms eligible as small businesses. About 37,002 of those already hold federal contracts. It is a proposed rule and has not been adopted.`,
        ``,
        `Agencies are required to consider substantive public comments before issuing a final rule, and the comment record on this docket is thin relative to the number of firms it would affect.`,
        ``,
        `We built a free comment builder for it. No signup, nothing stored, and it supports commenters who oppose the rule, support it, or hold a mixed position. A tool that only helped one side would be advocacy wearing a public service costume, and we were not willing to put our name on that.`,
        ``,
        `Comments close September 21 under Docket SBA-2026-0199.`,
      ].join('\n'),
      hashtags: '#GovCon #SmallBusiness #SBA',
      cta: 'The free comment builder is linked on our page. No account required.',
      reference: 'ir-gov.app/sba-comment',
      dataNote: SBA_SOURCE,
      image: {
        stat: sbaStat,
        label: daysToComment === 0 ? 'LAST DAY TO COMMENT' : 'DAYS TO COMMENT ON THE SBA RULE',
        sub: 'Free builder. No signup. Any position.',
      },
    })
  }

  // ── COMPANY: the analytical read, survives the comment deadline ─────────
  if (now < SBA_RELEVANCE_END) {
    out.push({
      kind: 'sba-thesis',
      audience: 'company',
      label: 'SBA thesis: certifications become the moat',
      body: [
        `A consequence of the SBA size standards proposal that we have not seen discussed much.`,
        ``,
        `The proposal would move 114,541 additional firms into small business eligibility. About 37,002 of them already hold federal contracts, together holding 105,655 contracts worth more than 71 billion dollars. These are not new entrants. They are established competitors who would become eligible for the same set-asides as a ten person shop.`,
        ``,
        `The volume of set-aside work does not increase to match.`,
        ``,
        `Which means the broad small business category gets more crowded, while the narrower certifications do not expand the same way. 8(a), SDVOSB, WOSB and HUBZone all require something beyond size: ownership, control, certification, geography. Those gates do not move because a revenue threshold moved.`,
        ``,
        `If this is adopted, the practical effect is that a certification you already hold becomes worth more, not less, and firms that never pursued one may find the general small business pool a harder place to compete.`,
        ``,
        `This is a proposed rule. It has not been adopted and the figures could change before it is.`,
      ].join('\n'),
      hashtags: '#GovCon #SmallBusiness #SetAsides',
      cta: 'Free eligibility check for the narrower certifications is on our page.',
      reference: 'ir-gov.app/eligibility',
      dataNote: SBA_SOURCE,
      image: {
        stat: '338',
        label: 'STANDARDS REPLACING 995',
        sub: 'SBA proposed rule. Proposed, not adopted.',
      },
    })
  }

  return out
}

/**
 * Posts that stand on capability and positioning rather than the news cycle.
 *
 * Competitor language follows docs/COMPETITION.md deliberately: IR positions
 * on price tier, self-serve access, and the integrated loop. It never claims
 * to out-analyst an enterprise research desk, and never claims a
 * category-of-one on recompetes. Punching at a stronger incumbent's strength
 * reads as insecurity and invites a correction we would lose.
 */
function evergreenPosts(counts: { live: number; week: number }): GeneratedPost[] {
  const liveText = counts.live > 0 ? n(counts.live) : 'every open'
  const out: GeneratedPost[] = []

  // ── COMPANY: what the product is, without the completeness claim ────────
  out.push({
    kind: 'capability-loop',
    audience: 'company',
    label: 'What IR actually does',
    body: [
      `Most tools in this market stop at finding the contract. That is the easy half.`,
      ``,
      `IR pulls solicitations from SAM.gov every night and scores each one against your company: your NAICS codes, your set-aside status, your size, your geography. ${counts.live > 0 ? `${liveText} of them are open in our store right now.` : ''}`,
      ``,
      `Then it keeps going, because a match is not a decision. You get who held the work before and what they were paid, how far awards in that segment have historically landed from the advertised value, and a scored read on whether it is worth your weeks.`,
      ``,
      `And when you decide to bid, the capability statement and the proposal draft come out of the same profile you already filled in.`,
      ``,
      `Find, judge, draft, send. One loop, one login, priced like software rather than like a consultancy.`,
    ].join('\n'),
    hashtags: '#GovCon #FederalContracting #SmallBusiness',
    cta: 'DM us and we will set you up.',
    reference: 'ir-gov.app',
    dataNote: `Describes shipped functionality only. ${counts.live > 0 ? `The count of ${liveText} is open solicitations currently in IR's store, which is a synced subset of SAM.gov, not a census of the federal market.` : 'No volume claim made.'} Incumbent and award-value figures come from public USAspending records and are only shown where they exist.`,
    image: {
      stat: '4',
      label: 'STEPS, ONE LOGIN',
      sub: 'Find, judge, draft, send. Scored and sourced.',
    },
  })

  // ── COMPANY: the evidence tiers, which is the actual differentiator ─────
  out.push({
    kind: 'capability-evidence',
    audience: 'company',
    label: 'Why our score shows its work',
    body: [
      `Every tool in this category now ships a win probability. Almost none of them publish whether those numbers are any good.`,
      ``,
      `We decided early that a score is a claim, and if we want you to bet real weeks on ours we should show you where it came from.`,
      ``,
      `So every IR score breaks into three kinds of evidence, and says which is which.`,
      ``,
      `MEASURED is counted. Your own federal award history, pulled from public records by UEI, and the outcomes of solicitations we have already watched close. "You have won three awards in this NAICS code" is a count, not an opinion.`,
      ``,
      `STRUCTURAL is true by published rule. Set-aside eligibility, size standards, NAICS fit. Right by definition, and the first thing that can disqualify a bid.`,
      ``,
      `HEURISTIC is reasoned but not yet validated. Incumbent size as a proxy for entrenchment, for example. Defensible, not proven, and labelled so you can discount it.`,
      ``,
      `We are not claiming our score is a calibrated probability. The outcome record is still accumulating. When there is enough of it we will publish how we did, including if it is unflattering.`,
      ``,
      `A tool that tells you your odds should be willing to be measured on them.`,
    ].join('\n'),
    hashtags: '#GovCon #AI #FederalContracting',
    cta: 'The full breakdown is on our capabilities page.',
    reference: 'ir-gov.app/capabilities',
    dataNote:
      'Describes the shipped evidence-tier scoring layer. The statement that IR does not yet claim calibration is accurate and deliberate: the outcome dataset is still accumulating and no accuracy figure is published or implied.',
    image: {
      stat: '3',
      label: 'TIERS OF EVIDENCE, LABELLED',
      sub: 'Measured, structural, heuristic. You see which is which.',
    },
  })

  // ── FOUNDER: build in public ────────────────────────────────────────────
  out.push({
    kind: 'founder-build',
    audience: 'founder',
    label: 'Build in public: the gap a stranger found',
    body: [
      `Shipped something this week that most tools would rather not, and then had someone immediately show me a hole in it.`,
      ``,
      `The thing we shipped: every score in IR now tells you what kind of evidence it rests on. Counted from real records, true by published rule, or reasoned but not yet proven. The last category is labelled, because it is the part that could be wrong.`,
      ``,
      `Most products in this space would bury that. A number with a decimal point looks more confident than a number with a caveat.`,
      ``,
      `Then someone who has clearly done capture professionally pointed out that our incumbent read is shallow. We show who held the work and what they were paid. We do not show whether the agency was happy with them, and a recompete against a satisfied incumbent is a completely different bet than a recompete against a struggling one.`,
      ``,
      `They were right. It is now the thing I am working on.`,
      ``,
      `Building in public mostly gets sold as a marketing tactic. The actual value is that strangers with more experience than you will tell you what is wrong with your product for free, but only if you are honest enough about it that they can see the seams.`,
    ].join('\n'),
    hashtags: '#BuildInPublic #GovCon #SmallBusiness',
    cta: 'If you bid federal work and something in this is wrong, tell me. That is the whole point.',
    dataNote:
      'Narrative and product transparency. The described evidence-tier layer is shipped. The described gap in incumbent performance data is real and currently unaddressed; no claim is made that it is solved.',
  })

  // ── FOUNDER: contrarian ─────────────────────────────────────────────────
  out.push({
    kind: 'founder-contrarian',
    audience: 'founder',
    label: 'Contrarian: bidding more is not the strategy',
    body: [
      `The most common advice I hear given to new federal contractors is to bid on everything and treat it as a numbers game.`,
      ``,
      `I think that advice quietly destroys small companies.`,
      ``,
      `A serious proposal is forty to eighty hours. For a ten person firm that is a meaningful share of a month, taken directly out of billable work. Do that six times against contracts you were never positioned to win and you have spent a quarter of your year on nothing.`,
      ``,
      `Volume is a strategy for someone with a proposal team. For everyone else the skill is subtraction, deciding fast and honestly what to skip.`,
      ``,
      `The hard part of this business was never finding contracts. It is knowing which ones deserve your only real asset, which is your time.`,
    ].join('\n'),
    hashtags: '#GovCon #SmallBusiness #CaptureManagement',
    cta: 'DM me and I will set you up.',
    reference: 'ir-gov.app',
    dataNote:
      'Opinion piece. The 40 to 80 hour proposal estimate is a widely cited industry range, presented as such rather than as IR-measured data.',
  })

  out.push({
    kind: 'founder-article-why',
    audience: 'founder',
    format: 'article',
    label: 'ARTICLE: The number that decides your next 60 hours',
    title: 'The number that decides your next 60 hours',
    body: [
      `Somewhere tonight, a small business owner is going to sit down after everyone has gone home and decide whether to bid on a federal contract.`,
      ``,
      `It is not a small decision. A serious proposal runs 40 to 80 hours. For a ten person company that is a meaningful piece of a month, taken directly out of billable work. Get it wrong six times and you have spent a quarter of your year on nothing.`,
      ``,
      `So they will look for signal. Is the incumbent beatable? Is this really open, or shaped for someone else? Has anyone like us ever won work like this?`,
      ``,
      `At the large primes, a person is paid six figures a year to answer exactly those questions. They are called capture analysts, and the work takes weeks per pursuit.`,
      ``,
      `The small business owner has a search box and a gut feeling.`,
      ``,
      `That asymmetry is the entire reason IR exists. Not the paperwork, not the searching. The fact that one side of the market gets a professional answer and the other side guesses.`,
      ``,
      `WHY THE EXISTING TOOLS DID NOT CLOSE IT`,
      ``,
      `The established federal intelligence platforms are genuinely good. They employ real analyst desks, they produce real forecasting, and for a mid sized integrator with a capture team and a budget, they earn their price.`,
      ``,
      `They are just not built for the ten person shop. Enterprise pricing, a sales call before you can see the product, annual contracts. That is a coherent business. It is simply aimed above the buyer we are talking about, and everyone underneath that line was left with the search box.`,
      ``,
      `AND WHY THE NEW WAVE DOES NOT CLOSE IT EITHER`,
      ``,
      `Then AI arrived, and with it a wave of tools promising to score your odds. Point the model at the market, get a number back.`,
      ``,
      `Here is our problem with that. A score is a claim. When a tool tells a contractor they have a 73 percent chance, it is asking them to spend 60 hours of a small company's capacity on that assertion. And almost none of these tools will tell you where the number came from, what it weighed, what evidence sits behind it, or whether their scores have ever been checked against what actually happened.`,
      ``,
      `Confidence is the cheapest thing to manufacture and the most expensive thing to be wrong about. A number with no provenance is not intelligence. It is a guess wearing a lab coat.`,
      ``,
      `WHAT WE DID INSTEAD`,
      ``,
      `IR scores contracts too. The difference is that every score opens up.`,
      ``,
      `Each point carries three things: the factor, the reasoning, and what tier of evidence it rests on.`,
      ``,
      `Measured means counted from awards that actually happened, including your own federal award history pulled from public records. "You have won three contracts in this NAICS code" is a count, not an opinion.`,
      ``,
      `Structural means a rule rather than a prediction. Set aside eligibility is binary and published in the solicitation. No model involved.`,
      ``,
      `Heuristic means reasoned but not yet validated against outcomes. Defensible thinking, unproven.`,
      ``,
      `That third label is the uncomfortable one to ship. It means our product openly tells you which parts of its own scoring are still assumption.`,
      ``,
      `We went back and forth on it, because admitting uncertainty looks weaker in a demo. We shipped it anyway, for a simple reason. If we want someone to bet real weeks on a number, we should be willing to show them where it came from, including when the honest answer is that this part is reasoning rather than measurement.`,
      ``,
      `WHAT WE CANNOT CLAIM YET`,
      ``,
      `Since we are being straight: we cannot currently tell you our scores are calibrated. Nobody has verified that a 70 wins more often than a 40. Not ours, and as far as we can tell, not anyone's in this market.`,
      ``,
      `So we started recording. Every solicitation IR sees gets archived, and when the award posts months later we match it back: who won, at what price, against what field. That record accumulates whether anyone is watching or not.`,
      ``,
      `Eventually it lets us publish something almost nobody in this industry publishes. Our own accuracy. Including the years it is unflattering.`,
      ``,
      `That is a slower way to build a product. It is also the only version we would be comfortable asking a small business to trust.`,
      ``,
      `THE ACTUAL GOAL`,
      ``,
      `We are not trying to replace judgment. The owner who knows their customer, their capacity and their real differentiators will always know things no system can see.`,
      ``,
      `We are trying to make sure that person is not doing an analyst's job at eleven at night, alone, with no information, while the competition has a whole team doing it in daylight.`,
      ``,
      `If that is your situation, we would genuinely like to hear what you would need it to do.`,
      ``,
      `Lorenzo Rojas, Founder, IR`,
    ].join('\n'),
    hashtags: '#GovCon #FederalContracting #SmallBusiness #BuildInPublic',
    cta: 'DM me and I will set you up.',
    reference: 'ir-gov.app',
    dataNote: 'Long-form article. Factual claims: capture analyst compensation (six figures, widely documented for the role) and the 40-80 hour proposal range (a commonly cited industry figure, stated as such). All claims about IR describe shipped behaviour — the evidence tiers in lib/evidence-score.ts and the outcome collector in lib/outcomes.ts. The statement that IR cannot yet claim calibration is accurate and deliberate. No competitor is named and no competitor pricing is quoted.',
    image: {
      mode: 'article',
      eyebrow: 'GOVCON INTELLIGENCE',
      headline: 'The number that decides your next 60 hours',
      deck: 'A score is a claim. If we want you to bet real weeks on ours, we should show you where it came from.',
    },
  })

  return out
}
