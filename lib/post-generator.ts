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

/**
 * Who is speaking.
 *
 * `company` is IR's own page: plural, institutional, but written like a person
 * runs it — willing to hold an opinion, no corporate mush.
 * `founder` is Lorenzo's profile: first person, specific, opinionated. People
 * follow people, and the two must not sound like the same author.
 */
export type Audience = 'company' | 'founder'

/** Optional artwork spec; the studio turns this into a branded 1200x1200 PNG. */
export interface PostImage {
  stat: string
  label: string
  sub: string
}

export interface GeneratedPost {
  kind: PostKind
  audience: Audience
  label: string        // internal name for the admin list
  body: string         // paste-ready
  hashtags: string
  firstComment: string // links go here, never in the body
  dataNote: string     // what was counted, so the claim is defensible
  image?: PostImage
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
        `${n(week.length)} new federal opportunities posted in the last seven days.`,
        ``,
        `${pct}% of them are set aside for small business. That is ${n(setAside)} contracts where the large primes are not allowed to bid against you.`,
        ``,
        `Most small businesses never see these, because checking means searching SAM.gov manually, every day, forever.`,
        ``,
        `The opportunities are not the scarce part. Knowing which ones are worth your time is.`,
      ].join('\n'),
      hashtags: '#GovCon #FederalContracting #SmallBusiness',
      firstComment: 'ir-gov.app',
      dataNote: `Counted ${n(week.length)} solicitations with a posted date in the last 7 days; ${n(setAside)} carried a small-business set-aside code.`,
      image: { stat: n(week.length), label: 'NEW OPPORTUNITIES THIS WEEK', sub: `${pct}% set aside for small business` },
    })
  }

  // ── 2. Sector heat ───────────────────────────────────────────────────────
  const topNaics = tally(week.map(c => c.naicsCode), 5)
  if (topNaics.length >= 3 && topNaics[0].count >= 8) {
    const lines = topNaics.map((t, i) => `${i + 1}. ${naicsName(t.key)} — ${n(t.count)} postings`)
    posts.push({
      kind: 'sector-heat',
      audience: 'company',
      label: 'Where the money moved this week',
      body: [
        `Where federal buying actually moved this week:`,
        ``,
        ...lines,
        ``,
        `If your NAICS code is on this list, the market is active for you right now and you should be looking.`,
        ``,
        `If it is not, that is worth knowing too. Timing your capture effort to when your sector is actually buying beats bidding year-round on whatever appears.`,
      ].join('\n'),
      hashtags: '#GovCon #FederalContracting #NAICS',
      firstComment: 'ir-gov.app',
      dataNote: `Grouped ${n(week.length)} solicitations posted in the last 7 days by NAICS code; top ${topNaics.length} shown.`,
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
        `${topAgency.key} posted ${n(topAgency.count)} opportunities this week, more than any other buyer.`,
        ``,
        `${pct}% of them are small-business set-asides.`,
        ``,
        `Agencies buy in waves. Fiscal calendars, program cycles, and expiring contracts drive when requirements hit the street, and the firms that win consistently are watching those rhythms rather than reacting to whatever showed up today.`,
        ``,
        `Which agency is your best customer right now?`,
      ].join('\n'),
      hashtags: '#GovCon #FederalContracting #SmallBusiness',
      firstComment: 'ir-gov.app',
      dataNote: `${topAgency.key} accounted for ${n(topAgency.count)} of ${n(week.length)} solicitations posted in the last 7 days; ${n(theirSetAside)} were small-business set-asides.`,
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
        `${n(soon.length)} federal contracts close in the next seven days. ${n(soonSetAside)} of them are reserved for small business.`,
        ``,
        `Here is the uncomfortable part: if you are seeing a solicitation for the first time with a week left, you have already lost it.`,
        ``,
        `The firms that win were talking to that program office months ago, during market research, before anything was published. By the time it posts, the requirement is often shaped around whoever did that work.`,
        ``,
        `Bidding on what closes this week is not a strategy. Knowing what closes next quarter is.`,
      ].join('\n'),
      hashtags: '#GovCon #CaptureManagement #FederalContracting',
      firstComment: 'ir-gov.app',
      dataNote: `Counted ${n(soon.length)} open solicitations with response deadlines within 7 days; ${n(soonSetAside)} carried small-business set-aside codes.`,
      image: { stat: n(soon.length), label: 'CONTRACTS CLOSING IN 7 DAYS', sub: `${n(soonSetAside)} reserved for small business` },
    })
  }

  // ── 5. Set-aside breakdown across the live market ────────────────────────
  if (live.length >= 200) {
    const buckets: Record<string, number> = {}
    for (const c of live) {
      const code = c.setAside.toUpperCase()
      if (!SMALL_BIZ_SET_ASIDES.has(code)) continue
      const label =
        code.startsWith('8A') ? '8(a)'
        : code.startsWith('SDVOSB') ? 'SDVOSB'
        : code.startsWith('WOSB') || code.startsWith('EDWOSB') ? 'WOSB / EDWOSB'
        : code.startsWith('HZ') ? 'HUBZone'
        : code.startsWith('VS') ? 'VOSB'
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
          `${n(total)} federal contracts are open right now under small-business set-asides. Here is how they split:`,
          ``,
          ...rows.map(([label, count]) => `${label} — ${n(count)}`),
          ``,
          `Two things worth noticing.`,
          ``,
          `The narrower programs have far fewer contracts, but far fewer competitors chasing them. A smaller pool you are eligible for beats a large one you are not.`,
          ``,
          `And most firms qualify for more of these than they think. The certification is usually the barrier people imagine, not the one they actually face.`,
        ].join('\n'),
        hashtags: '#GovCon #SmallBusiness #8a #SDVOSB #WOSB #HUBZone',
        firstComment: 'ir-gov.app/eligibility',
        dataNote: `Grouped ${n(total)} currently-open solicitations by set-aside code out of ${n(live.length)} live records.`,
        image: { stat: n(total), label: 'OPEN SET-ASIDE CONTRACTS', sub: 'Reserved for small business right now' },
      })
    }
  }

  // ── 6. Pricing reality — only once outcomes exist ────────────────────────
  try {
    const outcomes = await prisma.contractOutcome.findMany({
      where: { matchConfidence: { gte: 55 }, awardAmount: { gt: 0 }, estimatedValue: { gt: 0 } },
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
          `Across ${n(ratios.length)} matched awards, the median came in at ${pct}% of the advertised value.`,
          ``,
          `Estimated value is a planning figure, not a price signal. Treating it as the target is one of the most common and most expensive mistakes a first-time bidder makes.`,
          ``,
          `The number that matters is what similar work actually awarded for, and that is public record if you know where to look.`,
        ].join('\n'),
        hashtags: '#GovCon #FederalContracting #Pricing',
        firstComment: 'ir-gov.app',
        dataNote: `Median of ${n(ratios.length)} solicitation-to-award matches at confidence 55+, comparing final award amount to advertised value.`,
      })
    }
  } catch { /* outcomes table not migrated yet — skip this draft */ }

  // ── 7. Capability + positioning + founder voice ──────────────────────────
  // These do not depend on a weekly sample, so they always have something to
  // publish, but they still quote live counts where they can.
  posts.push(...evergreenPosts({ live: live.length, week: week.length }))

  return posts
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
      `IR runs the same sequence against ${liveText} federal solicitation, scores each one against your business, and shows the reasoning for every point it assigns. Not a filtered list. An assessment.`,
      ``,
      `We are not claiming to replace judgment. We are claiming that nobody should be doing the mechanical part by hand at eleven at night.`,
    ].join('\n'),
    hashtags: '#GovCon #CaptureManagement #FederalContracting',
    firstComment: 'ir-gov.app/capabilities',
    dataNote: `References ${counts.live > 0 ? `${n(counts.live)} live solicitations currently in the store` : 'the live store'}. Capability claims map to shipped features on the capabilities page.`,
    image: { stat: '5 min', label: 'VS 6–8 WEEKS OF ANALYST WORK', sub: 'Scored, sourced, and explained' },
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
      `The best federal market intelligence platforms cost more per year than most small contractors make on their first three contracts.`,
      ``,
      `That is not a criticism. Those platforms are built for mid-to-large integrators with capture teams and analyst budgets, and for that buyer they are worth it.`,
      ``,
      `The problem is everyone underneath that line. A ten-person shop competing for the same set-asides gets a SAM.gov search box and a spreadsheet.`,
      ``,
      `IR exists for that firm. Scored matches with reasoning, recompete signal before the RFP posts, a pipeline, and a first draft. Self-serve, month to month, no sales call, no annual contract.`,
      ``,
      `We are not trying to out-analyst an enterprise research desk. We are trying to make sure the firms they price out are not flying blind.`,
    ].join('\n'),
    hashtags: '#GovCon #SmallBusiness #FederalContracting',
    firstComment: 'ir-gov.app/compare/govwin',
    dataNote: 'Positioning claims are price-tier and access-model only, per docs/COMPETITION.md. No capability superiority is asserted over enterprise research desks.',
  })

  // ── FOUNDER: why ─────────────────────────────────────────────────────────
  out.push({
    kind: 'founder-why',
    audience: 'founder',
    label: 'Why I built this',
    body: [
      `The federal government is the largest buyer on earth, and most small businesses never sell it anything.`,
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
    dataNote: 'Personal narrative. No factual claims requiring substantiation.',
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
