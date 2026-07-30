// Honest, numbers-first competitor comparison content for the /compare pages.
// Voice + policy per docs/COMPETITION.md: price-tier and integration claims,
// never "only platform with X", and always an honest "pick them if" so a buyer
// trusts the page. Sources are cited in COMPETITION.md.

export interface CompareRow { feature: string; ir: string; them: string; irEdge: boolean }

export interface Comparison {
  slug: string
  competitor: string
  metaTitle: string
  metaDescription: string
  kicker: string
  headline: string
  intro: string
  theirPrice: string
  irPrice: string
  note?: string
  pickThemIf: string
  pickIrIf: string
  rows: CompareRow[]
}

const IR_PRICE = 'Free to start · $79–$499/mo · self-serve'

export const COMPARISONS: Comparison[] = [
  {
    slug: 'highergov',
    competitor: 'HigherGov',
    metaTitle: 'IR vs HigherGov — the independent tool for small government contractors',
    metaDescription:
      'HigherGov alternative for small businesses: scored contract matches with the reasoning shown, Recompete Radar included, and proposal drafting — self-serve, month-to-month, free to start.',
    kicker: 'IR vs HIGHERGOV',
    headline: 'The independent pick for the small shop.',
    intro:
      'HigherGov is a strong, data-broad opportunity platform — and our closest direct comparison. As of May 2026 it is part of Procurement Sciences, so its roadmap and pricing are moving toward the enterprise, capture-team buyer. IR stays built for the small business: scored matches with the reasoning shown, Recompete Radar included, and proposal drafting — all self-serve.',
    theirPrice: '$500 / $2,500 / $5,000 per year (pre-acquisition pricing; annual)',
    irPrice: IR_PRICE,
    note:
      'HigherGov was acquired by Procurement Sciences in May 2026. It already has recompete tracking; watch for roadmap and pricing changes under enterprise ownership.',
    pickThemIf:
      'You want the broadest possible data set including SLED (state & local), and an annual contract with a now-enterprise-owned platform is fine for you.',
    pickIrIf:
      'You are a small business that wants matches scored against your profile with the "why" shown, recompete signal included (not a filter you remember to run), and a first-draft proposal — month-to-month, free to start.',
    rows: [
      { feature: 'Profile-scored matching', ir: 'Every posting, daily', them: 'Search + saved alerts', irEdge: true },
      { feature: 'Match reasoning shown', ir: 'Factor-by-factor: you vs. the notice', them: 'Limited', irEdge: true },
      { feature: 'Recompete / pre-RFP signal', ir: 'Included, scored, emailed', them: 'Included (filter)', irEdge: false },
      { feature: 'Proposal drafting', ir: '4-volume guided drafts', them: 'Via Procurement Sciences (enterprise)', irEdge: true },
      { feature: 'Send to contracting officer', ir: 'Built in, with confirmation', them: 'Not offered', irEdge: true },
      { feature: 'SLED (state & local) data', ir: 'Federal-only (for now)', them: 'Yes', irEdge: false },
      { feature: 'Onboarding', ir: 'Self-serve, ~5 min, free to start', them: 'Free trial, annual plans', irEdge: true },
    ],
  },
  {
    slug: 'govtribe',
    competitor: 'GovTribe',
    metaTitle: 'IR vs GovTribe — scored matches, recompete radar, and proposal drafting',
    metaDescription:
      'GovTribe alternative: instead of a flat federal pipeline, IR scores every contract against your profile, surfaces recompetes before the RFP, and drafts your proposal — free to start.',
    kicker: 'IR vs GOVTRIBE',
    headline: 'More than a pipeline — a full loop.',
    intro:
      'GovTribe is the affordable, no-nonsense federal (and fed+state) pipeline — the "GovWin was too much" pick. IR covers the same find-and-track ground but adds the parts that actually win work: matches scored against your profile with reasons, Recompete Radar before the RFP exists, and a first-draft proposal.',
    theirPrice: '$1,350/yr federal · $1,800/yr fed + state',
    irPrice: IR_PRICE,
    pickThemIf:
      'You want a straightforward federal + state pipeline to search and track, and you do not need pre-RFP recompete intel or proposal help.',
    pickIrIf:
      'You want the whole loop in one place — scored matches with reasons, recompete radar, a bid pipeline, and proposal drafting — starting free.',
    rows: [
      { feature: 'Profile-scored matching', ir: 'Every posting, scored + ranked', them: 'Search + tracking', irEdge: true },
      { feature: 'Match reasoning shown', ir: 'Factor-by-factor', them: 'Not offered', irEdge: true },
      { feature: 'Recompete / pre-RFP signal', ir: 'Included, scored, emailed', them: 'Not offered', irEdge: true },
      { feature: 'Proposal drafting', ir: '4-volume guided drafts', them: 'Not offered', irEdge: true },
      { feature: 'Bid pipeline with $ totals', ir: 'Included', them: 'Included', irEdge: false },
      { feature: 'SLED (state & local) data', ir: 'Federal-only (for now)', them: 'Yes (fed+state tier)', irEdge: false },
      { feature: 'Onboarding', ir: 'Self-serve, free to start', them: 'Self-serve, annual', irEdge: true },
    ],
  },
  {
    slug: 'govwin',
    competitor: 'GovWin IQ (Deltek)',
    metaTitle: 'GovWin IQ alternative for small business — IR',
    metaDescription:
      'GovWin IQ alternative for small businesses priced out of a $12K–$40K/yr enterprise terminal: scored matches, recompete radar, and proposal drafting, self-serve and free to start.',
    kicker: 'IR vs GOVWIN IQ',
    headline: 'The 80% that matters, without the enterprise invoice.',
    intro:
      'Let\'s be honest: GovWin IQ is the best-in-class pre-RFP intelligence platform, backed by a large analyst desk, and it is the right tool for mid-to-large integrators with capture teams and budget. IR does not try to out-analyst GovWin. IR is for the small business GovWin prices out — the same find, foresee, track, and draft loop, self-serve, for a fraction of the invoice.',
    theirPrice: '$12,000–$40,000/yr, sales-quoted (up to ~$119K)',
    irPrice: IR_PRICE,
    pickThemIf:
      'You are a mid-to-large integrator with a capture team and budget, and you need analyst-validated budget and forecast intelligence years ahead. GovWin is best-in-class there — IR does not replicate a research desk.',
    pickIrIf:
      'You are a small business that GovWin prices out. You want scored matches, recompete signal, a bid pipeline, and proposal drafting — self-serve, month-to-month, for a fraction of the cost.',
    rows: [
      { feature: 'Annual cost', ir: '$948–$5,988/yr (or free to start)', them: '$12,000–$40,000/yr', irEdge: true },
      { feature: 'Analyst-validated pre-RFP intel', ir: 'Automated Recompete Radar (included)', them: 'Analyst desk — best in class', irEdge: false },
      { feature: 'Profile-scored matching', ir: 'Every posting, with reasons', them: 'Search + analyst tracking', irEdge: true },
      { feature: 'Proposal drafting', ir: '4-volume guided drafts', them: 'Not offered', irEdge: true },
      { feature: 'Send to contracting officer', ir: 'Built in', them: 'Not offered', irEdge: true },
      { feature: 'Onboarding', ir: 'Self-serve, ~5 min, free to start', them: 'Demo → quote → annual contract', irEdge: true },
    ],
  },
]

export function getComparison(slug: string): Comparison | undefined {
  return COMPARISONS.find((c) => c.slug === slug)
}
