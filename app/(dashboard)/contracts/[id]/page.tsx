import { notFound } from 'next/navigation'
import Link from 'next/link'
import { fetchContractById } from '@/lib/sam-api'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateMatchScore } from '@/lib/matching'
import { SaveContractButton } from '@/components/contracts/save-contract-button'

function formatValue(v?: number): string {
  if (!v) return 'TBD'
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
  return `$${v.toLocaleString()}`
}

function formatDate(d: string): string {
  if (!d) return '—'
  const date = new Date(d)
  if (isNaN(date.getTime())) return d
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function ScoreBar({ label, score, max }: { label: string; score: number; max: number }) {
  const pct = max > 0 ? Math.round((score / max) * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.35)', width: 120, flexShrink: 0, letterSpacing: '0.06em', fontFamily: 'var(--font-geist-mono, monospace)' }}>{label}</span>
      <div style={{ flex: 1, height: 2, background: 'rgba(0,0,0,0.07)' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: score > 0 ? '#C41230' : 'rgba(0,0,0,0.05)', transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, width: 28, textAlign: 'right', color: score > 0 ? '#C41230' : '#64748b', fontFamily: 'var(--font-geist-mono, monospace)' }}>+{score}</span>
    </div>
  )
}

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const contract = await fetchContractById(id)

  if (!contract) {
    notFound()
  }

  const session = await auth()
  let breakdown = null
  if (session?.user?.id) {
    const dbProfile = await prisma.companyProfile.findUnique({
      where: { userId: session.user.id },
    })
    if (dbProfile) {
      const profile = {
        naicsCodes: JSON.parse(dbProfile.naicsCodes) as string[],
        businessTypes: JSON.parse(dbProfile.businessTypes) as string[],
        contractSizePrefs: JSON.parse(dbProfile.contractSizePrefs) as string[],
        contractTypePrefs: JSON.parse(dbProfile.contractTypePrefs) as string[],
        geoPrefs: JSON.parse(dbProfile.geoPrefs) as string[],
        certifications: JSON.parse(dbProfile.certifications) as string[],
      }
      breakdown = calculateMatchScore(contract, profile)
    }
  }

  const fields = [
    { label: 'AGENCY', value: contract.agency },
    { label: 'SUB-AGENCY', value: contract.subAgency ?? '—' },
    { label: 'NOTICE ID', value: contract.noticeId },
    { label: 'SOLICITATION #', value: contract.solicitationNumber || '—' },
    { label: 'TYPE', value: contract.typeDescription || contract.type },
    { label: 'SET-ASIDE', value: contract.setAsideDescription || 'None' },
    { label: 'NAICS CODE', value: `${contract.naicsCode} — ${contract.naicsDescription}` },
    { label: 'ESTIMATED VALUE', value: formatValue(contract.value) },
    { label: 'POSTED DATE', value: formatDate(contract.postedDate) },
    { label: 'RESPONSE DEADLINE', value: formatDate(contract.responseDeadline) },
    { label: 'PLACE OF PERFORMANCE', value: contract.placeOfPerformance || 'TBD' },
  ]

  const scoreColor = breakdown
    ? breakdown.total >= 80 ? '#16a34a' : breakdown.total >= 60 ? '#C41230' : '#64748b'
    : '#64748b'

  return (
    <div style={{ padding: '32px 40px', minHeight: '100vh', maxWidth: 1100, fontFamily: 'var(--font-geist-mono, monospace)' }}>
      <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'rgba(0,0,0,0.35)', fontSize: 10, letterSpacing: '0.1em', textDecoration: 'none', marginBottom: 28 }}>
        ← BACK TO DASHBOARD
      </Link>

      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0A', lineHeight: 1.3, margin: '0 0 8px', letterSpacing: '-0.01em', fontFamily: 'var(--font-geist-sans, sans-serif)', maxWidth: 700 }}>
        {contract.title}
      </h1>
      <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', marginBottom: 32, letterSpacing: '0.06em' }}>{contract.agency}</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 12, alignItems: 'start' }}>
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Details grid */}
          <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', padding: '28px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.25)', marginBottom: 20 }}>CONTRACT DETAILS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 40px' }}>
              {fields.map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 9, color: 'rgba(0,0,0,0.25)', letterSpacing: '0.12em', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 13, color: '#0A0A0A', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', padding: '28px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.25)', marginBottom: 16 }}>DESCRIPTION</div>
            <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.6)', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>
              {contract.description || 'No description available.'}
            </p>
          </div>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Match score */}
          {breakdown && (
            <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', padding: '24px' }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.25)', marginBottom: 16 }}>MATCH SCORE</div>
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 48, fontWeight: 700, color: scoreColor, fontFamily: 'var(--font-geist-sans, sans-serif)', lineHeight: 1 }}>{breakdown.total}</span>
                <span style={{ fontSize: 16, color: 'rgba(0,0,0,0.25)', marginLeft: 4 }}>/100</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <ScoreBar label="NAICS MATCH" score={breakdown.naicsScore} max={40} />
                <ScoreBar label="SET-ASIDE" score={breakdown.setAsideScore} max={25} />
                <ScoreBar label="CONTRACT SIZE" score={breakdown.contractSizeScore} max={20} />
                <ScoreBar label="GEOGRAPHY" score={breakdown.geoScore} max={15} />
              </div>
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Object.values(breakdown.details).map((detail, i) => (
                  <div key={i} style={{ fontSize: 10, color: 'rgba(0,0,0,0.35)', lineHeight: 1.5 }}>• {detail}</div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', padding: '24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.25)', marginBottom: 8 }}>ACTIONS</div>
            <SaveContractButton contract={contract} />
            <Link
              href="/documents"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', fontSize: 10, letterSpacing: '0.08em', border: '1px solid rgba(0,0,0,0.1)', color: 'rgba(0,0,0,0.45)', textDecoration: 'none', fontFamily: 'var(--font-geist-mono, monospace)' }}
            >
              ☰ GENERATE DOCUMENTS
            </Link>
            <a
              href={contract.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', fontSize: 10, letterSpacing: '0.08em', border: '1px solid rgba(0,0,0,0.1)', color: 'rgba(0,0,0,0.45)', textDecoration: 'none', fontFamily: 'var(--font-geist-mono, monospace)' }}
            >
              ↗ VIEW ON SAM.GOV
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
