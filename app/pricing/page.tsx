import type { Metadata } from 'next'
import PricingClient from './PricingClient'
import { FAQS } from './faqs'

export const metadata: Metadata = {
  title: 'Pricing — Plans from $79/mo | IR GovCon Intelligence',
  description: 'IR pricing: Starter $79/mo, Pro $199/mo, Enterprise $499/mo. Federal contract matching, Recompete Radar, and proposal drafting — a fraction of legacy GovCon tool pricing.',
  alternates: { canonical: 'https://ir-gov.app/pricing' },
}

// FAQ structured data — can earn an expandable FAQ block in Google results.
const FAQ_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

export default function PricingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }} />
      <PricingClient />
    </>
  )
}
