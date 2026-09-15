/**
 * Subject Test Generation Service — Full Subject Test (80Q) Format
 *
 * Generates exactly 80 bilingual MCQ questions in 4 sequential batches of 20.
 * Each batch is a separate OpenAI call so output never approaches the 16K
 * token limit (worst-case per 20Q: ~8,580 tokens; limit: 16,000 tokens).
 *
 * Batch ordering:
 *   Batch 1 → Q1–Q20
 *   Batch 2 → Q21–Q40
 *   Batch 3 → Q41–Q60
 *   Batch 4 → Q61–Q80
 *
 * Server-assigned orders override whatever the AI returned, so the final
 * question set always has orders 1–80 with no gaps or duplicates.
 *
 * Atomicity: all 80 questions and the GENERATED status transition are written
 * in one Prisma $transaction so the DB never has partial state.
 *
 * LIMITATION — Stale GENERATING records: if Vercel hard-terminates the function,
 * the finally/markFailed cleanup is not guaranteed. Stale recovery is handled by
 * GET /api/admin/tests which marks GENERATING records older than 8 min as DRAFT.
 *
 * Server-only. Never import in client components.
 */

import { db } from '@/lib/db';
import { validateAIOutput } from '@/lib/admin/question-validator';
import { buildSystemPrompt } from '@/lib/admin/generator-prompt';
import { generateTestSlug } from '@/lib/admin/slug-generator';
import { mapAIQuestionToDBRow } from '@/lib/admin/question-mapper';
import type { AIGenerationResult, AIQuestion, GeneratedDifficulty } from '@/types/generated-test';
import type { GenerationResult } from '@/lib/admin/generation.service';

// ─── Constants ────────────────────────────────────────────────────────────────

const OPENAI_MODEL = 'gpt-4o';
const BATCH_SIZE = 20;
const BATCH_COUNT = 4;
const TOTAL_QUESTIONS = 80; // BATCH_SIZE * BATCH_COUNT

/**
 * Budget guard: stop scheduling new OpenAI calls when less than this many ms
 * remain. Covers DB write (~3 s), duplicate check (<1 s), error handling (~2 s).
 */
const MINIMUM_REMAINING_BUDGET_MS = 30_000;

/** maxDuration for the route is 300 s (Vercel Hobby/Pro Fluid Compute). */
const MAX_DURATION_MS = 295_000; // 5 s safety margin below the hard limit

// ─── Input type ───────────────────────────────────────────────────────────────

export type SubjectTestInput = {
  exam: 'BPSC TRE 4';
  category: string;     // e.g. "Physics"
  subjectLabel: string; // e.g. "Physics" (display label, may differ in future)
  topic: string;        // auto-generated, e.g. "Physics — Test 1"
  difficulty: GeneratedDifficulty;
};

// ─── Scope builder ────────────────────────────────────────────────────────────

/**
 * Generates the auto-applied strictTopicScope for a subject test.
 * No admin input: the scope is always generated from the subject name.
 */
export function buildSubjectScope(subjectLabel: string): string {
  return [
    `This is a BPSC TRE 4 Part III (Concerned Subject) practice paper for ${subjectLabel}.`,
    `Questions must primarily assess knowledge and skills within the ${subjectLabel} syllabus as examined in BPSC TRE 4.`,
    `Cover a variety of sub-topics within ${subjectLabel} — do not restrict to a single sub-topic or chapter.`,
    `Supporting interdisciplinary context is acceptable only when the correct answer is determined mainly by ${subjectLabel} subject knowledge.`,
    `Do not generate a question whose primary tested knowledge belongs to an unrelated subject.`,
  ].join('\n');
}

// ─── Batch prompt builder ─────────────────────────────────────────────────────

/**
 * Builds the user-turn prompt for one 20-question batch.
 * Reuses buildSystemPrompt (system turn) from generator-prompt.ts.
 *
 * @param batchNumber  1–4
 * @param input        subject test input
 * @param strictScope  pre-built scope string
 * @param prevQuestions questions already generated in earlier batches (for dedup guidance)
 */
function buildBatchUserPrompt(
  batchNumber: number,
  input: SubjectTestInput,
  strictScope: string,
  prevQuestions: AIQuestion[],
): string {
  const difficultyNotes: Record<string, string> = {
    Beginner:
      'Use simple, basic concepts. Questions should be easy for a first-time learner. Avoid tricky wording. Focus on well-known facts.',
    Easy: 'Use straightforward concepts. Avoid ambiguity. Questions require basic recall.',
    Moderate:
      'Mix basic recall with applied understanding. Some questions may require reasoning or comparison.',
    Hard: 'Include nuanced details, date-specific facts, subtle distinctions, and multi-step reasoning.',
    'Very Hard':
      'Push to maximum difficulty through REASONING and PRECISION — not just obscure trivia. Use statement evaluation, assertion-reason, tight chronological sequences, cause-effect chains, close-alternative distractors.',
    Mixed: 'Include a balanced mix of difficulty levels appropriate for BPSC TRE 4 examination.',
  };

  const prevBlock =
    prevQuestions.length > 0
      ? [
          '',
          '═══════════════════════════════════════════',
          'DO NOT REPEAT THESE QUESTIONS (already generated in earlier batches)',
          '═══════════════════════════════════════════',
          'The following exact questions were already generated. Do not regenerate any of these.',
          'You may generate different questions about the same sub-topic, but not these specific ones:',
          '',
          ...prevQuestions.map((q, i) => `${i + 1}. ${q.questionEn}`),
          '',
        ].join('\n')
      : '';

  return [
    `Generate exactly ${BATCH_SIZE} unique bilingual MCQ practice questions for a BPSC TRE 4 subject paper.`,
    `This is batch ${batchNumber} of ${BATCH_COUNT}. Use orders 1 through ${BATCH_SIZE} in your response.`,
    '(The server will remap these to the correct global order range automatically.)',
    '',
    `Exam: ${input.exam}`,
    `Category: ${input.category}`,
    `Topic: ${input.topic}`,
    `Difficulty: ${input.difficulty}`,
    `Difficulty guidance: ${difficultyNotes[input.difficulty] ?? difficultyNotes.Moderate}`,
    '',
    '═══════════════════════════════════════════',
    'SUBJECT SCOPE (STRICT — every question must comply)',
    '═══════════════════════════════════════════',
    strictScope,
    '',
    '⚠️  STRICT MODE: Every question must directly assess the declared subject scope above.',
    '    A question that is factually correct but primarily tests a different subject will FAIL validation.',
    prevBlock,
    '═══════════════════════════════════════════',
    'JSON SCHEMA (return ONLY this, no other text)',
    '═══════════════════════════════════════════',
    `{
  "titleHi": "<Hindi title — 6 to 12 words>",
  "titleEn": "<English title — 5 to 10 words>",
  "questions": [
    {
      "order": 1,
      "category": "<sub-category tag within ${input.category}>",
      "topic": "${input.topic}",
      "difficulty": "<Beginner | Easy | Moderate | Hard | Very Hard>",
      "questionType": "<DIRECT | STATEMENT | QUOTE_ATTRIBUTION | CHRONOLOGY | MATCHING | ASSERTION_REASON>",
      "questionHi": "<Hindi question text>",
      "optionAHi": "<Hindi option A>",
      "optionBHi": "<Hindi option B>",
      "optionCHi": "<Hindi option C>",
      "optionDHi": "<Hindi option D>",
      "explanationHi": "<Hindi explanation — 1-2 sentences>",
      "questionEn": "<English question text>",
      "optionAEn": "<English option A>",
      "optionBEn": "<English option B>",
      "optionCEn": "<English option C>",
      "optionDEn": "<English option D>",
      "explanationEn": "<English explanation — 1-2 sentences>",
      "correctOption": "A"
    }
  ]
}`,
    '',
    `Generate all ${BATCH_SIZE} questions now. correctOption must be one of: A, B, C, D — never E.`,
  ].join('\n');
}

// ─── Retry-aware OpenAI call ──────────────────────────────────────────────────

type OAResp = { choices: Array<{ message: { content: string } }> };
type BatchCallResult =
  | { ok: true; data: OAResp }
  | { ok: false; error: string; retryable: boolean };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls OpenAI with bounded exponential backoff.
 *
 * Retryable:  HTTP 429, temporary 5xx, network errors (max 2 retries/call).
 * Not-retried: 400 Bad Request, 401 Unauthorized, 402 Payment Required,
 *              403 Forbidden, or deterministic failures (content/schema errors).
 *
 * Retry-After header is honoured for 429 (seconds integer or HTTP date).
 * Retries are skipped if the wait would push elapsed beyond the budget.
 */
async function callOpenAIOnce(
  payload: object,
  apiKey: string,
  budgetRemainingMs: number,
  corrId: string,
  batchNum: number,
): Promise<BatchCallResult> {
  const MAX_RETRIES = 2;
  let lastError = 'Unknown error';
  let totalWaited = 0;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = (await res.json()) as OAResp;
        return { ok: true, data };
      }

      const status = res.status;
      const errText = await res.text();
      lastError = `OpenAI HTTP ${status}: ${errText.slice(0, 200)}`;

      // Non-retryable: auth, billing, bad request
      if (status === 400 || status === 401 || status === 402 || status === 403) {
        return { ok: false, error: lastError, retryable: false };
      }

      // Retryable: 429 or 5xx
      if (status === 429 || status >= 500) {
        if (attempt >= MAX_RETRIES) break;

        // Parse Retry-After (seconds integer or HTTP date)
        let waitMs: number;
        const retryAfterHeader = res.headers.get('Retry-After');
        if (retryAfterHeader) {
          const asInt = parseInt(retryAfterHeader, 10);
          if (!isNaN(asInt)) {
            waitMs = asInt * 1000;
          } else {
            const retryDate = new Date(retryAfterHeader).getTime();
            waitMs = !isNaN(retryDate) ? Math.max(0, retryDate - Date.now()) : 3000;
          }
        } else {
          // Exponential backoff: attempt 0→3 s, attempt 1→6 s
          waitMs = 3000 * Math.pow(2, attempt);
        }

        // Guard: skip retry if wait + minimum_budget exceeds remaining budget
        if (totalWaited + waitMs + MINIMUM_REMAINING_BUDGET_MS > budgetRemainingMs) {
          console.warn(
            `[${corrId}] batch ${batchNum} retry ${attempt + 1} skipped — budget exhausted (waitMs=${waitMs})`,
          );
          break;
        }

        console.warn(
          `[${corrId}] batch ${batchNum} retry ${attempt + 1} after ${waitMs}ms (HTTP ${status})`,
        );
        await sleep(waitMs);
        totalWaited += waitMs;
        continue;
      }

      // Unknown error code
      return { ok: false, error: lastError, retryable: false };
    } catch (err) {
      // Network/fetch error — retryable
      lastError = err instanceof Error ? err.message : 'Network error';
      if (attempt >= MAX_RETRIES) break;

      const waitMs = 2000 * Math.pow(2, attempt); // 2 s, 4 s
      if (totalWaited + waitMs + MINIMUM_REMAINING_BUDGET_MS > budgetRemainingMs) {
        console.warn(`[${corrId}] batch ${batchNum} network-retry skipped — budget exhausted`);
        break;
      }
      console.warn(`[${corrId}] batch ${batchNum} network-retry ${attempt + 1} after ${waitMs}ms: ${lastError}`);
      await sleep(waitMs);
      totalWaited += waitMs;
    }
  }

  return { ok: false, error: lastError, retryable: false };
}

// ─── Literal duplicate detection ──────────────────────────────────────────────

/**
 * Detects literal duplicate questions across all batches.
 * Normalises text (lowercase, collapsed whitespace) before comparison.
 * Returns an error string if any duplicate is found, otherwise null.
 *
 * Semantic duplicates are NOT detected here — they are flagged later by
 * Agent 2 (AI validation) as NEAR_DUPLICATE issues at REVIEW level.
 * Duplicates are never silently removed — a detected duplicate causes the
 * entire generation to fail so the admin retries, keeping the count at 80.
 */
function detectLiteralDuplicates(questions: AIQuestion[]): string | null {
  const seen = new Map<string, number>(); // normalised text → first occurrence index
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const normEn = q.questionEn.toLowerCase().replace(/\s+/g, ' ').trim();
    const normHi = q.questionHi.toLowerCase().replace(/\s+/g, ' ').trim();
    const key = `${normEn}|||${normHi}`;
    const firstIdx = seen.get(key);
    if (firstIdx !== undefined) {
      return `Literal duplicate detected: Q${firstIdx + 1} and Q${i + 1} are identical. Please retry generation.`;
    }
    seen.set(key, i);
  }
  return null;
}

// ─── DB helper ────────────────────────────────────────────────────────────────

async function markFailed(testId: string, errorMessage: string): Promise<void> {
  await db.generatedTest
    .update({ where: { id: testId }, data: { status: 'DRAFT', errorMessage } })
    .catch(() => {});
}

// ─── Main generation function ─────────────────────────────────────────────────

/**
 * Generates exactly 80 questions for a Full Subject Test in 4 sequential batches.
 *
 * Returns the same GenerationResult union as generateTest() in generation.service.ts
 * so the route handler can treat both paths identically.
 */
export async function generateSubjectTest(
  input: SubjectTestInput,
  apiKey: string,
  opts?: { onBatchComplete?: (batchNum: number, totalQuestions: number) => void },
): Promise<GenerationResult> {
  const reqStart = Date.now();
  const corrId = `subj-${Date.now().toString(36)}`;

  const strictScope = buildSubjectScope(input.subjectLabel);
  const slug = generateTestSlug(input.category, input.topic);

  // ── 1. Create GENERATING record ───────────────────────────────────────────
  let testId: string;
  try {
    const created = await db.generatedTest.create({
      data: {
        exam: input.exam,
        category: input.category,
        topic: input.topic,
        slug,
        titleHi: `${input.subjectLabel} — 80 प्रश्न अभ्यास प्रश्नपत्र`,
        titleEn: `${input.subjectLabel} — 80-Question Practice Paper`,
        difficulty: input.difficulty,
        totalQuestions: TOTAL_QUESTIONS,
        durationMinutes: TOTAL_QUESTIONS, // 80 min = 80 questions × 1 min/q
        status: 'GENERATING',
        generationSource: 'openai',
        generationModel: OPENAI_MODEL,
        strictTopicScope: strictScope,
        topicAdherenceMode: 'STRICT',
        excludeScope: null,
        plannedPublishAt: null,
      },
    });
    testId = created.id;
    console.log(`[${corrId}:${testId}] SETUP done | +${Date.now() - reqStart}ms`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'DB create failed';
    console.error(`[${corrId}] SETUP failed | ${msg}`);
    return { ok: false, error: `Failed to create test record: ${msg}`, stage: 'SETUP' };
  }

  // ── 2. Run 4 sequential batches ───────────────────────────────────────────
  const allQuestions: AIQuestion[] = [];
  const aiStart = Date.now();

  for (let batchIdx = 0; batchIdx < BATCH_COUNT; batchIdx++) {
    const batchNum = batchIdx + 1;
    const orderStart = batchIdx * BATCH_SIZE + 1; // 1, 21, 41, 61
    const orderEnd = orderStart + BATCH_SIZE - 1; // 20, 40, 60, 80

    // Budget check before each batch
    const elapsed = Date.now() - reqStart;
    const budgetRemaining = MAX_DURATION_MS - elapsed;
    if (budgetRemaining < MINIMUM_REMAINING_BUDGET_MS) {
      const msg = `Execution budget exhausted before batch ${batchNum} (elapsed=${elapsed}ms)`;
      console.error(`[${corrId}:${testId}] ${msg}`);
      await markFailed(testId, msg);
      return { ok: false, error: msg, stage: 'AI_CALL' };
    }

    console.log(
      `[${corrId}:${testId}] BATCH_${batchNum} start | orders=${orderStart}–${orderEnd} | prevQ=${allQuestions.length} | budget=${budgetRemaining}ms`,
    );

    const batchPrompt = buildBatchUserPrompt(batchNum, input, strictScope, allQuestions);
    const payload = {
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: buildSystemPrompt('STRICT') },
        { role: 'user', content: batchPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 16000,
    };

    const callResult = await callOpenAIOnce(payload, apiKey, budgetRemaining, corrId, batchNum);

    if (!callResult.ok) {
      const msg = `Batch ${batchNum} OpenAI call failed: ${callResult.error}`;
      console.error(`[${corrId}:${testId}] BATCH_${batchNum} failed | +${Date.now() - reqStart}ms | ${callResult.error}`);
      await markFailed(testId, msg);
      return { ok: false, error: msg, stage: 'AI_CALL' };
    }

    // Parse JSON
    const raw = callResult.data.choices?.[0]?.message?.content ?? '';
    let aiResult: AIGenerationResult;
    try {
      aiResult = JSON.parse(raw) as AIGenerationResult;
    } catch {
      const msg = `Batch ${batchNum} returned invalid JSON`;
      console.error(`[${corrId}:${testId}] BATCH_${batchNum} JSON_PARSE failed | ${msg}`);
      await markFailed(testId, msg);
      return { ok: false, error: msg, stage: 'AI_CALL' };
    }

    // Validate: must have exactly BATCH_SIZE questions, correct schema, A-D answers
    const structVal = validateAIOutput(aiResult, BATCH_SIZE);
    if (!structVal.valid) {
      const errMsg = structVal.errors.map((e) => `${e.field}: ${e.message}`).join('; ');
      const msg = `Batch ${batchNum} schema validation failed: ${errMsg}`;
      console.error(`[${corrId}:${testId}] BATCH_${batchNum} SCHEMA_INVALID | ${msg}`);
      await markFailed(testId, msg);
      return { ok: false, error: msg, stage: 'AI_CALL' };
    }

    // Server-side order override: remap AI orders 1-20 to batchOffset range
    const batchQuestions = (aiResult.questions as AIQuestion[]).map((q, localIdx) => ({
      ...q,
      order: orderStart + localIdx, // e.g. batch 2: 21, 22, ..., 40
    }));

    allQuestions.push(...batchQuestions);
    console.log(
      `[${corrId}:${testId}] BATCH_${batchNum} done | +${Date.now() - reqStart}ms | cumulative=${allQuestions.length}Q`,
    );
    opts?.onBatchComplete?.(batchNum, allQuestions.length);
  }

  // ── 3. Cross-batch literal duplicate check (warning only) ───────────────────
  // Duplicates do NOT abort generation — they are rare, cosmetic, and can be
  // caught later by Agent 2 validation (NEAR_DUPLICATE / FAIL flags).
  // Failing the full 4-batch run over a single duplicate wastes 3-4 minutes of
  // generation time and forces a full retry.
  const dupWarning = detectLiteralDuplicates(allQuestions);
  if (dupWarning) {
    console.warn(`[${corrId}:${testId}] DUPLICATE_CHECK warning (non-fatal) | ${dupWarning}`);
  }

  // ── 4. Final order validation: must be exactly 1–80 with no gaps ─────────
  const sortedOrders = allQuestions.map((q) => q.order).sort((a, b) => a - b);
  const ordersValid = sortedOrders.every((o, i) => o === i + 1);
  if (!ordersValid || allQuestions.length !== TOTAL_QUESTIONS) {
    const msg = `Internal order validation failed: got [${sortedOrders.slice(0, 5).join(',')}…] expected 1–${TOTAL_QUESTIONS}`;
    console.error(`[${corrId}:${testId}] ORDER_VALIDATION failed | ${msg}`);
    await markFailed(testId, msg);
    return { ok: false, error: msg, stage: 'AI_CALL' };
  }

  const generationMs = Date.now() - aiStart;

  // ── 5. Atomic transaction: createMany all 80 questions + update to GENERATED ─
  // Interactive form is used so that both operations explicitly share the same
  // Prisma transaction client `tx`. If either operation fails, PostgreSQL
  // automatically rolls back both — no partial questions are written.
  // Total DB time is << 1 s (single bulk INSERT + single UPDATE), well within
  // Neon's interactive-transaction idle timeout.
  const sortedRows = allQuestions
    .sort((a, b) => a.order - b.order)
    .map((q, idx) => mapAIQuestionToDBRow(q, testId, idx + 1)); // final 1-80 assignment

  try {
    await db.$transaction(async (tx) => {
      await tx.generatedQuestion.createMany({ data: sortedRows });
      await tx.generatedTest.update({
        where: { id: testId },
        data: {
          // Server-generated title — AI titles not used for subject tests.
          titleHi: `${input.subjectLabel} — 80 प्रश्न अभ्यास प्रश्नपत्र`,
          titleEn: `${input.subjectLabel} — 80-Question Practice Paper`,
          status: 'GENERATED',
          generationMs,
          errorMessage: null,
        },
      });
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'DB write failed';
    console.error(`[${corrId}:${testId}] DB_TRANSACTION failed | +${Date.now() - reqStart}ms | ${msg}`);
    // The transaction rolled back automatically — no partial questions exist.
    // Best-effort: mark test DRAFT so admin can retry.
    // Not guaranteed after Vercel hard termination (finally not reached).
    await markFailed(testId, `DB transaction failed: ${msg}`);
    return { ok: false, error: `Failed to save questions: ${msg}`, stage: 'DB_WRITE' };
  }

  const totalMs = Date.now() - reqStart;
  console.log(
    `[${corrId}:${testId}] COMPLETE | ✅ ${TOTAL_QUESTIONS}Q in ${BATCH_COUNT} batches | total=${totalMs}ms (ai=${generationMs}ms)`,
  );
  return { ok: true, testId, slug, generationMs };
}
