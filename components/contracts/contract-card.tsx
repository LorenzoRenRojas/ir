'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Contract } from '@/lib/sam-api'

interface ContractCardProps {
  contract: Contract
  onSave?: (contract: Contract) => void
  onDismiss?: (contractId: string) => void
  isSaved?: boolean
}

function formatDeadline(deadline: string): { text: string; urgent: boolean } {
  const date = new Date(deadline)
  if (!deadline || isNaN(date.getTime())) return { text: 'No deadline posted', urgent: false }
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

  if (days < 0) return { text: 'Expired', urgent: true }
  if (days === 0) return { text: 'Due today', urgent: true }
  if (days <= 3) return { text: `${days}d left`, urgent: true }
  if (days <= 7) return { text: `${days}d left`, urgent: false }
  return { text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), urgent: false }
}

function MatchScoreRing({ score }: { score: number }) {
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444'
  const label = score >= 70 ? 'Strong' : score >= 40 ? 'Good' : 'Weak'

  return (
    <div className="flex flex-col items-center">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold border-2"
        style={{ borderColor: color, color }}
      >
        {score}
      </div>
      <span className="text-xs mt-1" style={{ color }}>{label}</span>
    </div>
  )
}

function SetAsideBadge({ type, description }: { type: string; description: string }) {
  const variantMap: Record<string, 'gold' | 'navy' | 'green' | 'purple' | 'yellow' | 'slate'> = {
    'SBA': 'green',
    'SDVOSBC': 'navy',
    'WOSB': 'purple',
    '8A': 'gold',
    'HUBZONE': 'yellow',
  }

  const shortLabel: Record<string, string> = {
    'SBA': 'Small Business',
    'SDVOSBC': 'SDVOSB',
    'WOSB': 'WOSB',
    '8A': '8(a)',
    'HUBZONE': 'HUBZone',
    'NONE': 'Open',
    'FULL': 'Open',
  }

  const variant = variantMap[type] || 'slate'
  const label = shortLabel[type] || description.split(' ')[0]

  return <Badge variant={variant}>{label}</Badge>
}

export function ContractCard({ contract, onSave, onDismiss, isSaved }: ContractCardProps) {
  const deadline = formatDeadline(contract.responseDeadline)

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all duration-200 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <SetAsideBadge type={contract.setAsideType} description={contract.setAsideDescription} />
            <span className="text-xs text-slate-500">{contract.type}</span>
          </div>
          <Link href={`/contracts/${contract.id}`}>
            <h3 className="text-white font-semibold text-sm leading-snug hover:text-[#C8A96E] transition-colors line-clamp-2">
              {contract.title}
            </h3>
          </Link>
          <p className="text-slate-400 text-xs mt-1">{contract.agency}</p>
        </div>

        {contract.matchScore !== undefined && (
          <MatchScoreRing score={contract.matchScore} />
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-950/50 rounded-lg p-2">
          <div className="text-xs text-slate-500 mb-0.5">Value</div>
          <div className="text-sm font-semibold text-[#C8A96E]">{contract.valueFormatted}</div>
        </div>
        <div className="bg-slate-950/50 rounded-lg p-2">
          <div className="text-xs text-slate-500 mb-0.5">Deadline</div>
          <div className={`text-sm font-semibold ${deadline.urgent ? 'text-red-400' : 'text-slate-300'}`}>
            {deadline.text}
          </div>
        </div>
        <div className="bg-slate-950/50 rounded-lg p-2">
          <div className="text-xs text-slate-500 mb-0.5">NAICS</div>
          <div className="text-sm font-semibold text-slate-300">{contract.naicsCode}</div>
        </div>
      </div>

      {/* Location */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {contract.placeOfPerformance || 'Location TBD'}
      </div>

      {/* Incumbent */}
      {contract.incumbent && (
        <div className="bg-slate-950/50 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
          <div>
            <div className="text-xs text-slate-500 mb-0.5">Prev. Winner</div>
            <div className="text-xs font-medium text-slate-300 truncate max-w-[180px]">{contract.incumbent.awardee}</div>
          </div>
          {contract.incumbent.amount > 0 && (
            <div className="text-xs font-semibold text-[#C8A96E] shrink-0">
              {contract.incumbent.amount >= 1_000_000
                ? `$${(contract.incumbent.amount / 1_000_000).toFixed(1)}M`
                : `$${(contract.incumbent.amount / 1_000).toFixed(0)}K`}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t border-slate-800">
        <Link href={`/contracts/${contract.id}`} className="flex-1">
          <Button variant="ghost" size="sm" className="w-full text-xs">
            View Details
          </Button>
        </Link>
        {onSave && (
          <Button
            variant={isSaved ? 'navy' : 'outline'}
            size="sm"
            className="flex-1 text-xs"
            onClick={() => onSave(contract)}
          >
            {isSaved ? '★ Saved' : '☆ Save'}
          </Button>
        )}
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-slate-500 hover:text-red-400"
            onClick={() => onDismiss(contract.id)}
          >
            ✕
          </Button>
        )}
      </div>
    </div>
  )
}
