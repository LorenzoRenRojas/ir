// Capture Playbook — turns the data we already have on an opportunity (set-aside,
// notice type, incumbent, deadline, the user's certs) into the concrete next
// moves. This is the "capture" layer that sits between finding a contract and
// writing the proposal — the part no self-serve tool operationalizes. Pure
// heuristics, no I/O, no API keys: every claim traces to authoritative fields.

import type { Contract } from './sam-api'

export interface CaptureProfile {
  certifications: string[]
  businessTypes: string[]
}

export type Eligibility = 'eligible' | 'ineligible' | 'open' | 'unknown'

export interface CaptureStep {
  title: string
  detail: string
  tone: 'do' | 'watch' | 'info'
}

export interface CapturePlaybook {
  eligibility: Eligibility
  eligibilityLabel: string
  eligibilityDetail: string
  signals: { label: string; tone: 'do' | 'watch' | 'info' }[]
  steps: CaptureStep[]
}

// Cert keywords a set-aside description might require, and how they read in a
// user's profile. Mirrors lib/matching's set-aside mappings, keyword-based so
// both "8(a) Certified" and "8(a) Set-Aside" resolve.
const CERT_MATCHERS: { keyword: RegExp; label: string; profile: RegExp }[] = [
  { keyword: /8\(a\)/i, label: '8(a)', profile: /8\(a\)/i },
  { keyword: /hubzone/i, label: 'HUBZone', profile: /hubzone/i },
  { keyword: /service.?disabled|sdvosb|\bvosb\b/i, label: 'SDVOSB', profile: /sdvosb|service.?disabled/i },
  { keyword: /women|wosb|edwosb/i, label: 'WOSB', profile: /wosb|women/i },
  { keyword: /small business/i, label: 'Small Business', profile: /small business/i },
]

const isPreRfp = (c: Contract) =>
  /sources sought|presolicitation|pre-solicitation|request for information|\brfi\b|special notice/i.test(
    `${c.type} ${c.typeDescription}`
  )

const isSourcesSought = (c: Contract) =>
  /sources sought|request for information|\brfi\b/i.test(`${c.type} ${c.typeDescription}`)

function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null
  const t = new Date(dateStr).getTime()
  if (isNaN(t)) return null
  return Math.ceil((t - Date.now()) / 86_400_000)
}

export function buildCapturePlaybook(
  contract: Contract,
  profile: CaptureProfile | null,
  incumbent: { awardee: string; amount: number } | null
): CapturePlaybook {
  const sa = `${contract.setAsideType} ${contract.setAsideDescription}`.trim()
  const hasSetAside = !!sa && !/^(none|no set-aside)?$/i.test(contract.setAsideDescription || '')
  const profileCerts = profile ? [...profile.certifications, ...profile.businessTypes] : []

  // ── Eligibility ──────────────────────────────────────────────────────────
  let eligibility: Eligibility = 'unknown'
  let eligibilityLabel = 'Eligibility unknown'
  let eligibilityDetail = ''

  if (!profile) {
    eligibility = 'unknown'
    eligibilityLabel = 'Complete your profile'
    eligibilityDetail = 'Add your certifications in settings and IR will tell you whether you qualify for this set-aside.'
  } else if (!hasSetAside) {
    eligibility = 'open'
    eligibilityLabel = 'Full & open competition'
    eligibilityDetail = 'No set-aside — anyone can bid, which means a wider field. Your differentiators and past performance carry the win.'
  } else {
    const required = CERT_MATCHERS.find(m => m.keyword.test(sa))
    if (!required) {
      eligibility = 'unknown'
      eligibilityLabel = 'Set-aside — check requirements'
      eligibilityDetail = `Set aside as "${contract.setAsideDescription}". Confirm the exact eligibility on the notice.`
    } else if (profileCerts.some(c => required.profile.test(c))) {
      eligibility = 'eligible'
      eligibilityLabel = `Eligible — ${required.label} set-aside`
      eligibilityDetail = `This is reserved for ${required.label} firms and you hold it. Smaller field, real advantage — prioritize this one.`
    } else {
      eligibility = 'ineligible'
      eligibilityLabel = `Restricted — needs ${required.label}`
      eligibilityDetail = `This is set aside for ${required.label} firms, which isn't on your profile. You'd need that certification, or a prime who has it — consider teaming rather than bidding direct.`
    }
  }

  // ── Signals ──────────────────────────────────────────────────────────────
  const signals: { label: string; tone: 'do' | 'watch' | 'info' }[] = []
  if (isPreRfp(contract)) {
    signals.push({
      label: 'PRE-RFP — the solicitation isn\'t out yet. Engage now to shape the requirement before it locks.',
      tone: 'do',
    })
  }
  if (incumbent) {
    signals.push({
      label: `Incumbent on record: ${incumbent.awardee}. You're the challenger — lead with what they can't offer.`,
      tone: 'watch',
    })
  }
  const dleft = daysUntil(contract.responseDeadline)
  if (dleft !== null && dleft >= 0 && dleft <= 7) {
    signals.push({ label: `Response due in ${dleft} day${dleft === 1 ? '' : 's'} — tight turnaround. Move today.`, tone: 'watch' })
  }
  if (eligibility === 'eligible') {
    signals.push({ label: 'Your certification narrows the field in your favor.', tone: 'do' })
  }

  // ── Next moves ───────────────────────────────────────────────────────────
  const steps: CaptureStep[] = []

  if (eligibility === 'ineligible') {
    steps.push({
      title: 'Find a prime to team with',
      detail: `You can't bid this set-aside direct, but you can subcontract. Identify a ${eligibilityLabel.replace('Restricted — needs ', '')} prime pursuing it and offer your capability.`,
      tone: 'do',
    })
  } else {
    steps.push({
      title: 'Confirm fit against the requirement',
      detail: 'Read the statement of work and map it to your past performance. If you can name two similar projects, you belong in this bid.',
      tone: 'do',
    })
  }

  if (isSourcesSought(contract)) {
    steps.push({
      title: 'Respond to the Sources Sought',
      detail: 'This is how you win before the RFP exists — a strong response can steer the eventual requirement toward your strengths and signal a competitive field.',
      tone: 'do',
    })
  }

  if (incumbent) {
    steps.push({
      title: `Research ${incumbent.awardee}`,
      detail: 'Know what you\'re displacing — their scope, their price, and the gaps a customer might want filled. Your win theme is their weakness.',
      tone: 'info',
    })
  }

  const hasPoc = (contract.pointsOfContact?.length ?? 0) > 0
  if (hasPoc && eligibility !== 'ineligible') {
    steps.push({
      title: 'Introduce yourself to the contracting officer',
      detail: 'Send your capability statement to the point of contact — one click from your pipeline. Early, professional contact is how small businesses get on the radar.',
      tone: 'do',
    })
  }

  steps.push({
    title: eligibility === 'ineligible' ? 'Draft a capability statement for teaming' : 'Draft your response',
    detail: 'Generate a capability statement or proposal draft from your profile to move from "interested" to "in the running."',
    tone: 'do',
  })

  return { eligibility, eligibilityLabel, eligibilityDetail, signals, steps }
}
