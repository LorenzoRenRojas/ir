import type { Metadata } from 'next'
import { Archivo, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import { SessionProvider } from '@/components/ui/session-provider'

// Type system: one industrial grotesk (Archivo) does the confident, editorial
// heavy lifting for headings and body; a restrained engineering mono (IBM Plex
// Mono) carries the small technical labels. This reads defense-tech / precise —
// Anduril/Palantir territory — instead of "hacker terminal" (Geist Mono) or
// "generic AI SaaS" (Inter/Geist Sans). Variable names are unchanged so the
// whole site re-skins from here without touching every component.
const displaySans = Archivo({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
})

const techMono = IBM_Plex_Mono({
  variable: '--font-geist-mono',
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://ir-gov.app'),
  title: {
    default: 'IR GovCon Intelligence — Win Federal Contracts',
    template: '%s — IR GovCon Intelligence',
  },
  description: 'AI-matched federal contract opportunities from SAM.gov, scored against your company profile. Built for small businesses and set-aside firms.',
  keywords: 'government contracts, SAM.gov, federal contracts, small business, NAICS, set-aside, 8a, SDVOSB, WOSB, HUBZone, GovCon, contract intelligence',
  authors: [{ name: 'IR GovCon Intelligence' }],
  openGraph: {
    type: 'website',
    siteName: 'IR — GovCon Intelligence',
    title: 'IR — Government Contract Intelligence',
    description: 'AI-matched federal contract opportunities from SAM.gov, scored against your company profile. Built for small businesses and set-aside firms.',
    url: 'https://ir-gov.app',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IR — Government Contract Intelligence',
    description: 'AI-matched federal contract opportunities from SAM.gov, scored against your company profile.',
  },
  robots: {
    index: true,
    follow: true,
  },
  // Search-engine ownership verification. To turn on Google Search Console:
  // 1. In Search Console, add ir-gov.app and choose the "HTML tag" method.
  // 2. Copy just the content value (the long token, not the whole tag).
  // 3. In Vercel → Project → Settings → Environment Variables, add
  //    GOOGLE_SITE_VERIFICATION = <that token>, then redeploy.
  // Same idea for Bing via BING_SITE_VERIFICATION. No code change needed —
  // the tags below appear automatically once the env vars are set.
  verification: {
    ...(process.env.GOOGLE_SITE_VERIFICATION
      ? { google: process.env.GOOGLE_SITE_VERIFICATION }
      : {}),
    ...(process.env.BING_SITE_VERIFICATION
      ? { other: { 'msvalidate.01': process.env.BING_SITE_VERIFICATION } }
      : {}),
  },
}

// Structured data: tells Google exactly what IR is, powers rich results
const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://ir-gov.app/#org',
      name: 'IR — GovCon Intelligence',
      url: 'https://ir-gov.app',
      description: 'Federal contract intelligence for small businesses: AI-matched SAM.gov opportunities, recompete radar, and proposal drafting.',
      contactPoint: { '@type': 'ContactPoint', email: 'hello@ir-gov.app', contactType: 'sales' },
    },
    {
      '@type': 'SoftwareApplication',
      name: 'IR',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: 'https://ir-gov.app',
      description: 'Finds federal contracts your company can win: profile-scored SAM.gov matching, daily alerts, expiring-contract intelligence, and 4-volume proposal drafting.',
      offers: [
        { '@type': 'Offer', name: 'Starter', price: '79', priceCurrency: 'USD' },
        { '@type': 'Offer', name: 'Pro', price: '199', priceCurrency: 'USD' },
        { '@type': 'Offer', name: 'Enterprise', price: '499', priceCurrency: 'USD' },
      ],
    },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${displaySans.variable} ${techMono.variable}`}
      style={{ height: '100%' }}
    >
      <body style={{ minHeight: '100%', background: '#0A0A0B', color: '#E2E8F0', margin: 0, fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
