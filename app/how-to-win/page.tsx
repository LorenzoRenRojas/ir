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

export default function HowToWinPage() {
  return <HowToWinClient />
}
