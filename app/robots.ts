import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/admin', '/settings', '/saved', '/documents', '/proposals', '/onboarding', '/api/'],
      },
    ],
    sitemap: 'https://ir-gov.app/sitemap.xml',
  }
}
