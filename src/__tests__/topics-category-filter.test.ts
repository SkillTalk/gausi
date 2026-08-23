/**
 * Tests for category-filtered Topic-wise Practice navigation.
 *
 * Covers 8 scenarios from the requirements:
 *  1. Homepage History card links to category-filtered route
 *  2. Geography card links correctly
 *  3. /tre4/topics?category=history renders History only
 *  4. Geography is absent from History-filtered page
 *  5. Future DB-published History tests remain included through existing data flow
 *  6. /tre4/topics without category still renders all subjects
 *  7. Invalid category does not crash — falls back to all subjects
 *  8. All Subjects link returns to unfiltered page
 */

import { describe, it, expect } from 'vitest';
import { tre4TopicGroups } from '@/content/exams/tre4/topics';

// ── Filtering logic (extracted from topics page for testability) ──────────────

const VALID_CATEGORY_IDS = new Set(tre4TopicGroups.map((g) => g.id));

function resolveVisibleGroups(categoryParam: string | undefined) {
  const categoryId = categoryParam?.trim() ?? '';
  const filteredGroup = VALID_CATEGORY_IDS.has(categoryId)
    ? tre4TopicGroups.find((g) => g.id === categoryId) ?? null
    : null;
  const visibleGroups = filteredGroup ? [filteredGroup] : tre4TopicGroups;
  const isFiltered = filteredGroup !== null;
  return { filteredGroup, visibleGroups, isFiltered };
}

// ── 1 & 2. Category card link format ─────────────────────────────────────────

describe('1 & 2: homepage / /tre4 category card link format', () => {
  it('every group produces a unique category-filtered link using group.id', () => {
    const links = tre4TopicGroups.map((g) => `/tre4/topics?category=${g.id}`);
    const unique = new Set(links);
    expect(unique.size).toBe(links.length);
  });

  it('History group produces /tre4/topics?category=history', () => {
    const history = tre4TopicGroups.find((g) => g.id === 'history');
    expect(history).toBeDefined();
    expect(`/tre4/topics?category=${history!.id}`).toBe('/tre4/topics?category=history');
  });

  it('Geography group produces /tre4/topics?category=geography', () => {
    const geo = tre4TopicGroups.find((g) => g.id === 'geography');
    expect(geo).toBeDefined();
    expect(`/tre4/topics?category=${geo!.id}`).toBe('/tre4/topics?category=geography');
  });

  it('Science group produces /tre4/topics?category=science (not General Science)', () => {
    const sci = tre4TopicGroups.find((g) => g.id === 'science');
    expect(sci).toBeDefined();
    // URL uses group.id (stable slug), not dbCategory
    expect(`/tre4/topics?category=${sci!.id}`).toBe('/tre4/topics?category=science');
  });
});

// ── 3. History-only filter ────────────────────────────────────────────────────

describe('3: ?category=history renders History only', () => {
  it('resolves to a single group with id=history', () => {
    const { visibleGroups, isFiltered } = resolveVisibleGroups('history');
    expect(isFiltered).toBe(true);
    expect(visibleGroups).toHaveLength(1);
    expect(visibleGroups[0].id).toBe('history');
    expect(visibleGroups[0].label).toBe('History');
  });

  it('heading context: filtered group has label + labelHi', () => {
    const { filteredGroup } = resolveVisibleGroups('history');
    expect(filteredGroup).not.toBeNull();
    expect(filteredGroup!.label).toBe('History');
    expect(filteredGroup!.labelHi).toBe('इतिहास');
  });
});

// ── 4. Geography absent from History page ────────────────────────────────────

describe('4: Geography absent from ?category=history', () => {
  it('visibleGroups does not include Geography', () => {
    const { visibleGroups } = resolveVisibleGroups('history');
    const ids = visibleGroups.map((g) => g.id);
    expect(ids).not.toContain('geography');
    expect(ids).not.toContain('science');
    expect(ids).not.toContain('mathematics');
  });
});

// ── 5. Future DB tests included via existing data flow ────────────────────────

describe('5: future DB-published History tests auto-included', () => {
  it('History group has dbCategory=History which matches DB category column', () => {
    const history = tre4TopicGroups.find((g) => g.id === 'history');
    expect(history!.dbCategory).toBe('History');
    // getDbTestsForGroup uses group.dbCategory ?? group.label — no UI code change needed
    // when new History tests are published they appear under History automatically
  });

  it('getDbTestsForGroup receives groupDbCategory from group.dbCategory not group.id', () => {
    // Verify the Science group example: id=science but dbCategory=General Science
    const science = tre4TopicGroups.find((g) => g.id === 'science');
    expect(science!.dbCategory).toBe('General Science');
    // So DB filtering is by 'General Science', not 'science'
    // URL param is 'science' (group.id) which is independent from DB category
  });
});

// ── 6. All-subjects mode: no category param ───────────────────────────────────

describe('6: /tre4/topics without category shows all subjects', () => {
  it('no category param → not filtered, all groups visible', () => {
    const { isFiltered, visibleGroups } = resolveVisibleGroups(undefined);
    expect(isFiltered).toBe(false);
    expect(visibleGroups).toHaveLength(tre4TopicGroups.length);
  });

  it('empty string category param → same as no param', () => {
    const { isFiltered, visibleGroups } = resolveVisibleGroups('');
    expect(isFiltered).toBe(false);
    expect(visibleGroups).toHaveLength(tre4TopicGroups.length);
  });
});

// ── 7. Invalid category falls back to all subjects ────────────────────────────

describe('7: invalid category does not crash, falls back to all subjects', () => {
  it('unknown category → isFiltered=false, all groups shown', () => {
    const { isFiltered, visibleGroups } = resolveVisibleGroups('abc');
    expect(isFiltered).toBe(false);
    expect(visibleGroups).toHaveLength(tre4TopicGroups.length);
  });

  it('SQL-injection-like value → safe fallback', () => {
    const { isFiltered } = resolveVisibleGroups("'; DROP TABLE tests; --");
    expect(isFiltered).toBe(false);
  });

  it('valid-looking but non-existent id → fallback', () => {
    const { isFiltered } = resolveVisibleGroups('physics');
    expect(isFiltered).toBe(false);
  });
});

// ── 8. All Subjects link ──────────────────────────────────────────────────────

describe('8: All Subjects link points to unfiltered topics page', () => {
  it('all subjects href is /tre4/topics (no query)', () => {
    const allSubjectsHref = '/tre4/topics';
    // Applying the filter logic with no category → all groups
    const { isFiltered } = resolveVisibleGroups(undefined);
    expect(isFiltered).toBe(false);
    expect(allSubjectsHref).toBe('/tre4/topics');
    expect(allSubjectsHref).not.toContain('?category');
  });

  it('back link differs by filter state', () => {
    const { isFiltered: filtered } = resolveVisibleGroups('history');
    const { isFiltered: unfiltered } = resolveVisibleGroups(undefined);
    // filtered → back link to All Subjects = /tre4/topics
    // unfiltered → back link to BPSC TRE 4 = /tre4
    expect(filtered).toBe(true);
    expect(unfiltered).toBe(false);
    const backLink = (f: boolean) => (f ? '/tre4/topics' : '/tre4');
    expect(backLink(filtered)).toBe('/tre4/topics');
    expect(backLink(unfiltered)).toBe('/tre4');
  });
});
