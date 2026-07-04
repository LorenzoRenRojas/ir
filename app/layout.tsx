import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { SessionProvider } from '@/components/ui/session-provider'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://ir-gov.app'),
  title: {
    default: 'IR — Government Contract Intelligence',
    template: '%s — IR',
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
      className={`${geistSans.variable} ${geistMono.variable}`}
      style={{ height: '100%' }}
    >
      <body style={{ minHeight: '100%', background: '#0A0A0B', color: '#E2E8F0', margin: 0 }}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
