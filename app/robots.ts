import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://vibetravel.space'; 

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/'], // never expose API routes to crawlers
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
