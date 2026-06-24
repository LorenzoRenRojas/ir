'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
  companyName: '', capabilityStatement: '', businessTypes: [],
  naicsSearch: '', naicsCodes: [], agencyHistory: [],
  annualRevenue: '', orgSize: '', contractVehicles: [],
  certifications: [], contractSizePref: 'Any', contractTypePrefs: [],
  geoPrefs: [], pastPerformance: '', uei: '',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toggle<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]
}

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: '6px 12px', fontSize: 11,
      border: selected ? '1px solid rgba(196,18,48,0.5)' : '1px solid rgba(255,255,255,0.12)',
      background: selected ? 'rgba(196,18,48,0.12)' : 'rgba(255,255,255,0.04)',
      color: selected ? '#f87171' : 'rgba(255,255,255,0.55)',
      cursor: 'pointer', fontFamily: 'var(--font-geist-mono, monospace)',
      letterSpacing: '0.04em', transition: 'all 0.15s', borderRadius: 2,
    }}>
      {selected ? '✓ ' : ''}{label}
    </button>
  )
}

function Radio({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 12px', border: selected ? '1px solid rgba(196,18,48,0.4)' : '1px solid rgba(255,255,255,0.08)', background: selected ? 'rgba(196,18,48,0.08)' : 'transparent', transition: 'all 0.15s', borderRadius: 2 }}>
      <div style={{ width: 12, height: 12, borderRadius: '50%', border: selected ? '2px solid #C41230' : '2px solid rgba(255,255,255,0.2)', background: selected ? '#C41230' : 'transparent', flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: selected ? '#f87171' : 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>{label}</span>
    </div>
  )
}

// ── Typewriter hook ───────────────────────────────────────────────────────────

function useTypewriter(text: string, speed = 18) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    setDisplayed('')
    setDone(false)
    if (!text) return
    let i = 0
    const interval = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) { clearInterval(interval); setDone(true) }
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed])

  return { displayed, done }
}

// ── Question definitions ──────────────────────────────────────────────────────

type Question = {
  id: keyof Answers | 'review'
  ask: string | ((a: Answers) => string)
  type: 'text' | 'textarea' | 'chips' | 'radio' | 'chips-search' | 'review'
  hint?: string
  optional?: boolean
}

const QUESTIONS: Question[] = [
  {
    id: 'companyName',
    ask: "Welcome to IR. What's your company name?",
    type: 'text',
    hint: 'Legal name or DBA is fine.',
  },
  {
    id: 'capabilityStatement',
    ask: (a) => `Got it — ${a.companyName}. In 1–2 sentences, what does your company actually do? Be specific — this is the most important field for your match quality.`,
    type: 'textarea',
    hint: 'E.g. "We deliver zero-trust architecture and cloud migration for civilian federal agencies, specializing in AWS GovCloud deployments."',
  },
  {
    id: 'businessTypes',
    ask: 'What type of business is it? Select all that apply.',
    type: 'chips',
    hint: 'These determine which set-aside contracts you\'re eligible for.',
  },
  {
    id: 'naicsCodes',
    ask: 'Which NAICS codes cover your work? Search and select all that apply.',
    type: 'chips-search',
    hint: 'NAICS codes are how the government categorizes contract work.',
  },
  {
    id: 'agencyHistory',
    ask: 'Which federal agencies have you worked with before?',
    type: 'chips',
    optional: true,
    hint: 'Prior relationships are a major win factor. Select all that apply.',
  },
  {
    id: 'annualRevenue',
    ask: "What's your annual revenue range?",
    type: 'radio',
    hint: 'Used to calculate which contract sizes are realistic for you to win.',
  },
  {
    id: 'orgSize',
    ask: 'How many employees does your company have?',
    type: 'radio',
  },
  {
    id: 'contractVehicles',
    ask: 'Do you hold any contract vehicles or IDIQ vehicles?',
    type: 'chips',
    optional: true,
    hint: 'Many large contracts require these. Leave blank if none.',
  },
  {
    id: 'certifications',
    ask: 'Any certifications or security clearances?',
    type: 'chips',
    optional: true,
  },
  {
    id: 'contractSizePref',
    ask: 'What size contracts do you typically pursue?',
    type: 'radio',
  },
  {
    id: 'contractTypePrefs',
    ask: 'What type of work do you prefer?',
    type: 'chips',
  },
  {
    id: 'geoPrefs',
    ask: 'Where do you work?',
    type: 'chips',
  },
  {
    id: 'pastPerformance',
    ask: "Almost done. Describe your best past performance — agency, contract size, and what you delivered. This trains your match engine.",
    type: 'textarea',
    optional: true,
    hint: 'E.g. "Delivered $2.1M cybersecurity assessment for DHS, covering 14 field offices. Zero findings at final audit."',
  },
  {
    id: 'uei',
    ask: "Last one — your UEI number from SAM.gov. We use this to verify your registrations.",
    type: 'text',
    optional: true,
    hint: '12-character Unique Entity Identifier. Skip if you don\'t have one yet.',
  },
  {
    id: 'review',
    ask: (a) => `Perfect. Here's your IR profile, ${a.companyName}. Ready to find your first match?`,
    type: 'review',
  },
]

// ── Metatron's Cube avatar ────────────────────────────────────────────────────

function MetatronCube() {
  const C = 32   // center of 64×64 canvas
  const rOrbit = 20  // satellite orbit radius
  const rBound = 28  // outer bounding circle
  const rInner = 11  // inner circle

  // 6 fruit-of-life satellite positions
  const hex = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6
    return { x: C + rOrbit * Math.cos(a), y: C + rOrbit * Math.sin(a) }
  })

  // All connecting lines: center→each point, and every point pair
  const lines: { x1: number; y1: number; x2: number; y2: number }[] = []
  hex.forEach((p) => lines.push({ x1: C, y1: C, x2: p.x, y2: p.y }))
  for (let i = 0; i < 6; i++) {
    for (let j = i + 1; j < 6; j++) {
      lines.push({ x1: hex[i].x, y1: hex[i].y, x2: hex[j].x, y2: hex[j].y })
    }
  }

  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}>
      {/* Glow filter */}
      <defs>
        <filter id="redGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Outer geometry — collapses inward */}
      <g className="m-outer" style={{ transformOrigin: '32px 32px', transformBox: 'fill-box' }} filter="url(#redGlow)">
        <circle cx={C} cy={C} r={rBound} stroke="#C41230" strokeWidth="0.6" strokeOpacity="0.45" fill="none" />
        <circle cx={C} cy={C} r={rInner} stroke="#C41230" strokeWidth="0.6" strokeOpacity="0.5" fill="none" />
        <circle cx={C} cy={C} r="2" fill="#C41230" />
        {hex.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" stroke="#C41230" strokeWidth="0.5" strokeOpacity="0.55" fill="rgba(196,18,48,0.1)" />
        ))}
        {lines.map((l, i) => (
          <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke="#C41230" strokeWidth={i < 6 ? 0.7 : 0.3}
            strokeOpacity={i < 6 ? 0.85 : 0.3} />
        ))}
      </g>

      {/* Inner layer — expands when outer collapses, rotated 30° */}
      <g className="m-inner" style={{ transformOrigin: '32px 32px', transformBox: 'fill-box' }} filter="url(#redGlow)">
        {Array.from({ length: 6 }, (_, i) => {
          const a = (Math.PI / 3) * i + Math.PI / 6
          const x = C + (rOrbit * 0.52) * Math.cos(a)
          const y = C + (rOrbit * 0.52) * Math.sin(a)
          return <circle key={i} cx={x} cy={y} r="2.2" stroke="#ff2244" strokeWidth="0.5" fill="rgba(255,34,68,0.15)" />
        })}
        {Array.from({ length: 6 }, (_, i) => {
          const a = (Math.PI / 3) * i + Math.PI / 6
          const x = C + (rOrbit * 0.52) * Math.cos(a)
          const y = C + (rOrbit * 0.52) * Math.sin(a)
          return <line key={i} x1={C} y1={C} x2={x} y2={y} stroke="#ff2244" strokeWidth="0.5" strokeOpacity="0.7" />
        })}
        <circle cx={C} cy={C} r="6" stroke="#ff2244" strokeWidth="0.5" strokeOpacity="0.5" fill="none" />
      </g>
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Answers>(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)

  const q = QUESTIONS[step]
  const question = typeof q.ask === 'function' ? q.ask(answers) : q.ask
  const { displayed, done } = useTypewriter(question)

  useEffect(() => {
    if (done && inputRef.current) inputRef.current.focus()
  }, [done, step])

  function setField<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers((prev) => ({ ...prev, [key]: value }))
  }

  function canAdvance() {
    if (q.optional) return true
    if (q.id === 'review') return true
    const id = q.id as keyof Answers
    const val = answers[id]
    if (Array.isArray(val)) return val.length > 0
    return String(val).trim().length > 0
  }

  function advance() {
    if (!canAdvance()) return
    setError('')
    if (step < QUESTIONS.length - 1) {
      setStep((s) => s + 1)
    }
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

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#ffffff', fontFamily: 'var(--font-geist-mono, monospace)', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <span style={{ color: '#C41230', fontSize: 18, fontWeight: 700 }}>ᛁ</span>
          <span style={{ color: '#ffffff', fontSize: 13, fontWeight: 700, letterSpacing: '0.12em' }}>IR</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 160, height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 1 }}>
            <div style={{ height: '100%', width: `${progress * 100}%`, background: '#C41230', borderRadius: 1, transition: 'width 0.4s ease' }} />
          </div>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}>{step + 1} / {QUESTIONS.length}</span>
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 680, width: '100%', margin: '0 auto', padding: '48px 24px 32px' }}>

        {/* Metatron message */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 32, animation: 'fadeIn 0.3s ease' }}>
          <div style={{ width: 64, height: 64, flexShrink: 0, marginTop: 0 }}>
            <MetatronCube />
          </div>
          <div style={{ flex: 1 }}>
            <div className="matrix-font" style={{ fontSize: 16, color: '#e0e0e0', lineHeight: 1.7, minHeight: 28, letterSpacing: '0.02em' }}>
              {displayed}
              {!done && <span style={{ opacity: 0.5, animation: 'blink 1s step-end infinite' }}>|</span>}
            </div>
            {q.hint && done && (
              <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-geist-sans, sans-serif)', lineHeight: 1.5 }}>
                {q.hint}
              </div>
            )}
          </div>
        </div>

        {/* Input area */}
        {done && q.type !== 'review' && (
          <div style={{ marginLeft: 44, animation: 'fadeSlideUp 0.25s ease' }}>

            {/* Text input */}
            {q.type === 'text' && (
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                type="text"
                value={answers[q.id as keyof Answers] as string}
                onChange={(e) => setField(q.id as keyof Answers, e.target.value as never)}
                onKeyDown={(e) => e.key === 'Enter' && advance()}
                placeholder="Type your answer…"
                style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#ffffff', fontSize: 15, fontFamily: 'var(--font-geist-sans, sans-serif)', outline: 'none', borderRadius: 4, boxSizing: 'border-box' }}
              />
            )}

            {/* Textarea */}
            {q.type === 'textarea' && (
              <textarea
                ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                value={answers[q.id as keyof Answers] as string}
                onChange={(e) => setField(q.id as keyof Answers, e.target.value as never)}
                placeholder="Type your answer…"
                rows={4}
                style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#ffffff', fontSize: 14, fontFamily: 'var(--font-geist-sans, sans-serif)', outline: 'none', borderRadius: 4, resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 }}
              />
            )}

            {/* Chips */}
            {q.type === 'chips' && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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

            {/* NAICS searchable chips */}
            {q.type === 'chips-search' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  type="text"
                  value={answers.naicsSearch}
                  onChange={(e) => setField('naicsSearch', e.target.value)}
                  placeholder="Search NAICS codes or descriptions…"
                  style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#ffffff', fontSize: 13, fontFamily: 'var(--font-geist-sans, sans-serif)', outline: 'none', borderRadius: 4, boxSizing: 'border-box' }}
                />
                {answers.naicsCodes.length > 0 && (
                  <div style={{ fontSize: 9, color: '#f87171', letterSpacing: '0.1em' }}>{answers.naicsCodes.length} SELECTED: {answers.naicsCodes.join(', ')}</div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
                  {filteredNaics.map(({ code, label }) => (
                    <Chip key={code} label={`${code} — ${label}`} selected={answers.naicsCodes.includes(code)} onClick={() => setField('naicsCodes', toggle(answers.naicsCodes, code))} />
                  ))}
                </div>
              </div>
            )}

            {/* Radio */}
            {q.type === 'radio' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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

            {/* Nav buttons */}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              {step > 0 && (
                <button onClick={() => setStep((s) => s - 1)} style={{ padding: '10px 18px', fontSize: 10, letterSpacing: '0.1em', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontFamily: 'var(--font-geist-mono, monospace)' }}>
                  ← BACK
                </button>
              )}
              <button
                onClick={advance}
                disabled={!canAdvance()}
                style={{ padding: '10px 24px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', background: canAdvance() ? '#C41230' : 'rgba(255,255,255,0.06)', color: canAdvance() ? '#ffffff' : 'rgba(255,255,255,0.2)', border: 'none', cursor: canAdvance() ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-geist-mono, monospace)', transition: 'all 0.15s' }}
              >
                {q.optional && !String(answers[q.id as keyof Answers] ?? '').length ? 'SKIP →' : 'CONTINUE →'}
              </button>
            </div>
          </div>
        )}

        {/* Review step */}
        {done && q.type === 'review' && (
          <div style={{ marginLeft: 44, animation: 'fadeSlideUp 0.25s ease', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'COMPANY', value: answers.companyName },
                { label: 'CAPABILITIES', value: answers.capabilityStatement ? answers.capabilityStatement.slice(0, 100) + (answers.capabilityStatement.length > 100 ? '…' : '') : '—' },
                { label: 'BUSINESS TYPE', value: answers.businessTypes.join(', ') || '—' },
                { label: 'NAICS CODES', value: `${answers.naicsCodes.length} selected` },
                { label: 'AGENCY HISTORY', value: answers.agencyHistory.length ? `${answers.agencyHistory.length} agencies` : '—' },
                { label: 'REVENUE', value: answers.annualRevenue || '—' },
                { label: 'EMPLOYEES', value: answers.orgSize || '—' },
                { label: 'CONTRACT VEHICLES', value: answers.contractVehicles.length ? `${answers.contractVehicles.length} vehicles` : '—' },
                { label: 'GEOGRAPHY', value: answers.geoPrefs.join(', ') || '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>{label}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', textAlign: 'right', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>{value}</span>
                </div>
              ))}
            </div>

            {error && (
              <div style={{ padding: '10px 12px', background: 'rgba(196,18,48,0.1)', border: '1px solid rgba(196,18,48,0.3)', color: '#f87171', fontSize: 11 }}>{error}</div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep((s) => s - 1)} style={{ padding: '12px 20px', fontSize: 10, letterSpacing: '0.1em', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontFamily: 'var(--font-geist-mono, monospace)' }}>
                ← EDIT
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{ flex: 1, padding: '12px 24px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', background: '#C41230', color: '#ffffff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontFamily: 'var(--font-geist-mono, monospace)' }}
              >
                {loading ? 'SETTING UP YOUR PROFILE…' : 'FIND MY CONTRACTS →'}
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');

        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes blink { 0%, 100% { opacity: 1 } 50% { opacity: 0 } }

        /* Outer collapses to center, then expands back */
        @keyframes outerFold {
          0%, 100% { transform: scale(1);    opacity: 1; }
          40%       { transform: scale(0.08); opacity: 0; }
          60%       { transform: scale(0.08); opacity: 0; }
        }
        /* Inner expands briefly while outer is collapsed */
        @keyframes innerReveal {
          0%, 30%   { transform: scale(0) rotate(0deg);    opacity: 0; }
          50%        { transform: scale(1) rotate(30deg);   opacity: 1; }
          70%, 100% { transform: scale(0) rotate(60deg);   opacity: 0; }
        }

        .m-outer { animation: outerFold 5s ease-in-out infinite; }
        .m-inner { animation: innerReveal 5s ease-in-out infinite; }

        .matrix-font { font-family: 'Share Tech Mono', 'Courier New', monospace !important; }

        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.2); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>
    </div>
  )
}
