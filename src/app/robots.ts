import { MetadataRoute } from 'next';
import { siteConfig } from '@/content/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin', '/admin/', '/tre4/*/test', '/tre4/*/result'],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
