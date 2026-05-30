'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const NAICS_OPTIONS = [
  { code: '236220', label: '236220 — Commercial Building Construction' },
  { code: '237310', label: '237310 — Highway/Street Construction' },
  { code: '238210', label: '238210 — Electrical Contractors' },
  { code: '238220', label: '238220 — Plumbing/HVAC' },
  { code: '511210', label: '511210 — Software Publishers' },
  { code: '518210', label: '518210 — Data Processing/Cloud' },
  { code: '519290', label: '519290 — Web Search Portals' },
  { code: '541330', label: '541330 — Engineering Services' },
  { code: '541511', label: '541511 — Custom Computer Programming' },
  { code: '541512', label: '541512 — Computer Systems Design' },
  { code: '541519', label: '541519 — Other Computer Services' },
  { code: '541611', label: '541611 — Management Consulting' },
  { code: '541614', label: '541614 — Process/Logistics Consulting' },
  { code: '541690', label: '541690 — Other Scientific/Technical' },
  { code: '541712', label: '541712 — R&D Physical Sciences' },
  { code: '541990', label: '541990 — Other Professional Services' },
  { code: '561210', label: '561210 — Facilities Management' },
  { code: '561320', label: '561320 — Temporary Staffing' },
  { code: '611420', label: '611420 — Computer Training' },
  { code: '621999', label: '621999 — Other Health Services' },
  { code: '811212', label: '811212 — Computer/IT Repair' },
]

const BUSINESS_TYPES = [
  'Small Business',
  '8(a) Certified',
  'SDVOSB',
  'WOSB',
  'HUBZone',
  'Large Business',
  'Nonprofit',
]

const CONTRACT_TYPES = ['Services', 'Products', 'Construction', 'R&D', 'IT/Technology']

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming',
]

const CERTIFICATIONS = [
  'ISO 9001',
  'ISO 27001',
  'CMMI Level 2',
  'CMMI Level 3',
  'SOC 2',
  'No Clearance',
  'Secret Clearance',
  'Top Secret',
  'Top Secret/SCI',
]

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$79/mo',
    features: ['25 matches/month', '3 document templates', 'Email alerts', 'SAM.gov integration'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$199/mo',
    popular: true,
    features: ['Unlimited matches', 'Full document suite', 'Priority alerts', 'Match score explanations'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$499/mo',
    features: ['Everything in Pro', '5 team seats', 'Dedicated support', 'White-label documents'],
  },
]

interface FormData {
  companyName: string
  uei: string
  website: string
  yearFounded: string
  businessTypes: string[]
  naicsCodes: string[]
  contractSizePref: string
  contractTypePrefs: string[]
  geoConus: boolean
  geoStates: string[]
  geoWorldwide: boolean
  certifications: string[]
  plan: string
}

const initialForm: FormData = {
  companyName: '',
  uei: '',
  website: '',
  yearFounded: '',
  businessTypes: [],
  naicsCodes: [],
  contractSizePref: 'Any',
  contractTypePrefs: [],
  geoConus: true,
  geoStates: [],
  geoWorldwide: false,
  certifications: [],
  plan: 'starter',
}

function toggle<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormData>(initialForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const TOTAL_STEPS = 7

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleComplete() {
    setLoading(true)
    setError('')
    try {
      const geoPrefs: string[] = []
      if (form.geoWorldwide) geoPrefs.push('Worldwide')
      if (form.geoConus) geoPrefs.push('CONUS')
      geoPrefs.push(...form.geoStates)

      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: form.companyName,
          uei: form.uei || null,
          website: form.website || null,
          yearFounded: form.yearFounded ? parseInt(form.yearFounded) : null,
          businessTypes: form.businessTypes,
          naicsCodes: form.naicsCodes,
          contractSizePrefs: form.contractSizePref === 'Any' ? ['Any'] : [form.contractSizePref],
          contractTypePrefs: form.contractTypePrefs,
          geoPrefs,
          certifications: form.certifications,
          plan: form.plan,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong')
        return
      }
      router.push('/dashboard')
    } catch {
      setError('Failed to save profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center px-4 py-12">
      {/* Logo */}
      <div className="mb-10">
        <span className="text-3xl font-bold" style={{ color: '#C8A96E' }}>ᛁ IR</span>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-2xl mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">Step {step} of {TOTAL_STEPS}</span>
          <span className="text-sm text-slate-400">{Math.round((step / TOTAL_STEPS) * 100)}% complete</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%`, background: '#C8A96E' }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl p-8">

        {/* Step 1 — Company Basics */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Company Basics</h2>
            <p className="text-slate-400 mb-6">Tell us about your organization</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Company Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => setField('companyName', e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
                  placeholder="Acme Government Solutions LLC"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  UEI Number <span className="text-slate-500">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.uei}
                  onChange={(e) => setField('uei', e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
                  placeholder="12-character UEI from SAM.gov"
                  maxLength={12}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Website <span className="text-slate-500">(optional)</span>
                </label>
                <input
                  type="url"
                  value={form.website}
                  onChange={(e) => setField('website', e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
                  placeholder="https://www.yourcompany.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Year Founded <span className="text-slate-500">(optional)</span>
                </label>
                <input
                  type="number"
                  value={form.yearFounded}
                  onChange={(e) => setField('yearFounded', e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
                  placeholder="2010"
                  min={1900}
                  max={new Date().getFullYear()}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2 — Business Type */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Business Type</h2>
            <p className="text-slate-400 mb-6">Select all that apply to your business</p>
            <div className="grid grid-cols-2 gap-3">
              {BUSINESS_TYPES.map((bt) => {
                const selected = form.businessTypes.includes(bt)
                return (
                  <button
                    key={bt}
                    type="button"
                    onClick={() => setField('businessTypes', toggle(form.businessTypes, bt))}
                    className="flex items-center gap-3 p-4 rounded-lg border text-left transition-all"
                    style={selected
                      ? { border: '1px solid #C8A96E', background: 'rgba(200,169,110,0.08)', color: '#C8A96E' }
                      : { borderColor: '#334155', color: '#94a3b8' }
                    }
                  >
                    <div
                      className="w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center"
                      style={selected
                        ? { background: '#C8A96E', borderColor: '#C8A96E' }
                        : { borderColor: '#475569' }
                      }
                    >
                      {selected && <span className="text-slate-950 text-xs font-bold">✓</span>}
                    </div>
                    <span className="text-sm font-medium">{bt}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 3 — NAICS Codes */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">NAICS Codes</h2>
            <p className="text-slate-400 mb-6">Select the NAICS codes that apply to your business (select all that fit)</p>
            <div className="flex flex-wrap gap-2">
              {NAICS_OPTIONS.map(({ code, label }) => {
                const selected = form.naicsCodes.includes(code)
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setField('naicsCodes', toggle(form.naicsCodes, code))}
                    className="px-3 py-2 rounded-lg text-sm font-medium border transition-all"
                    style={selected
                      ? { border: '1px solid #C8A96E', background: 'rgba(200,169,110,0.12)', color: '#C8A96E' }
                      : { borderColor: '#334155', color: '#94a3b8' }
                    }
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            {form.naicsCodes.length > 0 && (
              <p className="mt-4 text-sm" style={{ color: '#C8A96E' }}>
                {form.naicsCodes.length} code{form.naicsCodes.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>
        )}

        {/* Step 4 — Contract Preferences */}
        {step === 4 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Contract Preferences</h2>
            <p className="text-slate-400 mb-6">What types of contracts are you targeting?</p>

            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Contract Size</h3>
              <div className="space-y-2">
                {['Micro (<$10K)', 'Simplified ($10K-$250K)', 'Large ($250K+)', 'Any'].map((size) => (
                  <label key={size} className="flex items-center gap-3 cursor-pointer group">
                    <div
                      className="w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all"
                      style={form.contractSizePref === size
                        ? { borderColor: '#C8A96E', background: '#C8A96E' }
                        : { borderColor: '#475569' }
                      }
                      onClick={() => setField('contractSizePref', size)}
                    >
                      {form.contractSizePref === size && (
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                      )}
                    </div>
                    <span
                      className="text-sm cursor-pointer"
                      style={{ color: form.contractSizePref === size ? '#C8A96E' : '#94a3b8' }}
                      onClick={() => setField('contractSizePref', size)}
                    >
                      {size}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Contract Type</h3>
              <div className="space-y-2">
                {CONTRACT_TYPES.map((type) => {
                  const selected = form.contractTypePrefs.includes(type)
                  return (
                    <label key={type} className="flex items-center gap-3 cursor-pointer">
                      <div
                        className="w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all cursor-pointer"
                        style={selected
                          ? { background: '#C8A96E', borderColor: '#C8A96E' }
                          : { borderColor: '#475569' }
                        }
                        onClick={() => setField('contractTypePrefs', toggle(form.contractTypePrefs, type))}
                      >
                        {selected && <span className="text-slate-950 text-xs font-bold">✓</span>}
                      </div>
                      <span
                        className="text-sm cursor-pointer"
                        style={{ color: selected ? '#C8A96E' : '#94a3b8' }}
                        onClick={() => setField('contractTypePrefs', toggle(form.contractTypePrefs, type))}
                      >
                        {type}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 5 — Geographic Preferences */}
        {step === 5 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Geographic Preferences</h2>
            <p className="text-slate-400 mb-6">Where do you want to perform work?</p>

            <div className="space-y-3 mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  className="w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all"
                  style={form.geoConus
                    ? { background: '#C8A96E', borderColor: '#C8A96E' }
                    : { borderColor: '#475569' }
                  }
                  onClick={() => setField('geoConus', !form.geoConus)}
                >
                  {form.geoConus && <span className="text-slate-950 text-xs font-bold">✓</span>}
                </div>
                <span
                  className="text-sm cursor-pointer font-medium"
                  style={{ color: form.geoConus ? '#C8A96E' : '#94a3b8' }}
                  onClick={() => setField('geoConus', !form.geoConus)}
                >
                  CONUS (Continental United States)
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  className="w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all"
                  style={form.geoWorldwide
                    ? { background: '#C8A96E', borderColor: '#C8A96E' }
                    : { borderColor: '#475569' }
                  }
                  onClick={() => setField('geoWorldwide', !form.geoWorldwide)}
                >
                  {form.geoWorldwide && <span className="text-slate-950 text-xs font-bold">✓</span>}
                </div>
                <span
                  className="text-sm cursor-pointer font-medium"
                  style={{ color: form.geoWorldwide ? '#C8A96E' : '#94a3b8' }}
                  onClick={() => setField('geoWorldwide', !form.geoWorldwide)}
                >
                  Worldwide (including OCONUS)
                </span>
              </label>
            </div>

            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Specific States</h3>
            <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
              {US_STATES.map((state) => {
                const selected = form.geoStates.includes(state)
                return (
                  <button
                    key={state}
                    type="button"
                    onClick={() => setField('geoStates', toggle(form.geoStates, state))}
                    className="px-2 py-1.5 rounded text-xs font-medium border transition-all text-left"
                    style={selected
                      ? { border: '1px solid #C8A96E', background: 'rgba(200,169,110,0.1)', color: '#C8A96E' }
                      : { borderColor: '#334155', color: '#94a3b8' }
                    }
                  >
                    {state}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 6 — Certifications */}
        {step === 6 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Certifications & Clearances</h2>
            <p className="text-slate-400 mb-6">Select all certifications and clearance levels your company holds</p>
            <div className="space-y-3">
              {CERTIFICATIONS.map((cert) => {
                const selected = form.certifications.includes(cert)
                return (
                  <label key={cert} className="flex items-center gap-3 cursor-pointer">
                    <div
                      className="w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all cursor-pointer"
                      style={selected
                        ? { background: '#C8A96E', borderColor: '#C8A96E' }
                        : { borderColor: '#475569' }
                      }
                      onClick={() => setField('certifications', toggle(form.certifications, cert))}
                    >
                      {selected && <span className="text-slate-950 text-xs font-bold">✓</span>}
                    </div>
                    <span
                      className="text-sm cursor-pointer"
                      style={{ color: selected ? '#C8A96E' : '#94a3b8' }}
                      onClick={() => setField('certifications', toggle(form.certifications, cert))}
                    >
                      {cert}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 7 — Review & Subscribe */}
        {step === 7 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Review & Subscribe</h2>
            <p className="text-slate-400 mb-6">Confirm your profile and choose a plan</p>

            {/* Summary */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 mb-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Company</span>
                <span className="text-white font-medium">{form.companyName || 'Not set'}</span>
              </div>
              {form.uei && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">UEI</span>
                  <span className="text-white">{form.uei}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Business Types</span>
                <span className="text-white text-right max-w-xs">
                  {form.businessTypes.length > 0 ? form.businessTypes.join(', ') : 'None selected'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">NAICS Codes</span>
                <span className="text-white">{form.naicsCodes.length} selected</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Contract Size</span>
                <span className="text-white">{form.contractSizePref}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Geography</span>
                <span className="text-white">
                  {[
                    form.geoWorldwide && 'Worldwide',
                    form.geoConus && 'CONUS',
                    form.geoStates.length > 0 && `${form.geoStates.length} states`,
                  ].filter(Boolean).join(', ') || 'Not set'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Certifications</span>
                <span className="text-white">{form.certifications.length > 0 ? form.certifications.join(', ') : 'None'}</span>
              </div>
            </div>

            {/* Plan selection */}
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Choose Your Plan</h3>
            <div className="space-y-3">
              {PLANS.map((plan) => {
                const selected = form.plan === plan.id
                return (
                  <div
                    key={plan.id}
                    onClick={() => setField('plan', plan.id)}
                    className="relative p-4 rounded-lg border cursor-pointer transition-all"
                    style={selected
                      ? { border: '1px solid #C8A96E', background: 'rgba(200,169,110,0.06)' }
                      : { borderColor: '#334155' }
                    }
                  >
                    {plan.popular && (
                      <span
                        className="absolute -top-2.5 left-4 text-xs font-bold px-2 py-0.5 rounded-full text-slate-950"
                        style={{ background: '#C8A96E' }}
                      >
                        MOST POPULAR
                      </span>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                          style={selected ? { borderColor: '#C8A96E', background: '#C8A96E' } : { borderColor: '#475569' }}
                        >
                          {selected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                        </div>
                        <span className="font-semibold text-white">{plan.name}</span>
                      </div>
                      <span className="font-bold" style={{ color: '#C8A96E' }}>{plan.price}</span>
                    </div>
                    <ul className="ml-7 space-y-1">
                      {plan.features.map((f) => (
                        <li key={f} className="text-xs text-slate-400 flex items-center gap-2">
                          <span style={{ color: '#C8A96E' }}>✓</span> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-950 border border-red-800 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="px-5 py-2.5 rounded-lg border border-slate-700 text-slate-300 font-medium disabled:opacity-30 hover:border-slate-500 transition-colors"
          >
            Back
          </button>

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1 && !form.companyName.trim()) {
                  setError('Company name is required')
                  return
                }
                setError('')
                setStep((s) => s + 1)
              }}
              className="px-6 py-2.5 rounded-lg font-semibold text-slate-950 transition-colors"
              style={{ background: '#C8A96E' }}
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleComplete}
              disabled={loading}
              className="px-6 py-2.5 rounded-lg font-semibold text-slate-950 transition-colors disabled:opacity-60"
              style={{ background: '#C8A96E' }}
            >
              {loading ? 'Setting up…' : 'Complete Setup'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
