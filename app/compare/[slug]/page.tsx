import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { COMPARISONS, getComparison } from '@/lib/comparisons'
import CompareClient from './CompareClient'

export function generateStaticParams() {
  return COMPARISONS.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const c = getComparison(slug)
  if (!c) return { title: 'Comparison — IR' }
  const url = `https://ir-gov.app/compare/${c.slug}`
  return {
    title: c.metaTitle,
    description: c.metaDescription,
    alternates: { canonical: url },
    openGraph: { title: c.metaTitle, description: c.metaDescription, url, type: 'article' },
    twitter: { card: 'summary_large_image', title: c.metaTitle, description: c.metaDescription },
  }
}

export default async function ComparePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const comparison = getComparison(slug)
  if (!comparison) notFound()
  return <CompareClient c={comparison} />
}
