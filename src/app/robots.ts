import { MetadataRoute } from 'next';
import { siteConfig } from '@/content/content';

export default function robots(): MetadataRoute.Robots {
  const base = siteConfig.url;
  return {
    rules: {
      userAgent: '*',
      allow: '/'
    },
    sitemap: `${base}/sitemap.xml`
  };
}


