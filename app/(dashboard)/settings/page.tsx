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

  useEffect(() => { loadSettings() }, [])

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

  if (loading) {
    return (
      <div style={{ padding: '32px 40px', fontSize: 10, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.25)' }}>LOADING…</div>
    )
  }

  const currentTier = userData?.subscriptionTier ?? 'free'

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
    </div>
  )
}
