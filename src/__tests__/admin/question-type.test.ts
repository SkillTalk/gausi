/**
 * Tests for question-type diversity feature:
 * - questionType enum and constants
 * - computeDistribution (generator)
 * - question-validator accepts/rejects questionType
 * - ai-validator system prompt content
 * - repair service preserves/updates questionType
 * - structural shapes for each question type
 * - bilingual correctness guard
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  QUESTION_TYPES,
  type QuestionType,
} from '@/types/generated-test';
import { computeDistribution } from '@/lib/admin/generator-prompt';
import { validateAIOutput } from '@/lib/admin/question-validator';
import { validateRepairedQuestion } from '@/lib/admin/repair.service';

// ─── QuestionType enum ────────────────────────────────────────────────────────

describe('QUESTION_TYPES enum', () => {
  it('contains all 6 required types', () => {
    const expected: QuestionType[] = [
      'DIRECT',
      'STATEMENT',
      'QUOTE_ATTRIBUTION',
      'CHRONOLOGY',
      'MATCHING',
      'ASSERTION_REASON',
    ];
    for (const t of expected) {
      expect(QUESTION_TYPES).toContain(t);
    }
  });

  it('has exactly 6 types', () => {
    expect(QUESTION_TYPES).toHaveLength(6);
  });
});

// ─── computeDistribution ─────────────────────────────────────────────────────

describe('computeDistribution', () => {
  it('sums to exactly 25 for Moderate', () => {
    const dist = computeDistribution('Moderate', 25);
    const total = Object.values(dist).reduce((a, b) => a + b, 0);
    expect(total).toBe(25);
  });

  it('sums to exactly 25 for Very Hard', () => {
    const dist = computeDistribution('Very Hard', 25);
    const total = Object.values(dist).reduce((a, b) => a + b, 0);
    expect(total).toBe(25);
  });

  it('sums to exactly 25 for Beginner', () => {
    const dist = computeDistribution('Beginner', 25);
    const total = Object.values(dist).reduce((a, b) => a + b, 0);
    expect(total).toBe(25);
  });

  it('sums to exactly 10 for any difficulty with 10 questions', () => {
    for (const diff of ['Beginner', 'Easy', 'Moderate', 'Hard', 'Very Hard', 'Mixed']) {
      const dist = computeDistribution(diff, 10);
      const total = Object.values(dist).reduce((a, b) => a + b, 0);
      expect(total).toBe(10);
    }
  });

  it('DIRECT is highest for Beginner', () => {
    const dist = computeDistribution('Beginner', 25);
    const nonDirect = Object.entries(dist)
      .filter(([k]) => k !== 'DIRECT')
      .reduce((a, [, v]) => a + v, 0);
    expect(dist.DIRECT).toBeGreaterThan(nonDirect);
  });

  it('Very Hard has more complex types than Beginner', () => {
    const easy = computeDistribution('Beginner', 25);
    const hard = computeDistribution('Very Hard', 25);
    const easyComplex = (easy.STATEMENT ?? 0) + (easy.CHRONOLOGY ?? 0) + (easy.ASSERTION_REASON ?? 0);
    const hardComplex = (hard.STATEMENT ?? 0) + (hard.CHRONOLOGY ?? 0) + (hard.ASSERTION_REASON ?? 0);
    expect(hardComplex).toBeGreaterThan(easyComplex);
  });

  it('never returns negative counts', () => {
    for (const diff of ['Beginner', 'Easy', 'Moderate', 'Hard', 'Very Hard', 'Mixed']) {
      const dist = computeDistribution(diff, 25);
      for (const count of Object.values(dist)) {
        expect(count).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

// ─── question-validator: questionType field ───────────────────────────────────

function makeMinimalQuestion(overrides: Record<string, unknown> = {}) {
  return {
    order: 1,
    category: 'History',
    topic: 'INC Formation',
    difficulty: 'Moderate',
    questionType: 'DIRECT',
    questionHi: 'परीक्षण प्रश्न',
    questionEn: 'Test question',
    optionAHi: 'विकल्प अ',
    optionBHi: 'विकल्प ब',
    optionCHi: 'विकल्प स',
    optionDHi: 'विकल्प द',
    optionAEn: 'Option A',
    optionBEn: 'Option B',
    optionCEn: 'Option C',
    optionDEn: 'Option D',
    explanationHi: 'स्पष्टीकरण',
    explanationEn: 'Explanation',
    correctOption: 'A',
    ...overrides,
  };
}

describe('validateAIOutput — questionType', () => {
  it('accepts a valid DIRECT questionType', () => {
    const result = validateAIOutput(
      { titleHi: 'शीर्षक', titleEn: 'Title', questions: [makeMinimalQuestion()] },
      1,
    );
    expect(result.valid).toBe(true);
  });

  it('accepts all 6 valid questionTypes', () => {
    for (const qt of QUESTION_TYPES) {
      const result = validateAIOutput(
        {
          titleHi: 'शीर्षक',
          titleEn: 'Title',
          questions: [makeMinimalQuestion({ questionType: qt })],
        },
        1,
      );
      expect(result.valid).toBe(true);
    }
  });

  it('rejects an invalid questionType string', () => {
    const result = validateAIOutput(
      {
        titleHi: 'शीर्षक',
        titleEn: 'Title',
        questions: [makeMinimalQuestion({ questionType: 'UNKNOWN_TYPE' })],
      },
      1,
    );
    expect(result.valid).toBe(false);
    expect((result as { valid: false; errors: unknown[] }).errors.some(
      (e: unknown) => (e as { message: string }).message.includes('questionType'),
    )).toBe(true);
  });

  it('accepts missing questionType (backward compatible with old data)', () => {
    const q = makeMinimalQuestion();
    const { questionType: _unused, ...withoutType } = q;
    void _unused;
    const result = validateAIOutput(
      { titleHi: 'शीर्षक', titleEn: 'Title', questions: [withoutType] },
      1,
    );
    expect(result.valid).toBe(true);
  });
});

// ─── STATEMENT question structure ─────────────────────────────────────────────

describe('STATEMENT question structure', () => {
  it('question with 2-statement format passes structural validation', () => {
    const q = makeMinimalQuestion({
      questionType: 'STATEMENT',
      questionHi: 'निम्नलिखित कथनों पर विचार करें:\n\nकथन 1: INC की स्थापना 1885 में हुई\nकथन 2: A.O. Hume इसके संस्थापक थे\n\nउपरोक्त में से कौन सा/से कथन सही है/हैं?',
      questionEn: 'Consider the following statements:\n\nStatement 1: The INC was founded in 1885\nStatement 2: A.O. Hume was its founder\n\nWhich of the above statements is/are correct?',
      optionAHi: 'केवल 1',
      optionAEn: 'Only 1',
      optionBHi: 'केवल 2',
      optionBEn: 'Only 2',
      optionCHi: '1 और 2 दोनों',
      optionCEn: 'Both 1 and 2',
      optionDHi: 'न 1 और न 2',
      optionDEn: 'Neither 1 nor 2',
      correctOption: 'C',
    });
    const result = validateAIOutput(
      { titleHi: 'शीर्षक', titleEn: 'Title', questions: [q] },
      1,
    );
    expect(result.valid).toBe(true);
  });

  it('correctOption for STATEMENT question is A/B/C/D', () => {
    for (const co of ['A', 'B', 'C', 'D']) {
      const q = makeMinimalQuestion({ questionType: 'STATEMENT', correctOption: co });
      const result = validateAIOutput({ titleHi: 'शीर्षक', titleEn: 'Title', questions: [q] }, 1);
      expect(result.valid).toBe(true);
    }
  });
});

// ─── QUOTE_ATTRIBUTION structure ──────────────────────────────────────────────

describe('QUOTE_ATTRIBUTION question structure', () => {
  it('passes with valid quote format', () => {
    const q = makeMinimalQuestion({
      questionType: 'QUOTE_ATTRIBUTION',
      questionHi: '"स्वाधीनता मेरा जन्मसिद्ध अधिकार है और मैं इसे लेकर रहूँगा।"\n\nयह वक्तव्य किसने दिया था?',
      questionEn: '"Swaraj is my birthright and I shall have it."\n\nWho made this statement?',
      optionAHi: 'बाल गंगाधर तिलक',
      optionAEn: 'Bal Gangadhar Tilak',
      optionBHi: 'महात्मा गाँधी',
      optionBEn: 'Mahatma Gandhi',
      optionCHi: 'लाला लाजपत राय',
      optionCEn: 'Lala Lajpat Rai',
      optionDHi: 'सुभाष चंद्र बोस',
      optionDEn: 'Subhas Chandra Bose',
      correctOption: 'A',
    });
    const result = validateAIOutput({ titleHi: 'शीर्षक', titleEn: 'Title', questions: [q] }, 1);
    expect(result.valid).toBe(true);
  });
});

// ─── CHRONOLOGY structure ─────────────────────────────────────────────────────

describe('CHRONOLOGY question structure', () => {
  it('passes with valid chronology format', () => {
    const q = makeMinimalQuestion({
      questionType: 'CHRONOLOGY',
      questionHi: 'निम्नलिखित घटनाओं को सही कालानुक्रमिक क्रम में व्यवस्थित कीजिए:\n\n1. प्रथम INC अधिवेशन\n2. लखनऊ पैक्ट\n3. असहयोग आंदोलन\n4. भारत छोड़ो आंदोलन\n\nसही क्रम का चयन करें:',
      questionEn: 'Arrange the following events in correct chronological order:\n\n1. First INC Session\n2. Lucknow Pact\n3. Non-Cooperation Movement\n4. Quit India Movement\n\nSelect the correct sequence:',
      optionAHi: '1 → 2 → 3 → 4',
      optionAEn: '1 → 2 → 3 → 4',
      optionBHi: '2 → 1 → 4 → 3',
      optionBEn: '2 → 1 → 4 → 3',
      optionCHi: '3 → 2 → 1 → 4',
      optionCEn: '3 → 2 → 1 → 4',
      optionDHi: '4 → 3 → 2 → 1',
      optionDEn: '4 → 3 → 2 → 1',
      correctOption: 'A',
    });
    const result = validateAIOutput({ titleHi: 'शीर्षक', titleEn: 'Title', questions: [q] }, 1);
    expect(result.valid).toBe(true);
  });
});

// ─── MATCHING structure ───────────────────────────────────────────────────────

describe('MATCHING question structure', () => {
  it('passes with valid matching format', () => {
    const q = makeMinimalQuestion({
      questionType: 'MATCHING',
      questionHi: 'निम्नलिखित में से कौन सा युग्म सही सुमेलित है?',
      questionEn: 'Which of the following pairs is correctly matched?',
      optionAHi: 'A.O. Hume — INC के महासचिव',
      optionAEn: 'A.O. Hume — General Secretary of INC',
      optionBHi: 'डब्ल्यू. सी. बनर्जी — INC के संस्थापक',
      optionBEn: 'W.C. Banerjee — Founder of INC',
      optionCHi: 'दादाभाई नौरोजी — प्रथम भारतीय ICS',
      optionCEn: 'Dadabhai Naoroji — First Indian ICS',
      optionDHi: 'गोपाल कृष्ण गोखले — INC के प्रथम अध्यक्ष',
      optionDEn: 'Gopal Krishna Gokhale — First President of INC',
      correctOption: 'A',
    });
    const result = validateAIOutput({ titleHi: 'शीर्षक', titleEn: 'Title', questions: [q] }, 1);
    expect(result.valid).toBe(true);
  });
});

// ─── ASSERTION_REASON structure ───────────────────────────────────────────────

describe('ASSERTION_REASON question structure', () => {
  const standardOptionsHi = {
    optionAHi: 'A और R दोनों सत्य हैं और R, A की सही व्याख्या है',
    optionBHi: 'A और R दोनों सत्य हैं किन्तु R, A की सही व्याख्या नहीं है',
    optionCHi: 'A सत्य है किन्तु R असत्य है',
    optionDHi: 'A असत्य है किन्तु R सत्य है',
  };
  const standardOptionsEn = {
    optionAEn: 'Both A and R are true and R is the correct explanation of A',
    optionBEn: 'Both A and R are true but R is not the correct explanation of A',
    optionCEn: 'A is true but R is false',
    optionDEn: 'A is false but R is true',
  };

  it('passes with standard A/R format and options', () => {
    const q = makeMinimalQuestion({
      questionType: 'ASSERTION_REASON',
      questionHi: 'अभिकथन (A): INC की स्थापना 1885 में हुई।\nकारण (R): A.O. Hume ने भारतीय राजनीतिक असंतोष को एक संगठित रूप देने के लिए इसकी स्थापना की।',
      questionEn: 'Assertion (A): The INC was founded in 1885.\nReason (R): A.O. Hume established it to give organised form to Indian political discontent.',
      ...standardOptionsHi,
      ...standardOptionsEn,
      correctOption: 'A',
    });
    const result = validateAIOutput({ titleHi: 'शीर्षक', titleEn: 'Title', questions: [q] }, 1);
    expect(result.valid).toBe(true);
  });

  it('correctOption E is never valid for ASSERTION_REASON', () => {
    const q = makeMinimalQuestion({
      questionType: 'ASSERTION_REASON',
      ...standardOptionsHi,
      ...standardOptionsEn,
      correctOption: 'E',
    });
    const result = validateAIOutput({ titleHi: 'शीर्षक', titleEn: 'Title', questions: [q] }, 1);
    expect(result.valid).toBe(false);
  });
});

// ─── correctOption is always A/B/C/D — never E ───────────────────────────────

describe('correctOption constraint across all types', () => {
  for (const qt of QUESTION_TYPES) {
    it(`${qt}: rejects correctOption E`, () => {
      const q = makeMinimalQuestion({ questionType: qt, correctOption: 'E' });
      const result = validateAIOutput({ titleHi: 'शीर्षक', titleEn: 'Title', questions: [q] }, 1);
      expect(result.valid).toBe(false);
    });

    it(`${qt}: accepts correctOption A`, () => {
      const q = makeMinimalQuestion({ questionType: qt, correctOption: 'A' });
      const result = validateAIOutput({ titleHi: 'शीर्षक', titleEn: 'Title', questions: [q] }, 1);
      expect(result.valid).toBe(true);
    });
  }
});

// ─── Bilingual requirement ────────────────────────────────────────────────────

describe('bilingual field requirement', () => {
  it('rejects question with empty questionHi', () => {
    const q = makeMinimalQuestion({ questionHi: '' });
    const result = validateAIOutput({ titleHi: 'शीर्षक', titleEn: 'Title', questions: [q] }, 1);
    expect(result.valid).toBe(false);
  });

  it('rejects question with empty questionEn', () => {
    const q = makeMinimalQuestion({ questionEn: '' });
    const result = validateAIOutput({ titleHi: 'शीर्षक', titleEn: 'Title', questions: [q] }, 1);
    expect(result.valid).toBe(false);
  });

  it('rejects missing explanation in Hindi', () => {
    const q = makeMinimalQuestion({ explanationHi: '' });
    const result = validateAIOutput({ titleHi: 'शीर्षक', titleEn: 'Title', questions: [q] }, 1);
    expect(result.valid).toBe(false);
  });
});

// ─── validateRepairedQuestion handles questionType ────────────────────────────

describe('validateRepairedQuestion — questionType', () => {
  const baseRepaired = {
    questionType: 'DIRECT',
    questionHi: 'INC की स्थापना कब हुई?',
    questionEn: 'When was the INC founded?',
    optionAHi: '1885',
    optionBHi: '1886',
    optionCHi: '1887',
    optionDHi: '1888',
    optionAEn: '1885',
    optionBEn: '1886',
    optionCEn: '1887',
    optionDEn: '1888',
    explanationHi: 'INC की स्थापना 1885 में हुई।',
    explanationEn: 'The INC was founded in 1885.',
    correctOption: 'A',
  };

  it('accepts a repaired question with valid questionType', () => {
    const result = validateRepairedQuestion(baseRepaired, []);
    expect(result.valid).toBe(true);
  });

  it('accepts all valid questionTypes', () => {
    for (const qt of QUESTION_TYPES) {
      const result = validateRepairedQuestion({ ...baseRepaired, questionType: qt }, []);
      expect(result.valid).toBe(true);
    }
  });

  it('rejects invalid questionType in repaired question', () => {
    const result = validateRepairedQuestion({ ...baseRepaired, questionType: 'INVALID' }, []);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('questionType'))).toBe(true);
  });

  it('accepts repaired question without questionType (falls back to original)', () => {
    const { questionType: _u, ...withoutType } = baseRepaired;
    void _u;
    // undefined questionType should not trigger validation error
    const result = validateRepairedQuestion(withoutType as typeof baseRepaired, []);
    expect(result.valid).toBe(true);
  });
});

// ─── Generation mix diversity ─────────────────────────────────────────────────

describe('generation distribution diversity', () => {
  it('Moderate 25 includes at least 2 STATEMENT questions', () => {
    const dist = computeDistribution('Moderate', 25);
    expect(dist.STATEMENT).toBeGreaterThanOrEqual(2);
  });

  it('Very Hard 25 includes ASSERTION_REASON questions', () => {
    const dist = computeDistribution('Very Hard', 25);
    expect(dist.ASSERTION_REASON).toBeGreaterThanOrEqual(1);
  });

  it('Very Hard 25 has fewer DIRECT than Beginner', () => {
    const beginner = computeDistribution('Beginner', 25);
    const veryHard = computeDistribution('Very Hard', 25);
    expect(veryHard.DIRECT).toBeLessThan(beginner.DIRECT);
  });

  it('Hard 25 includes CHRONOLOGY questions', () => {
    const dist = computeDistribution('Hard', 25);
    expect(dist.CHRONOLOGY).toBeGreaterThanOrEqual(1);
  });

  it('Mixed 25 includes diverse types', () => {
    const dist = computeDistribution('Mixed', 25);
    const diverseCount = Object.values(dist).filter((v) => v > 0).length;
    // At least 4 different types for Mixed
    expect(diverseCount).toBeGreaterThanOrEqual(4);
  });
});

// ─── ai-validator system prompt includes type-specific rules ──────────────────

// We test by importing the internal build function
// Since it's not exported, we test via the runAIValidation call with mocked fetch.

describe('ai-validator includes type-specific rules', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('system prompt content includes STATEMENT-specific instruction', async () => {
    // Capture the fetch call to verify the system prompt
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              overallStatus: 'READY',
              validationSummary: 'All good',
              questions: [{ order: 1, status: 'PASS', confidence: 0.95, issues: [], suggestedFix: null, factualNotes: null }],
            }),
          },
        }],
      }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    const { runAIValidation } = await import('@/lib/admin/ai-validator');
    const q = {
      id: 'q1',
      testId: 't1',
      order: 1,
      category: 'History',
      topic: 'INC',
      difficulty: 'Moderate',
      questionType: 'STATEMENT',
      questionHi: 'कथन प्रश्न',
      questionEn: 'Statement question',
      optionAHi: 'केवल 1',
      optionBHi: 'केवल 2',
      optionCHi: '1 और 2 दोनों',
      optionDHi: 'न 1 और न 2',
      optionEHi: 'उत्तर नहीं देना चाहता',
      optionAEn: 'Only 1',
      optionBEn: 'Only 2',
      optionCEn: 'Both 1 and 2',
      optionDEn: 'Neither 1 nor 2',
      optionEEn: 'I do not want to answer',
      explanationHi: 'स्पष्टीकरण',
      explanationEn: 'Explanation',
      correctOption: 'C',
      questionVersion: 1,
      answerSource: 'AI_VALIDATED' as const,
      createdAt: new Date().toISOString(),
    };

    await runAIValidation('sk-test', [q], 'BPSC TRE 4', 'History', 'INC', 'Moderate');

    const [, options] = fetchSpy.mock.calls[0] as [unknown, { body: string }];
    const payload = JSON.parse(options.body) as { messages: Array<{ role: string; content: string }> };
    const systemContent = payload.messages.find((m) => m.role === 'system')?.content ?? '';

    expect(systemContent).toContain('STATEMENT');
    expect(systemContent).toContain('QUOTE_ATTRIBUTION');
    expect(systemContent).toContain('CHRONOLOGY');
    expect(systemContent).toContain('ASSERTION_REASON');
    expect(systemContent).toContain('MATCHING');
  });
});
