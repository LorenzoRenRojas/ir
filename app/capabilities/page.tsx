import type { Metadata } from 'next'
import CapabilitiesClient from './CapabilitiesClient'

export const metadata: Metadata = {
  title: 'Capabilities — IR vs Legacy GovCon Tools | IR',
  description: 'How IR finds, scores, and drafts federal contract bids — and how it compares to GovWin, HigherGov, and other legacy GovCon intelligence tools on price and capability.',
  alternates: { canonical: 'https://ir-gov.app/capabilities' },
}

export default function CapabilitiesPage() {
  return <CapabilitiesClient />
}
