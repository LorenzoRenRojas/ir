import type { MetadataRoute } from 'next'
import { TOP_NAICS_CODES } from '@/lib/naics'
import { COMPARISONS } from '@/lib/comparisons'
import { SET_ASIDES } from '@/lib/set-asides'
import { AGENCIES } from '@/lib/agencies'
import { STATES } from '@/lib/states'

const BASE = 'https://ir-gov.app'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/naics`, changeFrequency: 'daily', priority: 0.9 },
    ...TOP_NAICS_CODES.map(n => ({
      url: `${BASE}/naics/${n.code}`,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
    { url: `${BASE}/set-asides`, changeFrequency: 'daily', priority: 0.9 },
    ...SET_ASIDES.map(s => ({
      url: `${BASE}/set-asides/${s.slug}`,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
    { url: `${BASE}/agencies`, changeFrequency: 'daily', priority: 0.9 },
    ...AGENCIES.map(a => ({
      url: `${BASE}/agencies/${a.slug}`,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
    { url: `${BASE}/states`, changeFrequency: 'daily', priority: 0.9 },
    ...STATES.map(s => ({
      url: `${BASE}/states/${s.slug}`,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
    { url: `${BASE}/eligibility`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/changelog`, changeFrequency: 'weekly', priority: 0.5 },
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
