import { unstable_cache } from 'next/cache'

// REGULATORY TOPIC QUEUE — post material that never runs dry.
//
// The Federal Register publishes every proposed and final rule the government
// issues. Rules drive procurement: a cybersecurity mandate creates cyber
// demand, a size-standards rule redraws who can bid. That is a permanent
// supply of things worth saying, refreshed daily, free and keyless.
//
// WHAT THIS MODULE WILL AND WILL NOT DO, and the line is the whole point:
//
//   It emits FACTS and a SCAFFOLD. Title, agency, publication date, document
//   number, RIN, docket, comment deadline, and the government's own abstract
//   are primary source — quotable verbatim, no verification needed, because
//   they are the rule describing itself.
//
//   It never writes the take. "This squeezes small primes", "this creates
//   demand in IT" — that is interpretation, and interpretation is where the
//   value and the risk both live. Every SBA figure in the hand-written drafts
//   took a research pass across six law-firm summaries and the first version
//   still had seven errors in it. A machine-written opinion on a rule nobody
//   read would put an indefensible claim in a public post under the founder's
//   name, which is the exact failure the claims policy exists to prevent.
//
// So the scaffold ships with the analytical sentences left as bracketed
// prompts. The author fills them or the post does not go out.

export interface RegTopic {
  id: string
  title: string
  agency: string
  /** Raw API type: "Rule" | "Proposed Rule" */
  type: string
  typeLabel: string
  /** ISO publication date */
  date: string
  url: string
  abstract: string
  documentNumber: string
  rin: string | null
  docket: string | null
  commentsCloseOn: string | null
  effectiveOn: string | null
  /** Days until comments close; null when there is no open window */
  daysToComment: number | null
  urgency: 'comment-window' | 'recent' | 'background'
  /** Suggested angle, phrased as a QUESTION so it never reads as a finding */
  angle: string
  /** Verifiable bullets, each traceable to the document itself */
  facts: string[]
  /** Paste-and-fill post skeleton */
  scaffold: string
  hashtags: string
  dataNote: string
}

const API = 'https://www.federalregister.gov/api/v1/documents.json'

// Rules and proposed rules only. Routine notices are noise for this purpose.
const SIGNAL_TYPES = ['RULE', 'PRORULE']

// Full-text searches run against the register. Broad enough to keep the queue
// stocked, narrow enough that most hits are actually about buying things.
const QUERIES = [
  'small business contracting',
  'federal acquisition regulation',
  'small business size standards',
  'government procurement',
]

// A hit has to look like procurement before it earns a slot. The Federal
// Register is mostly not about contracting, and an off-topic queue is worse
// than an empty one — it trains you to skim past it.
const RELEVANT = /\b(contract|contracting|contractor|procure|procurement|acquisition|solicitation|set-aside|set aside|small business|subcontract|offeror|bid|vendor|supplier|FAR|DFARS|8\(a\)|HUBZone|SDVOSB|WOSB)\b/i

const BASE_FIELDS = [
  'title', 'type', 'abstract', 'document_number', 'html_url',
  'publication_date', 'agencies',
]
// Requested on the first attempt only. If the upstream ever stops accepting
// one of these the whole request fails, so a base-field retry stands behind it
// — the queue degrades to fewer facts rather than to nothing.
const RICH_FIELDS = [
  ...BASE_FIELDS,
  'comments_close_on', 'docket_ids', 'regulation_id_numbers',
  'action', 'effective_on',
]

interface FrAgency { name?: string; raw_name?: string }
interface FrDoc {
  title?: string
  type?: string
  abstract?: string | null
  document_number?: string
  html_url?: string
  publication_date?: string
  agencies?: FrAgency[]
  comments_close_on?: string | null
  docket_ids?: string[] | null
  regulation_id_numbers?: string[] | null
  action?: string | null
  effective_on?: string | null
}

const daysAgoISO = (days: number) =>
  new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

function daysUntil(iso: string): number | null {
  const d = new Date(`${iso}T23:59:59Z`)
  if (Number.isNaN(d.getTime())) return null
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000)
}

/** Trim an abstract to a quotable length on a sentence boundary. */
function trimAbstract(text: string, max = 420): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('; '))
  return (stop > max * 0.5 ? cut.slice(0, stop + 1) : `${cut.trimEnd()}…`)
}

async function query(term: string, fields: string[], sinceDays: number, perPage: number): Promise<FrDoc[]> {
  const params = new URLSearchParams()
  params.set('per_page', String(perPage))
  params.set('order', 'newest')
  params.set('conditions[publication_date][gte]', daysAgoISO(sinceDays))
  for (const t of SIGNAL_TYPES) params.append('conditions[type][]', t)
  params.set('conditions[term]', term)
  for (const f of fields) params.append('fields[]', f)

  const res = await fetch(`${API}?${params.toString()}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(9_000),
  })
  if (!res.ok) throw new Error(`FR ${res.status}`)
  const data = (await res.json()) as { results?: FrDoc[] }
  return Array.isArray(data.results) ? data.results : []
}

async function queryWithFallback(term: string, sinceDays: number, perPage: number): Promise<FrDoc[]> {
  try {
    return await query(term, RICH_FIELDS, sinceDays, perPage)
  } catch {
    try {
      return await query(term, BASE_FIELDS, sinceDays, perPage)
    } catch {
      return []
    }
  }
}

function buildScaffold(t: Omit<RegTopic, 'scaffold' | 'angle' | 'facts' | 'hashtags' | 'dataNote'>): string {
  const lines: string[] = []

  lines.push('[OPEN — one line, your voice. What made you stop when you read this?]')
  lines.push('')
  lines.push(
    `The ${t.agency} published ${t.type === 'Proposed Rule' ? 'a proposed rule' : 'a final rule'} on ${fmtDate(t.date)}.`
  )
  lines.push('')
  lines.push(`"${t.title}"`)
  lines.push('')

  if (t.abstract) {
    lines.push('In the government\'s own words:')
    lines.push('')
    lines.push(`"${trimAbstract(t.abstract)}"`)
    lines.push('')
  }

  lines.push('[YOUR READ — 2 to 4 sentences. What does this actually change for a')
  lines.push(' small contractor? This is the part nobody has verified for you. If you')
  lines.push(' are not sure, write what you are not sure about — that is a stronger')
  lines.push(' post than a confident guess, and it is on-brand for IR.]')
  lines.push('')
  lines.push('[OPTIONAL — one number, only if it genuinely relates. Live market stats')
  lines.push(' are on the Company Page tab. Phrase it as "IR tracked N", never "N exist".]')
  lines.push('')

  if (t.commentsCloseOn && t.daysToComment !== null && t.daysToComment >= 0) {
    const ref = [
      t.docket ? `Docket ${t.docket}` : null,
      t.rin ? `RIN ${t.rin}` : null,
    ].filter(Boolean).join(', ')
    lines.push(
      `Comments close ${fmtDate(t.commentsCloseOn)} — ${t.daysToComment} ${t.daysToComment === 1 ? 'day' : 'days'}.` +
      (ref ? ` ${ref} on regulations.gov.` : '')
    )
    lines.push('')
  } else if (t.effectiveOn) {
    lines.push(`Effective ${fmtDate(t.effectiveOn)}.`)
    lines.push('')
  }

  lines.push('[CLOSE — a question to the reader, or a DM. No link in the post.]')

  return lines.join('\n')
}

function toTopic(doc: FrDoc): RegTopic | null {
  if (!doc?.title || !doc.html_url || !doc.publication_date) return null

  const title = doc.title.trim()
  const abstract = (doc.abstract || '').trim()
  if (!RELEVANT.test(`${title} ${abstract}`)) return null

  const agency = doc.agencies?.[0]?.name || doc.agencies?.[0]?.raw_name || 'A federal agency'
  const type = doc.type || 'Document'
  const commentsCloseOn = doc.comments_close_on || null
  const dtc = commentsCloseOn ? daysUntil(commentsCloseOn) : null
  const open = dtc !== null && dtc >= 0

  const rin = doc.regulation_id_numbers?.[0] ?? null
  const docket = doc.docket_ids?.[0] ?? null

  const core = {
    id: doc.document_number || doc.html_url,
    title,
    agency,
    type,
    typeLabel: type === 'Proposed Rule' ? 'PROPOSED' : type === 'Rule' ? 'FINAL' : type.toUpperCase(),
    date: doc.publication_date,
    url: doc.html_url,
    abstract,
    documentNumber: doc.document_number || '',
    rin,
    docket,
    commentsCloseOn,
    effectiveOn: doc.effective_on || null,
    daysToComment: dtc,
    urgency: (open ? 'comment-window' : 'recent') as RegTopic['urgency'],
  }

  // Angles are QUESTIONS. A statement here would be an unverified finding
  // wearing the authority of the tool that produced it.
  const angle = open
    ? 'Comment window is open — who does this help and who does it cost, and is anyone telling the small end of the market it is happening?'
    : type === 'Rule'
      ? 'This one is final, not proposed. What has to change in how a small contractor operates, and by when?'
      : 'Does this create or remove demand in a NAICS code your readers actually work in?'

  const facts = [
    `${type} published ${fmtDate(core.date)} by ${agency}.`,
    `Federal Register document number ${core.documentNumber || 'n/a'}.`,
    docket ? `Docket ${docket}.` : null,
    rin ? `RIN ${rin}.` : null,
    open ? `Comments close ${fmtDate(commentsCloseOn!)} (${dtc} ${dtc === 1 ? 'day' : 'days'}).` : null,
    !open && commentsCloseOn ? `Comment period closed ${fmtDate(commentsCloseOn)}.` : null,
    core.effectiveOn ? `Effective ${fmtDate(core.effectiveOn)}.` : null,
  ].filter((x): x is string => x !== null)

  return {
    ...core,
    angle,
    facts,
    scaffold: buildScaffold(core),
    hashtags: '#GovCon #FederalContracting #SmallBusiness',
    dataNote:
      'Every fact above is taken directly from the Federal Register entry for this document — ' +
      'title, agency, publication date, document number, and where present the docket, RIN, ' +
      'comment deadline and effective date. Those are primary source and quotable as written. ' +
      'The analysis is deliberately blank: nothing in this draft interprets the rule, and no ' +
      'claim about its effect has been checked. Read the rule before you write that part, and ' +
      'describe a proposed rule as proposed until it is final.',
  }
}

async function _fetchTopics(limit: number, sinceDays: number): Promise<RegTopic[]> {
  const batches = await Promise.all(
    QUERIES.map(q => queryWithFallback(q, sinceDays, 20).catch(() => [] as FrDoc[]))
  )

  const seen = new Set<string>()
  const topics: RegTopic[] = []
  for (const doc of batches.flat()) {
    const t = toTopic(doc)
    if (!t || seen.has(t.id)) continue
    seen.add(t.id)
    topics.push(t)
  }

  // An open comment window is the most postable thing on the list — it gives a
  // deadline, a docket, and a reason for the reader to act today. Soonest
  // deadline first, then most recent.
  topics.sort((a, b) => {
    const ao = a.urgency === 'comment-window', bo = b.urgency === 'comment-window'
    if (ao !== bo) return ao ? -1 : 1
    if (ao && bo) return (a.daysToComment ?? 0) - (b.daysToComment ?? 0)
    return b.date.localeCompare(a.date)
  })

  return topics.slice(0, limit)
}

// Rules do not change intraday and this feeds an admin page, so a 6h cache is
// plenty and keeps four upstream queries off every page load.
export const fetchRegTopics = unstable_cache(
  async (limit = 12, sinceDays = 45): Promise<RegTopic[]> => _fetchTopics(limit, sinceDays),
  ['reg-topics'],
  { revalidate: 21_600, tags: ['reg-topics'] }
)
