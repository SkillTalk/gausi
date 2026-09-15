/**
 * Subject Test Orchestrator — comprehensive mocked tests.
 *
 * Covers:
 *   - Success path: 4 sequential OpenAI calls, server-assigned 1-80 orders,
 *     single interactive transaction with tx client, Option E enforced.
 *   - Failure per batch (1-4): no transaction called, parent marked DRAFT.
 *   - JSON parse failure, wrong batch count (19/21Q), correctOption=E,
 *     cross-batch literal duplicate, final order gap.
 *   - Prisma transaction failure: no partial save, markFailed called.
 *   - Retry: 429 retried; 400/401/402 not retried.
 *
 * Neither OpenAI nor a real DB is contacted.
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';

// ─── Mock DB ──────────────────────────────────────────────────────────────────

const mockDbCreate = vi.fn();
const mockDbUpdate = vi.fn();
const mockDbTransaction = vi.fn();

// tx client injected into the $transaction callback
const mockTx = {
  generatedQuestion: { createMany: vi.fn() },
  generatedTest: { update: vi.fn() },
};

vi.mock('@/lib/db', () => ({
  db: {
    generatedTest: {
      create: (...args: unknown[]) => mockDbCreate(...args),
      update: (...args: unknown[]) => mockDbUpdate(...args),
    },
    generatedQuestion: {
      createMany: vi.fn(), // must NOT be called directly — only via tx
    },
    $transaction: (...args: unknown[]) => mockDbTransaction(...args),
  },
}));

vi.mock('@/lib/admin/slug-generator', () => ({ generateTestSlug: () => 'physics-test-1' }));
vi.mock('@/lib/admin/generator-prompt', () => ({ buildSystemPrompt: () => 'SYS' }));

import { generateSubjectTest } from '@/lib/admin/subject-test-generation.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const OPTION_E_HI = 'उत्तर नहीं देना चाहता';
const OPTION_E_EN = 'I do not want to answer';

/**
 * Make a question with globally unique text using batchIdx + localIdx so
 * cross-batch duplicate detection does not false-fire in success tests.
 */
function makeAIQuestion(order: number, correctOption = 'A', batchIdx = 0) {
  return {
    order,
    category: 'Physics',
    topic: 'Physics — Test 1',
    difficulty: 'Moderate',
    questionType: 'DIRECT' as const,
    questionHi: `बैच ${batchIdx} प्रश्न ${order}`,
    optionAHi: 'A', optionBHi: 'B', optionCHi: 'C', optionDHi: 'D',
    explanationHi: 'व्याख्या।',
    questionEn: `Batch ${batchIdx} Question ${order}`,
    optionAEn: 'A', optionBEn: 'B', optionCEn: 'C', optionDEn: 'D',
    explanationEn: 'Explanation.',
    correctOption,
  };
}

/** Make a valid 20Q response with batch-unique question texts. */
function makeValidBatch(batchSize = 20, batchIdx = 0) {
  return JSON.stringify({
    titleHi: 'भौतिकी परीक्षा',
    titleEn: 'Physics Test',
    questions: Array.from({ length: batchSize }, (_el, i) => makeAIQuestion(i + 1, 'A', batchIdx)),
  });
}

function makeOKResponse(content: string) {
  return {
    ok: true, status: 200,
    json: async () => ({ choices: [{ message: { content } }] }),
    headers: { get: vi.fn().mockReturnValue(null) },
    text: async () => content,
  };
}
function makeErrResponse(status: number) {
  return {
    ok: false, status,
    json: async () => ({ error: 'error' }),
    headers: { get: vi.fn().mockReturnValue(null) },
    text: async () => 'error',
  };
}

/** Create a fetch mock that returns 4 successful batch responses with unique text. */
function successFetch() {
  return vi.fn()
    .mockResolvedValueOnce(makeOKResponse(makeValidBatch(20, 0)))
    .mockResolvedValueOnce(makeOKResponse(makeValidBatch(20, 1)))
    .mockResolvedValueOnce(makeOKResponse(makeValidBatch(20, 2)))
    .mockResolvedValueOnce(makeOKResponse(makeValidBatch(20, 3)));
}

const INPUT = {
  exam: 'BPSC TRE 4' as const,
  category: 'Physics',
  subjectLabel: 'Physics',
  topic: 'Physics — Test 1',
  difficulty: 'Moderate' as const,
};

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers(); // skip sleep() delays in retry paths

  mockDbCreate.mockResolvedValue({ id: 'test-id-001' });
  mockDbUpdate.mockResolvedValue({});
  mockTx.generatedQuestion.createMany.mockResolvedValue({ count: 80 });
  mockTx.generatedTest.update.mockResolvedValue({});
  mockDbTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<void>) => {
    return fn(mockTx);
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// ─── 1. Success path ─────────────────────────────────────────────────────────

describe('generateSubjectTest — success path', () => {
  it('makes exactly 4 OpenAI calls', async () => {
    const fetch = successFetch();
    vi.stubGlobal('fetch', fetch);
    const p = generateSubjectTest(INPUT, 'sk-key');
    await vi.runAllTimersAsync();
    const result = await p;
    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('each call requests max_tokens=16000', async () => {
    const fetch = successFetch();
    vi.stubGlobal('fetch', fetch);
    const p = generateSubjectTest(INPUT, 'sk-key');
    await vi.runAllTimersAsync();
    await p;
    for (const call of fetch.mock.calls) {
      const body = JSON.parse(call[1].body as string) as { max_tokens: number };
      expect(body.max_tokens).toBe(16000);
    }
  });

  it('does NOT log the API key in any console output', async () => {
    vi.stubGlobal('fetch', successFetch());
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const p = generateSubjectTest(INPUT, 'sk-secret-key');
    await vi.runAllTimersAsync();
    await p;
    const logs = spy.mock.calls.flat().join(' ');
    expect(logs).not.toContain('sk-secret-key');
  });

  it('calls are sequential — batch N+1 starts after batch N resolves', async () => {
    const callOrder: number[] = [];
    let idx = 0;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => {
      callOrder.push(++idx);
      return makeOKResponse(makeValidBatch(20, idx - 1));
    }));
    const p = generateSubjectTest(INPUT, 'sk-key');
    await vi.runAllTimersAsync();
    await p;
    expect(callOrder).toEqual([1, 2, 3, 4]);
  });

  it('db.$transaction is called exactly once after all 4 batches', async () => {
    vi.stubGlobal('fetch', successFetch());
    let fetchCountAtTransaction = 0;
    let fetchCount = 0;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => {
      return makeOKResponse(makeValidBatch(20, fetchCount++));
    }));
    mockDbTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<void>) => {
      fetchCountAtTransaction = fetchCount;
      return fn(mockTx);
    });
    const p = generateSubjectTest(INPUT, 'sk-key');
    await vi.runAllTimersAsync();
    await p;
    expect(mockDbTransaction).toHaveBeenCalledTimes(1);
    expect(fetchCountAtTransaction).toBe(4); // all 4 batches complete before transaction
  });

  it('uses the tx client for createMany, not direct db', async () => {
    const { db } = await import('@/lib/db');
    const directCreateMany = db.generatedQuestion.createMany as Mock;
    vi.stubGlobal('fetch', successFetch());
    const p = generateSubjectTest(INPUT, 'sk-key');
    await vi.runAllTimersAsync();
    await p;
    expect(mockTx.generatedQuestion.createMany).toHaveBeenCalledTimes(1);
    expect(directCreateMany).not.toHaveBeenCalled();
  });

  it('tx.createMany receives exactly 80 rows', async () => {
    vi.stubGlobal('fetch', successFetch());
    const p = generateSubjectTest(INPUT, 'sk-key');
    await vi.runAllTimersAsync();
    await p;
    const args = mockTx.generatedQuestion.createMany.mock.calls[0][0] as { data: unknown[] };
    expect(args.data).toHaveLength(80);
  });

  it('server assigns orders exactly 1-80, overriding AI-provided orders', async () => {
    // All batches return AI orders 1-20 — server must remap to 1-80
    vi.stubGlobal('fetch', successFetch());
    const p = generateSubjectTest(INPUT, 'sk-key');
    await vi.runAllTimersAsync();
    await p;
    const { data } = mockTx.generatedQuestion.createMany.mock.calls[0][0] as { data: Array<{ order: number }> };
    const orders = data.map((r) => r.order).sort((a, b) => a - b);
    expect(orders).toEqual(Array.from({ length: 80 }, (_, i) => i + 1));
  });

  it('final orders have no gaps and no duplicates', async () => {
    vi.stubGlobal('fetch', successFetch());
    const p = generateSubjectTest(INPUT, 'sk-key');
    await vi.runAllTimersAsync();
    await p;
    const { data } = mockTx.generatedQuestion.createMany.mock.calls[0][0] as { data: Array<{ order: number }> };
    const orders = data.map((r) => r.order).sort((a, b) => a - b);
    expect(new Set(orders).size).toBe(80);
    expect(orders[0]).toBe(1);
    expect(orders[79]).toBe(80);
  });

  it('Option E (Hi+En) is hardcoded on every row — never from AI output', async () => {
    vi.stubGlobal('fetch', successFetch());
    const p = generateSubjectTest(INPUT, 'sk-key');
    await vi.runAllTimersAsync();
    await p;
    const { data } = mockTx.generatedQuestion.createMany.mock.calls[0][0] as {
      data: Array<{ optionEHi: string; optionEEn: string }>
    };
    for (const row of data) {
      expect(row.optionEHi).toBe(OPTION_E_HI);
      expect(row.optionEEn).toBe(OPTION_E_EN);
    }
  });

  it('tx.generatedTest.update sets status=GENERATED', async () => {
    vi.stubGlobal('fetch', successFetch());
    const p = generateSubjectTest(INPUT, 'sk-key');
    await vi.runAllTimersAsync();
    await p;
    const args = mockTx.generatedTest.update.mock.calls[0][0] as { data: { status: string } };
    expect(args.data.status).toBe('GENERATED');
  });

  it('returns ok=true with testId and slug', async () => {
    vi.stubGlobal('fetch', successFetch());
    const p = generateSubjectTest(INPUT, 'sk-key');
    await vi.runAllTimersAsync();
    const result = await p;
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.testId).toBe('test-id-001');
      expect(result.slug).toBe('physics-test-1');
    }
  });
});

// ─── 2. Per-batch failure paths ───────────────────────────────────────────────

describe('generateSubjectTest — per-batch failure (non-retryable 401)', () => {
  // Use 401 (non-retryable) so tests don't wait for retry backoff.
  for (let failIdx = 0; failIdx < 4; failIdx++) {
    it(`batch ${failIdx + 1} failure → no transaction, parent DRAFT`, async () => {
      let callCount = 0;
      vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => {
        const i = callCount++;
        return i === failIdx
          ? makeErrResponse(401) // non-retryable
          : makeOKResponse(makeValidBatch(20, i));
      }));

      const p = generateSubjectTest(INPUT, 'sk-key');
      await vi.runAllTimersAsync();
      const result = await p;

      expect(result.ok).toBe(false);
      expect(mockDbTransaction).not.toHaveBeenCalled();
      expect(mockTx.generatedQuestion.createMany).not.toHaveBeenCalled();
      expect(mockDbUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'DRAFT' }) }),
      );
      // Exactly failIdx+1 fetch calls (stops at failing batch)
      const { fetch: gf } = global as typeof global & { fetch: Mock };
      expect(gf.mock.calls.length).toBe(failIdx + 1);
    });
  }
});

// ─── 3. JSON parse failure ────────────────────────────────────────────────────

describe('generateSubjectTest — JSON parse failure', () => {
  it('batch 1 returns invalid JSON → no save, parent DRAFT', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeOKResponse('not json {{')));
    const p = generateSubjectTest(INPUT, 'sk-key');
    await vi.runAllTimersAsync();
    const result = await p;
    expect(result.ok).toBe(false);
    expect(mockDbTransaction).not.toHaveBeenCalled();
    expect(mockDbUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'DRAFT' }) }),
    );
  });
});

// ─── 4. Wrong question count per batch ───────────────────────────────────────

describe('generateSubjectTest — wrong batch question count', () => {
  it('batch returns 19Q → validation fails, no save', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeOKResponse(makeValidBatch(19, 0))));
    const p = generateSubjectTest(INPUT, 'sk-key');
    await vi.runAllTimersAsync();
    const result = await p;
    expect(result.ok).toBe(false);
    expect(mockDbTransaction).not.toHaveBeenCalled();
  });

  it('batch returns 21Q → validation fails, no save', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeOKResponse(makeValidBatch(21, 0))));
    const p = generateSubjectTest(INPUT, 'sk-key');
    await vi.runAllTimersAsync();
    const result = await p;
    expect(result.ok).toBe(false);
    expect(mockDbTransaction).not.toHaveBeenCalled();
  });
});

// ─── 5. correctOption=E ───────────────────────────────────────────────────────

describe('generateSubjectTest — invalid correctOption=E', () => {
  it('correctOption=E in any question → schema validation fails, no save', async () => {
    const bad = JSON.stringify({
      titleHi: 'Test', titleEn: 'Test',
      questions: Array.from({ length: 20 }, (_, i) => makeAIQuestion(i + 1, i === 5 ? 'E' : 'A', 0)),
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeOKResponse(bad)));
    const p = generateSubjectTest(INPUT, 'sk-key');
    await vi.runAllTimersAsync();
    const result = await p;
    expect(result.ok).toBe(false);
    expect(mockDbTransaction).not.toHaveBeenCalled();
    expect(mockDbUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'DRAFT' }) }),
    );
  });
});

// ─── 6. Cross-batch literal duplicate ────────────────────────────────────────

describe('generateSubjectTest — cross-batch literal duplicate detection', () => {
  it('same question text in batch 1 and batch 3 → dedup catches, no save', async () => {
    // batch 1: all unique (batchIdx=0)
    // batch 2: all unique (batchIdx=1)
    // batch 3: first question is identical to batch 1's first question
    const batch3Dup = JSON.stringify({
      titleHi: 'Test', titleEn: 'Test',
      questions: Array.from({ length: 20 }, (_, i) => ({
        ...makeAIQuestion(i + 1, 'A', 2),
        questionEn: i === 0 ? 'Batch 0 Question 1' : `Batch 2 Question ${i + 1}`,
        questionHi: i === 0 ? 'बैच 0 प्रश्न 1' : `बैच 2 प्रश्न ${i + 1}`,
      })),
    });

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(makeOKResponse(makeValidBatch(20, 0)))
      .mockResolvedValueOnce(makeOKResponse(makeValidBatch(20, 1)))
      .mockResolvedValueOnce(makeOKResponse(batch3Dup))
      .mockResolvedValueOnce(makeOKResponse(makeValidBatch(20, 3))),
    );

    const p = generateSubjectTest(INPUT, 'sk-key');
    await vi.runAllTimersAsync();
    const result = await p;

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/[Dd]uplicate/);
    expect(mockDbTransaction).not.toHaveBeenCalled();
    expect(mockDbUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'DRAFT' }) }),
    );
  });

  it('different questions on the same topic from different batches are NOT flagged as duplicates', async () => {
    // All 4 batches have unique question texts (batchIdx 0-3)
    vi.stubGlobal('fetch', successFetch());
    const p = generateSubjectTest(INPUT, 'sk-key');
    await vi.runAllTimersAsync();
    const result = await p;
    expect(result.ok).toBe(true); // no false duplicate positive
  });
});

// ─── 7. Prisma transaction failure ───────────────────────────────────────────

describe('generateSubjectTest — Prisma transaction failure', () => {
  it('transaction failure → no partial questions, markFailed called, stage=DB_WRITE', async () => {
    vi.stubGlobal('fetch', successFetch());
    mockDbTransaction.mockRejectedValue(new Error('connection reset'));

    const p = generateSubjectTest(INPUT, 'sk-key');
    await vi.runAllTimersAsync();
    const result = await p;

    expect(result.ok).toBe(false);
    expect((result as { stage: string }).stage).toBe('DB_WRITE');
    expect(mockTx.generatedQuestion.createMany).not.toHaveBeenCalled(); // tx never ran
    expect(mockDbUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'DRAFT' }) }),
    );
  });

  it('transaction failure + markFailed failure → returns GenerationError, does not throw', async () => {
    vi.stubGlobal('fetch', successFetch());
    mockDbTransaction.mockRejectedValue(new Error('DB down'));
    mockDbUpdate.mockRejectedValue(new Error('DB still down'));

    const p = generateSubjectTest(INPUT, 'sk-key');
    await vi.runAllTimersAsync();
    const result = await p;

    expect(result.ok).toBe(false);
    expect((result as { stage: string }).stage).toBe('DB_WRITE');
  });
});

// ─── 8. Retry behavior ────────────────────────────────────────────────────────

describe('generateSubjectTest — retry behavior', () => {
  it('429 with Retry-After: 0 is retried and then succeeds', async () => {
    let idx = 0;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => {
      const call = idx++;
      if (call === 0) {
        return {
          ok: false, status: 429,
          headers: { get: (h: string) => h === 'Retry-After' ? '0' : null },
          text: async () => 'rate limited',
        };
      }
      return makeOKResponse(makeValidBatch(20, call - 1));
    }));

    const p = generateSubjectTest(INPUT, 'sk-key');
    await vi.runAllTimersAsync();
    const result = await p;

    expect(result.ok).toBe(true);
    // 5 calls: 1 (429 on batch 1) + 1 (retry batch 1) + 3 (batches 2-4)
    const { fetch: gf } = global as typeof global & { fetch: Mock };
    expect(gf.mock.calls.length).toBe(5);
  });

  it('429 with HTTP-date Retry-After is parsed correctly', async () => {
    const futureDate = new Date(Date.now() + 100).toUTCString(); // 100ms in future
    let idx = 0;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => {
      const call = idx++;
      if (call === 0) {
        return {
          ok: false, status: 429,
          headers: { get: (h: string) => h === 'Retry-After' ? futureDate : null },
          text: async () => 'rate limited',
        };
      }
      return makeOKResponse(makeValidBatch(20, call - 1));
    }));

    const p = generateSubjectTest(INPUT, 'sk-key');
    await vi.runAllTimersAsync();
    const result = await p;
    expect(result.ok).toBe(true);
  });

  it('401 Unauthorized is not retried (exactly 1 fetch call)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeErrResponse(401)));
    const p = generateSubjectTest(INPUT, 'sk-key');
    await vi.runAllTimersAsync();
    await p;
    const { fetch: gf } = global as typeof global & { fetch: Mock };
    expect(gf.mock.calls.length).toBe(1);
  });

  it('400 Bad Request is not retried', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeErrResponse(400)));
    const p = generateSubjectTest(INPUT, 'sk-key');
    await vi.runAllTimersAsync();
    await p;
    const { fetch: gf } = global as typeof global & { fetch: Mock };
    expect(gf.mock.calls.length).toBe(1);
  });

  it('402 billing error is not retried', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeErrResponse(402)));
    const p = generateSubjectTest(INPUT, 'sk-key');
    await vi.runAllTimersAsync();
    await p;
    const { fetch: gf } = global as typeof global & { fetch: Mock };
    expect(gf.mock.calls.length).toBe(1);
  });
});
