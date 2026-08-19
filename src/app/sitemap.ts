import { MetadataRoute } from 'next';
import { siteConfig } from '@/content/site';
import { tre4Tests } from '@/content/exams/tre4/tests';
import { tre4TopicGroups } from '@/content/exams/tre4/topics';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url.replace(/\/$/, '');
  const now = new Date().toISOString();

  const routes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/tre4`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/tre4/daily`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/tre4/topics`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/tre4/history`, lastModified: now, changeFrequency: 'never', priority: 0.3 },
    { url: `${base}/tre4/revision`, lastModified: now, changeFrequency: 'never', priority: 0.3 },
    { url: `${base}/privacy`, lastModified: now, priority: 0.2 },
    { url: `${base}/terms`, lastModified: now, priority: 0.2 },
  ];

  // Test instruction pages (the canonical SEO-friendly URL per test)
  for (const test of tre4Tests) {
    routes.push({
      url: `${base}/tre4/${test.slug}/instructions`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    });
  }

  // Available topic pages
  for (const group of tre4TopicGroups) {
    for (const topic of group.topics) {
      if (topic.available) {
        routes.push({
          url: `${base}/tre4/topics#${topic.id}`,
          lastModified: now,
          priority: 0.6,
        });
      }
    }
  }

  return routes;
}
