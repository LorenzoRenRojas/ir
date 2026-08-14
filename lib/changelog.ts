// The public build log — "you said, we shipped." Entries flagged fromFeedback
// came directly from user/tester notes; that flag renders a badge, which is
// the whole point: proof that feedback here actually changes the product.
//
// Add new entries at the TOP. Dates are ISO (YYYY-MM-DD).

export interface ChangelogEntry {
  date: string
  title: string
  body: string
  fromFeedback?: boolean
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: '2026-08-14',
    title: 'Watchlist keywords, market pulse, and state pages',
    body: 'Set watchlist keywords in Settings → Notifications and new postings that mention them ride along in your daily digest no matter the match score. The digest also gains a market-pulse stat from IR\'s own store. Plus: a free set-aside eligibility check at /eligibility, and federal-contracts guides for all 50 states.',
    fromFeedback: true,
  },
  {
    date: '2026-08-14',
    title: 'Pipeline cleanup: CLOSED badges, one-tap triage, referrals',
    body: 'Pursuits whose response deadline passed without a decision now wear an honest CLOSED badge, and a weekly nudge offers one-tap "mark lost" or "remove" so the pipeline stays clean without ever deleting your win/loss history. Every member also gets a personal referral link (Settings → Account).',
    fromFeedback: true,
  },
  {
    date: '2026-08-12',
    title: 'Unviewed contracts',
    body: 'The dashboard now tracks which opportunities you have actually opened — an UNVIEWED badge, a live count, and a one-click filter. New solicitations don\'t post every day, but there\'s almost always signal you haven\'t seen yet.',
    fromFeedback: true,
  },
  {
    date: '2026-08-12',
    title: 'Expired solicitations handled gracefully',
    body: 'Opening a saved contract whose solicitation expired or was archived used to dead-end in a 404. It now lands on a clear "no longer available" page that says why, and keeps your pipeline record intact.',
    fromFeedback: true,
  },
  {
    date: '2026-08-11',
    title: 'Price intelligence on every market',
    body: 'Contract detail pages now show what deals in this market actually go for — 25th percentile, median, and 75th percentile award sizes — plus a market-concentration gauge showing whether a few primes dominate or the field is open.',
  },
  {
    date: '2026-08-11',
    title: 'Faster feed',
    body: 'The dashboard paints in two phases: your scored matches render immediately, and deeper enrichment (win probability, incumbents) streams in behind them. Cold loads that used to hang on external data now show contracts seconds sooner.',
  },
  {
    date: '2026-08-10',
    title: 'Capture Command in the Playbook',
    body: 'A portfolio-level brief across your whole pipeline: where your money is concentrated, which pursuits deserve the hours, and a generated capture memo for the top deal.',
  },
  {
    date: '2026-08-09',
    title: 'Bid/No-Bid verdicts',
    body: 'Every scored contract now carries a capture-manager verdict — PURSUE, CONDITIONAL, LONG SHOT, or INELIGIBLE — mapped to the same PWin gates real capture teams use, with the reasoning spelled out.',
  },
  {
    date: '2026-08-09',
    title: 'Opportunity signals',
    body: 'The feed now reads timing the way analysts do: SHAPE IT flags for pre-RFP notices you can still influence, FY-END PUSH for use-it-or-lose-it budget season, and deadline urgency on everything.',
  },
  {
    date: '2026-08-08',
    title: 'Regulatory Radar',
    body: 'A dashboard widget watching the Federal Register for rules and notices that touch your NAICS codes — the events that create tomorrow\'s contracts.',
  },
  {
    date: '2026-08-07',
    title: 'Set-aside and agency guides',
    body: 'Public plain-English guides to every major set-aside program (8(a), WOSB, SDVOSB, HUBZone and more) and buyer agency — each with live matching opportunities.',
  },
  {
    date: '2026-08-07',
    title: 'One-click feedback',
    body: 'The feedback button in the corner of every dashboard page goes straight to the founder\'s inbox. This page is where those notes end up as shipped product.',
  },
]
