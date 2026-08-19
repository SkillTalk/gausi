import { MetadataRoute } from 'next';
import { siteConfig } from '@/content/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/tre4/*/test', '/tre4/*/result'],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
