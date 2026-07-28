'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import MetatronBackdrop from '@/components/MetatronBackdrop'
import MetatronEyeIcon from '@/components/MetatronEyeIcon'
import { mono, sans, crimson, surface } from '@/components/marketing'

// ── Data ─────────────────────────────────────────────────────────────────────

const NAICS_OPTIONS = [
  { code: '236220', label: 'Commercial Building Construction' },
  { code: '237310', label: 'Highway & Street Construction' },
  { code: '238210', label: 'Electrical Contractors' },
  { code: '238220', label: 'Plumbing & HVAC' },
  { code: '334111', label: 'Electronic Computer Manufacturing' },
  { code: '334290', label: 'Communications Equipment' },
  { code: '336411', label: 'Aircraft Manufacturing' },
  { code: '484110', label: 'Trucking (Local)' },
  { code: '484121', label: 'Trucking (Long-Distance)' },
  { code: '511210', label: 'Software Publishers' },
  { code: '518210', label: 'Data Processing & Cloud' },
  { code: '519290', label: 'Web Search Portals' },
  { code: '541110', label: 'Legal Services' },
  { code: '541211', label: 'Accounting & Auditing' },
  { code: '541310', label: 'Architecture Services' },
  { code: '541330', label: 'Engineering Services' },
  { code: '541380', label: 'Testing & Inspection' },
  { code: '541511', label: 'Custom Software Development' },
  { code: '541512', label: 'Computer Systems Design' },
  { code: '541513', label: 'IT Facilities Management' },
  { code: '541519', label: 'Other IT Services' },
  { code: '541611', label: 'Management Consulting' },
  { code: '541612', label: 'HR Consulting' },
  { code: '541614', label: 'Logistics & Supply Chain Consulting' },
  { code: '541618', label: 'Other Management Consulting' },
  { code: '541620', label: 'Environmental Consulting' },
  { code: '541690', label: 'Other Scientific & Technical' },
  { code: '541711', label: 'R&D in Biotechnology' },
  { code: '541712', label: 'R&D in Physical & Engineering Sciences' },
  { code: '541715', label: 'R&D in Life Sciences' },
  { code: '541720', label: 'R&D in Social Sciences' },
  { code: '541810', label: 'Advertising & PR' },
  { code: '541990', label: 'Other Professional Services' },
  { code: '561110', label: 'Office Administrative Services' },
  { code: '561210', label: 'Facilities Support Services' },
  { code: '561310', label: 'Employment Placement' },
  { code: '561320', label: 'Temporary Staffing' },
  { code: '561330', label: 'Professional Employer Organizations' },
  { code: '561499', label: 'Other Business Support' },
  { code: '561611', label: 'Investigation & Security Services' },
  { code: '561612', label: 'Security Guards' },
  { code: '561621', label: 'Security Systems' },
  { code: '561720', label: 'Janitorial Services' },
  { code: '561730', label: 'Landscaping' },
  { code: '561910', label: 'Packaging & Labeling' },
  { code: '561990', label: 'Other Support Services' },
  { code: '611420', label: 'Computer Training' },
  { code: '611430', label: 'Professional Development & Training' },
  { code: '621111', label: 'Physicians & Surgeons' },
  { code: '621310', label: 'Mental Health Services' },
  { code: '621340', label: 'Physical Therapy' },
  { code: '621511', label: 'Medical Laboratories' },
  { code: '621610', label: 'Home Health Care' },
  { code: '621910', label: 'Ambulance Services' },
  { code: '621999', label: 'Other Health Services' },
  { code: '811212', label: 'Computer & IT Repair' },
  { code: '811213', label: 'Communication Equipment Repair' },
  { code: '922120', label: 'Police Protection' },
  { code: '922160', label: 'Fire Protection' },
  { code: '927110', label: 'Space Research & Technology' },
  { code: '928110', label: 'National Security' },
]

const BUSINESS_TYPES = ['Small Business', '8(a) Certified', 'SDVOSB', 'WOSB', 'HUBZone', 'Large Business', 'Nonprofit']

const AGENCIES = [
  'Department of Defense', 'Department of the Army', 'Department of the Navy', 'Department of the Air Force',
  'Defense Logistics Agency', 'DISA', 'DARPA', 'Department of Veterans Affairs',
  'Department of Homeland Security', 'FEMA', 'TSA', 'CBP', 'ICE',
  'Department of Health and Human Services', 'NIH', 'CDC', 'FDA', 'CMS',
  'Department of Energy', 'Department of Transportation', 'FAA',
  'Department of Justice', 'FBI', 'DEA', 'Department of State', 'USAID',
  'Department of the Treasury', 'IRS', 'Department of Commerce', 'NOAA',
  'Department of the Interior', 'Department of Agriculture', 'USDA',
  'Department of Education', 'Department of Labor', 'HUD', 'EPA', 'NASA', 'GSA', 'SSA', 'SBA',
]

const REVENUE_RANGES = ['Under $500K', '$500K – $1M', '$1M – $5M', '$5M – $25M', '$25M – $100M', '$100M+']
const ORG_SIZES = ['1–10', '11–50', '51–200', '201–500', '500+']

const CONTRACT_VEHICLES = [
  'GSA MAS (Multiple Award Schedule)', 'SEWP V', 'CIO-SP3', 'OASIS+', 'STARS III',
  'Alliant 2', 'HCaTS', '8(a) STARS III', 'POLARIS', 'VETS2',
  'T4NG', 'ENCORE III', 'ITES-3S',
]

const CERTIFICATIONS = [
  'ISO 9001', 'ISO 27001', 'CMMI Level 2', 'CMMI Level 3',
  'SOC 2 Type II', 'FedRAMP Ready', 'FedRAMP Authorized',
  'CMMC Level 1', 'CMMC Level 2',
  'No Clearance', 'Secret Clearance', 'Top Secret', 'Top Secret/SCI',
]

const CONTRACT_SIZES = ['Micro (<$10K)', 'Simplified ($10K–$250K)', 'Mid ($250K–$5M)', 'Large ($5M–$50M)', 'Major ($50M+)', 'Any']
const CONTRACT_TYPES = ['Services', 'Products/Supplies', 'Construction', 'R&D', 'IT/Technology', 'Healthcare', 'Training']
const GEO_OPTIONS = [
  'CONUS (Continental US)', 'OCONUS (Overseas)', 'Remote/Virtual',
  'Northeast', 'Mid-Atlantic', 'Southeast', 'Midwest', 'Southwest', 'West Coast',
  'DC Metro Area', 'Texas', 'California', 'Virginia', 'Maryland', 'Florida',
]

// ── Types ────────────────────────────────────────────────────────────────────

interface Answers {
  companyName: string
  website: string
  yearFounded: string
  capabilityStatement: string
  businessTypes: string[]
  naicsSearch: string
  naicsCodes: string[]
  agencyHistory: string[]
  annualRevenue: string
  orgSize: string
  contractVehicles: string[]
  certifications: string[]
  contractSizePref: string
  contractTypePrefs: string[]
  geoPrefs: string[]
  pastPerformance: string
  uei: string
}

const initial: Answers = {
  companyName: '', website: '', yearFounded: '', capabilityStatement: '', businessTypes: [],
  naicsSearch: '', naicsCodes: [], agencyHistory: [],
  annualRevenue: '', orgSize: '', contractVehicles: [],
  certifications: [], contractSizePref: 'Any', contractTypePrefs: [],
  geoPrefs: [], pastPerformance: '', uei: '',
}

interface OnbPrefs {
  feedEligibleOnly: boolean
  feedDensity: 'comfortable' | 'compact'
  notifyDigest: boolean
  notifyDeadlines: boolean
}
const initialPrefs: OnbPrefs = { feedEligibleOnly: true, feedDensity: 'comfortable', notifyDigest: true, notifyDeadlines: true }

// ── Helpers ───────────────────────────────────────────────────────────────────

function toggle<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]
}

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="ir-onb-chip" style={{
      padding: '8px 13px', fontSize: 11.5,
      border: selected ? '1px solid rgba(196,18,48,0.55)' : '1px solid rgba(255,255,255,0.12)',
      background: selected ? 'rgba(196,18,48,0.14)' : 'rgba(255,255,255,0.04)',
      color: selected ? '#f87171' : 'rgba(255,255,255,0.6)',
      cursor: 'pointer', fontFamily: mono,
      letterSpacing: '0.03em', transition: 'all 0.15s ease', borderRadius: 7,
    }}>
      {selected ? '✓ ' : ''}{label}
    </button>
  )
}

function Radio({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} className="ir-onb-radio" style={{ display: 'flex', alignItems: 'center', gap: 11, cursor: 'pointer', padding: '12px 15px', border: selected ? '1px solid rgba(196,18,48,0.45)' : '1px solid rgba(255,255,255,0.09)', background: selected ? 'rgba(196,18,48,0.08)' : 'rgba(255,255,255,0.02)', transition: 'all 0.15s ease', borderRadius: 8 }}>
      <div style={{ width: 14, height: 14, borderRadius: '50%', border: selected ? '2px solid #C41230' : '2px solid rgba(255,255,255,0.22)', background: selected ? '#C41230' : 'transparent', flexShrink: 0, transition: 'all 0.15s', boxShadow: selected ? '0 0 0 3px rgba(196,18,48,0.15)' : 'none' }} />
      <span style={{ fontSize: 13.5, color: selected ? '#fff' : 'rgba(255,255,255,0.6)', fontFamily: sans }}>{label}</span>
    </div>
  )
}

function DarkSwitch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onClick}
      style={{ width: 44, height: 25, borderRadius: 13, background: on ? crimson : 'rgba(255,255,255,0.14)', position: 'relative', flexShrink: 0, border: 'none', cursor: 'pointer', transition: 'background 0.22s ease', padding: 0, boxShadow: on ? '0 0 0 3px rgba(196,18,48,0.18)' : 'none' }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 22 : 3, width: 19, height: 19, borderRadius: '50%', background: '#fff', transition: 'left 0.22s cubic-bezier(0.34,1.56,0.64,1)', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }} />
    </button>
  )
}

function DarkToggleRow({ title, desc, on, onClick }: { title: string; desc: string; on: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, padding: '16px 18px', border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.02)', borderRadius: 10, cursor: 'pointer' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', fontFamily: sans, marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: sans, lineHeight: 1.5 }}>{desc}</div>
      </div>
      <DarkSwitch on={on} onClick={onClick} />
    </div>
  )
}

// ── Question definitions ──────────────────────────────────────────────────────

type QType = 'text' | 'textarea' | 'chips' | 'radio' | 'chips-search' | 'preferences' | 'review'
type Question = {
  id: keyof Answers | 'preferences' | 'review'
  section: string
  ask: string | ((a: Answers) => string)
  type: QType
  hint?: string
  optional?: boolean
}

const QUESTIONS: Question[] = [
  {
    id: 'uei', section: 'IDENTITY',
    ask: 'Start with your SAM.gov UEI or CAGE code.',
    type: 'text', optional: true,
    hint: 'Paste either and we pull your official registration — company name, NAICS codes, set-aside status — automatically. 12-character UEI or 5-character CAGE. Skip if you don\'t have one yet.',
  },
  {
    id: 'companyName', section: 'COMPANY',
    ask: (a) => a.companyName ? 'Confirm your company name.' : "What's your company name?",
    type: 'text', hint: 'Legal name or DBA is fine.',
  },
  {
    id: 'website', section: 'COMPANY',
    ask: 'What\'s your company website?',
    type: 'text', optional: true,
    hint: 'Contracting officers check — a live site builds trust. e.g. yourcompany.com. Skip if you don\'t have one yet.',
  },
  {
    id: 'yearFounded', section: 'COMPANY',
    ask: 'What year was the company founded?',
    type: 'text', optional: true,
    hint: 'Longevity is a win factor on past-performance evaluations.',
  },
  {
    id: 'capabilityStatement', section: 'CAPABILITY',
    ask: 'In a sentence or two, what does your company actually do?',
    type: 'textarea',
    hint: 'Be specific — this is the single most important field for match quality. E.g. "We deliver zero-trust architecture and cloud migration for civilian federal agencies, specializing in AWS GovCloud deployments."',
  },
  {
    id: 'businessTypes', section: 'QUALIFICATION',
    ask: 'What type of business is it?',
    type: 'chips', hint: 'Select all that apply. These determine which set-aside contracts you\'re eligible for.',
  },
  {
    id: 'naicsCodes', section: 'QUALIFICATION',
    ask: 'Which NAICS codes cover your work?',
    type: 'chips-search', hint: 'Search and select all that apply — NAICS codes are how the government categorizes contract work.',
  },
  {
    id: 'agencyHistory', section: 'BACKGROUND',
    ask: 'Which federal agencies have you worked with before?',
    type: 'chips', optional: true,
    hint: 'Prior relationships are a major win factor. Select all that apply.',
  },
  {
    id: 'annualRevenue', section: 'BACKGROUND',
    ask: "What's your annual revenue range?",
    type: 'radio', hint: 'Used to calculate which contract sizes are realistic for you to win.',
  },
  {
    id: 'orgSize', section: 'BACKGROUND',
    ask: 'How many employees does your company have?',
    type: 'radio',
  },
  {
    id: 'contractVehicles', section: 'QUALIFICATION',
    ask: 'Do you hold any contract or IDIQ vehicles?',
    type: 'chips', optional: true,
    hint: 'Many large contracts require these. Leave blank if none.',
  },
  {
    id: 'certifications', section: 'QUALIFICATION',
    ask: 'Any certifications or security clearances?',
    type: 'chips', optional: true,
  },
  {
    id: 'contractSizePref', section: 'TARGETING',
    ask: 'What size contracts do you typically pursue?',
    type: 'radio',
  },
  {
    id: 'contractTypePrefs', section: 'TARGETING',
    ask: 'What type of work do you prefer?',
    type: 'chips',
  },
  {
    id: 'geoPrefs', section: 'TARGETING',
    ask: 'Where do you work?',
    type: 'chips',
  },
  {
    id: 'pastPerformance', section: 'PAST PERFORMANCE',
    ask: 'Describe your best past performance.',
    type: 'textarea', optional: true,
    hint: 'Agency, contract size, and what you delivered — this trains your match engine. E.g. "Delivered $2.1M cybersecurity assessment for DHS across 14 field offices. Zero findings at final audit."',
  },
  {
    id: 'preferences', section: 'PREFERENCES',
    ask: 'How should your feed work?',
    type: 'preferences',
    hint: 'Set your defaults now — you can fine-tune everything later in Settings.',
  },
  {
    id: 'review', section: 'REVIEW',
    ask: (a) => a.companyName ? `Here's your IR profile, ${a.companyName}.` : "Here's your IR profile.",
    type: 'review',
  },
]

// ── Main component ────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Answers>(initial)
  const [prefs, setPrefs] = useState<OnbPrefs>(initialPrefs)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ueiLoading, setUeiLoading] = useState(false)
  const [ueiNote, setUeiNote] = useState('')
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)

  const q = QUESTIONS[step]
  const question = typeof q.ask === 'function' ? q.ask(answers) : q.ask

  // Focus the primary input as soon as the step renders (no typewriter wait).
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 60)
    return () => clearTimeout(t)
  }, [step])

  function setField<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers((prev) => ({ ...prev, [key]: value }))
  }

  function canAdvance() {
    if (q.optional) return true
    if (q.id === 'review' || q.id === 'preferences') return true
    const id = q.id as keyof Answers
    const val = answers[id]
    if (Array.isArray(val)) return val.length > 0
    return String(val).trim().length > 0
  }

  async function advance() {
    if (!canAdvance() || ueiLoading) return
    setError('')

    // Leaving the UEI step with a plausible UEI → pull the official SAM.gov
    // registration and prefill everything we can before the next question.
    if (q.id === 'uei' && /^([a-zA-Z0-9]{12}|[a-zA-Z0-9]{5})$/.test(answers.uei.trim())) {
      setUeiLoading(true)
      setUeiNote('')
      try {
        const res = await fetch(`/api/profile/uei-lookup?uei=${encodeURIComponent(answers.uei.trim())}`)
        const data = await res.json()
        if (res.ok && data.found) {
          const p = data.profile
          const mappedTypes: string[] = (p.certifications ?? []).map((c: string) =>
            c === '8(a)' ? '8(a) Certified' : c
          )
          setAnswers(prev => ({
            ...prev,
            uei: prev.uei.trim().toUpperCase(),
            companyName: prev.companyName || p.companyName || '',
            naicsCodes: Array.from(new Set([...prev.naicsCodes, ...(p.naicsCodes ?? [])])),
            businessTypes: Array.from(new Set([...prev.businessTypes, ...mappedTypes])),
          }))
          setUeiNote(`Pulled ${p.companyName ?? 'your registration'} — ${(p.naicsCodes ?? []).length} NAICS codes, ${mappedTypes.length} set-aside types.`)
        } else {
          setUeiNote(data.error ?? 'Lookup failed — no problem, we\'ll fill it in manually.')
        }
      } catch {
        setUeiNote('Lookup failed — no problem, we\'ll fill it in manually.')
      } finally {
        setUeiLoading(false)
      }
    }

    if (step < QUESTIONS.length - 1) setStep((s) => s + 1)
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: answers.companyName,
          website: answers.website.trim() ? answers.website.trim() : null,
          yearFounded: /^\d{4}$/.test(answers.yearFounded.trim()) ? parseInt(answers.yearFounded.trim(), 10) : null,
          uei: answers.uei || null,
          businessTypes: answers.businessTypes,
          naicsCodes: answers.naicsCodes,
          contractSizePrefs: answers.contractSizePref === 'Any' ? ['Any'] : [answers.contractSizePref],
          contractTypePrefs: answers.contractTypePrefs,
          geoPrefs: answers.geoPrefs,
          certifications: answers.certifications,
          contractVehicles: answers.contractVehicles,
          capabilityStatement: answers.capabilityStatement || null,
          pastPerformance: answers.pastPerformance || null,
          annualRevenue: answers.annualRevenue || null,
          orgSize: answers.orgSize || null,
          agencyHistory: answers.agencyHistory,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong'); return }
      // Persist the onboarding preference choices (best-effort — never block
      // the redirect on it; the migration-safe endpoint won't throw).
      try {
        await fetch('/api/preferences', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            feedEligibleOnly: prefs.feedEligibleOnly,
            feedDensity: prefs.feedDensity,
            notifyDigest: prefs.notifyDigest,
            notifyDeadlines: prefs.notifyDeadlines,
          }),
        })
      } catch { /* non-blocking */ }
      try { localStorage.setItem('ir-welcome', '1') } catch { /* private mode */ }
      router.push('/dashboard')
    } catch {
      setError('Failed to save profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filteredNaics = NAICS_OPTIONS.filter((n) =>
    !answers.naicsSearch ||
    n.label.toLowerCase().includes(answers.naicsSearch.toLowerCase()) ||
    n.code.includes(answers.naicsSearch)
  )

  const progress = step / (QUESTIONS.length - 1)
  const inputBase: React.CSSProperties = {
    width: '100%', padding: '15px 17px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff', fontFamily: sans, outline: 'none', borderRadius: 8, boxSizing: 'border-box', transition: 'border-color 0.15s, box-shadow 0.15s',
  }

  return (
    <div style={{ minHeight: '100vh', background: surface, color: '#fff', fontFamily: mono, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <MetatronBackdrop pulse />

      {/* Top bar */}
      <div style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'relative', zIndex: 2 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <span style={{ color: crimson, fontSize: 18, fontWeight: 700 }}>ᛁ</span>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: '0.12em' }}>IR</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 180, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress * 100}%`, background: crimson, borderRadius: 2, transition: 'width 0.5s cubic-bezier(0.22,1,0.36,1)' }} />
          </div>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.14em', fontFamily: mono }}>{String(step + 1).padStart(2, '0')} / {String(QUESTIONS.length).padStart(2, '0')}</span>
        </div>
      </div>

      {/* Step area */}
      <div style={{ flex: 1, width: '100%', maxWidth: 720, margin: '0 auto', padding: '64px 24px 48px', position: 'relative', zIndex: 1 }}>
        {/* Keyed by step → the whole block re-animates on advance (no typewriter) */}
        <div key={step} className="ir-onb-step">
          {/* Kicker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18 }}>
            <MetatronEyeIcon size={20} />
            <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.2em', color: crimson }}>STEP {String(step + 1).padStart(2, '0')} · {q.section}</span>
          </div>

          {/* Headline */}
          <h1 style={{ fontSize: 'clamp(27px, 4.2vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, margin: 0, fontFamily: sans, color: '#fff' }}>
            {question}
          </h1>

          {/* Hint */}
          {q.hint && (
            <p style={{ marginTop: 16, fontSize: 14, color: 'rgba(255,255,255,0.42)', fontFamily: sans, lineHeight: 1.65, maxWidth: 620 }}>
              {q.hint}
            </p>
          )}

          {/* Inputs */}
          <div style={{ marginTop: 30 }}>
            {q.type === 'text' && (
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                className="ir-onb-input" type="text"
                value={answers[q.id as keyof Answers] as string}
                onChange={(e) => setField(q.id as keyof Answers, e.target.value as never)}
                onKeyDown={(e) => e.key === 'Enter' && advance()}
                placeholder="Type your answer…"
                style={{ ...inputBase, fontSize: 16 }}
              />
            )}

            {q.type === 'textarea' && (
              <textarea
                ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                className="ir-onb-input"
                value={answers[q.id as keyof Answers] as string}
                onChange={(e) => setField(q.id as keyof Answers, e.target.value as never)}
                placeholder="Type your answer…" rows={4}
                style={{ ...inputBase, fontSize: 15, resize: 'vertical', lineHeight: 1.6 }}
              />
            )}

            {q.type === 'chips' && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
                {q.id === 'businessTypes' && BUSINESS_TYPES.map((bt) => (
                  <Chip key={bt} label={bt} selected={answers.businessTypes.includes(bt)} onClick={() => setField('businessTypes', toggle(answers.businessTypes, bt))} />
                ))}
                {q.id === 'agencyHistory' && AGENCIES.map((a) => (
                  <Chip key={a} label={a} selected={answers.agencyHistory.includes(a)} onClick={() => setField('agencyHistory', toggle(answers.agencyHistory, a))} />
                ))}
                {q.id === 'contractVehicles' && CONTRACT_VEHICLES.map((v) => (
                  <Chip key={v} label={v} selected={answers.contractVehicles.includes(v)} onClick={() => setField('contractVehicles', toggle(answers.contractVehicles, v))} />
                ))}
                {q.id === 'certifications' && CERTIFICATIONS.map((c) => (
                  <Chip key={c} label={c} selected={answers.certifications.includes(c)} onClick={() => setField('certifications', toggle(answers.certifications, c))} />
                ))}
                {q.id === 'contractTypePrefs' && CONTRACT_TYPES.map((t) => (
                  <Chip key={t} label={t} selected={answers.contractTypePrefs.includes(t)} onClick={() => setField('contractTypePrefs', toggle(answers.contractTypePrefs, t))} />
                ))}
                {q.id === 'geoPrefs' && GEO_OPTIONS.map((g) => (
                  <Chip key={g} label={g} selected={answers.geoPrefs.includes(g)} onClick={() => setField('geoPrefs', toggle(answers.geoPrefs, g))} />
                ))}
              </div>
            )}

            {q.type === 'chips-search' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input
                  ref={inputRef as React.RefObject<HTMLInputElement>}
                  className="ir-onb-input" type="text"
                  value={answers.naicsSearch}
                  onChange={(e) => setField('naicsSearch', e.target.value)}
                  placeholder="Search NAICS codes or descriptions…"
                  style={{ ...inputBase, fontSize: 14 }}
                />
                {answers.naicsCodes.length > 0 && (
                  <div style={{ fontSize: 10, color: '#f87171', letterSpacing: '0.08em', fontFamily: mono }}>{answers.naicsCodes.length} SELECTED: {answers.naicsCodes.join(', ')}</div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, maxHeight: 260, overflowY: 'auto', paddingRight: 4 }}>
                  {filteredNaics.map(({ code, label }) => (
                    <Chip key={code} label={`${code} — ${label}`} selected={answers.naicsCodes.includes(code)} onClick={() => setField('naicsCodes', toggle(answers.naicsCodes, code))} />
                  ))}
                </div>
              </div>
            )}

            {q.type === 'radio' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 460 }}>
                {q.id === 'annualRevenue' && REVENUE_RANGES.map((r) => (
                  <Radio key={r} label={r} selected={answers.annualRevenue === r} onClick={() => setField('annualRevenue', r)} />
                ))}
                {q.id === 'orgSize' && ORG_SIZES.map((s) => (
                  <Radio key={s} label={s} selected={answers.orgSize === s} onClick={() => setField('orgSize', s)} />
                ))}
                {q.id === 'contractSizePref' && CONTRACT_SIZES.map((s) => (
                  <Radio key={s} label={s} selected={answers.contractSizePref === s} onClick={() => setField('contractSizePref', s)} />
                ))}
              </div>
            )}

            {q.type === 'preferences' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 560 }}>
                <DarkToggleRow title="Only show contracts I can prime" desc="Hide set-asides your certifications don't qualify you to bid as prime." on={prefs.feedEligibleOnly} onClick={() => setPrefs((p) => ({ ...p, feedEligibleOnly: !p.feedEligibleOnly }))} />
                <DarkToggleRow title="Email me a daily match digest" desc="A morning email with the newest contracts scored against your profile." on={prefs.notifyDigest} onClick={() => setPrefs((p) => ({ ...p, notifyDigest: !p.notifyDigest }))} />
                <DarkToggleRow title="Deadline reminders" desc="A nudge 3 days before a saved contract's response deadline." on={prefs.notifyDeadlines} onClick={() => setPrefs((p) => ({ ...p, notifyDeadlines: !p.notifyDeadlines }))} />
                <div style={{ padding: '16px 18px', border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.02)', borderRadius: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', fontFamily: sans, marginBottom: 3 }}>Feed density</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: sans, lineHeight: 1.5, marginBottom: 12 }}>Comfortable is roomy and readable; compact fits more on screen.</div>
                  <div style={{ display: 'inline-flex', gap: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 3 }}>
                    {(['comfortable', 'compact'] as const).map((d) => (
                      <button key={d} type="button" onClick={() => setPrefs((p) => ({ ...p, feedDensity: d }))}
                        style={{ padding: '8px 16px', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, border: 'none', borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s', background: prefs.feedDensity === d ? crimson : 'transparent', color: prefs.feedDensity === d ? '#fff' : 'rgba(255,255,255,0.45)' }}>
                        {d.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {q.type === 'review' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 11 }}>
                  {[
                    { label: 'COMPANY', value: answers.companyName || '—' },
                    { label: 'CAPABILITIES', value: answers.capabilityStatement ? answers.capabilityStatement.slice(0, 100) + (answers.capabilityStatement.length > 100 ? '…' : '') : '—' },
                    { label: 'BUSINESS TYPE', value: answers.businessTypes.join(', ') || '—' },
                    { label: 'NAICS CODES', value: `${answers.naicsCodes.length} selected` },
                    { label: 'AGENCY HISTORY', value: answers.agencyHistory.length ? `${answers.agencyHistory.length} agencies` : '—' },
                    { label: 'REVENUE', value: answers.annualRevenue || '—' },
                    { label: 'EMPLOYEES', value: answers.orgSize || '—' },
                    { label: 'CONTRACT VEHICLES', value: answers.contractVehicles.length ? `${answers.contractVehicles.length} vehicles` : '—' },
                    { label: 'GEOGRAPHY', value: answers.geoPrefs.join(', ') || '—' },
                    { label: 'FEED', value: `${prefs.feedEligibleOnly ? 'Primeable only' : 'All contracts'} · ${prefs.feedDensity}` },
                    { label: 'EMAILS', value: [prefs.notifyDigest && 'Daily digest', prefs.notifyDeadlines && 'Deadline alerts'].filter(Boolean).join(', ') || 'Off' },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: 9, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', flexShrink: 0, fontFamily: mono, marginTop: 2 }}>{label}</span>
                      <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.75)', textAlign: 'right', fontFamily: sans }}>{value}</span>
                    </div>
                  ))}
                </div>
                {error && <div style={{ padding: '11px 14px', background: 'rgba(196,18,48,0.1)', border: '1px solid rgba(196,18,48,0.3)', color: '#f87171', fontSize: 12, borderRadius: 8, fontFamily: sans }}>{error}</div>}
              </div>
            )}
          </div>

          {/* Nav */}
          <div style={{ display: 'flex', gap: 10, marginTop: 28, alignItems: 'center', flexWrap: 'wrap' }}>
            {step > 0 && (
              <button onClick={() => setStep((s) => s - 1)}
                style={{ padding: '13px 22px', fontSize: 10, letterSpacing: '0.1em', fontWeight: 700, background: 'transparent', border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontFamily: mono, borderRadius: 8 }}>
                ← {q.type === 'review' ? 'EDIT' : 'BACK'}
              </button>
            )}
            {q.type === 'review' ? (
              <button onClick={handleSubmit} disabled={loading}
                style={{ flex: 1, minWidth: 220, padding: '14px 28px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', background: crimson, color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontFamily: mono, borderRadius: 8 }}>
                {loading ? 'SETTING UP YOUR PROFILE…' : 'FIND MY CONTRACTS →'}
              </button>
            ) : (
              <button onClick={advance} disabled={!canAdvance() || ueiLoading}
                style={{ padding: '13px 28px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', background: canAdvance() && !ueiLoading ? crimson : 'rgba(255,255,255,0.06)', color: canAdvance() && !ueiLoading ? '#fff' : 'rgba(255,255,255,0.25)', border: 'none', cursor: canAdvance() && !ueiLoading ? 'pointer' : 'not-allowed', fontFamily: mono, transition: 'all 0.15s', borderRadius: 8 }}>
                {ueiLoading ? 'PULLING SAM.GOV REGISTRATION…' : q.optional && !String(answers[q.id as keyof Answers] ?? '').length ? 'SKIP →' : 'CONTINUE →'}
              </button>
            )}
          </div>

          {ueiNote && (
            <div style={{ marginTop: 14, fontSize: 12.5, color: '#4ADE80', fontFamily: sans, lineHeight: 1.5, animation: 'onbFade 0.3s ease' }}>
              {ueiNote}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes onbFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes onbStepIn { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: translateY(0) } }
        .ir-onb-step { animation: onbStepIn 0.42s cubic-bezier(0.22,1,0.36,1) both; }
        .ir-onb-input:focus { border-color: rgba(196,18,48,0.55) !important; box-shadow: 0 0 0 3px rgba(196,18,48,0.14) !important; }
        .ir-onb-chip:hover { border-color: rgba(255,255,255,0.28) !important; }
        .ir-onb-radio:hover { border-color: rgba(255,255,255,0.2) !important; }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.28); }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 2px; }
      `}</style>
    </div>
  )
}
