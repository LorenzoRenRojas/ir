'use client'

import { useEffect, useState } from 'react'
import { SUBSCRIPTION_TIERS } from '@/lib/stripe'
import SecuritySection from '@/components/settings/SecuritySection'

// ─── Types ────────────────────────────────────────────────────────────────────
interface CompanyProfileData {
  companyName: string
  website: string | null
  uei: string | null
  yearFounded: number | null
  orgSize: string | null
  businessTypes: string[]
  naicsCodes: string[]
  contractSizePrefs: string[]
  contractTypePrefs: string[]
  geoPrefs: string[]
  certifications: string[]
  contractVehicles: string[]
  capabilityStatement: string | null
  pastPerformance: string | null
}
interface UserData {
  name: string | null
  email: string
  subscriptionTier: string
  createdAt?: string
  companyProfile?: CompanyProfileData | null
}
interface TeamMember {
  id: string; userId: string; role: string
  permissions: { canSaveContracts: boolean; canGenerateDocs: boolean; canManageWatchlist: boolean; canEditCompanyProfile: boolean }
  joinedAt: string; user: { id: string; name: string | null; email: string }
}
interface TeamInvite { id: string; token: string; email: string; role: string; expiresAt: string; createdAt: string }
interface TeamData { id: string; name: string; role: string; permissions: Record<string, boolean>; members: TeamMember[]; invites: TeamInvite[] }

interface Prefs {
  notifyDigest: boolean; notifyDeadlines: boolean; notifyRadar: boolean; notifyInstant: boolean
  feedEligibleOnly: boolean; feedHideSaved: boolean; feedDensity: 'comfortable' | 'compact'
  feedDefaultDueWithin: string; feedMinMatch: number
}
const DEFAULT_PREFS: Prefs = {
  notifyDigest: true, notifyDeadlines: true, notifyRadar: true, notifyInstant: false,
  feedEligibleOnly: true, feedHideSaved: true, feedDensity: 'comfortable', feedDefaultDueWithin: '', feedMinMatch: 0,
}

// ─── Design tokens ──────────────────────────────────────────────────────────
const mono = 'var(--font-geist-mono, monospace)'
const sans = 'var(--font-geist-sans, sans-serif)'
const crimson = '#C41230'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 13px', background: '#F8F8F7', border: '1px solid rgba(0,0,0,0.1)',
  color: '#0A0A0A', fontSize: 13, fontFamily: mono, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s, box-shadow 0.15s',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
  color: 'rgba(0,0,0,0.4)', marginBottom: 8, fontFamily: mono,
}

const NAICS_OPTIONS = [
  '236220 — Commercial Building Construction', '238210 — Electrical Contractors',
  '511210 — Software Publishers', '518210 — Data Processing/Cloud',
  '541330 — Engineering Services', '541511 — Custom Computer Programming',
  '541512 — Computer Systems Design', '541519 — Other Computer Services',
  '541611 — Management Consulting', '541690 — Other Scientific/Technical',
  '541712 — R&D Physical Sciences', '541990 — Other Professional Services',
  '561210 — Facilities Management', '561320 — Temporary Staffing',
  '621999 — Other Health Services',
]
const BUSINESS_TYPES = ['Small Business', '8(a) Certified', 'SDVOSB', 'WOSB', 'HUBZone', 'Large Business', 'Nonprofit']
const CONTRACT_TYPES = ['Services', 'Products', 'Construction', 'R&D', 'IT/Technology']
const CERTIFICATIONS = ['ISO 9001', 'ISO 27001', 'CMMI Level 2', 'CMMI Level 3', 'SOC 2', 'Secret Clearance', 'Top Secret', 'Top Secret/SCI']
const CONTRACT_VEHICLES = ['GSA MAS', 'SEWP V', 'Alliant 2', 'CIO-SP3', 'OASIS', '8(a) STARS III', 'VETS 2', 'HCaTS', 'ENCORE III', 'DISA SETI']
const ORG_SIZES = ['1 – 10', '11 – 50', '51 – 200', '201 – 500', '500+']

const PERMISSION_LABELS: Record<string, string> = {
  canSaveContracts: 'Save contracts', canGenerateDocs: 'Generate documents',
  canManageWatchlist: 'Manage watchlist', canEditCompanyProfile: 'Edit company profile',
}

function toggle<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]
}

// ─── Reusable primitives ────────────────────────────────────────────────────
function ProfileChip({ label, selected, onClick, disabled }: { label: string; selected: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ padding: '6px 11px', fontSize: 10.5, borderRadius: 6, border: selected ? '1px solid rgba(196,18,48,0.45)' : '1px solid rgba(0,0,0,0.1)', background: selected ? 'rgba(196,18,48,0.07)' : '#fff', color: selected ? crimson : 'rgba(0,0,0,0.5)', cursor: disabled ? 'default' : 'pointer', fontFamily: mono, letterSpacing: '0.04em', transition: 'all 0.14s ease', opacity: disabled ? 0.6 : 1 }}>
      {label}
    </button>
  )
}

function Switch({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onClick} disabled={disabled}
      style={{ width: 42, height: 24, borderRadius: 13, background: on ? crimson : 'rgba(0,0,0,0.14)', position: 'relative', flexShrink: 0, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', transition: 'background 0.22s ease', padding: 0, boxShadow: on ? '0 0 0 3px rgba(196,18,48,0.10)' : 'none' }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.22s cubic-bezier(0.34,1.56,0.64,1)', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }} />
    </button>
  )
}

function ToggleRow({ title, desc, on, onClick, disabled }: { title: string; desc: string; on: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <div onClick={() => !disabled && onClick()}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, padding: '16px 0', borderBottom: '1px solid rgba(0,0,0,0.06)', cursor: disabled ? 'default' : 'pointer' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0A0A0A', fontFamily: sans, marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.42)', fontFamily: sans, lineHeight: 1.5 }}>{desc}</div>
      </div>
      <Switch on={on} onClick={onClick} disabled={disabled} />
    </div>
  )
}

function Segmented<T extends string | number>({ options, value, onChange }: { options: { label: string; value: T }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div style={{ display: 'inline-flex', background: '#F1F0EC', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: 3, gap: 3, flexWrap: 'wrap' }}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button key={String(o.value)} type="button" onClick={() => onChange(o.value)}
            style={{ padding: '7px 14px', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, border: 'none', borderRadius: 6, cursor: 'pointer', transition: 'all 0.16s ease', background: active ? '#fff' : 'transparent', color: active ? crimson : 'rgba(0,0,0,0.4)', boxShadow: active ? '0 1px 4px rgba(0,0,0,0.10)' : 'none' }}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// Section card with a title/description header.
function Card({ title, desc, right, children }: { title: string; desc?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '26px 28px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 22 }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: sans, letterSpacing: '-0.01em' }}>{title}</h2>
          {desc && <p style={{ fontSize: 12.5, color: 'rgba(0,0,0,0.42)', margin: '6px 0 0', fontFamily: sans, lineHeight: 1.5, maxWidth: 520 }}>{desc}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}

function SaveButton({ saving, saved, label = 'SAVE CHANGES', savedLabel = 'SAVED ✓' }: { saving: boolean; saved: boolean; label?: string; savedLabel?: string }) {
  return (
    <button type="submit" disabled={saving}
      style={{ padding: '11px 22px', background: saved ? 'rgba(22,163,74,0.1)' : crimson, color: saved ? '#16a34a' : '#fff', border: saved ? '1px solid rgba(22,163,74,0.3)' : 'none', borderRadius: 8, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, fontFamily: mono, transition: 'all 0.2s ease' }}>
      {saving ? 'SAVING…' : saved ? savedLabel : `${label} →`}
    </button>
  )
}

// ─── Nav icons ──────────────────────────────────────────────────────────────
function Icon({ name }: { name: string }) {
  const common = { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (name) {
    case 'account': return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>
    case 'company': return <svg {...common}><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1" /></svg>
    case 'notifications': return <svg {...common}><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
    case 'feed': return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
    case 'billing': return <svg {...common}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>
    case 'team': return <svg {...common}><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5" /><path d="M16 5a3 3 0 0 1 0 6M18 20c0-2-1-3.5-2.5-4.5" /></svg>
    case 'security': return <svg {...common}><path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z" /><path d="M9 12l2 2 4-4" /></svg>
    default: return null
  }
}

const TABS = [
  { id: 'account', label: 'Account' },
  { id: 'company', label: 'Company Profile' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'feed', label: 'Feed' },
  { id: 'billing', label: 'Billing' },
  { id: 'team', label: 'Team' },
  { id: 'security', label: 'Security' },
] as const
type TabId = typeof TABS[number]['id']

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [tab, setTab] = useState<TabId>('account')
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  // Account
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [website, setWebsite] = useState('')
  const [uei, setUei] = useState('')

  // Preferences (notifications + feed) — auto-saved
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)
  const [prefPulse, setPrefPulse] = useState(false)
  const [needsMigration, setNeedsMigration] = useState(false)

  // Company profile
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [cpBusinessTypes, setCpBusinessTypes] = useState<string[]>([])
  const [cpNaicsCodes, setCpNaicsCodes] = useState<string[]>([])
  const [cpContractSizePrefs, setCpContractSizePrefs] = useState<string[]>([])
  const [cpContractTypePrefs, setCpContractTypePrefs] = useState<string[]>([])
  const [cpGeoPrefs, setCpGeoPrefs] = useState<string[]>([])
  const [cpCertifications, setCpCertifications] = useState<string[]>([])
  const [cpContractVehicles, setCpContractVehicles] = useState<string[]>([])
  const [cpOrgSize, setCpOrgSize] = useState('')
  const [cpCapabilityStatement, setCpCapabilityStatement] = useState('')
  const [cpPastPerformance, setCpPastPerformance] = useState('')

  // Billing
  const [upgradeError, setUpgradeError] = useState('')

  // Team
  const [team, setTeam] = useState<TeamData | null>(null)
  const [teamLoading, setTeamLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [newInviteToken, setNewInviteToken] = useState<string | null>(null)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [removingMember, setRemovingMember] = useState<string | null>(null)
  const [updatingMember, setUpdatingMember] = useState<string | null>(null)

  useEffect(() => { loadSettings(); loadTeam(); loadPrefs() }, [])

  async function loadSettings() {
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()
      if (data.user) {
        setUserData(data.user)
        setName(data.user.name ?? '')
        setEmail(data.user.email ?? '')
        const cp = data.user.companyProfile
        setCompanyName(cp?.companyName ?? '')
        setWebsite(cp?.website ?? '')
        setUei(cp?.uei ?? '')
        setCpBusinessTypes(cp?.businessTypes ?? [])
        setCpNaicsCodes(cp?.naicsCodes ?? [])
        setCpContractSizePrefs(cp?.contractSizePrefs ?? [])
        setCpContractTypePrefs(cp?.contractTypePrefs ?? [])
        setCpGeoPrefs(cp?.geoPrefs ?? [])
        setCpCertifications(cp?.certifications ?? [])
        setCpContractVehicles(cp?.contractVehicles ?? [])
        setCpOrgSize(cp?.orgSize ?? '')
        setCpCapabilityStatement(cp?.capabilityStatement ?? '')
        setCpPastPerformance(cp?.pastPerformance ?? '')
      }
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  async function loadPrefs() {
    try {
      const res = await fetch('/api/preferences')
      const data = await res.json()
      if (data.preferences) setPrefs({ ...DEFAULT_PREFS, ...data.preferences })
    } catch (err) { console.error(err) }
  }

  async function loadTeam() {
    try {
      const res = await fetch('/api/team')
      const data = await res.json()
      setTeam(data.team ?? null)
    } catch (err) { console.error(err) } finally { setTeamLoading(false) }
  }

  // Optimistic single-field auto-save for preferences.
  async function savePref(patch: Partial<Prefs>) {
    setPrefs((prev) => ({ ...prev, ...patch }))
    try {
      const res = await fetch('/api/preferences', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
      })
      const data = await res.json()
      if (data.needsMigration) setNeedsMigration(true)
      setPrefPulse(true); setTimeout(() => setPrefPulse(false), 1600)
    } catch { /* keep optimistic value */ }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(''); setSaved(false)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, companyName, website, uei }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Save failed'); return }
      setSaved(true); setTimeout(() => setSaved(false), 3000)
    } catch { setError('Failed to save settings') } finally { setSaving(false) }
  }

  async function handleUpgrade(tierId: string) {
    setUpgradeError('')
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tier: tierId }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setUpgradeError(data.error ?? 'Failed to start checkout')
    } catch { setUpgradeError('Failed to start checkout session') }
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault(); setProfileSaving(true); setProfileError(''); setProfileSaved(false)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessTypes: cpBusinessTypes, naicsCodes: cpNaicsCodes, contractSizePrefs: cpContractSizePrefs,
          contractTypePrefs: cpContractTypePrefs, geoPrefs: cpGeoPrefs, certifications: cpCertifications,
          contractVehicles: cpContractVehicles, orgSize: cpOrgSize || null,
          capabilityStatement: cpCapabilityStatement || null, pastPerformance: cpPastPerformance || null,
        }),
      })
      if (!res.ok) { const d = await res.json(); setProfileError(d.error ?? 'Save failed'); return }
      setProfileSaved(true); setTimeout(() => setProfileSaved(false), 3000)
    } catch { setProfileError('Failed to save') } finally { setProfileSaving(false) }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault(); if (!inviteEmail.trim()) return
    setInviting(true); setInviteError(''); setNewInviteToken(null)
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok) setInviteError(data.error ?? 'Failed to create invite')
      else { setNewInviteToken(data.invite.token); setInviteEmail(''); await loadTeam() }
    } catch { setInviteError('Failed to create invite') } finally { setInviting(false) }
  }

  async function handleRemoveMember(memberId: string) {
    setRemovingMember(memberId)
    try { await fetch(`/api/team/members/${memberId}`, { method: 'DELETE' }); await loadTeam() }
    finally { setRemovingMember(null) }
  }

  async function handleTogglePermission(memberId: string, currentPerms: Record<string, boolean>, key: string) {
    setUpdatingMember(memberId)
    const newPerms = { ...currentPerms, [key]: !currentPerms[key] }
    try {
      await fetch(`/api/team/members/${memberId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ permissions: newPerms }),
      })
      await loadTeam()
    } finally { setUpdatingMember(null) }
  }

  function copyInviteLink(token: string) {
    const url = `${window.location.origin}/invite/${token}`
    navigator.clipboard.writeText(url).then(() => { setCopiedToken(token); setTimeout(() => setCopiedToken(null), 2000) })
  }

  if (loading) {
    return <div style={{ padding: '32px 40px', fontSize: 10, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.25)', fontFamily: mono }}>LOADING…</div>
  }

  const currentTier = userData?.subscriptionTier ?? 'free'
  const isAdmin = team?.role === 'admin'
  const canEditProfile = isAdmin || !team
  const memberSince = userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : null

  const chipGroup = (title: string, items: string[], selected: string[], onToggle: (v: string) => void, labelFor?: (v: string) => string, valueFor?: (v: string) => string) => (
    <div>
      <div style={{ ...labelStyle, marginBottom: 10 }}>{title}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {items.map((it) => {
          const val = valueFor ? valueFor(it) : it
          return <ProfileChip key={it} label={labelFor ? labelFor(it) : it} selected={selected.includes(val)} onClick={() => canEditProfile && onToggle(val)} disabled={!canEditProfile} />
        })}
      </div>
    </div>
  )

  return (
    <div style={{ padding: '32px 40px', minHeight: '100vh' }}>
      <style>{`
        @keyframes panelIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pillIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        .ir-set-input:focus { border-color: rgba(196,18,48,0.4) !important; box-shadow: 0 0 0 3px rgba(196,18,48,0.08) !important; }
        .ir-nav-item:hover { background: rgba(0,0,0,0.03); }
        .ir-panel { animation: panelIn 0.28s ease both; }
        @media (max-width: 860px) {
          .ir-settings-grid { grid-template-columns: 1fr !important; }
          .ir-settings-nav { position: static !important; flex-direction: row !important; overflow-x: auto; border-right: none !important; border-bottom: 1px solid rgba(0,0,0,0.08); padding-bottom: 10px !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 26 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.25)', marginBottom: 10, fontFamily: mono }}>CONFIGURATION</div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.02em', margin: 0, fontFamily: sans }}>Settings</h1>
        <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.42)', margin: '8px 0 0', fontFamily: sans }}>
          {userData?.name ? `${userData.name} · ` : ''}{userData?.email}{memberSince ? ` · Member since ${memberSince}` : ''}
        </p>
      </div>

      <div className="ir-settings-grid" style={{ display: 'grid', gridTemplateColumns: '218px 1fr', gap: 28, alignItems: 'start' }}>
        {/* Left nav */}
        <nav className="ir-settings-nav" style={{ display: 'flex', flexDirection: 'column', gap: 3, position: 'sticky', top: 24, borderRight: '1px solid rgba(0,0,0,0.07)', paddingRight: 16 }}>
          {TABS.map((t) => {
            const active = tab === t.id
            return (
              <button key={t.id} className="ir-nav-item" onClick={() => setTab(t.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: active ? 'rgba(196,18,48,0.06)' : 'transparent', color: active ? crimson : 'rgba(0,0,0,0.55)', fontFamily: mono, fontSize: 11.5, fontWeight: active ? 700 : 500, letterSpacing: '0.03em', whiteSpace: 'nowrap', transition: 'all 0.15s ease', position: 'relative', textAlign: 'left' }}>
                <span style={{ display: 'flex', color: active ? crimson : 'rgba(0,0,0,0.35)' }}><Icon name={t.id} /></span>
                {t.label}
                {active && <span style={{ position: 'absolute', left: -16, top: 8, bottom: 8, width: 3, borderRadius: 2, background: crimson }} />}
              </button>
            )
          })}
        </nav>

        {/* Panel */}
        <div key={tab} className="ir-panel" style={{ minWidth: 0, maxWidth: 720 }}>
          {tab === 'account' && (
            <Card title="Account" desc="Your login identity and headline company details. Changing your email requires re-verifying the new address.">
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div><label style={labelStyle}>FULL NAME</label><input className="ir-set-input" type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="Jane Smith" /></div>
                  <div><label style={labelStyle}>EMAIL</label><input className="ir-set-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} placeholder="jane@company.com" /></div>
                </div>
                <div><label style={labelStyle}>COMPANY NAME</label><input className="ir-set-input" type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} style={inputStyle} placeholder="Acme Government Solutions LLC" /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div><label style={labelStyle}>WEBSITE</label><input className="ir-set-input" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} style={inputStyle} placeholder="https://www.company.com" /></div>
                  <div><label style={labelStyle}>UEI NUMBER</label><input className="ir-set-input" type="text" value={uei} onChange={(e) => setUei(e.target.value)} style={inputStyle} placeholder="12-char SAM.gov UEI" maxLength={12} /></div>
                </div>
                {error && <div style={{ padding: '10px 13px', background: 'rgba(196,18,48,0.05)', border: '1px solid rgba(196,18,48,0.2)', borderRadius: 8, color: crimson, fontSize: 12, fontFamily: sans }}>{error}</div>}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}><SaveButton saving={saving} saved={saved} /></div>
              </form>
            </Card>
          )}

          {tab === 'company' && (
            <Card title="Company Profile" desc="Everything the matcher and document engine use to score contracts and pre-fill your paperwork. The more complete, the sharper your matches."
              right={!canEditProfile ? <span style={{ fontSize: 9, letterSpacing: '0.1em', color: 'rgba(0,0,0,0.35)', fontFamily: mono, border: '1px solid rgba(0,0,0,0.1)', padding: '4px 8px', borderRadius: 6 }}>VIEW ONLY · ADMIN</span> : undefined}>
              <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {chipGroup('ORGANIZATION SIZE', ORG_SIZES, cpOrgSize ? [cpOrgSize] : [], (v) => setCpOrgSize(cpOrgSize === v ? '' : v))}
                {chipGroup('BUSINESS TYPE', BUSINESS_TYPES, cpBusinessTypes, (v) => setCpBusinessTypes(toggle(cpBusinessTypes, v)))}
                <div>
                  {chipGroup('NAICS CODES', NAICS_OPTIONS, cpNaicsCodes, (v) => setCpNaicsCodes(toggle(cpNaicsCodes, v)), (n) => n, (n) => n.split(' ')[0])}
                  {cpNaicsCodes.length > 0 && <div style={{ marginTop: 8, fontSize: 10, color: crimson, fontFamily: mono }}>{cpNaicsCodes.length} CODE{cpNaicsCodes.length !== 1 ? 'S' : ''} SELECTED</div>}
                </div>
                {chipGroup('CONTRACT TYPES', CONTRACT_TYPES, cpContractTypePrefs, (v) => setCpContractTypePrefs(toggle(cpContractTypePrefs, v)))}
                {chipGroup('CONTRACT SIZE PREFERENCE', ['Micro (<$10K)', 'Simplified ($10K-$250K)', 'Large ($250K+)', 'Any'], cpContractSizePrefs, (v) => setCpContractSizePrefs(toggle(cpContractSizePrefs, v)))}
                {chipGroup('CONTRACT VEHICLES', CONTRACT_VEHICLES, cpContractVehicles, (v) => setCpContractVehicles(toggle(cpContractVehicles, v)))}
                {chipGroup('CERTIFICATIONS & CLEARANCES', CERTIFICATIONS, cpCertifications, (v) => setCpCertifications(toggle(cpCertifications, v)))}
                {chipGroup('GEOGRAPHIC PREFERENCES', ['CONUS', 'Worldwide'], cpGeoPrefs, (v) => setCpGeoPrefs(toggle(cpGeoPrefs, v)))}
                <div>
                  <label style={labelStyle}>CAPABILITY STATEMENT</label>
                  <textarea value={cpCapabilityStatement} onChange={(e) => setCpCapabilityStatement(e.target.value)} disabled={!canEditProfile} rows={4}
                    placeholder="Describe your core capabilities, differentiators, and focus areas as a government contractor…"
                    style={{ width: '100%', padding: '11px 13px', background: '#F8F8F7', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, color: '#0A0A0A', fontSize: 12.5, fontFamily: sans, outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6, opacity: canEditProfile ? 1 : 0.6 }} />
                </div>
                <div>
                  <label style={labelStyle}>PAST PERFORMANCE</label>
                  <textarea value={cpPastPerformance} onChange={(e) => setCpPastPerformance(e.target.value)} disabled={!canEditProfile} rows={4}
                    placeholder="Key past contracts, agencies served, dollar values, outcomes…"
                    style={{ width: '100%', padding: '11px 13px', background: '#F8F8F7', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, color: '#0A0A0A', fontSize: 12.5, fontFamily: sans, outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6, opacity: canEditProfile ? 1 : 0.6 }} />
                </div>
                {profileError && <div style={{ padding: '10px 13px', background: 'rgba(196,18,48,0.05)', border: '1px solid rgba(196,18,48,0.2)', borderRadius: 8, color: crimson, fontSize: 12 }}>{profileError}</div>}
                {canEditProfile && <div style={{ display: 'flex', justifyContent: 'flex-end' }}><SaveButton saving={profileSaving} saved={profileSaved} label="SAVE PROFILE" savedLabel="PROFILE SAVED ✓" /></div>}
              </form>
            </Card>
          )}

          {tab === 'notifications' && (
            <>
              <Card title="Email notifications" desc={`Choose what lands in your inbox. Emails go to ${userData?.email ?? 'your account address'}. Changes save automatically.`}
                right={<span style={{ fontSize: 9, letterSpacing: '0.1em', color: prefPulse ? '#16a34a' : 'rgba(0,0,0,0.25)', fontFamily: mono, transition: 'color 0.2s', animation: prefPulse ? 'pillIn 0.2s ease' : undefined }}>{prefPulse ? 'SAVED ✓' : 'AUTO-SAVE'}</span>}>
                <div>
                  <ToggleRow title="Daily match digest" desc="A morning email with the newest contracts scored against your profile." on={prefs.notifyDigest} onClick={() => savePref({ notifyDigest: !prefs.notifyDigest })} />
                  <ToggleRow title="Deadline reminders" desc="A nudge 3 days before a saved contract's response deadline — so nothing slips." on={prefs.notifyDeadlines} onClick={() => savePref({ notifyDeadlines: !prefs.notifyDeadlines })} />
                  <ToggleRow title="Recompete radar" desc="Alerts when contracts in your NAICS space are approaching expiry and re-competition." on={prefs.notifyRadar} onClick={() => savePref({ notifyRadar: !prefs.notifyRadar })} />
                  <div style={{ borderBottom: 'none' }}>
                    <ToggleRow title="Instant high-match alerts" desc="Email the moment a 90%+ match to your profile is posted. Best for hot pursuit." on={prefs.notifyInstant} onClick={() => savePref({ notifyInstant: !prefs.notifyInstant })} />
                  </div>
                </div>
                <div style={{ marginTop: 18, padding: '12px 14px', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 8, fontSize: 11.5, color: 'rgba(0,0,0,0.45)', fontFamily: sans, lineHeight: 1.6 }}>
                  Every email includes a one-click unsubscribe. Turning everything off here silences all IR emails except security and billing notices.
                </div>
              </Card>
              <Card title="Quiet everything" desc="A single switch to pause all opportunity emails without losing your profile.">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.55)', fontFamily: sans }}>
                    {prefs.notifyDigest || prefs.notifyDeadlines || prefs.notifyRadar || prefs.notifyInstant ? 'You are receiving opportunity emails.' : 'All opportunity emails are paused.'}
                  </span>
                  <button onClick={() => savePref({ notifyDigest: false, notifyDeadlines: false, notifyRadar: false, notifyInstant: false })}
                    disabled={!(prefs.notifyDigest || prefs.notifyDeadlines || prefs.notifyRadar || prefs.notifyInstant)}
                    style={{ padding: '9px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', fontFamily: mono, borderRadius: 8, border: '1px solid rgba(0,0,0,0.15)', background: 'transparent', color: 'rgba(0,0,0,0.55)', cursor: 'pointer', opacity: (prefs.notifyDigest || prefs.notifyDeadlines || prefs.notifyRadar || prefs.notifyInstant) ? 1 : 0.4 }}>
                    PAUSE ALL
                  </button>
                </div>
              </Card>
            </>
          )}

          {tab === 'feed' && (
            <Card title="Feed preferences" desc="How your opportunity feed looks and filters the moment it loads. These become your defaults — you can still adjust per session on the dashboard. Saves automatically."
              right={<span style={{ fontSize: 9, letterSpacing: '0.1em', color: prefPulse ? '#16a34a' : 'rgba(0,0,0,0.25)', fontFamily: mono, transition: 'color 0.2s' }}>{prefPulse ? 'SAVED ✓' : 'AUTO-SAVE'}</span>}>
              <ToggleRow title="Only show contracts I can prime" desc="Hide set-asides your certifications don't qualify you to bid as prime contractor." on={prefs.feedEligibleOnly} onClick={() => savePref({ feedEligibleOnly: !prefs.feedEligibleOnly })} />
              <ToggleRow title="Hide contracts already in my pipeline" desc="Keep the feed a clean triage queue by hiding contracts you've already saved." on={prefs.feedHideSaved} onClick={() => savePref({ feedHideSaved: !prefs.feedHideSaved })} />
              <div style={{ padding: '18px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0A0A0A', fontFamily: sans, marginBottom: 3 }}>Card density</div>
                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.42)', fontFamily: sans, lineHeight: 1.5, marginBottom: 12 }}>Comfortable is roomy and readable; compact fits more opportunities on screen.</div>
                <Segmented value={prefs.feedDensity} onChange={(v) => savePref({ feedDensity: v })} options={[{ label: 'COMFORTABLE', value: 'comfortable' }, { label: 'COMPACT', value: 'compact' }]} />
              </div>
              <div style={{ padding: '18px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0A0A0A', fontFamily: sans, marginBottom: 3 }}>Default deadline window</div>
                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.42)', fontFamily: sans, lineHeight: 1.5, marginBottom: 12 }}>Pre-filter the feed to contracts closing within a set window when it loads.</div>
                <Segmented value={prefs.feedDefaultDueWithin} onChange={(v) => savePref({ feedDefaultDueWithin: v })}
                  options={[{ label: 'ANY', value: '' }, { label: '7 DAYS', value: '7' }, { label: '14 DAYS', value: '14' }, { label: '30 DAYS', value: '30' }, { label: '60 DAYS', value: '60' }]} />
              </div>
              <div style={{ padding: '18px 0 4px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0A0A0A', fontFamily: sans }}>Minimum match score</div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: crimson, fontFamily: mono }}>{prefs.feedMinMatch === 0 ? 'OFF' : `${prefs.feedMinMatch}%+`}</span>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.42)', fontFamily: sans, lineHeight: 1.5, margin: '3px 0 14px' }}>Hide low-scoring matches. Contracts scored below this never appear in your feed.</div>
                <input type="range" min={0} max={90} step={10} value={prefs.feedMinMatch}
                  onChange={(e) => setPrefs((p) => ({ ...p, feedMinMatch: Number(e.target.value) }))}
                  onMouseUp={(e) => savePref({ feedMinMatch: Number((e.target as HTMLInputElement).value) })}
                  onTouchEnd={(e) => savePref({ feedMinMatch: Number((e.target as HTMLInputElement).value) })}
                  style={{ width: '100%', accentColor: crimson, cursor: 'pointer' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'rgba(0,0,0,0.3)', fontFamily: mono, marginTop: 4 }}>
                  <span>OFF</span><span>50%</span><span>90%</span>
                </div>
              </div>
              {needsMigration && (
                <div style={{ marginTop: 14, padding: '11px 14px', background: 'rgba(180,83,9,0.06)', border: '1px solid rgba(180,83,9,0.25)', borderRadius: 8, fontSize: 11.5, color: '#b45309', fontFamily: sans, lineHeight: 1.6 }}>
                  Notification preferences saved. Feed appearance settings need a one-time database migration to persist — run <strong>RUN DB MIGRATION</strong> in the admin dashboard.
                </div>
              )}
            </Card>
          )}

          {tab === 'billing' && (
            <Card title="Subscription" desc="Your plan controls proposal generation, seats, and advanced intelligence. Upgrade or change anytime — billing is prorated by Stripe."
              right={<span style={{ fontSize: 9, letterSpacing: '0.12em', padding: '5px 11px', borderRadius: 20, background: 'rgba(196,18,48,0.07)', color: crimson, border: '1px solid rgba(196,18,48,0.2)', fontFamily: mono, textTransform: 'uppercase' }}>CURRENT · {currentTier}</span>}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                {[{ id: 'starter', ...SUBSCRIPTION_TIERS.starter }, { id: 'pro', ...SUBSCRIPTION_TIERS.pro, popular: true }, { id: 'enterprise', ...SUBSCRIPTION_TIERS.enterprise }].map((tier) => {
                  const isCurrent = currentTier === tier.id
                  const popular = (tier as { popular?: boolean }).popular
                  return (
                    <div key={tier.id} style={{ background: isCurrent ? 'rgba(196,18,48,0.03)' : '#F8F8F7', border: `1px solid ${isCurrent ? 'rgba(196,18,48,0.25)' : 'rgba(0,0,0,0.08)'}`, borderRadius: 10, padding: '20px', position: 'relative', borderTop: `3px solid ${isCurrent ? crimson : 'transparent'}` }}>
                      {popular && !isCurrent && <div style={{ fontSize: 8, letterSpacing: '0.12em', color: crimson, marginBottom: 8, fontFamily: mono }}>★ POPULAR</div>}
                      <div style={{ fontSize: 9, letterSpacing: '0.12em', color: 'rgba(0,0,0,0.4)', marginBottom: 8, fontFamily: mono }}>{tier.name.toUpperCase()}</div>
                      <div style={{ marginBottom: 16 }}><span style={{ fontSize: 30, fontWeight: 700, color: '#0A0A0A', fontFamily: sans }}>${tier.price}</span><span style={{ fontSize: 11, color: 'rgba(0,0,0,0.3)', marginLeft: 4 }}>/mo</span></div>
                      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {tier.features.map((f) => <li key={f} style={{ fontSize: 11.5, color: 'rgba(0,0,0,0.5)', display: 'flex', gap: 8, fontFamily: sans, lineHeight: 1.4 }}><span style={{ color: crimson, flexShrink: 0 }}>—</span>{f}</li>)}
                      </ul>
                      {isCurrent
                        ? <div style={{ fontSize: 10, letterSpacing: '0.1em', color: 'rgba(0,0,0,0.35)', textAlign: 'center', padding: '9px', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 7, fontFamily: mono }}>CURRENT PLAN</div>
                        : <button onClick={() => handleUpgrade(tier.id)} style={{ width: '100%', padding: '9px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', background: crimson, color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontFamily: mono }}>{tier.price > (SUBSCRIPTION_TIERS[currentTier as keyof typeof SUBSCRIPTION_TIERS]?.price ?? 0) ? 'UPGRADE →' : 'CHANGE →'}</button>}
                    </div>
                  )
                })}
              </div>
              {upgradeError && <div style={{ marginTop: 12, padding: '10px 13px', background: 'rgba(196,18,48,0.05)', border: '1px solid rgba(196,18,48,0.2)', borderRadius: 8, color: crimson, fontSize: 12 }}>{upgradeError}</div>}
            </Card>
          )}

          {tab === 'team' && (
            <Card title="Team" desc="Invite colleagues, assign roles, and control what each member can do in your workspace."
              right={team ? <span style={{ fontSize: 9, letterSpacing: '0.12em', padding: '5px 11px', borderRadius: 20, background: isAdmin ? 'rgba(196,18,48,0.07)' : 'rgba(0,0,0,0.04)', color: isAdmin ? crimson : 'rgba(0,0,0,0.45)', border: `1px solid ${isAdmin ? 'rgba(196,18,48,0.2)' : 'rgba(0,0,0,0.1)'}`, fontFamily: mono, textTransform: 'uppercase' }}>{isAdmin ? 'ADMIN' : 'MEMBER'}</span> : undefined}>
              {teamLoading ? (
                <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.25)', letterSpacing: '0.12em', fontFamily: mono }}>LOADING TEAM…</div>
              ) : !team ? (
                <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)', fontFamily: sans }}>No team yet. Complete onboarding to create your team workspace.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
                  <div>
                    <div style={{ ...labelStyle, marginBottom: 4 }}>WORKSPACE</div>
                    <div style={{ fontSize: 17, fontWeight: 600, color: '#0A0A0A', fontFamily: sans }}>{team.name}</div>
                  </div>
                  {isAdmin && (
                    <div>
                      <div style={{ ...labelStyle, marginBottom: 12 }}>INVITE MEMBER</div>
                      <form onSubmit={handleInvite} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@company.com" style={{ ...inputStyle, flex: 1, minWidth: 200 }} required />
                        <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'member' | 'admin')} style={{ padding: '11px 13px', background: '#F8F8F7', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, color: '#0A0A0A', fontSize: 11, fontFamily: mono, outline: 'none', cursor: 'pointer' }}>
                          <option value="member">MEMBER</option><option value="admin">ADMIN</option>
                        </select>
                        <button type="submit" disabled={inviting} style={{ padding: '11px 18px', background: crimson, color: '#fff', border: 'none', borderRadius: 8, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', cursor: inviting ? 'not-allowed' : 'pointer', opacity: inviting ? 0.6 : 1, fontFamily: mono, whiteSpace: 'nowrap' }}>{inviting ? '…' : 'SEND INVITE →'}</button>
                      </form>
                      {inviteError && <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(196,18,48,0.05)', border: '1px solid rgba(196,18,48,0.2)', borderRadius: 8, color: crimson, fontSize: 11 }}>{inviteError}</div>}
                      {newInviteToken && (
                        <div style={{ marginTop: 10, padding: '13px 15px', background: '#F8F8F7', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8 }}>
                          <div style={{ fontSize: 9, letterSpacing: '0.12em', color: 'rgba(0,0,0,0.4)', marginBottom: 8, fontFamily: mono }}>INVITE LINK — COPY AND SHARE:</div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <div style={{ flex: 1, fontSize: 11, color: 'rgba(0,0,0,0.5)', fontFamily: mono, wordBreak: 'break-all' }}>{typeof window !== 'undefined' ? `${window.location.origin}/invite/${newInviteToken}` : `/invite/${newInviteToken}`}</div>
                            <button onClick={() => copyInviteLink(newInviteToken)} style={{ padding: '7px 13px', background: copiedToken === newInviteToken ? 'rgba(22,163,74,0.1)' : '#0A0A0A', color: copiedToken === newInviteToken ? '#16a34a' : '#fff', border: 'none', borderRadius: 6, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer', fontFamily: mono, whiteSpace: 'nowrap', flexShrink: 0 }}>{copiedToken === newInviteToken ? 'COPIED ✓' : 'COPY'}</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div>
                    <div style={{ ...labelStyle, marginBottom: 12 }}>MEMBERS ({team.members.length})</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {team.members.map((member) => (
                        <div key={member.id} style={{ background: '#F8F8F7', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 8, padding: '15px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isAdmin ? 12 : 0, gap: 12 }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: '#0A0A0A', fontFamily: sans }}>{member.user.name ?? member.user.email}</div>
                              <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', fontFamily: sans }}>{member.user.email}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontSize: 8, letterSpacing: '0.12em', padding: '3px 9px', borderRadius: 20, background: member.role === 'admin' ? 'rgba(196,18,48,0.07)' : 'rgba(0,0,0,0.04)', color: member.role === 'admin' ? crimson : 'rgba(0,0,0,0.45)', border: `1px solid ${member.role === 'admin' ? 'rgba(196,18,48,0.2)' : 'rgba(0,0,0,0.1)'}`, fontFamily: mono, textTransform: 'uppercase' }}>{member.role}</span>
                              {isAdmin && <button onClick={() => handleRemoveMember(member.id)} disabled={removingMember === member.id} style={{ padding: '5px 11px', background: 'transparent', color: 'rgba(0,0,0,0.35)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 6, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', cursor: removingMember === member.id ? 'not-allowed' : 'pointer', fontFamily: mono }}>{removingMember === member.id ? '…' : 'REMOVE'}</button>}
                            </div>
                          </div>
                          {isAdmin && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, paddingTop: 12, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                              {Object.entries(PERMISSION_LABELS).map(([key, permLabel]) => {
                                const value = (member.permissions as Record<string, boolean>)[key] ?? false
                                const isUpdating = updatingMember === member.id
                                return (
                                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: isUpdating ? 'not-allowed' : 'pointer', opacity: isUpdating ? 0.5 : 1 }} onClick={() => !isUpdating && handleTogglePermission(member.id, member.permissions as Record<string, boolean>, key)}>
                                    <Switch on={value} onClick={() => !isUpdating && handleTogglePermission(member.id, member.permissions as Record<string, boolean>, key)} disabled={isUpdating} />
                                    <span style={{ fontSize: 11.5, color: value ? '#0A0A0A' : 'rgba(0,0,0,0.4)', fontFamily: sans, userSelect: 'none' }}>{permLabel}</span>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  {isAdmin && team.invites.length > 0 && (
                    <div>
                      <div style={{ ...labelStyle, marginBottom: 12 }}>PENDING INVITES ({team.invites.length})</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {team.invites.map((invite) => (
                          <div key={invite.id} style={{ background: '#F8F8F7', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 8, padding: '13px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, color: '#0A0A0A', fontFamily: sans }}>{invite.email}</div>
                              <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.35)', fontFamily: mono, marginTop: 2 }}>EXPIRES {new Date(invite.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {invite.role.toUpperCase()}</div>
                            </div>
                            <button onClick={() => copyInviteLink(invite.token)} style={{ padding: '7px 13px', background: copiedToken === invite.token ? 'rgba(22,163,74,0.1)' : 'transparent', color: copiedToken === invite.token ? '#16a34a' : 'rgba(0,0,0,0.5)', border: `1px solid ${copiedToken === invite.token ? 'rgba(22,163,74,0.3)' : 'rgba(0,0,0,0.1)'}`, borderRadius: 6, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer', fontFamily: mono, whiteSpace: 'nowrap' }}>{copiedToken === invite.token ? 'COPIED ✓' : 'COPY LINK'}</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}

          {tab === 'security' && <SecuritySection />}
        </div>
      </div>
    </div>
  )
}
