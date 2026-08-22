/**
 * Agent 4 — Automation Orchestrator Tests
 *
 * All DB and service calls are mocked.
 * No real AI credits are consumed.
 */

import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { db } from '@/lib/db';

// ─── Mock all dependencies ───────────────────────────────────────────────────

vi.mock('@/lib/db', () => ({
  db: {
    dailyAutomationConfig: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    automationRun: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    generatedTest: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@/lib/admin/generation.service', () => ({
  generateTest: vi.fn(),
}));

vi.mock('@/lib/admin/validation.service', () => ({
  validateTest: vi.fn(),
}));

vi.mock('@/lib/admin/publish.service', () => ({
  scheduleTest: vi.fn(),
  publishTest: vi.fn(),
}));

vi.mock('@/lib/admin/admin-validator', () => ({
  validateGenerateInput: vi.fn().mockReturnValue({ valid: true, errors: [] }),
  sanitizeInput: vi.fn().mockImplementation((i: unknown) => i),
}));

// Get typed mocks
import { generateTest } from '@/lib/admin/generation.service';
import { validateTest } from '@/lib/admin/validation.service';
import { scheduleTest, publishTest } from '@/lib/admin/publish.service';

const mockGenerate = generateTest as MockedFunction<typeof generateTest>;
const mockValidate = validateTest as MockedFunction<typeof validateTest>;
const mockSchedule = scheduleTest as MockedFunction<typeof scheduleTest>;
const mockPublish = publishTest as MockedFunction<typeof publishTest>;

const mockConfigFind = db.dailyAutomationConfig.findFirst as MockedFunction<typeof db.dailyAutomationConfig.findFirst>;
const mockConfigUpdate = db.dailyAutomationConfig.update as MockedFunction<typeof db.dailyAutomationConfig.update>;
const mockRunFind = db.automationRun.findUnique as MockedFunction<typeof db.automationRun.findUnique>;
const mockRunCreate = db.automationRun.create as MockedFunction<typeof db.automationRun.create>;
const mockRunUpdate = db.automationRun.update as MockedFunction<typeof db.automationRun.update>;
const mockTestFind = db.generatedTest.findFirst as MockedFunction<typeof db.generatedTest.findFirst>;

// ─── Set OpenAI env ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  process.env.OPENAI_API_KEY = 'sk-test-key';
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeConfig(overrides: Partial<{
  id: string;
  exam: string;
  category: string;
  topic: string;
  difficulty: string;
  totalQuestions: number;
  durationMinutes: number;
  enabled: boolean;
  autoPublish: boolean;
  allowRepeat: boolean;
  generateTime: string;
  publishTime: string;
  timezone: string;
  lastRunAt: null;
  lastRunStatus: null;
}> = {}) {
  return {
    id: 'config-1',
    exam: 'BPSC TRE 4',
    category: 'History',
    topic: 'Indian National Movement',
    difficulty: 'Moderate',
    totalQuestions: 25,
    durationMinutes: 15,
    enabled: true,
    autoPublish: true,
    allowRepeat: false,
    generateTime: '04:00',
    publishTime: '05:00',
    timezone: 'Asia/Kolkata',
    lastRunAt: null,
    lastRunStatus: null,
    nextRunAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeRun(overrides: Partial<{ id: string; status: string; generatedTestId: string | null }> = {}) {
  return {
    id: 'run-1',
    configId: 'config-1',
    runKey: 'bpsc-tre-4-history-2026-08-21',
    scheduledFor: new Date(),
    startedAt: new Date(),
    finishedAt: new Date(),
    status: 'SUCCESS',
    generatedTestId: 'test-1',
    generationStatus: 'GENERATED',
    validationStatus: 'READY',
    publicationStatus: 'SCHEDULED',
    errorStage: null,
    errorMessage: null,
    generationDurationMs: 5000,
    validationDurationMs: 3000,
    topic: 'Indian National Movement',
    category: 'History',
    exam: 'BPSC TRE 4',
    totalQuestions: 25,
    createdAt: new Date(),
    ...overrides,
  };
}

// ─── Import under test ────────────────────────────────────────────────────────

import {
  runAutomation,
  getISTDateString,
  buildRunKey,
  istTimeToUTC,
  istMidnightUTC,
  isTopicRecentlyUsed,
  upsertAutomationConfig,
  getAutomationConfig,
} from '@/lib/admin/automation.service';

// ─── Utility tests ────────────────────────────────────────────────────────────

describe('getISTDateString', () => {
  it('returns YYYY-MM-DD format in IST', () => {
    // UTC midnight = 5:30 AM IST next day? No — IST is UTC+5:30, so UTC 18:30 = IST 00:00
    // Test with a known UTC time: 2026-08-20T18:30:00Z = 2026-08-21T00:00:00 IST
    const utcDate = new Date('2026-08-20T18:30:00Z');
    expect(getISTDateString(utcDate)).toBe('2026-08-21');
  });

  it('returns same day for IST afternoon', () => {
    // 2026-08-21T07:30:00Z = 2026-08-21T13:00:00 IST (13:00)
    const utcDate = new Date('2026-08-21T07:30:00Z');
    expect(getISTDateString(utcDate)).toBe('2026-08-21');
  });
});

describe('buildRunKey', () => {
  it('produces a stable slug from exam + category + date', () => {
    expect(buildRunKey('BPSC TRE 4', 'History', '2026-08-21')).toBe('bpsc-tre-4-history-2026-08-21');
  });

  it('handles special characters in category', () => {
    const key = buildRunKey('BPSC TRE 4', 'General Science', '2026-08-21');
    expect(key).toBe('bpsc-tre-4-general-science-2026-08-21');
  });
});

describe('istTimeToUTC', () => {
  it('converts 05:00 IST to correct UTC', () => {
    const result = istTimeToUTC('05:00', '2026-08-21');
    // 05:00 IST = 05:00 - 5:30 = 23:30 UTC on 2026-08-20
    expect(result.toISOString()).toBe('2026-08-20T23:30:00.000Z');
  });
});

describe('istMidnightUTC', () => {
  it('converts IST midnight to UTC', () => {
    const result = istMidnightUTC('2026-08-21');
    // IST midnight = UTC 18:30 on previous day
    expect(result.toISOString()).toBe('2026-08-20T18:30:00.000Z');
  });
});

// ─── isTopicRecentlyUsed ─────────────────────────────────────────────────────

describe('isTopicRecentlyUsed', () => {
  it('returns true when a recent test with same topic exists', async () => {
    mockTestFind.mockResolvedValue({ id: 'existing-test' } as never);
    const result = await isTopicRecentlyUsed('Indian National Movement', 'History', 'BPSC TRE 4');
    expect(result).toBe(true);
  });

  it('returns false when no recent test found', async () => {
    mockTestFind.mockResolvedValue(null);
    const result = await isTopicRecentlyUsed('Indian National Movement', 'History', 'BPSC TRE 4');
    expect(result).toBe(false);
  });
});

// ─── runAutomation ────────────────────────────────────────────────────────────

describe('runAutomation', () => {
  it('returns SKIPPED when no config exists', async () => {
    mockConfigFind.mockResolvedValue(null);
    const result = await runAutomation();
    expect(result.status).toBe('SKIPPED');
    expect(result.message).toContain('No automation config');
  });

  it('returns SKIPPED when automation is disabled (no force)', async () => {
    mockConfigFind.mockResolvedValue(makeConfig({ enabled: false }) as never);
    const result = await runAutomation();
    expect(result.status).toBe('SKIPPED');
    expect(result.message).toContain('disabled');
  });

  it('runs even when disabled if force=true (Run Now)', async () => {
    mockConfigFind.mockResolvedValue(makeConfig({ enabled: false }) as never);
    mockRunFind.mockResolvedValue(null);
    mockTestFind.mockResolvedValue(null); // no recent topic use
    mockRunCreate.mockResolvedValue(makeRun() as never);
    mockRunUpdate.mockResolvedValue({} as never);
    mockConfigUpdate.mockResolvedValue({} as never);
    mockGenerate.mockResolvedValue({ ok: true, testId: 'test-1', slug: 'test-slug', generationMs: 1000 });
    mockValidate.mockResolvedValue({ ok: true, overallStatus: 'READY', passed: 5, failed: 0, reviewNeeded: 0, validationMs: 500, validationSummary: '' });
    mockSchedule.mockResolvedValue({ ok: true, data: { publishAt: new Date() } });

    const result = await runAutomation({ force: true, overrideDateStr: '2026-08-22' });
    expect(result.status).toBe('SUCCESS');
  });

  it('returns SKIPPED when topic is not set', async () => {
    mockConfigFind.mockResolvedValue(makeConfig({ topic: '' }) as never);
    const result = await runAutomation();
    expect(result.status).toBe('SKIPPED');
    expect(result.message).toContain('topic');
  });

  it('returns existing run status on duplicate cron execution (idempotency)', async () => {
    mockConfigFind.mockResolvedValue(makeConfig() as never);
    mockRunFind.mockResolvedValue(makeRun() as never);

    const result = await runAutomation({ overrideDateStr: '2026-08-21' });
    expect(result.status).toBe('SUCCESS');
    expect(result.runKey).toBe('bpsc-tre-4-history-2026-08-21');
    // No generation should happen
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('returns SKIPPED with TOPIC_GUARD when topic was recently used', async () => {
    mockConfigFind.mockResolvedValue(makeConfig({ allowRepeat: false }) as never);
    mockRunFind.mockResolvedValue(null);
    mockTestFind.mockResolvedValue({ id: 'recent-test' } as never);
    mockRunCreate.mockResolvedValue(makeRun({ status: 'SKIPPED', generatedTestId: null }) as never);
    mockRunUpdate.mockResolvedValue({} as never);
    mockConfigUpdate.mockResolvedValue({} as never);

    const result = await runAutomation({ overrideDateStr: '2026-08-22' });
    expect(result.status).toBe('SKIPPED');
    expect(result.message).toContain('recently used');
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('does NOT block topic repeat when allowRepeat=true', async () => {
    mockConfigFind.mockResolvedValue(makeConfig({ allowRepeat: true }) as never);
    mockRunFind.mockResolvedValue(null);
    mockRunCreate.mockResolvedValue(makeRun() as never);
    mockRunUpdate.mockResolvedValue({} as never);
    mockConfigUpdate.mockResolvedValue({} as never);
    mockGenerate.mockResolvedValue({ ok: true, testId: 'test-2', slug: 'slug-2', generationMs: 900 });
    mockValidate.mockResolvedValue({ ok: true, overallStatus: 'READY', passed: 25, failed: 0, reviewNeeded: 0, validationMs: 400, validationSummary: '' });
    mockSchedule.mockResolvedValue({ ok: true, data: { publishAt: new Date() } });

    const result = await runAutomation({ overrideDateStr: '2026-08-23' });
    expect(result.status).toBe('SUCCESS');
    expect(mockGenerate).toHaveBeenCalled();
  });

  it('returns FAILED when generation fails', async () => {
    mockConfigFind.mockResolvedValue(makeConfig() as never);
    mockRunFind.mockResolvedValue(null);
    mockTestFind.mockResolvedValue(null);
    mockRunCreate.mockResolvedValue(makeRun({ status: 'RUNNING', generatedTestId: null }) as never);
    mockRunUpdate.mockResolvedValue({} as never);
    mockConfigUpdate.mockResolvedValue({} as never);
    mockGenerate.mockResolvedValue({ ok: false, error: 'OpenAI timeout', stage: 'AI_CALL' });

    const result = await runAutomation({ overrideDateStr: '2026-08-24' });
    expect(result.status).toBe('FAILED');
    expect(result.message).toContain('Generation failed');
    expect(mockValidate).not.toHaveBeenCalled();
  });

  it('returns HELD_FOR_REVIEW when validation fails (content issues)', async () => {
    mockConfigFind.mockResolvedValue(makeConfig() as never);
    mockRunFind.mockResolvedValue(null);
    mockTestFind.mockResolvedValue(null);
    mockRunCreate.mockResolvedValue(makeRun({ status: 'RUNNING', generatedTestId: null }) as never);
    mockRunUpdate.mockResolvedValue({} as never);
    mockConfigUpdate.mockResolvedValue({} as never);
    mockGenerate.mockResolvedValue({ ok: true, testId: 'test-3', slug: 'slug-3', generationMs: 800 });
    mockValidate.mockResolvedValue({
      ok: true,
      overallStatus: 'VALIDATION_FAILED',
      passed: 20,
      failed: 5,
      reviewNeeded: 0,
      validationMs: 300,
      validationSummary: '5 questions have factual errors.',
    });

    const result = await runAutomation({ overrideDateStr: '2026-08-25' });
    expect(result.status).toBe('HELD_FOR_REVIEW');
    expect(result.message).toContain('validation failed');
    expect(mockPublish).not.toHaveBeenCalled();
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('returns FAILED when validation itself errors (technical failure)', async () => {
    mockConfigFind.mockResolvedValue(makeConfig() as never);
    mockRunFind.mockResolvedValue(null);
    mockTestFind.mockResolvedValue(null);
    mockRunCreate.mockResolvedValue(makeRun({ status: 'RUNNING', generatedTestId: null }) as never);
    mockRunUpdate.mockResolvedValue({} as never);
    mockConfigUpdate.mockResolvedValue({} as never);
    mockGenerate.mockResolvedValue({ ok: true, testId: 'test-4', slug: 'slug-4', generationMs: 700 });
    mockValidate.mockResolvedValue({ ok: false, error: 'AI validator crashed', stage: 'AI_CALL' });

    const result = await runAutomation({ overrideDateStr: '2026-08-26' });
    expect(result.status).toBe('FAILED');
    expect(result.message).toContain('Validation error');
  });

  it('schedules test when autoPublish=ON and publish time is in the future', async () => {
    mockConfigFind.mockResolvedValue(makeConfig({ autoPublish: true, publishTime: '23:59' }) as never);
    mockRunFind.mockResolvedValue(null);
    mockTestFind.mockResolvedValue(null);
    mockRunCreate.mockResolvedValue(makeRun() as never);
    mockRunUpdate.mockResolvedValue({} as never);
    mockConfigUpdate.mockResolvedValue({} as never);
    mockGenerate.mockResolvedValue({ ok: true, testId: 'test-5', slug: 'slug-5', generationMs: 600 });
    mockValidate.mockResolvedValue({ ok: true, overallStatus: 'READY', passed: 5, failed: 0, reviewNeeded: 0, validationMs: 200, validationSummary: '' });
    mockSchedule.mockResolvedValue({ ok: true, data: { publishAt: new Date() } });

    const result = await runAutomation({ overrideDateStr: '2026-08-27' });
    expect(result.status).toBe('SUCCESS');
    expect(mockSchedule).toHaveBeenCalled();
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it('leaves test as READY when autoPublish=OFF', async () => {
    mockConfigFind.mockResolvedValue(makeConfig({ autoPublish: false }) as never);
    mockRunFind.mockResolvedValue(null);
    mockTestFind.mockResolvedValue(null);
    mockRunCreate.mockResolvedValue(makeRun() as never);
    mockRunUpdate.mockResolvedValue({} as never);
    mockConfigUpdate.mockResolvedValue({} as never);
    mockGenerate.mockResolvedValue({ ok: true, testId: 'test-6', slug: 'slug-6', generationMs: 500 });
    mockValidate.mockResolvedValue({ ok: true, overallStatus: 'READY', passed: 5, failed: 0, reviewNeeded: 0, validationMs: 100, validationSummary: '' });

    const result = await runAutomation({ overrideDateStr: '2026-08-28' });
    expect(result.status).toBe('SUCCESS');
    expect(mockPublish).not.toHaveBeenCalled();
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('returns FAILED when OpenAI API key is missing', async () => {
    delete process.env.OPENAI_API_KEY;
    const result = await runAutomation();
    expect(result.status).toBe('FAILED');
    expect(result.message).toContain('OPENAI_API_KEY');
    process.env.OPENAI_API_KEY = 'sk-test-key';
  });
});

// ─── upsertAutomationConfig — topicMode persistence regression ───────────────
//
// Root cause of the "Enable Queue Mode" bug:
//   PUT /api/admin/automation/config was missing `topicMode` from its whitelist,
//   so { topicMode: 'QUEUE' } was stripped before reaching upsertAutomationConfig.
//   These tests verify the service layer correctly reads/writes topicMode so that
//   adding it to the API whitelist is sufficient to fix the end-to-end flow.

describe('upsertAutomationConfig — topicMode persistence', () => {
  const mockConfigCreate = db.dailyAutomationConfig.create as MockedFunction<
    typeof db.dailyAutomationConfig.create
  >;

  it('MANUAL → QUEUE: writes topicMode=QUEUE to the DB', async () => {
    // Existing config in MANUAL mode
    mockConfigFind.mockResolvedValue(makeConfig({ id: 'cfg-1' }) as never);
    mockConfigUpdate.mockResolvedValue({ ...makeConfig({ id: 'cfg-1' }), topicMode: 'QUEUE' } as never);

    await upsertAutomationConfig({ topicMode: 'QUEUE' });

    expect(mockConfigUpdate).toHaveBeenCalledWith({
      where: { id: 'cfg-1' },
      data: { topicMode: 'QUEUE' },
    });
  });

  it('QUEUE → MANUAL: writes topicMode=MANUAL to the DB', async () => {
    mockConfigFind.mockResolvedValue({ ...makeConfig({ id: 'cfg-1' }), topicMode: 'QUEUE' } as never);
    mockConfigUpdate.mockResolvedValue({ ...makeConfig({ id: 'cfg-1' }), topicMode: 'MANUAL' } as never);

    await upsertAutomationConfig({ topicMode: 'MANUAL' });

    expect(mockConfigUpdate).toHaveBeenCalledWith({
      where: { id: 'cfg-1' },
      data: { topicMode: 'MANUAL' },
    });
  });

  it('config reload returns persisted topicMode=QUEUE', async () => {
    // Simulate the DB returning a config whose topicMode was already set to QUEUE.
    const persistedConfig = { ...makeConfig({ id: 'cfg-1' }), topicMode: 'QUEUE' };
    mockConfigFind.mockResolvedValue(persistedConfig as never);

    const cfg = await getAutomationConfig();

    expect(cfg?.topicMode).toBe('QUEUE');
  });

  it('creates new config with topicMode=QUEUE when no config exists', async () => {
    mockConfigFind.mockResolvedValue(null);
    mockConfigCreate.mockResolvedValue({ ...makeConfig({ id: 'cfg-new' }), topicMode: 'QUEUE' } as never);

    await upsertAutomationConfig({ topicMode: 'QUEUE' });

    // create() should be called and topicMode should be included in data
    expect(mockConfigCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ topicMode: 'QUEUE' }),
      }),
    );
  });
});
