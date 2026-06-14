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

  // Notifications state (local only, demo)
  const [notifEmail, setNotifEmail] = useState(true)
  const [notifDeadlines, setNotifDeadlines] = useState(true)
  const [notifNewMatches, setNotifNewMatches] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

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
      if (!res.ok) {
        setError(data.error ?? 'Save failed')
        return
      }
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
      <div className="p-8 flex items-center justify-center">
        <p className="text-slate-400">Loading settings…</p>
      </div>
    )
  }

  const currentTier = userData?.subscriptionTier ?? 'free'

  return (
    <div className="p-8 max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-1">Settings</h1>
        <p className="text-slate-400">Manage your account and preferences</p>
      </div>

      {/* Profile section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-5">Profile</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
                placeholder="jane@company.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
              placeholder="Acme Government Solutions LLC"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Website</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
                placeholder="https://www.company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">UEI Number</label>
              <input
                type="text"
                value={uei}
                onChange={(e) => setUei(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
                placeholder="12-char SAM.gov UEI"
                maxLength={12}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-950 border border-red-800 rounded-lg text-red-300 text-sm">{error}</div>
          )}
          {saved && (
            <div className="p-3 bg-green-950 border border-green-800 rounded-lg text-green-300 text-sm">
              Settings saved successfully.
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg font-semibold text-slate-950 disabled:opacity-60"
              style={{ background: '#C8A96E' }}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Subscription section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Subscription</h2>
          <span
            className="text-sm px-3 py-1 rounded-full font-medium capitalize"
            style={{
              background: 'rgba(200,169,110,0.15)',
              color: '#C8A96E',
              border: '1px solid rgba(200,169,110,0.3)',
            }}
          >
            Current: {currentTier}
          </span>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {TIERS.map((tier) => {
            const isCurrent = currentTier === tier.id
            return (
              <div
                key={tier.id}
                className="relative rounded-xl p-4 border flex flex-col gap-3"
                style={
                  isCurrent
                    ? { border: '1px solid #C8A96E', background: 'rgba(200,169,110,0.06)' }
                    : { borderColor: '#1e293b' }
                }
              >
                {(tier as { popular?: boolean }).popular && (
                  <span
                    className="absolute -top-2.5 left-3 text-xs font-bold px-2 py-0.5 rounded-full text-slate-950"
                    style={{ background: '#C8A96E' }}
                  >
                    POPULAR
                  </span>
                )}
                <div>
                  <p className="font-semibold text-white">{tier.name}</p>
                  <p className="text-xl font-bold mt-0.5" style={{ color: '#C8A96E' }}>
                    ${tier.price}<span className="text-sm font-normal text-slate-400">/mo</span>
                  </p>
                </div>
                <ul className="space-y-1.5 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="text-xs text-slate-400 flex items-start gap-1.5">
                      <span style={{ color: '#C8A96E' }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2 rounded-lg text-sm font-medium bg-slate-800 text-slate-500 cursor-not-allowed"
                  >
                    Current Plan
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgrade(tier.id)}
                    className="w-full py-2 rounded-lg text-sm font-semibold text-slate-950 transition-colors"
                    style={{ background: '#C8A96E' }}
                  >
                    {tier.price > (SUBSCRIPTION_TIERS[currentTier as keyof typeof SUBSCRIPTION_TIERS]?.price ?? 0)
                      ? 'Upgrade'
                      : 'Downgrade'}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {upgradeError && (
          <div className="mt-4 p-3 bg-red-950 border border-red-800 rounded-lg text-red-300 text-sm">{upgradeError}</div>
        )}
      </div>

      {/* Notifications section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-5">Notifications</h2>
        <div className="space-y-4">
          {[
            { label: 'Email digest of new contract matches', value: notifEmail, setter: setNotifEmail },
            { label: 'Deadline reminders (3 days before due date)', value: notifDeadlines, setter: setNotifDeadlines },
            { label: 'Instant alerts for high-match contracts (90%+)', value: notifNewMatches, setter: setNotifNewMatches },
          ].map(({ label, value, setter }) => (
            <label key={label} className="flex items-center justify-between cursor-pointer group">
              <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{label}</span>
              <div
                onClick={() => setter(!value)}
                className="relative w-10 h-5 rounded-full transition-colors cursor-pointer"
                style={{ background: value ? '#C8A96E' : '#334155' }}
              >
                <div
                  className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                  style={{ transform: value ? 'translateX(22px)' : 'translateX(2px)' }}
                />
              </div>
            </label>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-4">Notification preferences are saved locally for demo purposes.</p>
      </div>
    </div>
  )
}
