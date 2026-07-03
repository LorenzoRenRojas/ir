import type { Metadata } from 'next'
import HowItWorksClient from './HowItWorksClient'

export const metadata: Metadata = {
  title: 'How IR Works — Federal Contract Matching Explained | IR',
  description: 'How IR turns 261,000+ SAM.gov notices into a ranked shortlist for your company: profile ingestion, the scoring formula, daily delivery, and the proposal engine.',
  alternates: { canonical: 'https://ir-gov.app/how-it-works' },
}

export default function HowItWorksPage() {
  return <HowItWorksClient />
}
