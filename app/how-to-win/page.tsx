import type { Metadata } from 'next'
import HowToWinClient from './HowToWinClient'

export const metadata: Metadata = {
  title: 'How to Win Federal Contracts — the small-business playbook',
  description:
    'The repeatable play for winning federal contracts as a small business: find winnable work, see recompetes before the RFP, decide with discipline, and respond on time. How IR runs each phase.',
  alternates: { canonical: 'https://ir-gov.app/how-to-win' },
  openGraph: {
    title: 'How to Win Federal Contracts — the small-business playbook',
    description: 'The repeatable five-phase play for winning federal contracts as a small business, and how IR runs each phase.',
    url: 'https://ir-gov.app/how-to-win',
    type: 'article',
  },
}

// HowTo structured data — the five-phase play, eligible for a step rich result.
const HOWTO_LD = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to win federal contracts as a small business',
  description: 'The repeatable five-phase play for winning federal contracts as a small business.',
  step: [
    { '@type': 'HowToStep', name: 'Set the yardstick', text: 'Register in SAM.gov, pursue any set-aside certification you qualify for, and complete your company profile so every contract is scored against it.' },
    { '@type': 'HowToStep', name: 'Find winnable work', text: 'Review open federal solicitations scored against your profile and filter to the ones you can prime.' },
    { '@type': 'HowToStep', name: 'See it before it exists', text: 'Track contracts in your NAICS expiring in 6–18 months and begin positioning before the RFP is posted.' },
    { '@type': 'HowToStep', name: 'Decide with discipline', text: 'Weigh win probability, incumbent, and market concentration, then run a bid/no-bid decision so you only pursue winnable work.' },
    { '@type': 'HowToStep', name: 'Respond on time', text: 'Generate a capability statement and a compliant proposal, track it in a pipeline, and submit before the deadline.' },
  ],
}

export default function HowToWinPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(HOWTO_LD) }} />
      <HowToWinClient />
    </>
  )
}
