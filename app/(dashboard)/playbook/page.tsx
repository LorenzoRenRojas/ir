'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { PageHeader } from '@/components/layout/PageHeader'

const mono = 'var(--font-geist-mono, monospace)'
const sans = 'var(--font-geist-sans, sans-serif)'
const crimson = '#C41230'

// In-app playbook — the tactical, do-this-now checklist. Different in kind from
// the public /how-to-win page (which sells the strategy): this one reflects the
// user's real state, links straight into each feature, and is written like a
// coach standing over your shoulder. Beginner-first, but useful to anyone.

interface StepState { onboardingDone: boolean; savedCount: number; docCount: number }

type Step = {
  id: string
  title: string
  do: string
  href: string
  cta: string
  // Auto-complete when the app state proves it's done; otherwise the user ticks it.
  auto?: (s: StepState) => boolean
}

const STEPS: Step[] = [
  { id: 'profile', title: 'Complete your company profile', do: 'Add your NAICS codes, certifications, and capability statement. This is the yardstick every contract is scored against — nothing works well without it.', href: '/settings', cta: 'OPEN PROFILE', auto: (s) => s.onboardingDone },
  { id: 'find', title: 'Find your first winnable match', do: 'Open your feed, turn on “Contracts I can prime,” and read the top match’s breakdown — see exactly why it scored.', href: '/dashboard', cta: 'OPEN FEED' },
  { id: 'save', title: 'Save one to your pipeline', do: 'Save a contract that looks winnable. That starts your pipeline, unlocks deadline alerts, and teaches the matcher what you like.', href: '/dashboard', cta: 'GO SAVE ONE', auto: (s) => s.savedCount > 0 },
  { id: 'radar', title: 'Scan the Recompete Radar', do: 'Find a contract in your space expiring in 6–18 months and note the incumbent. That’s your pipeline before the RFP exists — start the relationship now.', href: '/recompetes', cta: 'OPEN RADAR' },
  { id: 'decide', title: 'Run a bid / no-bid', do: 'On a saved contract, weigh the win probability and incumbent, then fill the scorecard. Only spend real hours on work you can actually win.', href: '/saved', cta: 'OPEN PIPELINE' },
  { id: 'docs', title: 'Generate your capability statement', do: 'One click in the Doc Suite. Every contracting officer asks for one — have it ready before you need it.', href: '/documents', cta: 'OPEN DOC SUITE', auto: (s) => s.docCount > 0 },
  { id: 'notify', title: 'Turn on your alerts', do: 'Switch on the daily match digest and deadline reminders so a winnable contract never slips past a due date.', href: '/settings', cta: 'OPEN SETTINGS' },
]

const LS_KEY = 'ir-playbook-done'

export default function PlaybookPage() {
  const { data: session } = useSession()
  const [state, setState] = useState<StepState>({ onboardingDone: false, savedCount: 0, docCount: 0 })
  const [manual, setManual] = useState<Set<string>>(new Set())

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) setManual(new Set(JSON.parse(raw)))
    } catch { /* private mode */ }
  }, [])

  useEffect(() => {
    setState((s) => ({ ...s, onboardingDone: !!session?.user?.onboardingDone }))
  }, [session])

  useEffect(() => {
    Promise.all([
      fetch('/api/contracts/saved').then((r) => r.json()).catch(() => ({})),
      fetch('/api/documents/generate').then((r) => r.json()).catch(() => ({})),
    ]).then(([saved, docs]) => {
      setState((s) => ({
        ...s,
        savedCount: (saved.saved ?? []).length,
        docCount: (docs.documents ?? []).length,
      }))
    })
  }, [])

  function isDone(step: Step): boolean {
    if (step.auto && step.auto(state)) return true
    return manual.has(step.id)
  }
  function toggle(id: string) {
    setManual((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      try { localStorage.setItem(LS_KEY, JSON.stringify([...next])) } catch { /* ignore */ }
      return next
    })
  }

  const doneCount = STEPS.filter(isDone).length
  const pct = Math.round((doneCount / STEPS.length) * 100)
  const allDone = doneCount === STEPS.length

  return (
    <div style={{ padding: '30px 40px 48px', minHeight: '100vh', maxWidth: 820 }}>
      <PageHeader
        kicker="YOUR PLAYBOOK"
        title={allDone ? 'You’re running the full play.' : 'Your first win, step by step.'}
        subtitle="Seven moves that take you from a cold profile to a submitted bid. Do them in order — each one links straight to where it happens."
      />

      {/* Progress */}
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.03)', padding: '18px 22px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.4)' }}>{allDone ? 'PLAY COMPLETE ✓' : `${doneCount} OF ${STEPS.length} DONE`}</span>
          <span style={{ fontFamily: sans, fontSize: 22, fontWeight: 800, color: allDone ? '#16a34a' : crimson, letterSpacing: '-0.02em' }}>{pct}%</span>
        </div>
        <div style={{ height: 6, background: 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: allDone ? '#16a34a' : crimson, borderRadius: 3, transition: 'width 0.5s cubic-bezier(0.22,1,0.36,1)' }} />
        </div>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {STEPS.map((step, i) => {
          const done = isDone(step)
          const autoDone = !!(step.auto && step.auto(state))
          return (
            <div key={step.id} style={{ background: '#fff', border: `1px solid ${done ? 'rgba(22,163,74,0.3)' : 'rgba(0,0,0,0.08)'}`, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.03)', padding: '18px 20px', display: 'flex', gap: 16, alignItems: 'flex-start', transition: 'border-color 0.2s ease' }}>
              {/* Check */}
              <button
                onClick={() => !autoDone && toggle(step.id)}
                title={autoDone ? 'Completed automatically' : done ? 'Mark not done' : 'Mark done'}
                style={{ flexShrink: 0, width: 26, height: 26, borderRadius: '50%', border: done ? 'none' : '2px solid rgba(0,0,0,0.15)', background: done ? (autoDone ? '#16a34a' : '#16a34a') : 'transparent', color: '#fff', cursor: autoDone ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, marginTop: 2 }}
              >
                {done ? '✓' : ''}
              </button>
              {/* Body */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: mono, fontSize: 10, color: 'rgba(0,0,0,0.25)', letterSpacing: '0.1em' }}>{String(i + 1).padStart(2, '0')}</span>
                  <span style={{ fontFamily: sans, fontSize: 15, fontWeight: 700, color: done ? 'rgba(0,0,0,0.4)' : '#0A0A0A', textDecoration: done ? 'line-through' : 'none' }}>{step.title}</span>
                  {autoDone && <span style={{ fontFamily: mono, fontSize: 8, letterSpacing: '0.1em', color: '#16a34a', border: '1px solid rgba(22,163,74,0.3)', padding: '2px 6px', borderRadius: 4 }}>DONE</span>}
                </div>
                <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.5)', margin: '0 0 12px', fontFamily: sans, lineHeight: 1.6 }}>{step.do}</p>
                <Link href={step.href} style={{ display: 'inline-block', padding: '7px 14px', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', fontFamily: mono, color: done ? 'rgba(0,0,0,0.4)' : crimson, border: `1px solid ${done ? 'rgba(0,0,0,0.12)' : 'rgba(196,18,48,0.35)'}`, borderRadius: 8, textDecoration: 'none' }}>
                  {step.cta} →
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {allDone && (
        <div style={{ marginTop: 20, background: '#0A0A0A', borderRadius: 12, padding: '24px 26px', textAlign: 'center' }}>
          <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.16em', color: '#4ADE80', marginBottom: 10 }}>THE MACHINE IS RUNNING ✓</div>
          <div style={{ fontFamily: sans, fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 6 }}>You’re positioned. Now keep the pipeline full.</div>
          <div style={{ fontFamily: sans, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>Check the feed daily, work the Radar weekly, and every recompete you track becomes next year’s win.</div>
        </div>
      )}
    </div>
  )
}
