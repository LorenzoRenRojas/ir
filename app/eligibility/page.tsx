import type { Metadata } from 'next'
import EligibilityClient from './EligibilityClient'

export const metadata: Metadata = {
  title: 'Set-Aside Eligibility Check — Which Federal Programs Fit You? | IR',
  description: 'Answer five quick questions and see which federal set-aside programs your small business likely qualifies for — 8(a), WOSB, SDVOSB, HUBZone and more. Free, no signup required.',
  alternates: { canonical: 'https://ir-gov.app/eligibility' },
}

export default function EligibilityPage() {
  return <EligibilityClient />
}
