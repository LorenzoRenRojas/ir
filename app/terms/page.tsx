import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — IR GovCon Intelligence',
  description: 'Terms of Service for IR GovCon Intelligence. Read our terms before using the platform.',
}

const EFFECTIVE_DATE = 'June 28, 2026'

export default function TermsPage() {
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
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 8px', fontFamily: sans }}>Terms of Service</h1>
        <p style={{ fontFamily: mono, fontSize: 11, color: 'rgba(0,0,0,0.3)', marginBottom: 56, letterSpacing: '0.04em' }}>
          Effective date: {EFFECTIVE_DATE}
        </p>

        <div style={{ fontFamily: sans, fontSize: 15, lineHeight: 1.8, color: '#1a1a1a', display: 'flex', flexDirection: 'column', gap: 40 }}>

          <section>
            <h2 style={h2Style}>1. Acceptance of Terms</h2>
            <p>By creating an account or using any feature of the IR GovCon Intelligence platform (&ldquo;IR,&rdquo; &ldquo;the Service,&rdquo; &ldquo;we,&rdquo; or &ldquo;us&rdquo;), you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you are accepting these Terms on behalf of a company or other legal entity, you represent that you have the authority to bind that entity. If you do not agree to these Terms, do not use the Service.</p>
          </section>

          <section>
            <h2 style={h2Style}>2. Description of Service</h2>
            <p>IR is a software platform that aggregates federal contracting opportunity data from public government sources, including SAM.gov and USASpending.gov, and applies artificial intelligence and machine learning techniques to match those opportunities against your company&apos;s profile. The Service includes:</p>
            <ul style={ulStyle}>
              <li>AI-scored federal contract opportunity feeds</li>
              <li>Company profile management for NAICS codes, certifications, set-aside categories, and past performance</li>
              <li>Win probability estimates based on your profile against each opportunity</li>
              <li>Contract watchlists and team collaboration features</li>
              <li>Proposal drafting assistance tools</li>
            </ul>
          </section>

          <section>
            <h2 style={h2Style}>3. Eligibility</h2>
            <p>You must be at least 18 years old and have the legal capacity to enter into contracts to use IR. The Service is intended for business entities and professionals engaged in, or seeking to engage in, federal government contracting. Use of IR for personal, household, or consumer purposes is not permitted.</p>
          </section>

          <section>
            <h2 style={h2Style}>4. Account Registration and Security</h2>
            <p>You must register for an account to access most features of IR. You agree to provide accurate, current, and complete information during registration and to keep that information updated. You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must notify us immediately at <a href="mailto:hello@ir-gov.app" style={linkStyle}>hello@ir-gov.app</a> if you suspect unauthorized access to your account.</p>
            <p style={{ marginTop: 16 }}>You may not share your account with others or create accounts for the purpose of reselling access. Enterprise plan team features are the designated mechanism for multi-user access within an organization.</p>
          </section>

          <section>
            <h2 style={h2Style}>5. Subscription Plans and Billing</h2>
            <p>IR offers free and paid subscription tiers. Current pricing and plan features are described on our pricing page. By subscribing to a paid plan, you authorize us to charge your payment method on a recurring basis at the then-current plan rate. All fees are stated in U.S. dollars and are non-refundable except as required by applicable law or as expressly stated in these Terms.</p>
            <p style={{ marginTop: 16 }}>We reserve the right to change pricing with at least 30 days&apos; advance notice. Continued use of a paid plan after a price change takes effect constitutes acceptance of the new price. You may cancel your subscription at any time from your account settings; cancellation takes effect at the end of the current billing period and you will retain access through that date.</p>
          </section>

          <section>
            <h2 style={h2Style}>6. Acceptable Use</h2>
            <p>You agree not to use the Service to:</p>
            <ul style={ulStyle}>
              <li>Reproduce, resell, or redistribute contract data or match results obtained from IR for commercial purposes outside your own organization without our prior written consent</li>
              <li>Scrape, crawl, or programmatically extract data from IR at a rate or volume that places unreasonable load on our systems</li>
              <li>Circumvent any rate limits, access controls, or authentication mechanisms</li>
              <li>Submit false, misleading, or fraudulent company profile information</li>
              <li>Use the Service to assist with any activity that violates federal procurement laws, including false claims, bid rigging, or collusion</li>
              <li>Reverse-engineer, decompile, or attempt to extract the source code of IR</li>
              <li>Attempt to access data or accounts belonging to other IR users</li>
            </ul>
          </section>

          <section>
            <h2 style={h2Style}>7. AI Features and Data Use</h2>
            <p>IR uses AI and machine learning models, including text embedding models, to analyze your company profile and generate match scores. By providing a capability statement, past performance descriptions, and other profile data, you grant IR a non-exclusive license to process that text through these models for the purpose of generating your matches and improving the accuracy of our matching algorithms.</p>
            <p style={{ marginTop: 16 }}>Win probability scores are statistical estimates based on your profile data and available contracting history. They are not predictions or guarantees of outcome. IR makes no representation that any match score reflects your actual likelihood of winning a specific contract. Procurement decisions are made solely by government contracting officers and are subject to regulatory requirements outside our control.</p>
          </section>

          <section>
            <h2 style={h2Style}>8. Government Data and Third-Party Sources</h2>
            <p>Contract opportunity data displayed in IR is sourced from SAM.gov and USASpending.gov, which are publicly available government systems. IR does not guarantee the completeness, accuracy, or timeliness of this data. Government agencies may modify, cancel, or re-solicit opportunities after data is ingested by our systems. You are solely responsible for verifying opportunity details directly on SAM.gov before taking any action in response to a contract listing.</p>
            <p style={{ marginTop: 16 }}>IR is not affiliated with, endorsed by, or officially associated with the U.S. General Services Administration, the Department of Defense, or any other federal agency.</p>
          </section>

          <section>
            <h2 style={h2Style}>9. Intellectual Property</h2>
            <p>The IR platform, including its software, design, algorithms, scoring methodology, and all content created by IR, is owned by IR GovCon Intelligence and is protected by copyright, trade secret, and other intellectual property laws. These Terms do not grant you any ownership interest in the Service. You retain ownership of all company profile data and documents you submit to IR.</p>
          </section>

          <section>
            <h2 style={h2Style}>10. Disclaimer of Warranties</h2>
            <p style={{ textTransform: 'uppercase', fontSize: 13, letterSpacing: '0.02em', color: '#333' }}>The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind, express or implied. To the fullest extent permitted by law, IR disclaims all warranties, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement. IR does not warrant that the Service will be uninterrupted, error-free, or free of harmful components, or that any contract opportunity data will be accurate, complete, or current.</p>
          </section>

          <section>
            <h2 style={h2Style}>11. Limitation of Liability</h2>
            <p style={{ textTransform: 'uppercase', fontSize: 13, letterSpacing: '0.02em', color: '#333' }}>To the fullest extent permitted by applicable law, IR&apos;s total liability to you for any claims arising out of or relating to these Terms or the Service shall not exceed the greater of (a) the amount you paid to IR in the 12 months preceding the claim, or (b) $100. In no event shall IR be liable for any indirect, incidental, special, consequential, or punitive damages, including lost profits, lost data, or business interruption, even if advised of the possibility of such damages.</p>
          </section>

          <section>
            <h2 style={h2Style}>12. Indemnification</h2>
            <p>You agree to indemnify, defend, and hold harmless IR and its officers, directors, employees, and agents from and against any claims, damages, losses, and expenses (including reasonable attorneys&apos; fees) arising from your use of the Service, your violation of these Terms, or your violation of any rights of a third party.</p>
          </section>

          <section>
            <h2 style={h2Style}>13. Termination</h2>
            <p>We may suspend or terminate your account at any time for violation of these Terms, non-payment of fees, or any other reason with or without notice. You may terminate your account at any time by contacting us. Upon termination, your right to access the Service ceases. We may retain certain data as required by law or for legitimate business purposes as described in our Privacy Policy.</p>
          </section>

          <section>
            <h2 style={h2Style}>14. Governing Law and Dispute Resolution</h2>
            <p>These Terms are governed by the laws of the State of Delaware, without regard to its conflict-of-law principles. Any dispute arising under or relating to these Terms shall be resolved by binding arbitration administered by the American Arbitration Association under its Commercial Arbitration Rules, with proceedings conducted in English. Notwithstanding the foregoing, either party may seek injunctive or other equitable relief in a court of competent jurisdiction to protect intellectual property rights. You waive any right to participate in a class action lawsuit or class-wide arbitration.</p>
          </section>

          <section>
            <h2 style={h2Style}>15. Changes to These Terms</h2>
            <p>We may update these Terms from time to time. We will notify you of material changes by email to the address on your account or by posting a notice in the Service at least 14 days before the change takes effect. Your continued use of the Service after a change takes effect constitutes acceptance of the revised Terms.</p>
          </section>

          <section>
            <h2 style={h2Style}>16. Contact</h2>
            <p>Questions about these Terms should be sent to:</p>
            <div style={{ marginTop: 16, padding: '20px 24px', background: '#F8F8F7', borderLeft: '3px solid rgba(0,0,0,0.08)', fontFamily: mono, fontSize: 12, lineHeight: 2, color: 'rgba(0,0,0,0.6)' }}>
              IR GovCon Intelligence<br />
              <a href="mailto:hello@ir-gov.app" style={linkStyle}>hello@ir-gov.app</a>
            </div>
          </section>

        </div>

        {/* Footer nav */}
        <div style={{ marginTop: 64, paddingTop: 32, borderTop: '1px solid rgba(0,0,0,0.07)', display: 'flex', gap: 32 }}>
          <Link href="/privacy" style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.1em', color: 'rgba(0,0,0,0.3)', textDecoration: 'none' }}>PRIVACY POLICY</Link>
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
