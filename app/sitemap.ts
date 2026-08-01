import type { MetadataRoute } from 'next'
import { TOP_NAICS_CODES } from '@/lib/naics'
import { COMPARISONS } from '@/lib/comparisons'

const BASE = 'https://ir-gov.app'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/coming-soon`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/naics`, changeFrequency: 'daily', priority: 0.9 },
    ...TOP_NAICS_CODES.map(n => ({
      url: `${BASE}/naics/${n.code}`,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
    { url: `${BASE}/capabilities`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/how-it-works`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/how-to-win`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/pricing`, changeFrequency: 'monthly', priority: 0.8 },
    ...COMPARISONS.map((c) => ({
      url: `${BASE}/compare/${c.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    { url: `${BASE}/register`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/security`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE}/terms`, changeFrequency: 'yearly', priority: 0.1 },
    { url: `${BASE}/privacy`, changeFrequency: 'yearly', priority: 0.1 },
  ]
}
