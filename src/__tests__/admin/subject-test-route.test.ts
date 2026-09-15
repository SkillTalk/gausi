/**
 * Subject Test Route — format routing tests.
 *
 * Tests POST /api/admin/subject-tests/generate routing:
 *   - FULL_SUBJECT_TEST: server enforces 80Q/80min, ignores client values
 *   - CUSTOM_PRACTICE: calls existing generateTest(), preserves Q/duration
 *   - Unknown/missing testFormat: handled safely, not routed to CUSTOM
 *   - Invalid subject/category: rejected with 400
 *   - Stage-aware HTTP status codes
 *   - No stack traces or secrets in responses
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock services ────────────────────────────────────────────────────────────

const mockGenerateSubjectTest = vi.fn();
const mockGenerateTest = vi.fn();

vi.mock('@/lib/admin/subject-test-generation.service', () => ({
  generateSubjectTest: (...args: unknown[]) => mockGenerateSubjectTest(...args),
  buildSubjectScope: (label: string) => `Scope for ${label}`,
}));

vi.mock('@/lib/admin/generation.service', () => ({
  generateTest: (...args: unknown[]) => mockGenerateTest(...args),
}));

// ─── Mock subjects ─────────────────────────────────────────────────────────────

vi.mock('@/content/exams/tre4/subjects', () => ({
  SUBJECT_SERIES_CATEGORIES: ['Physics', 'Music', 'English', 'Computer Science'],
  tre4SubjectsByCategory: {
    Physics: { slug: 'physics', category: 'Physics', label: 'Physics', labelHi: 'भौतिकी', icon: '⚛️', gradient: '' },
    Music: { slug: 'music', category: 'Music', label: 'Music', labelHi: 'संगीत', icon: '🎵', gradient: '' },
    English: { slug: 'english', category: 'English', label: 'English', labelHi: 'अंग्रेज़ी', icon: '📖', gradient: '' },
    'Computer Science': { slug: 'cs', category: 'Computer Science', label: 'Computer Science', labelHi: 'कंप्यूटर विज्ञान', icon: '💻', gradient: '' },
  },
}));

// ─── Import route handler (after mocks) ───────────────────────────────────────

import { POST } from '@/app/api/admin/subject-tests/generate/route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/admin/subject-tests/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeSuccess(testId = 'test-001') {
  return { ok: true, testId, slug: 'physics-test-1', generationMs: 5000 };
}

const BASE_FULL = {
  exam: 'BPSC TRE 4',
  category: 'Physics',
  topic: 'Physics — Test 1',
  difficulty: 'Moderate',
  testFormat: 'FULL_SUBJECT_TEST',
};

const BASE_CUSTOM = {
  exam: 'BPSC TRE 4',
  category: 'Physics',
  topic: 'Physics — Test 1',
  difficulty: 'Moderate',
  testFormat: 'CUSTOM_PRACTICE',
  totalQuestions: 25,
  durationMinutes: 30,
};

// ─── FULL_SUBJECT_TEST routing ────────────────────────────────────────────────

describe('FULL_SUBJECT_TEST routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateSubjectTest.mockResolvedValue(makeSuccess());
    process.env.OPENAI_API_KEY = 'sk-test';
  });

  it('routes FULL_SUBJECT_TEST to generateSubjectTest, not generateTest', async () => {
    await POST(makeRequest(BASE_FULL));
    expect(mockGenerateSubjectTest).toHaveBeenCalledTimes(1);
    expect(mockGenerateTest).not.toHaveBeenCalled();
  });

  it('ignores client-provided totalQuestions for FULL format', async () => {
    await POST(makeRequest({ ...BASE_FULL, totalQuestions: 50, durationMinutes: 50 }));
    // The service is called — it enforces 80Q internally. The route should not pass
    // totalQuestions from client body to the subject service input.
    expect(mockGenerateSubjectTest).toHaveBeenCalledTimes(1);
    const callArg = mockGenerateSubjectTest.mock.calls[0][0] as Record<string, unknown>;
    // SubjectTestInput does not have totalQuestions — server enforces 80
    expect(callArg).not.toHaveProperty('totalQuestions');
    expect(callArg).not.toHaveProperty('durationMinutes');
  });

  it('passes category, subjectLabel, topic, difficulty to service', async () => {
    await POST(makeRequest(BASE_FULL));
    const callArg = mockGenerateSubjectTest.mock.calls[0][0] as Record<string, unknown>;
    expect(callArg.category).toBe('Physics');
    expect(callArg.subjectLabel).toBe('Physics');
    expect(callArg.topic).toBe('Physics — Test 1');
    expect(callArg.difficulty).toBe('Moderate');
  });

  it('returns 200 with testId, format=FULL_SUBJECT_TEST, totalQuestions=80', async () => {
    const res = await POST(makeRequest(BASE_FULL));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.testId).toBe('test-001');
    expect(body.format).toBe('FULL_SUBJECT_TEST');
    expect(body.totalQuestions).toBe(80);
  });

  it('AI_CALL failure returns 502', async () => {
    mockGenerateSubjectTest.mockResolvedValue({ ok: false, error: 'OpenAI timeout', stage: 'AI_CALL' });
    const res = await POST(makeRequest(BASE_FULL));
    expect(res.status).toBe(502);
  });

  it('DB_WRITE failure returns 500', async () => {
    mockGenerateSubjectTest.mockResolvedValue({ ok: false, error: 'DB failed', stage: 'DB_WRITE' });
    const res = await POST(makeRequest(BASE_FULL));
    expect(res.status).toBe(500);
  });

  it('error response does not include stack trace or API key', async () => {
    mockGenerateSubjectTest.mockResolvedValue({ ok: false, error: 'Something failed', stage: 'AI_CALL' });
    const res = await POST(makeRequest(BASE_FULL));
    const body = await res.json() as Record<string, unknown>;
    expect(JSON.stringify(body)).not.toContain('sk-test');
    expect(JSON.stringify(body)).not.toContain('at Object');
    expect(JSON.stringify(body)).not.toContain('stack');
  });

  it('rejects invalid category with 400', async () => {
    const res = await POST(makeRequest({ ...BASE_FULL, category: 'InvalidSubject' }));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBeTruthy();
    expect(mockGenerateSubjectTest).not.toHaveBeenCalled();
  });

  it('rejects missing topic with 400', async () => {
    const res = await POST(makeRequest({ ...BASE_FULL, topic: '' }));
    expect(res.status).toBe(400);
    expect(mockGenerateSubjectTest).not.toHaveBeenCalled();
  });

  it('rejects invalid difficulty with 400', async () => {
    const res = await POST(makeRequest({ ...BASE_FULL, difficulty: 'Legendary' }));
    expect(res.status).toBe(400);
    expect(mockGenerateSubjectTest).not.toHaveBeenCalled();
  });

  it('returns 503 when OPENAI_API_KEY is missing', async () => {
    delete process.env.OPENAI_API_KEY;
    const res = await POST(makeRequest(BASE_FULL));
    expect(res.status).toBe(503);
    process.env.OPENAI_API_KEY = 'sk-test';
  });

  it('defaults to FULL_SUBJECT_TEST when testFormat is absent', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { testFormat: _fmt, ...noFormat } = BASE_FULL;
    await POST(makeRequest(noFormat as typeof BASE_FULL));
    expect(mockGenerateSubjectTest).toHaveBeenCalledTimes(1);
    expect(mockGenerateTest).not.toHaveBeenCalled();
  });
});

// ─── CUSTOM_PRACTICE routing ──────────────────────────────────────────────────

describe('CUSTOM_PRACTICE routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateTest.mockResolvedValue(makeSuccess());
    process.env.OPENAI_API_KEY = 'sk-test';
  });

  it('routes CUSTOM_PRACTICE to generateTest, not generateSubjectTest', async () => {
    await POST(makeRequest(BASE_CUSTOM));
    expect(mockGenerateTest).toHaveBeenCalledTimes(1);
    expect(mockGenerateSubjectTest).not.toHaveBeenCalled();
  });

  it('preserves client totalQuestions for CUSTOM_PRACTICE', async () => {
    await POST(makeRequest({ ...BASE_CUSTOM, totalQuestions: 40 }));
    const callArg = mockGenerateTest.mock.calls[0][0] as { totalQuestions: number };
    expect(callArg.totalQuestions).toBe(40);
  });

  it('preserves client durationMinutes for CUSTOM_PRACTICE', async () => {
    await POST(makeRequest({ ...BASE_CUSTOM, durationMinutes: 45 }));
    const callArg = mockGenerateTest.mock.calls[0][0] as { durationMinutes: number };
    expect(callArg.durationMinutes).toBe(45);
  });

  it.each([
    [1, true],
    [200, true],
    [0, false],
    [201, false],
  ])('totalQuestions=%i → valid=%s', async (totalQuestions, valid) => {
    const res = await POST(makeRequest({ ...BASE_CUSTOM, totalQuestions }));
    if (valid) {
      expect(res.status).toBe(200);
    } else {
      expect(res.status).toBe(400);
    }
  });

  it.each([
    [5, true],
    [180, true],
    [4, false],
    [181, false],
  ])('durationMinutes=%i → valid=%s', async (durationMinutes, valid) => {
    const res = await POST(makeRequest({ ...BASE_CUSTOM, durationMinutes }));
    if (valid) {
      expect(res.status).toBe(200);
    } else {
      expect(res.status).toBe(400);
    }
  });

  it('returns 200 with format=CUSTOM_PRACTICE and actual question count', async () => {
    const res = await POST(makeRequest({ ...BASE_CUSTOM, totalQuestions: 30 }));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.format).toBe('CUSTOM_PRACTICE');
    expect(body.totalQuestions).toBe(30);
  });
});

// ─── Unknown / malformed testFormat ──────────────────────────────────────────

describe('Unknown or malformed testFormat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateTest.mockResolvedValue(makeSuccess());
    mockGenerateSubjectTest.mockResolvedValue(makeSuccess());
    process.env.OPENAI_API_KEY = 'sk-test';
  });

  it('unknown testFormat value returns 400, not silently routed to CUSTOM', async () => {
    const res = await POST(makeRequest({ ...BASE_FULL, testFormat: 'MAINS_PAPER' }));
    expect(res.status).toBe(400);
    expect(mockGenerateTest).not.toHaveBeenCalled();
    expect(mockGenerateSubjectTest).not.toHaveBeenCalled();
  });

  it('testFormat=null is treated as absent and defaults to FULL (not silently routed to CUSTOM)', async () => {
    await POST(makeRequest({ ...BASE_FULL, testFormat: null }));
    // null coerces to string 'null' which is not a valid format → should be handled:
    // Either 400 or silently default to FULL — either is acceptable.
    // Critical: must NOT silently route to CUSTOM.
    expect(mockGenerateTest).not.toHaveBeenCalled();
  });

  it('empty testFormat string returns 400', async () => {
    const res = await POST(makeRequest({ ...BASE_FULL, testFormat: '' }));
    expect(res.status).toBe(400);
    expect(mockGenerateTest).not.toHaveBeenCalled();
    expect(mockGenerateSubjectTest).not.toHaveBeenCalled();
  });
});

// ─── Invalid JSON body ────────────────────────────────────────────────────────

describe('Invalid request body', () => {
  beforeEach(() => { process.env.OPENAI_API_KEY = 'sk-test'; });

  it('non-JSON body returns 400', async () => {
    const req = new Request('http://localhost/api/admin/subject-tests/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
