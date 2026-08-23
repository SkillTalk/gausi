/**
 * Centralized cache invalidation for the public test catalog.
 *
 * PUBLIC_CATALOG_TAG is the single cache tag associated with all
 * published-test listings. Any code that changes what tests are
 * publicly visible (publish, archive) must call
 * invalidatePublishedTestsCache() after the DB write.
 *
 * What IS cached (safe):
 *   - getPublishedDbTests() results — public PUBLISHED tests only
 *   - Rendered HTML of /tre4, /tre4/daily, /tre4/topics
 *
 * What is NOT cached (never cached):
 *   - Admin pages / admin API routes
 *   - User attempts / history / scoring
 *   - Authentication / session data
 *   - Validation state / question repair state
 *
 * Cache TTL: 60 seconds (fallback if invalidation never fires)
 * Cache tag: 'published-tests'
 *
 * Invalidation trigger points:
 *   1. publishTest()  — READY/SCHEDULED → PUBLISHED (adds to public listing)
 *   2. archiveTest()  — PUBLISHED → ARCHIVED  (removes from public listing)
 *   Both live in publish.service.ts, which calls this helper.
 *
 *   Cron (publishDueScheduledTests) calls publishTest() in a loop,
 *   so it benefits automatically — no separate hook needed there.
 *
 * This module is server-only. Never import from 'use client' components.
 */
import { revalidateTag, revalidatePath } from 'next/cache';

export const PUBLIC_CATALOG_TAG = 'published-tests';

export const CATALOG_TTL_SECONDS = 60;

/**
 * Invalidate all published-test catalog caches immediately.
 *
 * Clears:
 *   - unstable_cache entries tagged 'published-tests'
 *   - Full-page ISR cache for /tre4, /tre4/daily, /tre4/topics
 *
 * Safe to call from any server-side code (Route Handlers, service functions).
 * Errors are caught and logged — a cache-invalidation failure must never
 * prevent the DB write from being reported as successful.
 */
export function invalidatePublishedTestsCache(): void {
  try {
    // Invalidate data-level cache (unstable_cache entries)
    revalidateTag(PUBLIC_CATALOG_TAG);
    // Invalidate page-level ISR cache for all public listing routes
    revalidatePath('/tre4');
    revalidatePath('/tre4/daily');
    revalidatePath('/tre4/topics');
  } catch (err) {
    // Degraded gracefully — cache will expire via CATALOG_TTL_SECONDS TTL.
    console.warn(
      '[catalog-cache] Cache invalidation failed (will expire via TTL):',
      err instanceof Error ? err.message : err,
    );
  }
}
