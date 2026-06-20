'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogoRune } from '@/components/ui/logo-rune'

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

const BUSINESS_TYPES = ['Small Business', '8(a) Certified', 'SDVOSB', 'WOSB', 'HUBZone', 'Large Business', 'Nonprofit']
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
const CERTIFICATIONS = ['ISO 9001', 'ISO 27001', 'CMMI Level 2', 'CMMI Level 3', 'SOC 2', 'No Clearance', 'Secret Clearance', 'Top Secret', 'Top Secret/SCI']
const PLANS = [
  { id: 'starter', name: 'STARTER', price: '$79/mo', features: ['25 matches/month', '3 document templates', 'Email alerts', 'SAM.gov integration'] },
  { id: 'pro', name: 'PRO', price: '$199/mo', popular: true, features: ['Unlimited matches', 'Full document suite', 'Priority alerts', 'Match score explanations'] },
  { id: 'enterprise', name: 'ENTERPRISE', price: '$499/mo', features: ['Everything in Pro', '5 team seats', 'Dedicated support', 'White-label documents'] },
]

interface FormData {
  companyName: string; uei: string; website: string; yearFounded: string
  businessTypes: string[]; naicsCodes: string[]; contractSizePref: string
  contractTypePrefs: string[]; geoConus: boolean; geoStates: string[]
  geoWorldwide: boolean; certifications: string[]; plan: string
}

const initialForm: FormData = {
  companyName: '', uei: '', website: '', yearFounded: '',
  businessTypes: [], naicsCodes: [], contractSizePref: 'Any',
  contractTypePrefs: [], geoConus: true, geoStates: [],
  geoWorldwide: false, certifications: [], plan: 'starter',
}

function toggle<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#E2E8F0',
  fontSize: 13,
  fontFamily: 'var(--font-geist-mono, monospace)',
  outline: 'none',
  boxSizing: 'border-box' as const,
}

const labelStyle = {
  display: 'block',
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: '0.12em',
  color: 'rgba(255,255,255,0.3)',
  marginBottom: 8,
  fontFamily: 'var(--font-geist-mono, monospace)',
}

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 12px',
        fontSize: 11,
        border: selected ? '1px solid rgba(200,169,110,0.5)' : '1px solid rgba(255,255,255,0.08)',
        background: selected ? 'rgba(200,169,110,0.1)' : 'transparent',
        color: selected ? '#C8A96E' : 'rgba(255,255,255,0.4)',
        cursor: 'pointer',
        fontFamily: 'var(--font-geist-mono, monospace)',
        letterSpacing: '0.04em',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )
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
          companyName: form.companyName, uei: form.uei || null, website: form.website || null,
          yearFounded: form.yearFounded ? parseInt(form.yearFounded) : null,
          businessTypes: form.businessTypes, naicsCodes: form.naicsCodes,
          contractSizePrefs: form.contractSizePref === 'Any' ? ['Any'] : [form.contractSizePref],
          contractTypePrefs: form.contractTypePrefs, geoPrefs,
          certifications: form.certifications, plan: form.plan,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong'); return }
      router.push('/dashboard')
    } catch {
      setError('Failed to save profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const stepTitles = ['COMPANY BASICS', 'BUSINESS TYPE', 'NAICS CODES', 'CONTRACT PREFS', 'GEOGRAPHY', 'CERTIFICATIONS', 'REVIEW & SUBSCRIBE']

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0B', color: '#E2E8F0', fontFamily: 'var(--font-geist-mono, monospace)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 24px' }}>
      {/* Logo */}
      <div style={{ marginBottom: 40, alignSelf: 'flex-start', maxWidth: 640, width: '100%', margin: '0 auto 40px' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <LogoRune size={22} color="#C8A96E" />
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 700, letterSpacing: '0.12em' }}>IR</span>
        </Link>
      </div>

      <div style={{ width: '100%', maxWidth: 640 }}>
        {/* Progress */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 9, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)' }}>STEP {step} OF {TOTAL_STEPS} — {stepTitles[step - 1]}</span>
            <span style={{ fontSize: 9, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.2)' }}>{Math.round((step / TOTAL_STEPS) * 100)}%</span>
          </div>
          <div style={{ height: 2, background: 'rgba(255,255,255,0.07)' }}>
            <div style={{ height: '100%', width: `${(step / TOTAL_STEPS) * 100}%`, background: '#C8A96E', transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* Card */}
        <div style={{ background: '#0F0F10', border: '1px solid rgba(255,255,255,0.07)', padding: '36px' }}>

          {/* Step 1 */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={labelStyle}>COMPANY NAME <span style={{ color: 'rgba(255,100,100,0.6)' }}>*</span></label>
                <input type="text" value={form.companyName} onChange={(e) => setField('companyName', e.target.value)} style={inputStyle} placeholder="Acme Government Solutions LLC" />
              </div>
              <div>
                <label style={labelStyle}>UEI NUMBER <span style={{ color: 'rgba(255,255,255,0.2)' }}>(OPTIONAL)</span></label>
                <input type="text" value={form.uei} onChange={(e) => setField('uei', e.target.value)} style={inputStyle} placeholder="12-character UEI from SAM.gov" maxLength={12} />
              </div>
              <div>
                <label style={labelStyle}>WEBSITE <span style={{ color: 'rgba(255,255,255,0.2)' }}>(OPTIONAL)</span></label>
                <input type="url" value={form.website} onChange={(e) => setField('website', e.target.value)} style={inputStyle} placeholder="https://www.yourcompany.com" />
              </div>
              <div>
                <label style={labelStyle}>YEAR FOUNDED <span style={{ color: 'rgba(255,255,255,0.2)' }}>(OPTIONAL)</span></label>
                <input type="number" value={form.yearFounded} onChange={(e) => setField('yearFounded', e.target.value)} style={inputStyle} placeholder="2010" min={1900} max={new Date().getFullYear()} />
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 20, lineHeight: 1.6 }}>Select all that apply to your business.</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {BUSINESS_TYPES.map((bt) => (
                  <Chip key={bt} label={bt} selected={form.businessTypes.includes(bt)} onClick={() => setField('businessTypes', toggle(form.businessTypes, bt))} />
                ))}
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 20, lineHeight: 1.6 }}>Select all NAICS codes that apply to your business.</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {NAICS_OPTIONS.map(({ code, label }) => (
                  <Chip key={code} label={label} selected={form.naicsCodes.includes(code)} onClick={() => setField('naicsCodes', toggle(form.naicsCodes, code))} />
                ))}
              </div>
              {form.naicsCodes.length > 0 && (
                <div style={{ marginTop: 16, fontSize: 10, color: '#C8A96E', letterSpacing: '0.08em' }}>
                  {form.naicsCodes.length} CODE{form.naicsCodes.length !== 1 ? 'S' : ''} SELECTED
                </div>
              )}
            </div>
          )}

          {/* Step 4 */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              <div>
                <div style={{ fontSize: 9, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.25)', marginBottom: 14 }}>CONTRACT SIZE</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {['Micro (<$10K)', 'Simplified ($10K-$250K)', 'Large ($250K+)', 'Any'].map((size) => (
                    <div key={size} onClick={() => setField('contractSizePref', size)} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', border: form.contractSizePref === size ? '2px solid #C8A96E' : '2px solid rgba(255,255,255,0.15)', background: form.contractSizePref === size ? '#C8A96E' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {form.contractSizePref === size && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#0A0A0B' }} />}
                      </div>
                      <span style={{ fontSize: 12, color: form.contractSizePref === size ? '#C8A96E' : 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>{size}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 9, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.25)', marginBottom: 14 }}>CONTRACT TYPE</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {CONTRACT_TYPES.map((type) => (
                    <Chip key={type} label={type} selected={form.contractTypePrefs.includes(type)} onClick={() => setField('contractTypePrefs', toggle(form.contractTypePrefs, type))} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 5 */}
          {step === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'CONUS (Continental United States)', key: 'geoConus' as const },
                  { label: 'Worldwide (including OCONUS)', key: 'geoWorldwide' as const },
                ].map(({ label, key }) => (
                  <div key={key} onClick={() => setField(key, !form[key])} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                    <div style={{ width: 14, height: 14, border: form[key] ? '1px solid #C8A96E' : '1px solid rgba(255,255,255,0.15)', background: form[key] ? '#C8A96E' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {form[key] && <span style={{ fontSize: 9, color: '#0A0A0B', fontWeight: 700 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 12, color: form[key] ? '#C8A96E' : 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>{label}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 9, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.25)', marginBottom: 12 }}>SPECIFIC STATES</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
                  {US_STATES.map((state) => (
                    <Chip key={state} label={state} selected={form.geoStates.includes(state)} onClick={() => setField('geoStates', toggle(form.geoStates, state))} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 6 */}
          {step === 6 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 8, lineHeight: 1.6 }}>Select all certifications and clearance levels your company holds.</div>
              {CERTIFICATIONS.map((cert) => (
                <div key={cert} onClick={() => setField('certifications', toggle(form.certifications, cert))} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <div style={{ width: 14, height: 14, border: form.certifications.includes(cert) ? '1px solid #C8A96E' : '1px solid rgba(255,255,255,0.15)', background: form.certifications.includes(cert) ? '#C8A96E' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {form.certifications.includes(cert) && <span style={{ fontSize: 9, color: '#0A0A0B', fontWeight: 700 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 12, color: form.certifications.includes(cert) ? '#C8A96E' : 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>{cert}</span>
                </div>
              ))}
            </div>
          )}

          {/* Step 7 */}
          {step === 7 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Summary */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', padding: '20px' }}>
                <div style={{ fontSize: 9, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.25)', marginBottom: 16 }}>PROFILE SUMMARY</div>
                {[
                  { label: 'COMPANY', value: form.companyName || 'Not set' },
                  form.uei ? { label: 'UEI', value: form.uei } : null,
                  { label: 'BUSINESS TYPES', value: form.businessTypes.length > 0 ? form.businessTypes.join(', ') : 'None selected' },
                  { label: 'NAICS CODES', value: `${form.naicsCodes.length} selected` },
                  { label: 'CONTRACT SIZE', value: form.contractSizePref },
                  { label: 'GEOGRAPHY', value: [form.geoWorldwide && 'Worldwide', form.geoConus && 'CONUS', form.geoStates.length > 0 && `${form.geoStates.length} states`].filter(Boolean).join(', ') || 'Not set' },
                  { label: 'CERTIFICATIONS', value: form.certifications.length > 0 ? form.certifications.join(', ') : 'None' },
                ].filter(Boolean).map((item) => item && (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>{item.label}</span>
                    <span style={{ fontSize: 11, color: '#E2E8F0', textAlign: 'right', maxWidth: '60%', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Plan selection */}
              <div>
                <div style={{ fontSize: 9, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.25)', marginBottom: 14 }}>CHOOSE YOUR PLAN</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'rgba(255,255,255,0.04)' }}>
                  {PLANS.map((plan) => {
                    const selected = form.plan === plan.id
                    return (
                      <div
                        key={plan.id}
                        onClick={() => setField('plan', plan.id)}
                        style={{ background: selected ? 'rgba(200,169,110,0.05)' : '#0F0F10', padding: '16px 20px', cursor: 'pointer', borderLeft: selected ? '2px solid #C8A96E' : '2px solid transparent' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 12, height: 12, borderRadius: '50%', border: selected ? '2px solid #C8A96E' : '2px solid rgba(255,255,255,0.15)', background: selected ? '#C8A96E' : 'transparent' }} />
                            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: selected ? '#C8A96E' : 'rgba(255,255,255,0.6)' }}>{plan.name}</span>
                            {plan.popular && <span style={{ fontSize: 8, letterSpacing: '0.1em', color: '#C8A96E', padding: '2px 6px', border: '1px solid rgba(200,169,110,0.3)' }}>POPULAR</span>}
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: selected ? '#C8A96E' : 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>{plan.price}</span>
                        </div>
                        <ul style={{ listStyle: 'none', padding: '0 0 0 22px', margin: 0, display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
                          {plan.features.map((f) => (
                            <li key={f} style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', display: 'flex', gap: 6, fontFamily: 'var(--font-geist-sans, sans-serif)' }}>
                              <span style={{ color: '#C8A96E' }}>—</span>{f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              </div>

              {error && (
                <div style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: 11 }}>{error}</div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 36, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
              style={{ padding: '10px 20px', fontSize: 10, letterSpacing: '0.1em', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)', cursor: step === 1 ? 'not-allowed' : 'pointer', opacity: step === 1 ? 0.3 : 1, fontFamily: 'var(--font-geist-mono, monospace)' }}
            >
              ← BACK
            </button>

            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && !form.companyName.trim()) { setError('Company name is required'); return }
                  setError('')
                  setStep((s) => s + 1)
                }}
                style={{ padding: '10px 24px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', background: '#C8A96E', color: '#0A0A0B', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-geist-mono, monospace)' }}
              >
                CONTINUE →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleComplete}
                disabled={loading}
                style={{ padding: '10px 24px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', background: '#C8A96E', color: '#0A0A0B', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontFamily: 'var(--font-geist-mono, monospace)' }}
              >
                {loading ? 'SETTING UP…' : 'COMPLETE SETUP →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
