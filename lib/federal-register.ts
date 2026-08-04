import { unstable_cache } from 'next/cache'

// Federal Register event feed — the "monitor real-world events" layer.
//
// New and proposed federal rules drive procurement: a cybersecurity mandate
// creates cyber demand, an environmental rule creates cleanup demand, and so on.
// A capture analyst reads the Federal Register to see this forming before the
// contracts appear. This module pulls that signal from the official, free,
// keyless Federal Register API (federalregister.gov/developers/documentation).
//
// Everything here is best-effort and defensive: a slow or changed upstream must
// degrade to an empty feed, never break the dashboard. No API key, no quota.

export interface RegulatoryEvent {
  title: string
  type: string            // "Rule" | "Proposed Rule" | "Notice" | …
  agency: string          // best available agency name
  date: string            // ISO publication date
  url: string             // link to the document on federalregister.gov
  abstract: string        // short summary (may be empty)
  documentNumber: string
}

const API = 'https://www.federalregister.gov/api/v1/documents.json'

// The document types worth surfacing as demand signals. Rules and proposed
// rules create obligations agencies must fund; we skip routine notices.
const SIGNAL_TYPES = ['RULE', 'PRORULE']

interface FrAgency { name?: string; raw_name?: string }
interface FrDoc {
  title?: string
  type?: string
  abstract?: string | null
  document_number?: string
  html_url?: string
  publication_date?: string
  agencies?: FrAgency[]
}

function normalize(doc: FrDoc): RegulatoryEvent | null {
  if (!doc || typeof doc.title !== 'string' || !doc.html_url) return null
  const agency = doc.agencies?.[0]?.name || doc.agencies?.[0]?.raw_name || 'Federal Government'
  return {
    title: doc.title.trim(),
    type: doc.type || 'Document',
    agency,
    date: doc.publication_date || '',
    url: doc.html_url,
    abstract: (doc.abstract || '').trim(),
    documentNumber: doc.document_number || '',
  }
}

// ISO date N days ago, for the publication_date lower bound.
function daysAgoISO(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)
}

async function _fetchEvents(term: string, limit: number, sinceDays: number): Promise<RegulatoryEvent[]> {
  try {
    const params = new URLSearchParams()
    params.set('per_page', String(Math.min(Math.max(limit * 2, 10), 40)))
    params.set('order', 'newest')
    params.set('conditions[publication_date][gte]', daysAgoISO(sinceDays))
    for (const t of SIGNAL_TYPES) params.append('conditions[type][]', t)
    if (term.trim()) params.set('conditions[term]', term.trim())
    for (const f of ['title', 'type', 'abstract', 'document_number', 'html_url', 'publication_date', 'agencies']) {
      params.append('fields[]', f)
    }

    const res = await fetch(`${API}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) return []
    const data = (await res.json()) as { results?: FrDoc[] }
    if (!Array.isArray(data.results)) return []

    // Dedupe by document number and cap.
    const seen = new Set<string>()
    const events: RegulatoryEvent[] = []
    for (const doc of data.results) {
      const ev = normalize(doc)
      if (!ev) continue
      const key = ev.documentNumber || ev.url
      if (seen.has(key)) continue
      seen.add(key)
      events.push(ev)
      if (events.length >= limit) break
    }
    return events
  } catch {
    return [] // upstream slow/changed/unreachable — degrade to empty, never throw
  }
}

// Cached wrapper — regulations don't change intraday, so a 12h cache keeps this
// off every dashboard request while staying fresh enough to be useful.
export const fetchRegulatoryEvents = unstable_cache(
  async (term: string, limit = 6, sinceDays = 60): Promise<RegulatoryEvent[]> =>
    _fetchEvents(term, limit, sinceDays),
  ['federal-register-events'],
  { revalidate: 43_200, tags: ['federal-register'] }
)
