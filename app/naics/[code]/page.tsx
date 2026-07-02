import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TOP_NAICS_CODES } from '@/lib/naics'
import { fetchContracts } from '@/lib/sam-api'

// Re-render at most every 6h — matches the SAM.gov cache window
export const revalidate = 21600

const mono = 'var(--font-geist-mono, monospace)'
const sans = 'var(--font-geist-sans, sans-serif)'
const crimson = '#C41230'

export function generateStaticParams() {
  return TOP_NAICS_CODES.map(n => ({ code: n.code }))
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params
  const entry = TOP_NAICS_CODES.find(n => n.code === code)
  if (!entry) return { title: 'NAICS Code Not Found | IR' }
  return {
    title: `NAICS ${entry.code} Federal Contracts — ${entry.description} | IR`,
    description: `Live federal contract opportunities under NAICS ${entry.code} (${entry.description}). Updated daily from SAM.gov. Get matched to contracts that fit your business with IR.`,
    alternates: { canonical: `https://ir-gov.app/naics/${entry.code}` },
  }
}

export default async function NaicsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const entry = TOP_NAICS_CODES.find(n => n.code === code)
  if (!entry) notFound()

  const all = await fetchContracts()
  // Exact code first, then same 4-digit industry group
  const exact = all.filter(c => c.naicsCode === code)
  const related = all.filter(c => c.naicsCode !== code && c.naicsCode.startsWith(code.slice(0, 4)))
  const contracts = [...exact, ...related].slice(0, 20)

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#fff', fontFamily: mono }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px clamp(20px, 5vw, 48px) 96px' }}>
        <div style={{ marginBottom: 48 }}>
          <Link href="/naics" style={{ textDecoration: 'none' }}>
            <span style={{ color: crimson, fontSize: 20, fontWeight: 700 }}>ᛁ</span>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', marginLeft: 8 }}>IR</span>
          </Link>
        </div>

        <p style={{ fontSize: 9, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 16px' }}>
          {entry.sector.toUpperCase()} · NAICS {entry.code}
        </p>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 16px', fontFamily: sans }}>
          NAICS {entry.code} federal contracts.
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 16, lineHeight: 1.7, margin: '0 0 12px', maxWidth: 640, fontFamily: sans }}>
          {entry.description} — live opportunities pulled from SAM.gov.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, lineHeight: 1.7, margin: '0 0 48px', maxWidth: 640, fontFamily: sans }}>
          IR scores every posting against your company profile — NAICS codes, set-aside eligibility,
          contract size, and geography — and emails you the matches. Then it drafts your proposal.
        </p>

        <div style={{ display: 'flex', gap: 12, marginBottom: 64, flexWrap: 'wrap' }}>
          <Link href="/register" style={{ padding: '14px 32px', background: crimson, color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none' }}>
            GET MATCHED FREE →
          </Link>
          <Link href="/naics" style={{ padding: '14px 32px', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none' }}>
            ALL NAICS CODES
          </Link>
        </div>

        <p style={{ fontSize: 9, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 20px' }}>
          {contracts.length > 0 ? `ACTIVE OPPORTUNITIES (${contracts.length})` : 'ACTIVE OPPORTUNITIES'}
        </p>

        {contracts.length === 0 && (
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, fontFamily: sans }}>
            No active postings under this code in the current window. New opportunities post daily —
            <Link href="/register" style={{ color: crimson }}> create a free profile</Link> and IR will email you when one matches.
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {contracts.map(c => (
            <div key={c.id} style={{ border: '1px solid rgba(255,255,255,0.08)', padding: '20px 24px', background: '#111' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, fontFamily: sans, marginBottom: 6 }}>{c.title}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                    {c.agency} · {c.setAsideDescription} · NAICS {c.naicsCode}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 6 }}>
                    Deadline: {new Date(c.responseDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {c.placeOfPerformance}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: crimson, fontFamily: sans }}>{c.valueFormatted}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 64, padding: '32px', border: '1px solid rgba(196,18,48,0.3)', background: 'rgba(196,18,48,0.04)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px', fontFamily: sans }}>
            Stop refreshing SAM.gov.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.7, margin: '0 0 20px', fontFamily: sans }}>
            IR watches NAICS {entry.code} for you, scores every new posting against your profile,
            and drafts the proposal when you find one worth bidding.
          </p>
          <Link href="/register" style={{ display: 'inline-block', padding: '13px 28px', background: crimson, color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none' }}>
            START FREE →
          </Link>
        </div>
      </div>
    </div>
  )
}
