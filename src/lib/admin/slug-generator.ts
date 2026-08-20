/**
 * Generates a unique slug for a generated test.
 * Pattern: YYYY-MM-DD-{category-slug}-{topic-slug}
 * Appends a short random suffix to prevent collisions.
 */

export function generateTestSlug(category: string, topic: string): string {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const catSlug = toSlug(category);
  const topicSlug = toSlug(topic);
  const suffix = Math.random().toString(36).slice(2, 6); // 4 random chars
  return `${today}-${catSlug}-${topicSlug}-${suffix}`;
}

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')   // strip non-alphanumeric
    .replace(/\s+/g, '-')            // spaces to dashes
    .replace(/-+/g, '-')             // collapse dashes
    .replace(/^-|-$/g, '')           // trim edge dashes
    .slice(0, 40);                   // max 40 chars per segment
}
