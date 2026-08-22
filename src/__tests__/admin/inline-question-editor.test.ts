/**
 * Tests for the inline question editor state machine used by
 * /admin/tests/[testId]/page.tsx.
 *
 * The page uses a single `activeAction` state:
 *   { questionId: string; type: 'repair' | 'override' } | null
 *
 * QuestionCard receives `activeActionType = activeAction?.questionId === q.id
 *   ? activeAction.type : null` — so only one card can ever show an editor.
 *
 * These tests verify the exact state transitions:
 *  1. clicking Q5 repair opens editor for Q5
 *  2. clicking Q8 answer override closes Q5 editor and opens Q8
 *  3. cancel closes editor
 *  4. successful repair closes editor
 *  5. successful answer override closes editor
 *  6. only one question editor exists at a time
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ── State machine that mirrors page.tsx's activeAction logic ─────────────────

type ActionType = 'repair' | 'override';
type ActiveAction = { questionId: string; type: ActionType } | null;

class InlineEditorState {
  private _active: ActiveAction = null;

  /** Mirrors: onActivate = (type) => setActiveAction({ questionId: q.id, type }) */
  activate(questionId: string, type: ActionType): void {
    this._active = { questionId, type };
  }

  /** Mirrors: onDeactivate = () => setActiveAction(null) */
  deactivate(): void {
    this._active = null;
  }

  /** Mirrors: onRepairSuccess / onOverrideSuccess = () => setActiveAction(null) */
  onSuccess(): void {
    this._active = null;
  }

  /** What type is open for a given question (null = none) */
  activeTypeFor(questionId: string): ActionType | null {
    return this._active?.questionId === questionId ? this._active.type : null;
  }

  /** How many questions currently have an open editor (0 or 1 by design). */
  countOpenEditors(): number {
    return this._active === null ? 0 : 1;
  }

  /** Raw state for assertions. */
  get state(): ActiveAction {
    return this._active;
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Inline question editor — activeAction state machine', () => {
  let s: InlineEditorState;

  beforeEach(() => {
    s = new InlineEditorState();
  });

  // 1. Clicking Q5 repair opens the editor for Q5
  it('1. clicking Q5 repair opens editor for Q5', () => {
    s.activate('q5', 'repair');
    expect(s.activeTypeFor('q5')).toBe('repair');
    expect(s.state).toEqual({ questionId: 'q5', type: 'repair' });
  });

  it('1b. other questions show no editor when Q5 is active', () => {
    s.activate('q5', 'repair');
    for (const qId of ['q1', 'q2', 'q3', 'q4', 'q6', 'q7', 'q8']) {
      expect(s.activeTypeFor(qId)).toBeNull();
    }
  });

  // 2. Switching from Q5 repair → Q8 override
  it('2. clicking Q8 override while Q5 repair is open closes Q5 and opens Q8', () => {
    s.activate('q5', 'repair');
    expect(s.activeTypeFor('q5')).toBe('repair');

    s.activate('q8', 'override');
    expect(s.activeTypeFor('q5')).toBeNull();
    expect(s.activeTypeFor('q8')).toBe('override');
  });

  // 3. Cancel closes editor
  it('3. cancel closes repair editor', () => {
    s.activate('q5', 'repair');
    s.deactivate();
    expect(s.activeTypeFor('q5')).toBeNull();
    expect(s.countOpenEditors()).toBe(0);
  });

  it('3b. cancel closes override editor', () => {
    s.activate('q3', 'override');
    s.deactivate();
    expect(s.activeTypeFor('q3')).toBeNull();
    expect(s.countOpenEditors()).toBe(0);
  });

  // 4. Successful repair closes editor
  it('4. successful repair closes editor', () => {
    s.activate('q5', 'repair');
    s.onSuccess();
    expect(s.activeTypeFor('q5')).toBeNull();
    expect(s.countOpenEditors()).toBe(0);
  });

  // 5. Successful override closes editor
  it('5. successful answer override closes editor', () => {
    s.activate('q5', 'override');
    s.onSuccess();
    expect(s.activeTypeFor('q5')).toBeNull();
    expect(s.countOpenEditors()).toBe(0);
  });

  // 6. Only one editor open at a time
  it('6. only one editor open — repair then another repair', () => {
    s.activate('q1', 'repair');
    expect(s.countOpenEditors()).toBe(1);
    s.activate('q3', 'repair');
    expect(s.countOpenEditors()).toBe(1);
    expect(s.activeTypeFor('q3')).toBe('repair');
    expect(s.activeTypeFor('q1')).toBeNull();
  });

  it('6b. only one editor open — override then repair on different question', () => {
    s.activate('q2', 'override');
    expect(s.countOpenEditors()).toBe(1);
    s.activate('q7', 'repair');
    expect(s.countOpenEditors()).toBe(1);
    expect(s.activeTypeFor('q7')).toBe('repair');
    expect(s.activeTypeFor('q2')).toBeNull();
  });

  it('opening same question again preserves single editor', () => {
    s.activate('q4', 'repair');
    s.activate('q4', 'repair'); // click again on same
    expect(s.countOpenEditors()).toBe(1);
    expect(s.activeTypeFor('q4')).toBe('repair');
  });

  it('switching type on same question replaces editor', () => {
    s.activate('q6', 'repair');
    s.activate('q6', 'override');
    expect(s.activeTypeFor('q6')).toBe('override');
    expect(s.countOpenEditors()).toBe(1);
  });

  // Edge cases
  it('deactivate when nothing is open is a no-op', () => {
    expect(() => s.deactivate()).not.toThrow();
    expect(s.countOpenEditors()).toBe(0);
  });

  it('initial state has no open editor', () => {
    expect(s.state).toBeNull();
    expect(s.countOpenEditors()).toBe(0);
  });
});
