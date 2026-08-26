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
  | 'positioning-tier'
  | 'founder-why'
  | 'founder-build'
  | 'founder-contrarian'
  | 'sba-alarm'
  | 'sba-thesis'
  | 'sba-our-exposure'
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
  firstComment: string // links go here, never in the body
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
    return posts
  }

  // ── 1. Weekly pulse ──────────────────────────────────────────────────────
  if (week.length >= 25) {
    const setAside = week.filter(c => SMALL_BIZ_SET_ASIDES.has(c.setAside.toUpperCase())).length
    const pct = Math.round((setAside / week.length) * 100)
    posts.push({
      kind: 'weekly-pulse',
      audience: 'company',
      label: 'Weekly market pulse',
      body: [
        `IR tracked ${n(week.length)} new federal solicitations over the last seven days.`,
        ``,
        `${pct}% of them carry a small-business set-aside. That is ${n(setAside)} requirements where the competitive field is restricted rather than wide open.`,
        ``,
        `Worth being precise about that: some are open to any small business, and some are narrower still, restricted to 8(a), SDVOSB, WOSB or HUBZone firms specifically. Narrower pool, fewer competitors, but only if you hold the certification.`,
        ``,
        `The opportunities are not the scarce part. Knowing which ones are worth your time is.`,
      ].join('\n'),
      hashtags: '#GovCon #FederalContracting #SmallBusiness',
      firstComment: 'ir-gov.app',
      dataNote: `Counted ${n(week.length)} solicitations in IR's store with a posted date in the last 7 days; ${n(setAside)} carried a small-business set-aside code. IR's store is a synced subset of SAM.gov, not a complete census — the post says "IR tracked" for exactly this reason.`,
      image: { stat: n(week.length), label: 'SOLICITATIONS TRACKED THIS WEEK', sub: `${pct}% carry a small-business set-aside` },
    })
  }

  // ── 2. Sector heat ───────────────────────────────────────────────────────
  const topNaics = tally(week.map(c => c.naicsCode), 5)
  if (topNaics.length >= 3 && topNaics[0].count >= 8) {
    const lines = topNaics.map((t, i) => `${i + 1}. ${naicsName(t.key)} — ${n(t.count)} postings`)
    posts.push({
      kind: 'sector-heat',
      audience: 'company',
      label: 'Where new requirements appeared',
      body: [
        `Where new federal requirements appeared this week, by volume of solicitations IR tracked:`,
        ``,
        ...lines,
        ``,
        `This is posting volume, not dollars awarded. A code can be busy with small requirements or quiet with one large one, so read it as where activity is, not where the money is.`,
        ``,
        `If your code is on this list, there is something to look at this week.`,
      ].join('\n'),
      hashtags: '#GovCon #FederalContracting #NAICS',
      firstComment: 'ir-gov.app',
      dataNote: `Grouped ${n(week.length)} solicitations in IR's store, posted in the last 7 days, by NAICS code; top ${topNaics.length} by count. Counts are solicitations tracked, not award dollars.`,
    })
  }

  // ── 3. Agency spotlight ──────────────────────────────────────────────────
  const topAgency = tally(week.map(c => c.agency), 1)[0]
  if (topAgency && topAgency.count >= 10) {
    const theirs = week.filter(c => c.agency === topAgency.key)
    const theirSetAside = theirs.filter(c => SMALL_BIZ_SET_ASIDES.has(c.setAside.toUpperCase())).length
    const pct = Math.round((theirSetAside / theirs.length) * 100)
    posts.push({
      kind: 'agency-spotlight',
      audience: 'company',
      label: `Agency spotlight: ${topAgency.key}`,
      body: [
        `${topAgency.key} was the most active buyer in what IR tracked this week, with ${n(topAgency.count)} solicitations.`,
        ``,
        `${pct}% of them are small-business set-asides.`,
        ``,
        `Agencies buy in waves. Fiscal calendars, program cycles, and expiring contracts drive when requirements hit the street, and the firms that win consistently are watching those rhythms rather than reacting to whatever showed up today.`,
        ``,
        `Which agency is your best customer right now?`,
      ].join('\n'),
      hashtags: '#GovCon #FederalContracting #SmallBusiness',
      firstComment: 'ir-gov.app',
      dataNote: `${topAgency.key} accounted for ${n(topAgency.count)} of ${n(week.length)} solicitations in IR's store over 7 days; ${n(theirSetAside)} carried small-business set-aside codes. "Most active" is scoped to IR's synced subset and to solicitation count, not award value. Agency strings come from SAM.gov and are grouped verbatim, so sub-agency naming variants may split a count.`,
    })
  }

  // ── 4. Deadline pressure ─────────────────────────────────────────────────
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
      label: 'Closing this week',
      body: [
        `${n(soon.length)} of the contracts IR is tracking close in the next seven days. ${n(soonSetAside)} carry small-business set-asides.`,
        ``,
        `Here is the uncomfortable part: if you are seeing a solicitation for the first time with a week left, you are usually already too late.`,
        ``,
        `The firms that win were often talking to that program office months earlier, during market research, before anything was published. Requirements get shaped by those conversations.`,
        ``,
        `Bidding on what closes this week is not a strategy. Knowing what closes next quarter is.`,
      ].join('\n'),
      hashtags: '#GovCon #CaptureManagement #FederalContracting',
      firstComment: 'ir-gov.app',
      dataNote: `Counted ${n(soon.length)} solicitations in IR's store with response deadlines within 7 days; ${n(soonSetAside)} carried small-business set-aside codes. Scoped to IR's synced subset.`,
      image: { stat: n(soon.length), label: 'TRACKED CONTRACTS CLOSING IN 7 DAYS', sub: `${n(soonSetAside)} carry small-business set-asides` },
    })
  }

  // ── 5. Set-aside breakdown across the live market ────────────────────────
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
    if (total >= 50) {
      posts.push({
        kind: 'set-aside-share',
        audience: 'company',
        label: 'Set-aside breakdown, live market',
        body: [
          `${n(total)} of the open contracts IR is tracking carry small-business set-asides. Here is how they split:`,
          ``,
          ...rows.map(([label, count]) => `${label} — ${n(count)}`),
          ``,
          `Two things worth noticing.`,
          ``,
          `The narrower programs have far fewer contracts, but far fewer competitors chasing them. A smaller pool you are eligible for beats a large one you are not.`,
          ``,
          `And plenty of firms qualify for more of these than they realise. Worth checking rather than assuming.`,
        ].join('\n'),
        hashtags: '#GovCon #SmallBusiness #8a #SDVOSB #WOSB #HUBZone',
        firstComment: 'ir-gov.app/eligibility',
        dataNote: `Grouped ${n(total)} open solicitations in IR's store by set-aside code, out of ${n(live.length)} live records tracked. Scoped to IR's synced subset, not the full federal market.`,
        image: { stat: n(total), label: 'TRACKED SET-ASIDE CONTRACTS', sub: 'Open to small business right now' },
      })
    }
  }

  // ── 6. Pricing reality — only once outcomes exist ────────────────────────
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
      posts.push({
        kind: 'pricing-reality',
        audience: 'company',
        label: 'Award vs advertised value',
        body: [
          `We have been recording what federal contracts actually award for, against what the solicitation advertised.`,
          ``,
          `Across ${n(ratios.length)} awards we matched back to their original solicitation, the median landed at ${pct}% of the advertised value.`,
          ``,
          `Two caveats we would rather state than have pointed out. That is our sample, not the whole market. And advertised value is often a ceiling, especially on IDIQs, so a ratio under 100% is not automatically a discount.`,
          ``,
          `The point stands regardless: estimated value is a planning figure, not a price signal, and bidding to it is a common and expensive mistake.`,
        ].join('\n'),
        hashtags: '#GovCon #FederalContracting #Pricing',
        firstComment: 'ir-gov.app',
        dataNote: `Median of ${n(ratios.length)} solicitation-to-award matches at confidence 75+ (the award record cites the solicitation number, not a statistical guess), comparing award amount to advertised value. Ratios outside 0.05-20x are excluded as mismatches or IDIQ ceilings. Sample is IR's records only.`,
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

// ── TOPICAL: SBA size-standard overhaul ────────────────────────────────────
//
// Proposed rule published 2026-08-20 (Docket SBA-2026-0199, RIN 3245-AI67),
// SBA's third five-year review under the Small Business Jobs Act. Comments
// close 2026-09-21.
//
// PROPOSED, not final — every draft below says so, because a rule that has not
// been adopted being described as law is the kind of error that costs a
// reputation in this industry permanently.
//
// The alarm draft is gated on the comment deadline: telling people to file a
// comment after the window shuts is worse than saying nothing. The analytical
// drafts survive the deadline because the competitive consequence outlives it.
const SBA_COMMENT_DEADLINE = new Date('2026-09-21T23:59:59Z')
// Once the rule is finalised, revisit these: the framing shifts from
// "proposed" to "adopted" and the numbers may move.
const SBA_RELEVANCE_END = new Date('2027-03-01T00:00:00Z')

function topicalPosts(): GeneratedPost[] {
  const now = new Date()
  const out: GeneratedPost[] = []
  if (now > SBA_RELEVANCE_END) return out

  const sourceNote =
    'SBA proposed rule published 2026-08-20 in the Federal Register, RIN 3245-AI67 / Docket No. SBA-2026-0199. Note SBA issued TWO companion rules that day (industry size standards, and a revised size standards methodology); the figures below come from the rule carrying this RIN. Verified figures: 995 existing size standards consolidated to 338; 114,541 additional firms become eligible, of which about 37,002 are FY2025 federal contractors holding 105,655 contracts worth more than $71 billion; total eligible small businesses rise from 6,344,967 to 6,459,508 (+1.8%); 24 industry groups see a reduction in eligible firms totalling fewer than 200; comments due 2026-09-21. Cross-checked across Pillsbury, Holland & Knight, Hunton, Schwabe and Potomac Law summaries plus SBA Office of Advocacy. PROPOSED, not adopted; every draft states this.'

  if (now <= SBA_COMMENT_DEADLINE) {
    out.push({
      kind: 'sba-alarm',
      audience: 'founder',
      label: 'SBA size standards — the alarm (expires Sept 21)',
      body: [
        `SBA has proposed the largest expansion of small business size standards in decades, and I do not think enough small contractors have registered what it would do.`,
        ``,
        `The proposal consolidates 995 industry size standards into 338, set at the 4 and 5 digit NAICS level. It removes the ceiling on size standards and adds a productivity adjustment on top of inflation. In professional services, IT, engineering and logistics, thresholds rise as much as tenfold or more.`,
        ``,
        `SBA proposes not to reduce standards even in industries where its own analysis supported a decrease.`,
        ``,
        `Their estimate: 114,541 additional firms become eligible small businesses. Fewer than 200 lose eligibility.`,
        ``,
        `Here is the number I keep coming back to. Roughly 37,002 of those newly eligible firms are already federal contractors, holding 105,655 contracts worth more than 71 billion dollars.`,
        ``,
        `Those are not hypothetical competitors. They are companies currently winning federal work who would be able to bid in the small business pool alongside you.`,
        ``,
        `The pool does not get bigger. The number of companies allowed into it does.`,
        ``,
        `This is a proposed rule, not law. Comments close September 21, under RIN 3245-AI67. If it would change how you compete, that is the window.`,
      ].join('\n'),
      hashtags: '#GovCon #SmallBusiness #FederalContracting #SBA',
      firstComment: 'RIN 3245-AI67 / Docket SBA-2026-0199 on regulations.gov. Comments close September 21.',
      dataNote: sourceNote,
      image: { stat: '114,541', label: 'FIRMS WOULD GAIN SMALL STATUS', sub: 'Fewer than 200 would lose it. SBA proposed rule, comments close Sept 21.' },
    })
  }

  out.push({
    kind: 'sba-thesis',
    audience: 'founder',
    label: 'SBA thesis — certifications become the moat',
    body: [
      `A thought on SBA's proposed size standard overhaul that I have not seen made often enough.`,
      ``,
      `If 114,541 firms move into small business status, the thing that actually erodes is not any single threshold. It is what the words "small business set aside" mean as a competitive category.`,
      ``,
      `A ten person shop would be bidding against companies many times its size, under the same label, for the same work. The broad Total Small Business set aside stops being much of an edge.`,
      ``,
      `Which I think makes the narrower certifications considerably more valuable, not less. The 8(a), SDVOSB, WOSB and HUBZone pools do not expand the same way, because those turn on certification rather than size alone. When the broad category stops meaning much, the specific ones become the moat.`,
      ``,
      `The counterargument I keep sitting with: there is a real gap where firms graduate out of small status before they can win full and open, and this proposal genuinely helps them. I am not convinced the fix should come out of the smallest firms' share.`,
      ``,
      `Still a proposed rule. But if you have been putting off a certification you qualify for, this is the argument for stopping putting it off.`,
    ].join('\n'),
    hashtags: '#GovCon #SmallBusiness #8a #SDVOSB #WOSB #HUBZone',
    firstComment: 'ir-gov.app/eligibility',
    dataNote: sourceNote + ' The "certifications become more valuable" conclusion is analysis, presented as opinion rather than fact.',
    image: { stat: '338', label: 'STANDARDS REPLACING 995', sub: 'SBA proposed rule. Comments close Sept 21.' },
  })

  out.push({
    kind: 'sba-our-exposure',
    audience: 'founder',
    label: 'SBA — what it breaks in our own product',
    body: [
      `Everyone writing about SBA's proposed size standard overhaul is explaining what it means for contractors. Here is what it would mean for the tool I build, because I think that is the more useful thing to show.`,
      ``,
      `IR scores federal opportunities partly on how open a market has been to small business. That input comes from historical award data: what share of awards in a NAICS code actually went to small firms.`,
      ``,
      `If 114,541 companies become small overnight, that history stops describing the present. The competitive field gets more crowded, but the past will not show it for years.`,
      ``,
      `Which means my own scoring would quietly become optimistic. It would keep telling a genuinely small shop their odds look good, based on a market that no longer exists.`,
      ``,
      `I would rather say that in public now than have someone discover it later.`,
      ``,
      `It is also the argument for the thing we are building underneath the product: recording what actually happens to the contracts we score, so the model can be corrected against reality instead of assumption. A tool that tells you your odds should be willing to be measured on them, especially when the ground moves.`,
    ].join('\n'),
    hashtags: '#GovCon #BuildInPublic #FederalContracting',
    firstComment: 'ir-gov.app/capabilities',
    dataNote: sourceNote + ' The product exposure described is real: IR blends historical small-business award share into scoring, and that input would lag a size-standard change. Stated as a limitation, not a feature.',
  })

  return out
}

/**
 * Posts that stand on capability and positioning rather than this week's data.
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

  // ── COMPANY: the loop ────────────────────────────────────────────────────
  out.push({
    kind: 'capability-loop',
    audience: 'company',
    label: 'What IR actually does',
    body: [
      `A capture analyst costs six figures a year. Here is what they do, and what IR does instead.`,
      ``,
      `Scan the market for what fits you. Read the incumbent. Size up the competition. Check what similar work actually awarded for. Decide whether it is worth bidding. Write the first draft.`,
      ``,
      `That is six to eight weeks of work on a single pursuit.`,
      ``,
      `IR scores ${liveText} solicitation it tracks against your business profile, then runs the deeper work — incumbent, competition, pricing benchmarks, bid recommendation — on the ones that actually match you. Every point it assigns comes with its reasoning.`,
      ``,
      `We are not claiming to replace judgment. We are claiming nobody should be doing the mechanical part by hand at eleven at night.`,
    ].join('\n'),
    hashtags: '#GovCon #CaptureManagement #FederalContracting',
    firstComment: 'ir-gov.app/capabilities',
    dataNote: `References ${counts.live > 0 ? `${n(counts.live)} live solicitations currently in IR's store` : 'the live store'} — a synced subset of SAM.gov, not the full market. Scoring runs across the store; incumbent, competition and pricing enrichment run on matched results, and the copy says so rather than implying full enrichment on every record. The 6-8 week figure describes a full capture cycle on a single pursuit, a widely used industry range, not an IR measurement.`,
    image: { stat: '5 min', label: 'VS WEEKS OF MANUAL CAPTURE WORK', sub: 'Scored, sourced, and explained' },
  })

  // ── COMPANY: explainability, the real differentiator ─────────────────────
  out.push({
    kind: 'capability-evidence',
    audience: 'company',
    label: 'Why our score shows its work',
    body: [
      `Most tools hand you a match score. Almost none will tell you how they got it.`,
      ``,
      `We think a score you cannot interrogate is a score you should not act on, so every point IR assigns carries three things: the factor, the reasoning, and what tier of evidence it rests on.`,
      ``,
      `Measured means counted from awards that actually happened, including your own federal award history.`,
      `Structural means a rule, not a prediction. Set-aside eligibility is published in the solicitation.`,
      `Heuristic means reasoned but not yet validated against outcomes, and we label it that way rather than hiding it.`,
      ``,
      `That last category is the uncomfortable one to publish. We publish it anyway, because a tool that tells you your odds should be willing to be measured on them.`,
    ].join('\n'),
    hashtags: '#GovCon #FederalContracting #DataDriven',
    firstComment: 'ir-gov.app/capabilities',
    dataNote: 'Describes the evidence-tier scoring architecture as implemented in lib/evidence-score.ts and documented on the capabilities page.',
  })

  // ── COMPANY: positioning, per the claims policy ──────────────────────────
  out.push({
    kind: 'positioning-tier',
    audience: 'company',
    label: 'Positioning vs enterprise platforms',
    body: [
      `The best federal market intelligence platforms are priced for enterprise buyers, sold through a sales team, and usually locked to an annual contract.`,
      ``,
      `That is not a criticism. They are built for mid-to-large integrators with capture teams and analyst budgets, and for that buyer they are genuinely worth it.`,
      ``,
      `The problem is everyone underneath that line. A ten-person shop competing for the same set-asides gets a SAM.gov search box and a spreadsheet.`,
      ``,
      `IR exists for that firm. Scored matches with reasoning, recompete signal before the RFP posts, a pipeline, and a first draft. Self-serve, month to month, no sales call, no annual contract.`,
      ``,
      `We are not trying to out-analyst an enterprise research desk. We are trying to make sure the firms they price out are not flying blind.`,
    ].join('\n'),
    hashtags: '#GovCon #SmallBusiness #FederalContracting',
    firstComment: 'ir-gov.app/compare/govwin',
    dataNote: 'Positioning claims are price-tier and access-model only, per docs/COMPETITION.md. No capability superiority is asserted over enterprise research desks, and no specific competitor price figure is stated — quoting a rival\'s pricing publicly requires re-verifying it first, and it changes. Describes access model (sales-gated, annual) which is publicly documented by those vendors.',
  })

  // ── FOUNDER: why ─────────────────────────────────────────────────────────
  out.push({
    kind: 'founder-why',
    audience: 'founder',
    label: 'Why I built this',
    body: [
      `The federal government is the largest buyer on earth, and the overwhelming majority of small businesses never sell it anything.`,
      ``,
      `Not because they cannot do the work. Because the part before the work, figuring out which contracts are worth chasing, is a full-time analyst job, and a ten-person company does not have an analyst.`,
      ``,
      `The primes do. That is the entire asymmetry.`,
      ``,
      `I did not come up in government contracting, which I think is why the situation looked absurd to me rather than normal. Nobody had trained me to accept that capture intelligence is something only large companies get.`,
      ``,
      `So I have been building the version a small business can actually afford. It scores every federal opportunity against your business and shows you exactly why it scored that way.`,
      ``,
      `If you run a small business chasing federal work, I would genuinely like to hear what you would need it to do.`,
    ].join('\n'),
    hashtags: '#GovCon #SmallBusiness #BuildInPublic',
    firstComment: 'ir-gov.app',
    dataNote: 'Personal narrative. The only factual claim is that the US federal government is the world\'s largest single buyer of goods and services, which is widely documented. No IR-specific performance claims.',
  })

  // ── FOUNDER: build in public ─────────────────────────────────────────────
  out.push({
    kind: 'founder-build',
    audience: 'founder',
    label: 'Build in public: showing the work',
    body: [
      `Shipped something this week that most tools would rather not.`,
      ``,
      `IR now labels every part of its own match score by how much evidence is behind it. Counted from real awards, a published rule, or reasoning we have not validated yet.`,
      ``,
      `That third label is the awkward one. It means the product openly admits which parts of its own scoring are still assumption.`,
      ``,
      `I went back and forth on it. Showing your uncertainty looks weaker in a demo.`,
      ``,
      `But contractors bet real money and real weeks on these calls. If I want someone to trust a number, I should be willing to show them where it came from, including when the honest answer is "this part is reasoning, not measurement, and here is what we are doing about it."`,
      ``,
      `Building the record now so that eventually it can be measurement.`,
    ].join('\n'),
    hashtags: '#BuildInPublic #GovCon #ProductDevelopment',
    firstComment: 'ir-gov.app/capabilities',
    dataNote: 'Describes the evidence-tier system shipped in lib/evidence-score.ts and published on the capabilities page.',
  })

  // ── FOUNDER: the long-form founding piece ────────────────────────────────
  // The Featured article. Written to do three jobs at once: explain the
  // asymmetry that justifies the product, separate IR from the enterprise
  // incumbents AND the wave of unverifiable AI scoring tools, and establish
  // credibility by publishing IR's own limitations before anyone finds them.
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
    firstComment: 'ir-gov.app',
    dataNote: 'Long-form article. Factual claims: capture analyst compensation (six figures, widely documented for the role) and the 40-80 hour proposal range (a commonly cited industry figure, stated as such). All claims about IR describe shipped behaviour — the evidence tiers in lib/evidence-score.ts and the outcome collector in lib/outcomes.ts. The statement that IR cannot yet claim calibration is accurate and deliberate. No competitor is named and no competitor pricing is quoted.',
    image: {
      mode: 'article',
      eyebrow: 'GOVCON INTELLIGENCE',
      headline: 'The number that decides your next 60 hours',
      deck: 'A score is a claim. If we want you to bet real weeks on ours, we should show you where it came from.',
    },
  })

  // ── FOUNDER: contrarian ──────────────────────────────────────────────────
  out.push({
    kind: 'founder-contrarian',
    audience: 'founder',
    label: 'Contrarian: bidding more is not the strategy',
    body: [
      `The most common advice I hear given to new federal contractors is to bid on everything and treat it as a numbers game.`,
      ``,
      `I think that advice quietly destroys small companies.`,
      ``,
      `A serious proposal is forty to eighty hours. For a ten-person firm that is a meaningful share of a month, taken directly out of billable work. Do that six times against contracts you were never positioned to win and you have spent a quarter of your year on nothing.`,
      ``,
      `Volume is a strategy for someone with a proposal team. For everyone else the skill is subtraction, deciding fast and honestly what to skip.`,
      ``,
      `The hard part of this business was never finding contracts. It is knowing which ones deserve your only real asset, which is your time.`,
    ].join('\n'),
    hashtags: '#GovCon #SmallBusiness #CaptureManagement',
    firstComment: 'ir-gov.app',
    dataNote: 'Opinion piece. The 40–80 hour proposal estimate is a widely cited industry range, presented as such rather than as IR-measured data.',
  })

  return out
}
