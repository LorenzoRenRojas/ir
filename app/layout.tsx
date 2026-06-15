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
  title: 'IR — Government Contract Intelligence',
  description: 'Find your perfect government contract match',
  keywords: 'government contracts, SAM.gov, federal contracts, small business, NAICS, set-aside',
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
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
