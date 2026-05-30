'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface Filters {
  agency: string
  contractType: string
  setAside: string
  minValue: string
  maxValue: string
  q: string
}

interface FiltersSidebarProps {
  filters: Filters
  onChange: (filters: Filters) => void
  onReset: () => void
}

const AGENCIES = [
  'Department of Defense',
  'General Services Administration',
  'Department of Veterans Affairs',
  'Department of Homeland Security',
  'Department of Health and Human Services',
  'Department of Transportation',
  'Department of Energy',
  'Department of Agriculture',
  'Environmental Protection Agency',
  'Department of Justice',
]

const SET_ASIDE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'Small Business', label: 'Small Business' },
  { value: 'SDVOSB', label: 'SDVOSB' },
  { value: 'WOSB', label: 'WOSB' },
  { value: '8(a)', label: '8(a)' },
  { value: 'HUBZone', label: 'HUBZone' },
  { value: 'Open', label: 'Open Competition' },
]

const CONTRACT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'Solicitation', label: 'Solicitation' },
  { value: 'Sources Sought', label: 'Sources Sought' },
  { value: 'Presolicitation', label: 'Pre-Solicitation' },
  { value: 'Award', label: 'Award Notice' },
]

export function FiltersSidebar({ filters, onChange, onReset }: FiltersSidebarProps) {
  const [expanded, setExpanded] = useState(true)

  function update(key: keyof Filters, value: string) {
    onChange({ ...filters, [key]: value })
  }

  const hasActiveFilters = Object.values(filters).some(v => v !== '')

  return (
    <div className="w-full lg:w-64 flex-shrink-0">
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <svg className="w-4 h-4 text-[#C8A96E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
          </h3>
          {hasActiveFilters && (
            <button onClick={onReset} className="text-xs text-[#C8A96E] hover:underline">
              Reset all
            </button>
          )}
        </div>

        <div className="p-4 space-y-5">
          {/* Search */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Search</label>
            <input
              type="text"
              placeholder="Keywords..."
              value={filters.q}
              onChange={e => update('q', e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[#C8A96E]"
            />
          </div>

          {/* Agency */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Agency</label>
            <select
              value={filters.agency}
              onChange={e => update('agency', e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#C8A96E]"
            >
              <option value="">All Agencies</option>
              {AGENCIES.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Contract Type */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Contract Type</label>
            <div className="space-y-1.5">
              {CONTRACT_TYPES.map(t => (
                <label key={t.value} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="contractType"
                    value={t.value}
                    checked={filters.contractType === t.value}
                    onChange={() => update('contractType', t.value)}
                    className="accent-[#C8A96E]"
                  />
                  <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">{t.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Set-Aside */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Set-Aside Type</label>
            <div className="space-y-1.5">
              {SET_ASIDE_OPTIONS.map(s => (
                <label key={s.value} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="setAside"
                    value={s.value}
                    checked={filters.setAside === s.value}
                    onChange={() => update('setAside', s.value)}
                    className="accent-[#C8A96E]"
                  />
                  <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">{s.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Value Range */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Contract Value</label>
            <div className="space-y-2">
              <input
                type="number"
                placeholder="Min ($)"
                value={filters.minValue}
                onChange={e => update('minValue', e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[#C8A96E]"
              />
              <input
                type="number"
                placeholder="Max ($)"
                value={filters.maxValue}
                onChange={e => update('maxValue', e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[#C8A96E]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
