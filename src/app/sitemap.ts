import { MetadataRoute } from 'next';
import { siteConfig, services, caseStudies, blogPosts } from '@/content/content';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url.replace(/\/$/, '');
  const now = new Date().toISOString();
  const routes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/services`, lastModified: now },
    { url: `${base}/about`, lastModified: now },
    { url: `${base}/case-studies`, lastModified: now },
    { url: `${base}/blog`, lastModified: now },
    { url: `${base}/contact`, lastModified: now },
    { url: `${base}/free-audit`, lastModified: now },
    { url: `${base}/privacy`, lastModified: now },
    { url: `${base}/terms`, lastModified: now }
  ];
  routes.push(
    ...services.map((s) => ({ url: `${base}/services/${s.slug}`, lastModified: now })),
    ...caseStudies.map((c) => ({ url: `${base}/case-studies/${c.slug}`, lastModified: now })),
    ...blogPosts.map((b) => ({ url: `${base}/blog/${b.slug}`, lastModified: now }))
  );
  return routes;
}


