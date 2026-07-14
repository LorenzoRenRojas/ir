import { notFound } from 'next/navigation'
import Link from 'next/link'
import { fetchContractById, fetchContractDescription } from '@/lib/sam-api'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateMatchScore } from '@/lib/matching'
import { buildCapturePlaybook } from '@/lib/capture'
import { SaveContractButton } from '@/components/contracts/save-contract-button'
import { fetchIncumbent } from '@/lib/usaspending'
import ScoreBreakdown from '@/components/contracts/ScoreBreakdown'
import CapturePlaybook from '@/components/contracts/CapturePlaybook'
import MarketIntel from '@/components/contracts/MarketIntel'

function formatValue(v?: number): string {
  if (!v) return 'Not posted'
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

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const contract = await fetchContractById(decodeURIComponent(id))

  if (!contract) {
    notFound()
  }

  const [incumbent, description] = await Promise.all([
    contract.naicsCode && contract.agency
      ? fetchIncumbent(contract.naicsCode, contract.agency)
      : Promise.resolve(null),
    fetchContractDescription(contract),
  ])

  const session = await auth()
  let breakdown = null
  let captureProfile: { certifications: string[]; businessTypes: string[] } | null = null
  if (session?.user?.id) {
    const dbProfile = await prisma.companyProfile.findUnique({
      where: { userId: session.user.id },
    })
    if (dbProfile) {
      const parseArr = (s: string): string[] => {
        try { const v = JSON.parse(s); return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [] } catch { return [] }
      }
      const profile = {
        naicsCodes: parseArr(dbProfile.naicsCodes),
        businessTypes: parseArr(dbProfile.businessTypes),
        contractSizePrefs: parseArr(dbProfile.contractSizePrefs),
        contractTypePrefs: parseArr(dbProfile.contractTypePrefs),
        geoPrefs: parseArr(dbProfile.geoPrefs),
        certifications: parseArr(dbProfile.certifications),
      }
      breakdown = calculateMatchScore(contract, profile)
      captureProfile = { certifications: profile.certifications, businessTypes: profile.businessTypes }
    }
  }

  // Capture Playbook — pure/instant, renders even without a profile (it prompts
  // to complete one). The "how to pursue this" layer.
  const playbook = buildCapturePlaybook(contract, captureProfile, incumbent)

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
    { label: 'PLACE OF PERFORMANCE', value: contract.placeOfPerformance && contract.placeOfPerformance !== 'TBD' ? contract.placeOfPerformance : 'Not specified' },
  ]

  return (
    <div style={{ padding: '32px 40px', minHeight: '100vh', maxWidth: 1100, fontFamily: 'var(--font-geist-mono, monospace)' }}>
      <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'rgba(0,0,0,0.35)', fontSize: 10, letterSpacing: '0.1em', textDecoration: 'none', marginBottom: 28 }}>
        ← BACK TO DASHBOARD
      </Link>

      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0A', lineHeight: 1.3, margin: '0 0 8px', letterSpacing: '-0.01em', fontFamily: 'var(--font-geist-sans, sans-serif)', maxWidth: 700 }}>
        {contract.title}
      </h1>
      <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', marginBottom: 32, letterSpacing: '0.06em' }}>{contract.agency}</div>

      {/* Full animated match analysis — the "why this score" story */}
      {breakdown && <ScoreBreakdown breakdown={breakdown} />}

      {/* Capture Playbook (how to pursue) + Market Intelligence (who wins here) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12, marginBottom: 12 }}>
        <CapturePlaybook playbook={playbook} />
        {contract.naicsCode && <MarketIntel naics={contract.naicsCode} agency={contract.agency} />}
      </div>

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
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.25)', marginBottom: 16 }}>STATEMENT OF WORK</div>
            {description ? (
              <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.6)', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>
                {description}
              </p>
            ) : (
              <div>
                <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)', lineHeight: 1.8, margin: '0 0 16px', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>
                  The full statement of work couldn&apos;t be retrieved right now (SAM.gov limits how often
                  we can pull notice text). It&apos;s available on the official notice:
                </p>
                <a
                  href={contract.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-block', padding: '10px 20px', border: '1px solid rgba(0,0,0,0.15)', color: '#0A0A0A', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none', fontFamily: 'var(--font-geist-mono, monospace)' }}
                >
                  VIEW FULL NOTICE ON SAM.GOV ↗
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Incumbent */}
          {incumbent && (
            <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', padding: '24px' }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.25)', marginBottom: 16 }}>MARKET LEADER — TOP AWARD IN THIS NAICS</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', fontFamily: 'var(--font-geist-sans, sans-serif)', marginBottom: 8 }}>{incumbent.awardee}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div>
                  <div style={{ fontSize: 9, color: 'rgba(0,0,0,0.25)', letterSpacing: '0.12em', marginBottom: 2 }}>AWARD VALUE</div>
                  <div style={{ fontSize: 12, color: '#0A0A0A', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>{formatValue(incumbent.amount)}</div>
                </div>
                {incumbent.periodOfPerformanceEnd && (
                  <div>
                    <div style={{ fontSize: 9, color: 'rgba(0,0,0,0.25)', letterSpacing: '0.12em', marginBottom: 2 }}>CONTRACT ENDS</div>
                    <div style={{ fontSize: 12, color: '#0A0A0A', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>{formatDate(incumbent.periodOfPerformanceEnd)}</div>
                  </div>
                )}
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
