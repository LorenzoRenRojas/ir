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
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-400 w-36 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: score > 0 ? '#C8A96E' : '#334155' }}
        />
      </div>
      <span className="text-sm font-semibold w-8 text-right" style={{ color: score > 0 ? '#C8A96E' : '#64748b' }}>
        +{score}
      </span>
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

  // Get match score breakdown
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
    { label: 'Agency', value: contract.agency },
    { label: 'Sub-Agency', value: contract.subAgency ?? '—' },
    { label: 'Notice ID', value: contract.noticeId },
    { label: 'Solicitation #', value: contract.solicitationNumber || '—' },
    { label: 'Type', value: contract.typeDescription || contract.type },
    { label: 'Set-Aside', value: contract.setAsideDescription || 'None' },
    { label: 'NAICS Code', value: `${contract.naicsCode} — ${contract.naicsDescription}` },
    { label: 'Estimated Value', value: formatValue(contract.value) },
    { label: 'Posted Date', value: formatDate(contract.postedDate) },
    { label: 'Response Deadline', value: formatDate(contract.responseDeadline) },
    { label: 'Place of Performance', value: contract.placeOfPerformance || 'TBD' },
  ]

  return (
    <div className="p-8 max-w-5xl">
      {/* Back */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
      >
        ← Back to Dashboard
      </Link>

      {/* Title */}
      <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">
        {contract.title}
      </h1>
      <p className="text-slate-400 mb-8">{contract.agency}</p>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Detail grid */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Contract Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {fields.map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
                  <p className="text-sm text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Description</h2>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
              {contract.description || 'No description available.'}
            </p>
          </div>
        </div>

        {/* Right: match score + actions */}
        <div className="space-y-4">
          {/* Match score */}
          {breakdown && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-1">Match Score</h2>
              <div className="mb-4">
                <span
                  className="text-4xl font-bold"
                  style={{ color: breakdown.total >= 80 ? '#4ade80' : breakdown.total >= 60 ? '#C8A96E' : '#94a3b8' }}
                >
                  {breakdown.total}
                </span>
                <span className="text-slate-400 text-lg">/100</span>
              </div>
              <div className="space-y-3">
                <ScoreBar label="NAICS Match" score={breakdown.naicsScore} max={40} />
                <ScoreBar label="Set-Aside" score={breakdown.setAsideScore} max={25} />
                <ScoreBar label="Contract Size" score={breakdown.contractSizeScore} max={20} />
                <ScoreBar label="Geography" score={breakdown.geoScore} max={15} />
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800 space-y-1.5">
                {Object.values(breakdown.details).map((detail, i) => (
                  <p key={i} className="text-xs text-slate-400">• {detail}</p>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h2 className="text-base font-semibold text-white mb-2">Actions</h2>
            <SaveContractButton contract={contract} />
            <Link
              href="/documents"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium hover:border-slate-500 hover:text-white transition-colors"
            >
              📄 Generate Documents
            </Link>
            <a
              href={contract.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium hover:border-slate-500 hover:text-white transition-colors"
            >
              🔗 View on SAM.gov ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
