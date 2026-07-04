import type { Metadata } from 'next'

// The coming-soon page is what Googlebot sees at "/" while the launch gate is
// up, so it needs first-class metadata of its own.
export const metadata: Metadata = {
  title: 'IR — Government Contract Intelligence · Launching July 2026',
  description:
    'IR finds the federal contracts your company can actually win: AI-matched SAM.gov opportunities, expiring-contract intelligence, and proposal drafting for small businesses and set-aside firms. Launching July 2026 — join the waitlist.',
  alternates: { canonical: 'https://ir-gov.app/coming-soon' },
  robots: { index: true, follow: true },
}

export default function ComingSoonLayout({ children }: { children: React.ReactNode }) {
  return children
}
