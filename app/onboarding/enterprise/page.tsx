'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ── Question definitions ────────────────────────────────────────────────────

type AnswerType = 'single' | 'multi' | 'text' | 'textarea' | 'chips'

interface Question {
  id: string
  step: number
  label: string
  question: string
  type: AnswerType
  options?: string[]
  placeholder?: string
  hint?: string
}

const QUESTIONS: Question[] = [
  {
    id: 'orgSize',
    step: 1,
    label: 'ORGANIZATION SIZE',
    question: 'How many people are in your organization?',
    type: 'single',
    options: ['1 – 10', '11 – 50', '51 – 200', '201 – 500', '500+'],
  },
  {
    id: 'contractVehicles',
    step: 2,
    label: 'CONTRACT VEHICLES',
    question: 'Which contract vehicles does your company hold?',
    type: 'chips',
    options: ['GSA MAS', 'SEWP V', 'Alliant 2', 'CIO-SP3', 'OASIS', '8(a) STARS III', 'VETS 2', 'HCaTS', 'ENCORE III', 'DISA SETI', 'None currently', 'Other'],
    hint: 'Select all that apply.',
  },
  {
    id: 'pastPerformance',
    step: 3,
    label: 'PAST PERFORMANCE',
    question: 'Briefly describe your most relevant past performance.',
    type: 'textarea',
    placeholder: 'e.g. Delivered a $4.2M IT modernization project for the VA, on schedule and under budget. Led a 12-person cross-functional team...',
    hint: 'This helps us surface opportunities where your track record is a strong signal.',
  },
  {
    id: 'capabilityStatement',
    step: 4,
    label: 'CAPABILITY STATEMENT',
    question: "What's your core differentiator as a government contractor?",
    type: 'textarea',
    placeholder: 'e.g. We specialize in zero-trust architecture and cloud migration for DoD agencies, with TS/SCI cleared staff on-site...',
    hint: 'Think of this as the first paragraph of your capability statement.',
  },
  {
    id: 'teamName',
    step: 5,
    label: 'WORKSPACE',
    question: "What should we call your team's workspace?",
    type: 'text',
    placeholder: 'Acme Government Solutions',
    hint: 'Usually your company name. All team members will see this.',
  },
  {
    id: 'inviteEmails',
    step: 6,
    label: 'INVITE TEAM',
    question: 'Who else from your team should have access?',
    type: 'textarea',
    placeholder: 'jane@company.com\njohn@company.com\nops@company.com',
    hint: 'One email per line. You can also invite people later from Settings. This step is optional.',
  },
]

const TOTAL = QUESTIONS.length

// ── Chip component ──────────────────────────────────────────────────────────

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '8px 14px',
        fontSize: 11,
        border: selected ? '1px solid rgba(196,18,48,0.4)' : '1px solid rgba(0,0,0,0.1)',
        background: selected ? 'rgba(196,18,48,0.06)' : '#F8F8F7',
        color: selected ? '#C41230' : 'rgba(0,0,0,0.5)',
        cursor: 'pointer',
        fontFamily: 'var(--font-geist-mono, monospace)',
        letterSpacing: '0.04em',
        transition: 'all 0.12s',
      }}
    >
      {label}
    </button>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function EnterpriseOnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const q = QUESTIONS[step]
  const answer = answers[q.id]

  function setValue(val: string | string[]) {
    setAnswers((prev) => ({ ...prev, [q.id]: val }))
  }

  function toggleChip(option: string) {
    const current = (answers[q.id] as string[]) ?? []
    setValue(current.includes(option) ? current.filter((x) => x !== option) : [...current, option])
  }

  function canAdvance() {
    if (q.id === 'inviteEmails') return true // optional
    if (!answer) return false
    if (Array.isArray(answer)) return answer.length > 0
    return (answer as string).trim().length > 0
  }

  async function handleComplete() {
    setLoading(true)
    setError('')
    try {
      // Save profile details
      const settingsRes = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgSize: answers.orgSize as string,
          contractVehicles: answers.contractVehicles as string[] ?? [],
          pastPerformance: answers.pastPerformance as string,
          capabilityStatement: answers.capabilityStatement as string,
        }),
      })
      if (!settingsRes.ok) {
        const d = await settingsRes.json().catch(() => ({}))
        setError(d.error ?? 'Could not save your profile. Please try again.')
        setLoading(false)
        return
      }

      // Create team workspace
      const teamName = (answers.teamName as string)?.trim()
      if (teamName) {
        const teamRes = await fetch('/api/team/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: teamName }),
        })
        const teamData = await teamRes.json().catch(() => ({}))
        if (!teamRes.ok) {
          setError(teamData.error ?? 'Could not create your team workspace. Please try again.')
          setLoading(false)
          return
        }

        // Send invites if any emails provided
        const emailsRaw = (answers.inviteEmails as string) ?? ''
        const emails = emailsRaw.split('\n').map((e) => e.trim()).filter(Boolean)
        if (teamData.team && emails.length > 0) {
          await Promise.allSettled(
            emails.map((email) =>
              fetch('/api/team/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, role: 'member' }),
              })
            )
          )
        }
      }

      router.push('/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8F8F7', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 24px', fontFamily: 'var(--font-geist-mono, monospace)' }}>
      {/* Logo */}
      <div style={{ width: '100%', maxWidth: 600, marginBottom: 40 }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <span style={{ color: '#C41230', fontSize: 20, fontWeight: 700 }}>ᛁ</span>
          <span style={{ color: '#0A0A0A', fontSize: 14, fontWeight: 700, letterSpacing: '0.12em' }}>IR</span>
          <span style={{ fontSize: 9, letterSpacing: '0.12em', padding: '2px 8px', background: 'rgba(196,18,48,0.07)', color: '#C41230', border: '1px solid rgba(196,18,48,0.2)' }}>ENTERPRISE</span>
        </Link>
      </div>

      <div style={{ width: '100%', maxWidth: 600 }}>
        {/* Progress */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 9, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.3)' }}>{q.label}</span>
            <span style={{ fontSize: 9, letterSpacing: '0.12em', color: 'rgba(0,0,0,0.2)' }}>{step + 1} / {TOTAL}</span>
          </div>
          <div style={{ height: 2, background: 'rgba(0,0,0,0.06)' }}>
            <div style={{ height: '100%', width: `${((step + 1) / TOTAL) * 100}%`, background: '#C41230', transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
            {QUESTIONS.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 2, background: i <= step ? '#C41230' : 'rgba(0,0,0,0.08)', transition: 'background 0.3s' }} />
            ))}
          </div>
        </div>

        {/* Question card */}
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', padding: '40px 36px', marginBottom: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.02em', margin: '0 0 8px', fontFamily: 'var(--font-geist-sans, sans-serif)', lineHeight: 1.3 }}>
            {q.question}
          </h2>
          {q.hint && (
            <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', margin: '0 0 28px', fontFamily: 'var(--font-geist-sans, sans-serif)', lineHeight: 1.5 }}>
              {q.hint}
            </p>
          )}
          {!q.hint && <div style={{ marginBottom: 28 }} />}

          {/* Single-select options */}
          {q.type === 'single' && q.options && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {q.options.map((opt) => {
                const selected = answer === opt
                return (
                  <div
                    key={opt}
                    onClick={() => setValue(opt)}
                    style={{
                      padding: '14px 18px',
                      border: selected ? '1px solid rgba(196,18,48,0.35)' : '1px solid rgba(0,0,0,0.08)',
                      background: selected ? 'rgba(196,18,48,0.04)' : '#F8F8F7',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      transition: 'all 0.12s',
                      borderLeft: selected ? '3px solid #C41230' : '3px solid transparent',
                    }}
                  >
                    <div style={{ width: 14, height: 14, borderRadius: '50%', border: selected ? '2px solid #C41230' : '2px solid rgba(0,0,0,0.2)', background: selected ? '#C41230' : 'transparent', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: selected ? '#C41230' : '#0A0A0A', fontFamily: 'var(--font-geist-sans, sans-serif)', fontWeight: selected ? 600 : 400 }}>{opt}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Multi-select chips */}
          {q.type === 'chips' && q.options && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {q.options.map((opt) => (
                <Chip
                  key={opt}
                  label={opt}
                  selected={((answer as string[]) ?? []).includes(opt)}
                  onClick={() => toggleChip(opt)}
                />
              ))}
            </div>
          )}

          {/* Text input */}
          {q.type === 'text' && (
            <input
              type="text"
              value={(answer as string) ?? ''}
              onChange={(e) => setValue(e.target.value)}
              placeholder={q.placeholder}
              autoFocus
              style={{ width: '100%', padding: '12px 14px', background: '#F8F8F7', border: '1px solid rgba(0,0,0,0.12)', color: '#0A0A0A', fontSize: 14, fontFamily: 'var(--font-geist-sans, sans-serif)', outline: 'none', boxSizing: 'border-box' }}
            />
          )}

          {/* Textarea */}
          {q.type === 'textarea' && (
            <textarea
              value={(answer as string) ?? ''}
              onChange={(e) => setValue(e.target.value)}
              placeholder={q.placeholder}
              rows={5}
              autoFocus
              style={{ width: '100%', padding: '12px 14px', background: '#F8F8F7', border: '1px solid rgba(0,0,0,0.12)', color: '#0A0A0A', fontSize: 13, fontFamily: 'var(--font-geist-sans, sans-serif)', outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 }}
            />
          )}
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(196,18,48,0.05)', border: '1px solid rgba(196,18,48,0.2)', color: '#C41230', fontSize: 11 }}>
            {error}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            style={{ padding: '10px 20px', fontSize: 10, letterSpacing: '0.1em', background: 'transparent', border: '1px solid rgba(0,0,0,0.1)', color: 'rgba(0,0,0,0.35)', cursor: step === 0 ? 'not-allowed' : 'pointer', opacity: step === 0 ? 0.3 : 1, fontFamily: 'var(--font-geist-mono, monospace)' }}
          >
            ← BACK
          </button>

          {step < TOTAL - 1 ? (
            <button
              type="button"
              onClick={() => { setError(''); setStep((s) => s + 1) }}
              disabled={!canAdvance()}
              style={{ padding: '10px 28px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', background: canAdvance() ? '#C41230' : 'rgba(0,0,0,0.1)', color: canAdvance() ? '#ffffff' : 'rgba(0,0,0,0.3)', border: 'none', cursor: canAdvance() ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-geist-mono, monospace)', transition: 'all 0.15s' }}
            >
              CONTINUE →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleComplete}
              disabled={loading}
              style={{ padding: '10px 28px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', background: '#C41230', color: '#ffffff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontFamily: 'var(--font-geist-mono, monospace)' }}
            >
              {loading ? 'SETTING UP…' : 'LAUNCH DASHBOARD →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
