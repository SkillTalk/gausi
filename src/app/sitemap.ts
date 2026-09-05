import { MetadataRoute } from 'next';
import { siteConfig } from '@/content/site';
import { tre4Tests } from '@/content/exams/tre4/tests';
import { getPublishedDbTests } from '@/lib/test-provider';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url.replace(/\/$/, '');
  const now = new Date().toISOString();

  const routes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/tre4`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/tre4/daily`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/tre4/topics`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/privacy`, lastModified: now, priority: 0.2 },
    { url: `${base}/terms`, lastModified: now, priority: 0.2 },
  ];

  // Static test instruction pages — seeded first; their slugs become the dedup set.
  const seenSlugs = new Set<string>();
  for (const test of tre4Tests) {
    seenSlugs.add(test.slug);
    routes.push({
      url: `${base}/tre4/${test.slug}/instructions`,
      lastModified: test.date,
      changeFrequency: 'monthly',
      priority: 0.8,
    });
  }

  // DB-published test instruction pages.
  // Failure-safe: a DB outage must not break the entire sitemap.
  // Static routes are already appended above and will always be returned.
  try {
    const dbTests = await getPublishedDbTests({});
    for (const t of dbTests) {
      if (seenSlugs.has(t.slug)) continue; // deduplicate against static slugs
      seenSlugs.add(t.slug);
      routes.push({
        url: `${base}/tre4/${t.slug}/instructions`,
        lastModified: t.publishedAt,
        changeFrequency: 'monthly',
        priority: 0.8,
      });
    }
  } catch {
    // DB temporarily unavailable — static routes are still included above.
  }

  return routes;
}
