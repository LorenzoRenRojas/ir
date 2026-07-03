import type { Metadata } from 'next'
import PricingClient from './PricingClient'

export const metadata: Metadata = {
  title: 'Pricing — Plans from $79/mo | IR',
  description: 'IR pricing: Starter $79/mo, Pro $199/mo, Enterprise $499/mo. Federal contract matching, Recompete Radar, and proposal drafting — a fraction of legacy GovCon tool pricing.',
  alternates: { canonical: 'https://ir-gov.app/pricing' },
}

export default function PricingPage() {
  return <PricingClient />
}
