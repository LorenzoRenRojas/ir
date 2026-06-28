import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — IR GovCon Intelligence',
  description: 'Privacy Policy for IR GovCon Intelligence. Learn how we collect, use, and protect your data.',
}

const EFFECTIVE_DATE = 'June 28, 2026'

export default function PrivacyPage() {
  const mono = 'var(--font-geist-mono, monospace)'
  const sans = 'var(--font-geist-sans, sans-serif)'
  const crimson = '#C41230'

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', color: '#0A0A0A' }}>

      {/* Header */}
      <header style={{ padding: '20px 40px', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <span style={{ color: crimson, fontSize: 18, fontWeight: 700 }}>ᛁ</span>
          <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: '#0A0A0A' }}>IR</span>
        </Link>
        <Link href="/" style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.1em', color: 'rgba(0,0,0,0.35)', textDecoration: 'none' }}>← BACK</Link>
      </header>

      {/* Content */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '64px 40px 96px' }}>

        <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.18em', color: 'rgba(0,0,0,0.25)', marginBottom: 16 }}>LEGAL</div>
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 8px', fontFamily: sans }}>Privacy Policy</h1>
        <p style={{ fontFamily: mono, fontSize: 11, color: 'rgba(0,0,0,0.3)', marginBottom: 56, letterSpacing: '0.04em' }}>
          Effective date: {EFFECTIVE_DATE}
        </p>

        <div style={{ fontFamily: sans, fontSize: 15, lineHeight: 1.8, color: '#1a1a1a', display: 'flex', flexDirection: 'column', gap: 40 }}>

          <section>
            <h2 style={h2Style}>1. Introduction</h2>
            <p>IR GovCon Intelligence (&ldquo;IR,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates the IR platform at ir-gov.app. This Privacy Policy explains what information we collect, how we use it, and what rights you have regarding your data. By using IR, you agree to the practices described here.</p>
          </section>

          <section>
            <h2 style={h2Style}>2. Information We Collect</h2>

            <h3 style={h3Style}>2a. Account Information</h3>
            <p>When you register, we collect your name and email address. If you sign in with Google or another OAuth provider, we receive the name and email your provider shares with us.</p>

            <h3 style={{ ...h3Style, marginTop: 24 }}>2b. Company Profile Data</h3>
            <p>To generate contract matches, you voluntarily provide:</p>
            <ul style={ulStyle}>
              <li>Company name and legal name</li>
              <li>Unique Entity Identifier (UEI) from SAM.gov</li>
              <li>NAICS codes and business categories</li>
              <li>Business type and set-aside certifications (e.g., 8(a), SDVOSB, WOSB, HUBZone)</li>
              <li>Annual revenue range and employee count</li>
              <li>Contract vehicle and IDIQ holdings</li>
              <li>Security clearances and technical certifications</li>
              <li>Capability statement and past performance descriptions</li>
              <li>Geographic and contract size preferences</li>
              <li>Federal agency history</li>
            </ul>

            <h3 style={{ ...h3Style, marginTop: 24 }}>2c. Usage Data</h3>
            <p>We collect data about how you use the Service, including which contracts you view, save, or dismiss, and the match scores associated with those actions. This data is used to improve your match quality over time through our preference learning system.</p>

            <h3 style={{ ...h3Style, marginTop: 24 }}>2d. Technical Data</h3>
            <p>We automatically collect certain technical information when you use IR, including your IP address, browser type and version, session tokens, and access timestamps. This information is used for security, fraud prevention, and service reliability.</p>
          </section>

          <section>
            <h2 style={h2Style}>3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul style={ulStyle}>
              <li><strong>Provide the Service</strong> — generate contract matches, compute win probability scores, and maintain your account and company profile</li>
              <li><strong>Improve match quality</strong> — update your preference embedding based on save and dismiss actions to improve future recommendations</li>
              <li><strong>Communicate with you</strong> — send transactional emails (account confirmation, team invitations, billing receipts) and, with your consent, product updates</li>
              <li><strong>Ensure security</strong> — detect and prevent unauthorized access, fraud, or abuse</li>
              <li><strong>Comply with legal obligations</strong> — respond to lawful requests from government authorities or as otherwise required by law</li>
              <li><strong>Improve the platform</strong> — analyze aggregate, de-identified usage patterns to improve our algorithms and product features</li>
            </ul>
            <p style={{ marginTop: 16 }}>We do not sell your personal information to third parties. We do not use your data to train large language models operated by third parties without your explicit consent.</p>
          </section>

          <section>
            <h2 style={h2Style}>4. Data Sharing and Third-Party Services</h2>
            <p>We share your data with third-party service providers only as necessary to operate the Service:</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
              {[
                {
                  name: 'Turso (libSQL)',
                  purpose: 'Database hosting. Your company profile, saved contracts, and account data are stored in a Turso-hosted SQLite database.',
                  link: 'https://turso.tech/privacy',
                },
                {
                  name: 'Voyage AI',
                  purpose: 'Text embeddings. Your capability statement and past performance text are processed through Voyage AI\'s embedding API to generate match vectors. Voyage AI\'s data processing policies apply.',
                  link: 'https://www.voyageai.com/privacy',
                },
                {
                  name: 'SAM.gov / USASpending.gov',
                  purpose: 'Public government data sources. We query these APIs using only search parameters (NAICS codes, keywords); no personal data is transmitted.',
                  link: null,
                },
                {
                  name: 'Authentication Provider (NextAuth / OAuth)',
                  purpose: 'If you use Google sign-in, Google\'s OAuth service processes your authentication. We receive only your name and email.',
                  link: null,
                },
              ].map(({ name, purpose }) => (
                <div key={name} style={{ padding: '16px 20px', background: '#F8F8F7', borderLeft: '3px solid rgba(0,0,0,0.08)' }}>
                  <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 6 }}>{name}</div>
                  <div style={{ fontSize: 14, color: 'rgba(0,0,0,0.6)' }}>{purpose}</div>
                </div>
              ))}
            </div>

            <p style={{ marginTop: 16 }}>We may disclose your information if required to do so by law, court order, or government authority, or to protect the rights, property, or safety of IR, our users, or the public.</p>
          </section>

          <section>
            <h2 style={h2Style}>5. Data Retention</h2>
            <p>We retain your account and profile data for as long as your account is active. If you delete your account, we will delete your personal information within 30 days, except where we are required to retain it by law (e.g., billing records may be retained for up to 7 years for tax compliance purposes). Anonymized and aggregated data derived from your usage may be retained indefinitely.</p>
          </section>

          <section>
            <h2 style={h2Style}>6. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have the following rights regarding your personal information:</p>
            <ul style={ulStyle}>
              <li><strong>Access</strong> — request a copy of the personal data we hold about you</li>
              <li><strong>Correction</strong> — request that we correct inaccurate or incomplete data</li>
              <li><strong>Deletion</strong> — request that we delete your personal data (&ldquo;right to be forgotten&rdquo;), subject to legal retention requirements</li>
              <li><strong>Portability</strong> — receive your data in a structured, machine-readable format</li>
              <li><strong>Opt-out of marketing</strong> — unsubscribe from marketing emails at any time using the link in any such email</li>
            </ul>
            <p style={{ marginTop: 16 }}>To exercise any of these rights, contact us at <a href="mailto:hello@ir-gov.app" style={linkStyle}>hello@ir-gov.app</a>. We will respond within 30 days. We may need to verify your identity before processing your request.</p>

            <h3 style={{ ...h3Style, marginTop: 24 }}>California Residents (CCPA/CPRA)</h3>
            <p>California residents have additional rights under the California Consumer Privacy Act. We do not sell or share personal information as defined under California law. To submit a request or designate an authorized agent, contact us at the address below.</p>
          </section>

          <section>
            <h2 style={h2Style}>7. Security</h2>
            <p>We implement reasonable technical and organizational measures to protect your information against unauthorized access, alteration, disclosure, or destruction. These measures include encrypted data transmission (TLS), authentication controls, and access restrictions. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.</p>
          </section>

          <section>
            <h2 style={h2Style}>8. Children&apos;s Privacy</h2>
            <p>IR is not directed to individuals under the age of 18. We do not knowingly collect personal information from minors. If we learn that we have inadvertently collected such information, we will delete it promptly.</p>
          </section>

          <section>
            <h2 style={h2Style}>9. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of material changes by email or by posting a notice in the Service. The effective date at the top of this page indicates when the policy was last revised. Continued use of the Service after a change takes effect constitutes your acceptance of the revised policy.</p>
          </section>

          <section>
            <h2 style={h2Style}>10. Contact</h2>
            <p>If you have questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us:</p>
            <div style={{ marginTop: 16, padding: '20px 24px', background: '#F8F8F7', borderLeft: '3px solid rgba(0,0,0,0.08)', fontFamily: mono, fontSize: 12, lineHeight: 2, color: 'rgba(0,0,0,0.6)' }}>
              IR GovCon Intelligence<br />
              <a href="mailto:hello@ir-gov.app" style={linkStyle}>hello@ir-gov.app</a>
            </div>
          </section>

        </div>

        {/* Footer nav */}
        <div style={{ marginTop: 64, paddingTop: 32, borderTop: '1px solid rgba(0,0,0,0.07)', display: 'flex', gap: 32 }}>
          <Link href="/terms" style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.1em', color: 'rgba(0,0,0,0.3)', textDecoration: 'none' }}>TERMS OF SERVICE</Link>
          <Link href="/" style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.1em', color: 'rgba(0,0,0,0.3)', textDecoration: 'none' }}>HOME</Link>
          <a href="mailto:hello@ir-gov.app" style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.1em', color: 'rgba(0,0,0,0.3)', textDecoration: 'none' }}>CONTACT</a>
        </div>
      </div>
    </div>
  )
}

const h2Style: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: '0.1em',
  color: '#0A0A0A',
  marginBottom: 12,
  fontFamily: 'var(--font-geist-mono, monospace)',
  textTransform: 'uppercase' as const,
}

const h3Style: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: '#0A0A0A',
  marginBottom: 8,
  fontFamily: 'var(--font-geist-sans, sans-serif)',
}

const ulStyle: React.CSSProperties = {
  paddingLeft: 24,
  marginTop: 12,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  color: '#1a1a1a',
}

const linkStyle: React.CSSProperties = {
  color: '#C41230',
  textDecoration: 'none',
}
