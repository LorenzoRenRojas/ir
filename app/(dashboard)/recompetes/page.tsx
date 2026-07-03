'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Recompete {
  awardId: string
  description: string
  incumbent: string
  amount: number | null
  startDate: string | null
  endDate: string
  agency: string
  subAgency: string
  monthsUntilExpiry: number
  usaspendingUrl: string | null
}

const mono = 'var(--font-geist-mono, monospace)'
const sans = 'var(--font-geist-sans, sans-serif)'
const crimson = '#C41230'

const BUCKETS = [
  { key: 'urgent',  label: 'EXPIRING SOON — 0–6 MONTHS',  sub: 'Recompete likely already in planning. Contact the contracting office now.', min: 0,  max: 6,  color: crimson },
  { key: 'sweet',   label: 'SWEET SPOT — 6–12 MONTHS',    sub: 'Ideal positioning window: build the relationship before the RFP drops.',    min: 7,  max: 12, color: '#b45309' },
  { key: 'horizon', label: 'ON THE HORIZON — 12–18 MONTHS', sub: 'Early intel. Track these and watch for sources-sought notices.',          min: 13, max: 18, color: '#64748b' },
]

function formatAmount(v: number | null): string {
  if (!v) return 'Undisclosed'
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
  return `$${Math.round(v).toLocaleString()}`
}

function formatDate(d: string): string {
  const date = new Date(d)
  if (isNaN(date.getTime())) return d
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function RecompetesPage() {
  const [recompetes, setRecompetes] = useState<Recompete[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/recompetes')
      .then(async res => {
        const data = await res.json()
        if (!res.ok) {
          setError(data.error ?? 'Failed to load recompetes.')
          return
        }
        setRecompetes(data.recompetes ?? [])
      })
      .catch(() => setError('Network error — try refreshing.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: '32px 40px', minHeight: '100vh' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.25)', marginBottom: 10, fontFamily: mono }}>RECOMPETE RADAR</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.02em', margin: 0, fontFamily: sans }}>
          Contracts in your space, expiring soon.
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)', margin: '8px 0 0', fontFamily: sans, lineHeight: 1.6, maxWidth: 640 }}>
          Most federal contracts get recompeted when they expire. These awards match your NAICS codes and end within 18 months —
          meaning the solicitation is coming <strong style={{ color: '#0A0A0A' }}>before it ever appears on SAM.gov</strong>.
          Source: USAspending.gov award data.
        </p>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', paddingTop: 80, fontSize: 10, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.25)', fontFamily: mono }}>
          SCANNING FEDERAL AWARD DATA…
        </div>
      )}

      {error && !loading && (
        <div style={{ padding: '14px 18px', border: '1px solid rgba(196,18,48,0.3)', background: 'rgba(196,18,48,0.04)', fontSize: 12, color: crimson, fontFamily: sans, maxWidth: 560 }}>
          {error}{' '}
          {error.includes('NAICS') && (
            <Link href="/settings" style={{ color: crimson, fontWeight: 700 }}>Open settings →</Link>
          )}
        </div>
      )}

      {!loading && !error && recompetes.length === 0 && (
        <div style={{ textAlign: 'center', paddingTop: 80 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.2)', fontFamily: mono, marginBottom: 12 }}>NO EXPIRING AWARDS FOUND</div>
          <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)', fontFamily: sans }}>
            No awards in your NAICS codes expire in the next 18 months, or USAspending has no recent data for them.
          </p>
        </div>
      )}

      {!loading && BUCKETS.map(bucket => {
        const items = recompetes.filter(r => r.monthsUntilExpiry >= bucket.min && r.monthsUntilExpiry <= bucket.max)
        if (items.length === 0) return null
        return (
          <div key={bucket.key} style={{ marginBottom: 36 }}>
            <div style={{ marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: bucket.color, fontFamily: mono }}>
                {bucket.label} ({items.length})
              </span>
            </div>
            <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', margin: '0 0 12px', fontFamily: sans }}>{bucket.sub}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map(r => (
                <div key={r.awardId} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderLeft: `3px solid ${bucket.color}`, padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: sans, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {r.description}
                    </div>
                    <div style={{ display: 'flex', gap: 14, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', fontFamily: sans }}>{r.subAgency || r.agency}</span>
                      <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.3)', fontFamily: mono }}>
                        INCUMBENT: <span style={{ color: '#0A0A0A', fontWeight: 700 }}>{r.incumbent}</span>
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#0A0A0A', fontFamily: sans }}>{formatAmount(r.amount)}</div>
                    <div style={{ fontSize: 9, letterSpacing: '0.08em', color: bucket.color, fontFamily: mono, fontWeight: 700, marginTop: 2 }}>
                      ENDS {formatDate(r.endDate).toUpperCase()} · ~{r.monthsUntilExpiry} MO
                    </div>
                  </div>
                  {r.usaspendingUrl && (
                    <a
                      href={r.usaspendingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ padding: '7px 14px', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', border: '1px solid rgba(0,0,0,0.12)', color: 'rgba(0,0,0,0.5)', textDecoration: 'none', fontFamily: mono, flexShrink: 0 }}
                    >
                      AWARD DETAIL ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
