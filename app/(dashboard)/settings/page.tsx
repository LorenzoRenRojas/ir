'use client'

import { useEffect, useState } from 'react'
import { SUBSCRIPTION_TIERS } from '@/lib/stripe'

interface UserData {
  name: string | null
  email: string
  subscriptionTier: string
  companyProfile?: {
    companyName: string
    website: string | null
    uei: string | null
  } | null
}

interface TeamMember {
  id: string
  userId: string
  role: string
  permissions: {
    canSaveContracts: boolean
    canGenerateDocs: boolean
    canManageWatchlist: boolean
    canEditCompanyProfile: boolean
  }
  joinedAt: string
  user: { id: string; name: string | null; email: string }
}

interface TeamInvite {
  id: string
  token: string
  email: string
  role: string
  expiresAt: string
  createdAt: string
}

interface TeamData {
  id: string
  name: string
  role: string
  permissions: Record<string, boolean>
  members: TeamMember[]
  invites: TeamInvite[]
}

const TIERS = [
  { id: 'starter', ...SUBSCRIPTION_TIERS.starter },
  { id: 'pro', ...SUBSCRIPTION_TIERS.pro, popular: true },
  { id: 'enterprise', ...SUBSCRIPTION_TIERS.enterprise },
]

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  background: '#F8F8F7',
  border: '1px solid rgba(0,0,0,0.1)',
  color: '#0A0A0A',
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
  color: 'rgba(0,0,0,0.35)',
  marginBottom: 8,
  fontFamily: 'var(--font-geist-mono, monospace)',
}

const PERMISSION_LABELS: Record<string, string> = {
  canSaveContracts: 'Save contracts',
  canGenerateDocs: 'Generate documents',
  canManageWatchlist: 'Manage watchlist',
  canEditCompanyProfile: 'Edit company profile',
}

export default function SettingsPage() {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [upgradeError, setUpgradeError] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [website, setWebsite] = useState('')
  const [uei, setUei] = useState('')
  const [notifEmail, setNotifEmail] = useState(true)
  const [notifDeadlines, setNotifDeadlines] = useState(true)
  const [notifNewMatches, setNotifNewMatches] = useState(false)

  // Team state
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

  useEffect(() => { loadSettings() }, [])
  useEffect(() => { loadTeam() }, [])

  async function loadSettings() {
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()
      if (data.user) {
        setUserData(data.user)
        setName(data.user.name ?? '')
        setEmail(data.user.email ?? '')
        setCompanyName(data.user.companyProfile?.companyName ?? '')
        setWebsite(data.user.companyProfile?.website ?? '')
        setUei(data.user.companyProfile?.uei ?? '')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function loadTeam() {
    try {
      const res = await fetch('/api/team')
      const data = await res.json()
      setTeam(data.team ?? null)
    } catch (err) {
      console.error(err)
    } finally {
      setTeamLoading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, companyName, website, uei }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Save failed'); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpgrade(tierId: string) {
    setUpgradeError('')
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: tierId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setUpgradeError(data.error ?? 'Failed to start checkout')
      }
    } catch {
      setUpgradeError('Failed to start checkout session')
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteError('')
    setNewInviteToken(null)
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok) {
        setInviteError(data.error ?? 'Failed to create invite')
      } else {
        setNewInviteToken(data.invite.token)
        setInviteEmail('')
        await loadTeam()
      }
    } catch {
      setInviteError('Failed to create invite')
    } finally {
      setInviting(false)
    }
  }

  async function handleRemoveMember(memberId: string) {
    setRemovingMember(memberId)
    try {
      await fetch(`/api/team/members/${memberId}`, { method: 'DELETE' })
      await loadTeam()
    } finally {
      setRemovingMember(null)
    }
  }

  async function handleTogglePermission(memberId: string, currentPerms: Record<string, boolean>, key: string) {
    setUpdatingMember(memberId)
    const newPerms = { ...currentPerms, [key]: !currentPerms[key] }
    try {
      await fetch(`/api/team/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: newPerms }),
      })
      await loadTeam()
    } finally {
      setUpdatingMember(null)
    }
  }

  function copyInviteLink(token: string) {
    const url = `${window.location.origin}/invite/${token}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedToken(token)
      setTimeout(() => setCopiedToken(null), 2000)
    })
  }

  if (loading) {
    return (
      <div style={{ padding: '32px 40px', fontSize: 10, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.25)' }}>LOADING…</div>
    )
  }

  const currentTier = userData?.subscriptionTier ?? 'free'
  const isAdmin = team?.role === 'admin'

  const sectionStyle = {
    background: '#FFFFFF',
    border: '1px solid rgba(0,0,0,0.08)',
    padding: '28px 28px',
    marginBottom: 12,
  }

  const sectionHeadStyle = {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.16em',
    color: 'rgba(0,0,0,0.25)',
    marginBottom: 24,
    fontFamily: 'var(--font-geist-mono, monospace)',
  }

  return (
    <div style={{ padding: '32px 40px', minHeight: '100vh', maxWidth: 760 }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.25)', marginBottom: 10 }}>CONFIGURATION</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.02em', margin: 0, fontFamily: 'var(--font-geist-sans, sans-serif)' }}>Settings</h1>
      </div>

      {/* Profile */}
      <div style={sectionStyle}>
        <div style={sectionHeadStyle}>PROFILE</div>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>FULL NAME</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="Jane Smith" />
            </div>
            <div>
              <label style={labelStyle}>EMAIL</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} placeholder="jane@company.com" />
            </div>
          </div>
          <div>
            <label style={labelStyle}>COMPANY NAME</label>
            <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} style={inputStyle} placeholder="Acme Government Solutions LLC" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>WEBSITE</label>
              <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} style={inputStyle} placeholder="https://www.company.com" />
            </div>
            <div>
              <label style={labelStyle}>UEI NUMBER</label>
              <input type="text" value={uei} onChange={(e) => setUei(e.target.value)} style={inputStyle} placeholder="12-char SAM.gov UEI" maxLength={12} />
            </div>
          </div>

          {error && (
            <div style={{ padding: '10px 12px', background: 'rgba(196,18,48,0.05)', border: '1px solid rgba(196,18,48,0.2)', color: '#C41230', fontSize: 11 }}>{error}</div>
          )}
          {saved && (
            <div style={{ padding: '10px 12px', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)', color: '#16a34a', fontSize: 11, letterSpacing: '0.06em' }}>SETTINGS SAVED.</div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={saving}
              style={{ padding: '10px 20px', background: '#C41230', color: '#ffffff', border: 'none', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, fontFamily: 'var(--font-geist-mono, monospace)' }}
            >
              {saving ? 'SAVING…' : 'SAVE CHANGES →'}
            </button>
          </div>
        </form>
      </div>

      {/* Subscription */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={sectionHeadStyle}>SUBSCRIPTION</div>
          <span style={{ fontSize: 9, letterSpacing: '0.12em', padding: '3px 10px', background: 'rgba(196,18,48,0.07)', color: '#C41230', border: '1px solid rgba(196,18,48,0.2)', fontFamily: 'var(--font-geist-mono, monospace)', textTransform: 'uppercase' }}>
            CURRENT: {currentTier}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {TIERS.map((tier) => {
            const isCurrent = currentTier === tier.id
            return (
              <div key={tier.id} style={{ background: isCurrent ? 'rgba(196,18,48,0.03)' : '#F8F8F7', border: '1px solid rgba(0,0,0,0.08)', padding: '20px', position: 'relative', borderTop: isCurrent ? '2px solid #C41230' : '2px solid transparent' }}>
                {(tier as { popular?: boolean }).popular && !isCurrent && (
                  <div style={{ fontSize: 8, letterSpacing: '0.12em', color: '#C41230', marginBottom: 8, fontFamily: 'var(--font-geist-mono, monospace)' }}>POPULAR</div>
                )}
                <div style={{ fontSize: 9, letterSpacing: '0.12em', color: 'rgba(0,0,0,0.35)', marginBottom: 8, fontFamily: 'var(--font-geist-mono, monospace)' }}>{tier.name.toUpperCase()}</div>
                <div style={{ marginBottom: 16 }}>
                  <span style={{ fontSize: 28, fontWeight: 700, color: '#0A0A0A', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>${tier.price}</span>
                  <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.3)', marginLeft: 4 }}>/mo</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {tier.features.map((f) => (
                    <li key={f} style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', display: 'flex', gap: 8, fontFamily: 'var(--font-geist-sans, sans-serif)' }}>
                      <span style={{ color: '#C41230', flexShrink: 0 }}>—</span>{f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <div style={{ fontSize: 10, letterSpacing: '0.1em', color: 'rgba(0,0,0,0.3)', textAlign: 'center', padding: '8px', border: '1px solid rgba(0,0,0,0.08)', fontFamily: 'var(--font-geist-mono, monospace)' }}>CURRENT PLAN</div>
                ) : (
                  <button
                    onClick={() => handleUpgrade(tier.id)}
                    style={{ width: '100%', padding: '8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', background: '#C41230', color: '#ffffff', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-geist-mono, monospace)' }}
                  >
                    {tier.price > (SUBSCRIPTION_TIERS[currentTier as keyof typeof SUBSCRIPTION_TIERS]?.price ?? 0) ? 'UPGRADE →' : 'CHANGE →'}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {upgradeError && (
          <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(196,18,48,0.05)', border: '1px solid rgba(196,18,48,0.2)', color: '#C41230', fontSize: 11 }}>{upgradeError}</div>
        )}
      </div>

      {/* Notifications */}
      <div style={sectionStyle}>
        <div style={sectionHeadStyle}>NOTIFICATIONS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { label: 'Email digest of new contract matches', value: notifEmail, setter: setNotifEmail },
            { label: 'Deadline reminders (3 days before due date)', value: notifDeadlines, setter: setNotifDeadlines },
            { label: 'Instant alerts for high-match contracts (90%+)', value: notifNewMatches, setter: setNotifNewMatches },
          ].map(({ label, value, setter }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setter(!value)}>
              <span style={{ fontSize: 13, color: value ? '#0A0A0A' : 'rgba(0,0,0,0.4)', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>{label}</span>
              <div style={{ width: 36, height: 20, background: value ? '#C41230' : 'rgba(0,0,0,0.1)', position: 'relative', flexShrink: 0, cursor: 'pointer', transition: 'background 0.2s' }}>
                <div style={{ position: 'absolute', top: 3, left: value ? 19 : 3, width: 14, height: 14, background: value ? '#ffffff' : 'rgba(0,0,0,0.25)', transition: 'left 0.2s' }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, fontSize: 10, color: 'rgba(0,0,0,0.2)', letterSpacing: '0.06em' }}>NOTIFICATION PREFERENCES ARE LOCAL — DEMO ONLY.</div>
      </div>

      {/* Team */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={sectionHeadStyle}>TEAM</div>
          {team && (
            <span style={{ fontSize: 9, letterSpacing: '0.12em', padding: '3px 10px', background: isAdmin ? 'rgba(196,18,48,0.07)' : 'rgba(0,0,0,0.04)', color: isAdmin ? '#C41230' : 'rgba(0,0,0,0.45)', border: `1px solid ${isAdmin ? 'rgba(196,18,48,0.2)' : 'rgba(0,0,0,0.1)'}`, fontFamily: 'var(--font-geist-mono, monospace)', textTransform: 'uppercase' as const }}>
              {isAdmin ? 'ADMIN' : 'MEMBER'}
            </span>
          )}
        </div>

        {teamLoading ? (
          <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.25)', letterSpacing: '0.12em', fontFamily: 'var(--font-geist-mono, monospace)' }}>LOADING TEAM…</div>
        ) : !team ? (
          <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>No team yet. Complete onboarding to create your team workspace.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <div>
              <div style={{ ...labelStyle, marginBottom: 4 }}>WORKSPACE</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#0A0A0A', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>{team.name}</div>
            </div>

            {/* Invite form — admin only */}
            {isAdmin && (
              <div>
                <div style={{ ...labelStyle, marginBottom: 12 }}>INVITE MEMBER</div>
                <form onSubmit={handleInvite} style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    style={{ ...inputStyle, flex: 1 }}
                    required
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'member' | 'admin')}
                    style={{ padding: '10px 12px', background: '#F8F8F7', border: '1px solid rgba(0,0,0,0.1)', color: '#0A0A0A', fontSize: 11, fontFamily: 'var(--font-geist-mono, monospace)', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="member">MEMBER</option>
                    <option value="admin">ADMIN</option>
                  </select>
                  <button
                    type="submit"
                    disabled={inviting}
                    style={{ padding: '10px 16px', background: '#C41230', color: '#ffffff', border: 'none', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', cursor: inviting ? 'not-allowed' : 'pointer', opacity: inviting ? 0.6 : 1, fontFamily: 'var(--font-geist-mono, monospace)', whiteSpace: 'nowrap' }}
                  >
                    {inviting ? '…' : 'SEND INVITE →'}
                  </button>
                </form>
                {inviteError && (
                  <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(196,18,48,0.05)', border: '1px solid rgba(196,18,48,0.2)', color: '#C41230', fontSize: 11 }}>{inviteError}</div>
                )}
                {newInviteToken && (
                  <div style={{ marginTop: 10, padding: '12px 14px', background: '#F8F8F7', border: '1px solid rgba(0,0,0,0.08)' }}>
                    <div style={{ fontSize: 9, letterSpacing: '0.12em', color: 'rgba(0,0,0,0.35)', marginBottom: 8, fontFamily: 'var(--font-geist-mono, monospace)' }}>INVITE LINK — COPY AND SHARE:</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{ flex: 1, fontSize: 11, color: 'rgba(0,0,0,0.5)', fontFamily: 'var(--font-geist-mono, monospace)', wordBreak: 'break-all' }}>
                        {typeof window !== 'undefined' ? `${window.location.origin}/invite/${newInviteToken}` : `/invite/${newInviteToken}`}
                      </div>
                      <button
                        onClick={() => copyInviteLink(newInviteToken)}
                        style={{ padding: '6px 12px', background: copiedToken === newInviteToken ? 'rgba(74,222,128,0.1)' : '#0A0A0A', color: copiedToken === newInviteToken ? '#16a34a' : '#ffffff', border: 'none', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer', fontFamily: 'var(--font-geist-mono, monospace)', whiteSpace: 'nowrap', flexShrink: 0 }}
                      >
                        {copiedToken === newInviteToken ? 'COPIED ✓' : 'COPY'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Members list */}
            <div>
              <div style={{ ...labelStyle, marginBottom: 12 }}>MEMBERS ({team.members.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {team.members.map((member) => (
                  <div key={member.id} style={{ background: '#F8F8F7', border: '1px solid rgba(0,0,0,0.06)', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isAdmin ? 12 : 0 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#0A0A0A', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>{member.user.name ?? member.user.email}</div>
                        <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>{member.user.email}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 8, letterSpacing: '0.12em', padding: '2px 8px', background: member.role === 'admin' ? 'rgba(196,18,48,0.07)' : 'rgba(0,0,0,0.04)', color: member.role === 'admin' ? '#C41230' : 'rgba(0,0,0,0.45)', border: `1px solid ${member.role === 'admin' ? 'rgba(196,18,48,0.2)' : 'rgba(0,0,0,0.1)'}`, fontFamily: 'var(--font-geist-mono, monospace)', textTransform: 'uppercase' as const }}>
                          {member.role}
                        </span>
                        {isAdmin && (
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            disabled={removingMember === member.id}
                            style={{ padding: '4px 10px', background: 'transparent', color: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,0,0,0.1)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', cursor: removingMember === member.id ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-geist-mono, monospace)' }}
                          >
                            {removingMember === member.id ? '…' : 'REMOVE'}
                          </button>
                        )}
                      </div>
                    </div>

                    {isAdmin && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                        {Object.entries(PERMISSION_LABELS).map(([key, permLabel]) => {
                          const value = (member.permissions as Record<string, boolean>)[key] ?? false
                          const isUpdating = updatingMember === member.id
                          return (
                            <div
                              key={key}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: isUpdating ? 'not-allowed' : 'pointer', opacity: isUpdating ? 0.5 : 1 }}
                              onClick={() => !isUpdating && handleTogglePermission(member.id, member.permissions as Record<string, boolean>, key)}
                            >
                              <div style={{ width: 32, height: 18, background: value ? '#C41230' : 'rgba(0,0,0,0.1)', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
                                <div style={{ position: 'absolute', top: 2, left: value ? 16 : 2, width: 14, height: 14, background: value ? '#ffffff' : 'rgba(0,0,0,0.25)', transition: 'left 0.2s' }} />
                              </div>
                              <span style={{ fontSize: 11, color: value ? '#0A0A0A' : 'rgba(0,0,0,0.4)', fontFamily: 'var(--font-geist-sans, sans-serif)', userSelect: 'none' }}>{permLabel}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Pending invites — admin only */}
            {isAdmin && team.invites.length > 0 && (
              <div>
                <div style={{ ...labelStyle, marginBottom: 12 }}>PENDING INVITES ({team.invites.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {team.invites.map((invite) => (
                    <div key={invite.id} style={{ background: '#F8F8F7', border: '1px solid rgba(0,0,0,0.06)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 13, color: '#0A0A0A', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>{invite.email}</div>
                        <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.35)', fontFamily: 'var(--font-geist-mono, monospace)', marginTop: 2 }}>
                          EXPIRES {new Date(invite.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {invite.role.toUpperCase()}
                        </div>
                      </div>
                      <button
                        onClick={() => copyInviteLink(invite.token)}
                        style={{ padding: '6px 12px', background: copiedToken === invite.token ? 'rgba(74,222,128,0.1)' : 'transparent', color: copiedToken === invite.token ? '#16a34a' : 'rgba(0,0,0,0.5)', border: `1px solid ${copiedToken === invite.token ? 'rgba(74,222,128,0.3)' : 'rgba(0,0,0,0.1)'}`, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer', fontFamily: 'var(--font-geist-mono, monospace)', whiteSpace: 'nowrap' }}
                      >
                        {copiedToken === invite.token ? 'COPIED ✓' : 'COPY LINK'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
