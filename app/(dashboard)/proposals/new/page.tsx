'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { FullProposalQuestionnaire } from '@/lib/documents'

const STORAGE_KEY = 'ir-proposal-draft'

const STEPS = [
  { id: 1, label: 'THE OPPORTUNITY' },
  { id: 2, label: 'TECHNICAL APPROACH' },
  { id: 3, label: 'YOUR TEAM' },
  { id: 4, label: 'PAST PERFORMANCE' },
  { id: 5, label: 'PRICING' },
  { id: 6, label: 'REVIEW' },
]

const CONTRACT_TYPES = ['Firm Fixed Price (FFP)', 'Time & Materials (T&M)', 'Cost Plus Fixed Fee (CPFF)', 'Indefinite Delivery / Indefinite Quantity (IDIQ)', 'Other Transaction Authority (OTA)']
const RISK_LEVELS = ['Low', 'Medium', 'High']

function blank(): FullProposalQuestionnaire {
  return {
    contractTitle: '', agencyName: '', solicitationNumber: '', issuingOffice: '',
    responseDeadline: '', estimatedValue: '', contractType: '', naicsCode: '',
    placeOfPerformance: '', requirementSummary: '', keyObjectives: '',
    overallApproach: '',
    phase1: { name: '', timeline: '', deliverables: '', approach: '' },
    phase2: { name: '', timeline: '', deliverables: '', approach: '' },
    phase3: { name: '', timeline: '', deliverables: '', approach: '' },
    toolsTechnologies: '', qualityApproach: '',
    risks: [
      { description: '', likelihood: 'Medium', impact: 'Medium', mitigation: '' },
      { description: '', likelihood: 'Medium', impact: 'Medium', mitigation: '' },
    ],
    pm: { name: '', title: '', clearance: '', experience: '', quals: '' },
    techLead: { name: '', title: '', clearance: '', experience: '', quals: '' },
    additionalPersonnel: '', subName: '', subRole: '', subPercent: '', primePercent: '100',
    pp: [
      { title: '', agency: '', contractNumber: '', contractType: '', value: '', startDate: '', endDate: '', description: '', relevance: '', outcomes: '', refName: '', refTitle: '', refPhone: '', refEmail: '' },
      { title: '', agency: '', contractNumber: '', contractType: '', value: '', startDate: '', endDate: '', description: '', relevance: '', outcomes: '', refName: '', refTitle: '', refPhone: '', refEmail: '' },
      { title: '', agency: '', contractNumber: '', contractType: '', value: '', startDate: '', endDate: '', description: '', relevance: '', outcomes: '', refName: '', refTitle: '', refPhone: '', refEmail: '' },
    ],
    baseYear: '', oy1: '', oy2: '', oy3: '', oy4: '', totalPrice: '', amendments: '',
  }
}

const input: React.CSSProperties = {
  width: '100%', padding: '10px 12px', background: '#F8F8F7',
  border: '1px solid rgba(0,0,0,0.1)', color: '#0A0A0A', fontSize: 13,
  fontFamily: 'var(--font-geist-sans, sans-serif)', outline: 'none', boxSizing: 'border-box',
}
const textarea: React.CSSProperties = { ...input, resize: 'vertical' as const, minHeight: 90, lineHeight: 1.6 }
const label: React.CSSProperties = {
  display: 'block', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
  color: 'rgba(0,0,0,0.35)', marginBottom: 8, fontFamily: 'var(--font-geist-mono, monospace)',
}
const select: React.CSSProperties = { ...input, cursor: 'pointer' }

function Field({ lbl, req, children }: { lbl: string; req?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={label}>{lbl}{req && <span style={{ color: '#C41230', marginLeft: 4 }}>*</span>}</label>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.25)', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid rgba(0,0,0,0.07)', fontFamily: 'var(--font-geist-mono, monospace)' }}>
      {children}
    </div>
  )
}

export default function NewProposalPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [q, setQ] = useState<FullProposalQuestionnaire>(blank)
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState<{ id: string; content: string; mode?: 'ai' | 'template' } | null>(null)
  const [error, setError] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailResult, setEmailResult] = useState<{ sent: number; total: number } | null>(null)

  // Persist draft
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return
    try {
      const parsed = JSON.parse(saved)
      if (!parsed || typeof parsed !== 'object') return
      // Merge over a fresh blank so a draft saved under an OLDER schema (missing
      // risks/pp/phaseN) can't crash the step renderers (.map/.split on
      // undefined). Nested objects/arrays fall back to blank when absent.
      const base = blank()
      const merged: FullProposalQuestionnaire = { ...base, ...parsed }
      merged.phase1 = { ...base.phase1, ...(parsed.phase1 ?? {}) }
      merged.phase2 = { ...base.phase2, ...(parsed.phase2 ?? {}) }
      merged.phase3 = { ...base.phase3, ...(parsed.phase3 ?? {}) }
      merged.pm = { ...base.pm, ...(parsed.pm ?? {}) }
      merged.techLead = { ...base.techLead, ...(parsed.techLead ?? {}) }
      merged.risks = Array.isArray(parsed.risks) && parsed.risks.length ? parsed.risks : base.risks
      merged.pp = Array.isArray(parsed.pp) && parsed.pp.length ? parsed.pp : base.pp
      setQ(merged)
    } catch { /* corrupt draft — keep the blank form */ }
  }, [])
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(q))
  }, [q])

  function set(path: string, val: string) {
    setQ((prev) => {
      const next = { ...prev }
      const parts = path.split('.')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let cur: any = next
      for (let i = 0; i < parts.length - 1; i++) {
        if (/^\d+$/.test(parts[i + 1])) {
          cur[parts[i]] = Array.isArray(cur[parts[i]]) ? [...cur[parts[i]]] : cur[parts[i]]
        } else {
          cur[parts[i]] = { ...cur[parts[i]] }
        }
        cur = cur[parts[i]]
      }
      cur[parts[parts.length - 1]] = val
      return next
    })
  }

  function setArrayItem(arr: string, idx: number, field: string, val: string) {
    setQ((prev) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const copy = [...(prev as any)[arr]]
      copy[idx] = { ...copy[idx], [field]: val }
      return { ...prev, [arr]: copy }
    })
  }

  async function handleGenerate() {
    setGenerating(true)
    setError('')
    try {
      const res = await fetch('/api/proposals/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(q),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Generation failed'); return }
      setGenerated({ id: data.document.id, content: data.content, mode: data.mode })
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleEmail() {
    if (!generated) return
    setEmailSending(true)
    try {
      const res = await fetch('/api/proposals/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: generated.id }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to send'); return }
      setEmailResult({ sent: data.sent, total: data.total })
    } catch {
      setError('Failed to send emails.')
    } finally {
      setEmailSending(false)
    }
  }

  function handleDownload() {
    if (!generated) return
    const blob = new Blob([generated.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `proposal-${q.contractTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Generated result view ─────────────────────────────────────────────────
  if (generated) {
    return (
      <div style={{ padding: '40px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 9, letterSpacing: '0.18em', color: 'rgba(0,0,0,0.25)', fontFamily: 'var(--font-geist-mono, monospace)' }}>PROPOSAL READY</span>
              {/* Honest badge: which engine drafted this. AI when the key is
                  live + funded; template otherwise. */}
              {generated.mode === 'ai' ? (
                <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', color: '#C41230', border: '1px solid rgba(196,18,48,0.35)', padding: '3px 7px', fontFamily: 'var(--font-geist-mono, monospace)' }}>✦ AI-DRAFTED</span>
              ) : (
                <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,0,0,0.15)', padding: '3px 7px', fontFamily: 'var(--font-geist-mono, monospace)' }}>TEMPLATE DRAFT</span>
              )}
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.02em', margin: 0, fontFamily: 'var(--font-geist-sans, sans-serif)' }}>{q.contractTitle}</h1>
            <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.35)', margin: '6px 0 0', fontFamily: 'var(--font-geist-mono, monospace)' }}>{q.agencyName}</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => router.push('/documents')}
              style={{ padding: '10px 16px', fontSize: 10, letterSpacing: '0.08em', background: 'transparent', border: '1px solid rgba(0,0,0,0.12)', color: 'rgba(0,0,0,0.45)', cursor: 'pointer', fontFamily: 'var(--font-geist-mono, monospace)' }}
            >
              VIEW ALL PROPOSALS
            </button>
            <button
              onClick={handleDownload}
              style={{ padding: '10px 18px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', background: 'transparent', border: '1px solid #0A0A0A', color: '#0A0A0A', cursor: 'pointer', fontFamily: 'var(--font-geist-mono, monospace)' }}
            >
              ↓ DOWNLOAD .TXT
            </button>
          </div>
        </div>

        {/* Email to team */}
        <div style={{ background: '#0A0A0A', padding: '24px 28px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#C41230', marginBottom: 6, fontFamily: 'var(--font-geist-mono, monospace)' }}>SHARE WITH YOUR ORGANIZATION</div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0, fontFamily: 'var(--font-geist-sans, sans-serif)', lineHeight: 1.5 }}>
              Email this proposal to all members of your team so they can review, annotate, and contribute their sections.
            </p>
            {emailResult && (
              <p style={{ fontSize: 11, color: '#4ADE80', margin: '8px 0 0', fontFamily: 'var(--font-geist-mono, monospace)' }}>
                ✓ Sent to {emailResult.sent} of {emailResult.total} team member{emailResult.total !== 1 ? 's' : ''}
              </p>
            )}
            {error && (
              <p style={{ fontSize: 11, color: '#ef4444', margin: '8px 0 0', fontFamily: 'var(--font-geist-mono, monospace)' }}>{error}</p>
            )}
          </div>
          <button
            onClick={handleEmail}
            disabled={emailSending || !!emailResult}
            style={{
              padding: '12px 24px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
              background: emailResult ? 'transparent' : '#C41230',
              color: emailResult ? '#4ADE80' : '#ffffff',
              border: emailResult ? '1px solid #4ADE80' : 'none',
              cursor: emailSending || emailResult ? 'not-allowed' : 'pointer',
              opacity: emailSending ? 0.6 : 1,
              fontFamily: 'var(--font-geist-mono, monospace)', flexShrink: 0,
            }}
          >
            {emailResult ? 'SENT ✓' : emailSending ? 'SENDING…' : 'EMAIL TO TEAM →'}
          </button>
        </div>

        {/* Preview */}
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)', fontSize: 9, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.3)', fontFamily: 'var(--font-geist-mono, monospace)' }}>
            PROPOSAL DOCUMENT — REVIEW ALL CONTENT BEFORE SUBMISSION
          </div>
          <pre style={{ padding: '24px', fontSize: 11, color: 'rgba(0,0,0,0.7)', whiteSpace: 'pre-wrap', lineHeight: 1.75, fontFamily: 'var(--font-geist-mono, monospace)', margin: 0, overflowX: 'auto' }}>
            {generated.content}
          </pre>
        </div>
      </div>
    )
  }

  // ── Questionnaire ──────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '40px', maxWidth: 780, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 9, letterSpacing: '0.18em', color: 'rgba(0,0,0,0.25)', marginBottom: 10, fontFamily: 'var(--font-geist-mono, monospace)' }}>PROPOSAL BUILDER</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.02em', margin: '0 0 8px', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>
          New Proposal Questionnaire
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)', margin: 0, fontFamily: 'var(--font-geist-sans, sans-serif)', lineHeight: 1.5 }}>
          Answer each section and we'll generate a complete, attorney-reviewable proposal. Your answers auto-save as you go.
        </p>
      </div>

      {/* Step progress */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 40, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
        {STEPS.map((s) => (
          <button
            key={s.id}
            onClick={() => step > s.id || step === s.id ? setStep(s.id) : undefined}
            style={{
              flex: 1, padding: '12px 6px', fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
              background: 'transparent', border: 'none',
              borderBottom: step === s.id ? '2px solid #C41230' : '2px solid transparent',
              color: step === s.id ? '#C41230' : step > s.id ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.2)',
              cursor: step >= s.id ? 'pointer' : 'default',
              fontFamily: 'var(--font-geist-mono, monospace)', textAlign: 'center',
            }}
          >
            {s.id}. {s.label}
          </button>
        ))}
      </div>

      {/* ── STEP 1: THE OPPORTUNITY ── */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <SectionTitle>THE OPPORTUNITY — Tell us about the contract you&apos;re pursuing</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field lbl="CONTRACT / SOLICITATION TITLE" req>
                <input value={q.contractTitle} onChange={e => set('contractTitle', e.target.value)} style={input} placeholder="Enterprise IT Modernization Services" />
              </Field>
            </div>
            <Field lbl="ISSUING AGENCY" req>
              <input value={q.agencyName} onChange={e => set('agencyName', e.target.value)} style={input} placeholder="Department of Veterans Affairs" />
            </Field>
            <Field lbl="SOLICITATION NUMBER">
              <input value={q.solicitationNumber} onChange={e => set('solicitationNumber', e.target.value)} style={input} placeholder="36C10B25R0001" />
            </Field>
            <Field lbl="ISSUING OFFICE">
              <input value={q.issuingOffice} onChange={e => set('issuingOffice', e.target.value)} style={input} placeholder="Network Contracting Office 4" />
            </Field>
            <Field lbl="RESPONSE DEADLINE">
              <input value={q.responseDeadline} onChange={e => set('responseDeadline', e.target.value)} style={input} placeholder="August 15, 2026 at 4:00 PM ET" />
            </Field>
            <Field lbl="ESTIMATED CONTRACT VALUE">
              <input value={q.estimatedValue} onChange={e => set('estimatedValue', e.target.value)} style={input} placeholder="$2.5M" />
            </Field>
            <Field lbl="CONTRACT TYPE">
              <select value={q.contractType} onChange={e => set('contractType', e.target.value)} style={select}>
                <option value="">Select type…</option>
                {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field lbl="PRIMARY NAICS CODE FOR THIS OPPORTUNITY">
              <input value={q.naicsCode} onChange={e => set('naicsCode', e.target.value)} style={input} placeholder="541512" />
            </Field>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field lbl="PLACE OF PERFORMANCE">
                <input value={q.placeOfPerformance} onChange={e => set('placeOfPerformance', e.target.value)} style={input} placeholder="Washington, DC / Remote" />
              </Field>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field lbl="WHAT DOES THE AGENCY NEED? (In your own words — 2-4 sentences)" req>
                <textarea value={q.requirementSummary} onChange={e => set('requirementSummary', e.target.value)} style={textarea} placeholder="The agency requires a contractor to modernize its legacy IT infrastructure, migrate 50+ applications to a cloud environment, and provide ongoing support..." />
              </Field>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field lbl="KEY OBJECTIVES — List each on a new line" req>
                <textarea value={q.keyObjectives} onChange={e => set('keyObjectives', e.target.value)} style={textarea} placeholder={`Migrate all legacy applications to AWS GovCloud\nReduce system downtime by 99.9% SLA\nTrain 200+ agency staff on new systems`} />
              </Field>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: TECHNICAL APPROACH ── */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <SectionTitle>TECHNICAL APPROACH — How will you win this contract?</SectionTitle>

          <Field lbl="YOUR OVERALL METHODOLOGY — Describe your approach in 3-5 sentences" req>
            <textarea value={q.overallApproach} onChange={e => set('overallApproach', e.target.value)} style={{ ...textarea, minHeight: 110 }}
              placeholder="Our team will employ an Agile/SAFe delivery methodology with two-week sprints, continuous integration, and automated testing pipelines. We bring proven cloud migration expertise across 12 federal agencies and will apply our IR4 framework to reduce risk and accelerate delivery..." />
          </Field>

          {[1, 2, 3].map((n) => {
            const pk = `phase${n}` as 'phase1' | 'phase2' | 'phase3'
            const ph = q[pk]
            return (
              <div key={n} style={{ background: '#F8F8F7', border: '1px solid rgba(0,0,0,0.08)', padding: '20px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.3)', marginBottom: 16, fontFamily: 'var(--font-geist-mono, monospace)' }}>
                  PHASE {n}{n === 3 ? ' (OPTIONAL)' : ''}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
                  <Field lbl="PHASE NAME">
                    <input value={ph.name} onChange={e => set(`${pk}.name`, e.target.value)} style={input} placeholder={n === 1 ? 'Mobilization & Planning' : n === 2 ? 'Execution & Delivery' : 'Transition & Close-Out'} />
                  </Field>
                  <Field lbl="TIMELINE">
                    <input value={ph.timeline} onChange={e => set(`${pk}.timeline`, e.target.value)} style={input} placeholder="Months 1–2" />
                  </Field>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <Field lbl="KEY DELIVERABLES (one per line)">
                    <textarea value={ph.deliverables} onChange={e => set(`${pk}.deliverables`, e.target.value)} style={textarea} placeholder={`Project Management Plan\nKickoff Meeting\nStakeholder Register`} />
                  </Field>
                  <Field lbl="APPROACH FOR THIS PHASE">
                    <textarea value={ph.approach} onChange={e => set(`${pk}.approach`, e.target.value)} style={textarea} placeholder="Conduct initial discovery meetings with the COR and key stakeholders to define scope, establish baselines, and develop the project management plan..." />
                  </Field>
                </div>
              </div>
            )
          })}

          <Field lbl="TOOLS & TECHNOLOGIES YOU WILL USE">
            <textarea value={q.toolsTechnologies} onChange={e => set('toolsTechnologies', e.target.value)} style={textarea}
              placeholder={`Jira / Confluence — project tracking and documentation\nAWS GovCloud — cloud hosting environment\nTerraform — infrastructure as code\nGitHub Actions — CI/CD pipeline`} />
          </Field>

          <Field lbl="QUALITY CONTROL APPROACH" req>
            <textarea value={q.qualityApproach} onChange={e => set('qualityApproach', e.target.value)} style={textarea}
              placeholder="We maintain a formal Quality Control Plan reviewed quarterly. All deliverables undergo peer review and independent verification before submission. Deficiencies are tracked in our corrective action log with resolution within 5 business days..." />
          </Field>

          <div style={{ background: '#F8F8F7', border: '1px solid rgba(0,0,0,0.08)', padding: '20px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.3)', marginBottom: 16, fontFamily: 'var(--font-geist-mono, monospace)' }}>RISKS & MITIGATIONS</div>
            {q.risks.map((r, i) => (
              <div key={i} style={{ marginBottom: i < q.risks.length - 1 ? 20 : 0, paddingBottom: i < q.risks.length - 1 ? 20 : 0, borderBottom: i < q.risks.length - 1 ? '1px solid rgba(0,0,0,0.07)' : 'none' }}>
                <div style={{ fontSize: 9, letterSpacing: '0.1em', color: 'rgba(0,0,0,0.25)', marginBottom: 12, fontFamily: 'var(--font-geist-mono, monospace)' }}>RISK {i + 1}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <Field lbl="RISK DESCRIPTION">
                    <input value={r.description} onChange={e => setArrayItem('risks', i, 'description', e.target.value)} style={input} placeholder="Key personnel availability during ramp-up" />
                  </Field>
                  <Field lbl="LIKELIHOOD">
                    <select value={r.likelihood} onChange={e => setArrayItem('risks', i, 'likelihood', e.target.value)} style={select}>
                      {RISK_LEVELS.map(l => <option key={l}>{l}</option>)}
                    </select>
                  </Field>
                  <Field lbl="IMPACT">
                    <select value={r.impact} onChange={e => setArrayItem('risks', i, 'impact', e.target.value)} style={select}>
                      {RISK_LEVELS.map(l => <option key={l}>{l}</option>)}
                    </select>
                  </Field>
                </div>
                <Field lbl="MITIGATION STRATEGY">
                  <input value={r.mitigation} onChange={e => setArrayItem('risks', i, 'mitigation', e.target.value)} style={input} placeholder="Maintain a bench of pre-vetted, cleared candidates; negotiate 30-day start dates with all candidates in advance of award" />
                </Field>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 3: YOUR TEAM ── */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <SectionTitle>YOUR TEAM — Who will perform this work?</SectionTitle>

          {[
            { key: 'pm', title: 'PROGRAM MANAGER', ph: { name: 'Jane Smith', title: 'Program Manager', clearance: 'Secret', experience: '12', quals: 'PMP-certified with 12 years managing federal IT programs. Former DoD contractor with deep familiarity with FAR/DFARS requirements.' } },
            { key: 'techLead', title: 'TECHNICAL LEAD', ph: { name: 'John Doe', title: 'Senior Cloud Architect', clearance: 'Secret', experience: '8', quals: 'AWS GovCloud certified architect with 8 years of federal cloud migration experience. Led 3 ATO processes under FISMA Moderate.' } },
          ].map(({ key, title, ph }) => {
            const person = q[key as 'pm' | 'techLead']
            return (
              <div key={key} style={{ background: '#F8F8F7', border: '1px solid rgba(0,0,0,0.08)', padding: '20px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.3)', marginBottom: 16, fontFamily: 'var(--font-geist-mono, monospace)' }}>{title}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <Field lbl="FULL NAME" req>
                    <input value={person.name} onChange={e => set(`${key}.name`, e.target.value)} style={input} placeholder={ph.name} />
                  </Field>
                  <Field lbl="TITLE / ROLE">
                    <input value={person.title} onChange={e => set(`${key}.title`, e.target.value)} style={input} placeholder={ph.title} />
                  </Field>
                  <Field lbl="CLEARANCE LEVEL">
                    <input value={person.clearance} onChange={e => set(`${key}.clearance`, e.target.value)} style={input} placeholder={ph.clearance} />
                  </Field>
                  <Field lbl="YEARS OF RELEVANT EXPERIENCE">
                    <input value={person.experience} onChange={e => set(`${key}.experience`, e.target.value)} style={input} placeholder={ph.experience} />
                  </Field>
                </div>
                <Field lbl="QUALIFICATIONS SUMMARY (2-3 sentences)">
                  <textarea value={person.quals} onChange={e => set(`${key}.quals`, e.target.value)} style={textarea} placeholder={ph.quals} />
                </Field>
              </div>
            )
          })}

          <Field lbl="ADDITIONAL KEY PERSONNEL — Name, title, and brief quals for each (optional)">
            <textarea value={q.additionalPersonnel} onChange={e => set('additionalPersonnel', e.target.value)} style={textarea}
              placeholder={`Senior Software Engineer — Alex Chen, 7 years federal DevSecOps experience, AWS Developer certified\nData Analyst — Maria Garcia, 5 years DoD analytics, active TS/SCI clearance`} />
          </Field>

          <div style={{ background: '#F8F8F7', border: '1px solid rgba(0,0,0,0.08)', padding: '20px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.3)', marginBottom: 16, fontFamily: 'var(--font-geist-mono, monospace)' }}>SUBCONTRACTING (LEAVE BLANK IF NONE)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: 14, marginBottom: 14 }}>
              <Field lbl="SUBCONTRACTOR NAME">
                <input value={q.subName} onChange={e => set('subName', e.target.value)} style={input} placeholder="Acme Federal Services LLC" />
              </Field>
              <Field lbl="THEIR ROLE / SCOPE">
                <input value={q.subRole} onChange={e => set('subRole', e.target.value)} style={input} placeholder="Cybersecurity and compliance support" />
              </Field>
              <Field lbl="THEIR % OF WORK">
                <input value={q.subPercent} onChange={e => set('subPercent', e.target.value)} style={input} placeholder="30" />
              </Field>
            </div>
            <Field lbl="YOUR PRIME % OF WORK">
              <input value={q.primePercent} onChange={e => set('primePercent', e.target.value)} style={{ ...input, maxWidth: 120 }} placeholder="70" />
            </Field>
          </div>
        </div>
      )}

      {/* ── STEP 4: PAST PERFORMANCE ── */}
      {step === 4 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <SectionTitle>PAST PERFORMANCE — List up to 3 relevant federal contracts</SectionTitle>
          {q.pp.map((p, i) => (
            <div key={i} style={{ border: '1px solid rgba(0,0,0,0.1)', background: '#FFFFFF', padding: '20px' }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: i === 0 ? '#C41230' : 'rgba(0,0,0,0.3)', marginBottom: 16, fontFamily: 'var(--font-geist-mono, monospace)' }}>
                CONTRACT {i + 1}{i === 0 ? ' (REQUIRED)' : ' (OPTIONAL)'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <Field lbl="CONTRACT TITLE">
                    <input value={p.title} onChange={e => setArrayItem('pp', i, 'title', e.target.value)} style={input} placeholder="IT Infrastructure Modernization Support" />
                  </Field>
                </div>
                <Field lbl="CONTRACTING AGENCY">
                  <input value={p.agency} onChange={e => setArrayItem('pp', i, 'agency', e.target.value)} style={input} placeholder="Department of Homeland Security" />
                </Field>
                <Field lbl="CONTRACT NUMBER">
                  <input value={p.contractNumber} onChange={e => setArrayItem('pp', i, 'contractNumber', e.target.value)} style={input} placeholder="HSHQDC-22-C-00123" />
                </Field>
                <Field lbl="CONTRACT TYPE">
                  <select value={p.contractType} onChange={e => setArrayItem('pp', i, 'contractType', e.target.value)} style={select}>
                    <option value="">Select…</option>
                    {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field lbl="TOTAL VALUE">
                  <input value={p.value} onChange={e => setArrayItem('pp', i, 'value', e.target.value)} style={input} placeholder="$3.2M" />
                </Field>
                <Field lbl="START DATE">
                  <input value={p.startDate} onChange={e => setArrayItem('pp', i, 'startDate', e.target.value)} style={input} placeholder="01/2022" />
                </Field>
                <Field lbl="END DATE">
                  <input value={p.endDate} onChange={e => setArrayItem('pp', i, 'endDate', e.target.value)} style={input} placeholder="12/2024" />
                </Field>
                <div style={{ gridColumn: '1 / -1' }}>
                  <Field lbl="DESCRIPTION OF WORK (2-3 sentences)">
                    <textarea value={p.description} onChange={e => setArrayItem('pp', i, 'description', e.target.value)} style={textarea}
                      placeholder="Provided full lifecycle IT modernization support including cloud migration of 30 legacy applications to AWS GovCloud, implementation of zero-trust architecture, and 24/7 NOC operations..." />
                  </Field>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <Field lbl="RELEVANCE TO THIS SOLICITATION">
                    <textarea value={p.relevance} onChange={e => setArrayItem('pp', i, 'relevance', e.target.value)} style={textarea}
                      placeholder="This work directly demonstrates our capability to perform the cloud migration and ongoing IT support requirements outlined in Sections C.2.1 through C.2.4 of the current solicitation..." />
                  </Field>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <Field lbl="KEY OUTCOMES (one per line — be specific and measurable)">
                    <textarea value={p.outcomes} onChange={e => setArrayItem('pp', i, 'outcomes', e.target.value)} style={textarea}
                      placeholder={`Delivered all 30 application migrations on schedule within 18 months\nAchieved 99.97% system availability over 24-month period\nReceived Exceptional CPARS rating across all evaluation areas\nReduced infrastructure costs by $1.2M annually through consolidation`} />
                  </Field>
                </div>
              </div>
              <div style={{ paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(0,0,0,0.3)', marginBottom: 14, fontFamily: 'var(--font-geist-mono, monospace)' }}>COR / CONTRACTING OFFICER REFERENCE</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <Field lbl="NAME">
                    <input value={p.refName} onChange={e => setArrayItem('pp', i, 'refName', e.target.value)} style={input} placeholder="John Williams" />
                  </Field>
                  <Field lbl="TITLE">
                    <input value={p.refTitle} onChange={e => setArrayItem('pp', i, 'refTitle', e.target.value)} style={input} placeholder="Contracting Officer Representative" />
                  </Field>
                  <Field lbl="PHONE">
                    <input value={p.refPhone} onChange={e => setArrayItem('pp', i, 'refPhone', e.target.value)} style={input} placeholder="(202) 555-0100" />
                  </Field>
                  <Field lbl="EMAIL">
                    <input type="email" value={p.refEmail} onChange={e => setArrayItem('pp', i, 'refEmail', e.target.value)} style={input} placeholder="john.williams@agency.gov" />
                  </Field>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── STEP 5: PRICING ── */}
      {step === 5 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <SectionTitle>PRICING — Your proposed contract values by period</SectionTitle>
          <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)', margin: '-8px 0 4px', fontFamily: 'var(--font-geist-sans, sans-serif)', lineHeight: 1.5 }}>
            Enter proposed prices for each period. Total is calculated automatically. Leave option years blank if not applicable.
          </p>
          <div style={{ background: '#F8F8F7', border: '1px solid rgba(0,0,0,0.08)', padding: '24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { key: 'baseYear', lbl: 'BASE YEAR' },
              { key: 'oy1', lbl: 'OPTION YEAR 1' },
              { key: 'oy2', lbl: 'OPTION YEAR 2' },
              { key: 'oy3', lbl: 'OPTION YEAR 3' },
              { key: 'oy4', lbl: 'OPTION YEAR 4' },
            ].map(({ key, lbl }) => (
              <div key={key} style={{ display: 'grid', gridTemplateColumns: '180px 1fr', alignItems: 'center', gap: 16 }}>
                <label style={{ ...label, marginBottom: 0 }}>{lbl}</label>
                <input
                  value={q[key as keyof typeof q] as string}
                  onChange={e => set(key, e.target.value)}
                  style={{ ...input, maxWidth: 200 }}
                  placeholder="$0"
                />
              </div>
            ))}
            <div style={{ height: 1, background: 'rgba(0,0,0,0.08)', margin: '4px 0' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', alignItems: 'center', gap: 16 }}>
              <label style={{ ...label, marginBottom: 0, color: '#0A0A0A' }}>TOTAL ALL PERIODS</label>
              <input
                value={q.totalPrice}
                onChange={e => set('totalPrice', e.target.value)}
                style={{ ...input, maxWidth: 200, fontWeight: 600 }}
                placeholder="Auto-calculated or enter manually"
              />
            </div>
          </div>
          <Field lbl="ACKNOWLEDGED AMENDMENTS (if any — enter amendment number(s))">
            <input value={q.amendments} onChange={e => set('amendments', e.target.value)} style={input} placeholder="Amendment 0001, Amendment 0002" />
          </Field>
        </div>
      )}

      {/* ── STEP 6: REVIEW & GENERATE ── */}
      {step === 6 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <SectionTitle>REVIEW — Confirm your answers before generating</SectionTitle>

          {[
            { heading: 'The Opportunity', items: [
              ['Contract', q.contractTitle || '—'], ['Agency', q.agencyName || '—'],
              ['Solicitation #', q.solicitationNumber || '—'], ['Deadline', q.responseDeadline || '—'],
              ['Value', q.estimatedValue || '—'], ['NAICS', q.naicsCode || '—'],
            ]},
            { heading: 'Technical Approach', items: [
              ['Phase 1', q.phase1.name || '—'], ['Phase 2', q.phase2.name || '—'],
              ['Phase 3', q.phase3.name || 'N/A'],
            ]},
            { heading: 'Team', items: [
              ['Program Manager', q.pm.name || '—'], ['Technical Lead', q.techLead.name || '—'],
              ['Subcontractor', q.subName || 'None'],
            ]},
            { heading: 'Past Performance', items: q.pp.map((p, i) => [`Contract ${i + 1}`, p.title || '—'])},
            { heading: 'Pricing', items: [
              ['Base Year', q.baseYear || '—'], ['OY1', q.oy1 || '—'],
              ['Total', q.totalPrice || '—'],
            ]},
          ].map(({ heading, items }) => (
            <div key={heading} style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', padding: '16px 20px' }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.3)', marginBottom: 14, fontFamily: 'var(--font-geist-mono, monospace)' }}>{heading.toUpperCase()}</div>
              {items.map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(0,0,0,0.04)', fontSize: 12 }}>
                  <span style={{ color: 'rgba(0,0,0,0.4)', fontFamily: 'var(--font-geist-mono, monospace)', fontSize: 10 }}>{k}</span>
                  <span style={{ color: '#0A0A0A', fontFamily: 'var(--font-geist-sans, sans-serif)', fontWeight: v === '—' ? 400 : 500, opacity: v === '—' ? 0.4 : 1 }}>{v}</span>
                </div>
              ))}
            </div>
          ))}

          {!q.contractTitle || !q.agencyName ? (
            <div style={{ padding: '12px 16px', background: 'rgba(196,18,48,0.05)', border: '1px solid rgba(196,18,48,0.2)', color: '#C41230', fontSize: 11, fontFamily: 'var(--font-geist-mono, monospace)' }}>
              Contract title and agency name are required. Go back to Step 1 to complete them.
            </div>
          ) : null}

          {error && (
            <div style={{ padding: '12px 16px', background: 'rgba(196,18,48,0.05)', border: '1px solid rgba(196,18,48,0.2)', color: '#C41230', fontSize: 11, fontFamily: 'var(--font-geist-mono, monospace)' }}>
              {error}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 40, paddingTop: 28, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
        <button
          onClick={() => step > 1 ? setStep(s => s - 1) : router.push('/documents')}
          style={{ padding: '10px 20px', fontSize: 10, letterSpacing: '0.08em', background: 'transparent', border: '1px solid rgba(0,0,0,0.12)', color: 'rgba(0,0,0,0.45)', cursor: 'pointer', fontFamily: 'var(--font-geist-mono, monospace)' }}
        >
          {step === 1 ? '← BACK TO PROPOSALS' : '← PREVIOUS'}
        </button>

        {step < 6 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            style={{ padding: '10px 24px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', background: '#0A0A0A', color: '#ffffff', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-geist-mono, monospace)' }}
          >
            NEXT →
          </button>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={generating || !q.contractTitle || !q.agencyName}
            style={{
              padding: '12px 28px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
              background: !q.contractTitle || !q.agencyName ? 'rgba(0,0,0,0.08)' : '#C41230',
              color: !q.contractTitle || !q.agencyName ? 'rgba(0,0,0,0.25)' : '#ffffff',
              border: 'none', cursor: generating || !q.contractTitle || !q.agencyName ? 'not-allowed' : 'pointer',
              opacity: generating ? 0.7 : 1, fontFamily: 'var(--font-geist-mono, monospace)',
            }}
          >
            {generating ? 'GENERATING PROPOSAL…' : 'GENERATE PROPOSAL →'}
          </button>
        )}
      </div>
    </div>
  )
}
