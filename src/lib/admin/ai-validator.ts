// Agent 2 – AI Validator
// Sends deterministic-clean questions to gpt-4o for semantic/factual review.
// Uses structured JSON output (response_format: json_object via fetch, same as Agent 1).
// Never called on questions that already FAIL deterministic checks.

import type { GeneratedQuestion } from '@/types/generated-test';
import type {
  AIValidationOutput,
  AIQuestionValidation,
  QuestionValidationInput,
  ValidationOverallStatus,
} from '@/types/validation';

// Maximum questions per single AI request (keeps token output manageable).
const BATCH_SIZE = 20;
const VALIDATION_MODEL = 'gpt-4o';

// ─── Scope context passed from the test record ────────────────────────────────

export type TopicScopeContext = {
  /** Admin-defined scope boundary (null = no constraint). */
  strictTopicScope: string | null;
  excludeScope: string | null;
  /** STRICT = out-of-scope → FAIL. NORMAL = out-of-scope → REVIEW only. */
  topicAdherenceMode: 'STRICT' | 'NORMAL';
};

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(
  exam: string,
  category: string,
  topic: string,
  difficulty: string,
  scope: TopicScopeContext | null,
): string {
  const hasScopeConstraint = scope && (scope.strictTopicScope || scope.excludeScope);
  const mode = scope?.topicAdherenceMode ?? 'STRICT';

  const scopeSection = hasScopeConstraint
    ? [
        '',
        '═══════════════════════════════════════════',
        `TOPIC SCOPE BOUNDARY (mode: ${mode})`,
        '═══════════════════════════════════════════',
        ...(scope.strictTopicScope
          ? ['WHAT THIS TOPIC COVERS:', scope.strictTopicScope]
          : []),
        ...(scope.excludeScope
          ? ['', 'EXCLUDE / OUT OF SCOPE:', scope.excludeScope]
          : []),
        '',
        mode === 'STRICT'
          ? '⚠️  STRICT MODE: A question that is factually correct but tests content OUTSIDE the declared scope above must receive status=FAIL with issue type=TOPIC_SCOPE_FAIL. This is not a factual error — it is a scope violation.'
          : 'NORMAL MODE: A question outside the declared scope should receive status=REVIEW with issue type=TOPIC_SCOPE_FAIL.',
      ]
    : [];

  return [
    `You are an expert educational content validator for ${exam} (teacher recruitment) exam question papers.`,
    `You are reviewing MCQ questions in category "${category}", topic "${topic}", difficulty "${difficulty}".`,
    ...scopeSection,
    '',
    'Questions may use different formats. Validate each according to its questionType:',
    '',
    'GENERAL CHECKS (apply to ALL question types):',
    '1. HINDI/ENGLISH CONSISTENCY — Do Hindi and English question texts convey the same meaning? Do all A/B/C/D options match semantically? Does the marked correct answer remain logically identical across both languages?',
    '2. FACTUAL ACCURACY — Are dates, names, places, events, and historical facts correct? If you are uncertain about a fact, use REVIEW status instead of FAIL (do not invent certainty).',
    '3. AMBIGUITY — Is there more than one plausible correct answer? Is the wording vague?',
    '4. NEAR-DUPLICATE — Is this question semantically very similar to another in this same batch?',
    '5. TOPIC ALIGNMENT — Does the question clearly belong to the specified category and topic?',
    hasScopeConstraint
      ? `5a. TOPIC SCOPE — Does the question stay within the declared scope boundary above? If not, issue type=TOPIC_SCOPE_FAIL.`
      : '5a. TOPIC SCOPE — Is the question directly relevant to the specified topic?',
    '6. DIFFICULTY ALIGNMENT — Is the question appropriate for the specified difficulty level?',
    '',
    'TYPE-SPECIFIC CHECKS:',
    '',
    'STATEMENT questions:',
    '- Verify every numbered statement independently for factual correctness.',
    '- Verify that the correct answer combination (e.g., "Only 1 and 2") is actually true.',
    '- If a statement contains any factual error, flag FAIL or REVIEW for the whole question.',
    '- Do NOT pass a statement question just because the answer options look plausible.',
    '',
    'QUOTE_ATTRIBUTION questions:',
    '- Verify the quote is correctly attributed to the stated correct answer.',
    '- Use REVIEW if the attribution is disputed, unclear, or you are not fully certain.',
    '- Use FAIL only if the attribution is definitively wrong with high confidence.',
    '- Never flag a well-established verified quote just because it sounds unusual.',
    '',
    'CHRONOLOGY / ORDERING questions:',
    '⚠️  STRUCTURAL CHECK — perform this BEFORE evaluating whether the answer is correct:',
    '  1. Is the ordering/comparison criterion explicitly stated in the question text?',
    '     (e.g. "chronological order", "north to south", "west to east", "ascending value")',
    '  2. Is that criterion objectively measurable? Is there exactly ONE defensible ordering?',
    '  3. Are ALL listed entities comparable using the SAME criterion?',
    '  If any of (1), (2), or (3) is NO → immediately return status=FAIL, issue type=INVALID_ORDERING_CRITERION.',
    '  Do NOT attempt to evaluate the A/B/C/D answer sequences until the criterion itself is valid.',
    '',
    '  VALID ordering criteria examples:',
    '    ✓ "Arrange the following events in chronological order (by year)"',
    '    ✓ "Arrange from north to south by location"',
    '    ✓ "Arrange from west to east by longitude"',
    '    ✓ "Arrange rivers from upstream to downstream along the same river/system"',
    '    ✓ "Arrange in ascending order of area"',
    '',
    '  INVALID ordering criteria examples:',
    '    ✗ "Arrange these independent rivers from their sources to where they meet the sea"',
    '       → Each river has its own independent geography. No single comparable axis exists.',
    '    ✗ "Arrange in correct order" (vague — multiple valid interpretations)',
    '    ✗ Any ordering that forces unrelated entities onto a single scale they do not share.',
    '',
    'After the structural check passes:',
    '- Verify the year/date of each listed event.',
    '- Verify that exactly one of the four given sequences is the correct chronological order.',
    '- Flag FAIL if dates are wrong or the stated correct sequence is actually incorrect.',
    '- Use REVIEW only if you are genuinely uncertain about a specific date or event in the sequence.',
    '- Use PASS when all listed dates/events are well-established facts and the sequence is clearly correct.',
    '- Do NOT use REVIEW merely because verifying is difficult — only flag if you have specific doubt.',
    '',
    'ASSERTION_REASON questions:',
    '- Verify the assertion (A) independently — is it factually correct?',
    '- Verify the reason (R) independently — is it factually correct?',
    '- Verify the explanatory relationship between A and R to determine which option (A/B/C/D) is correct.',
    '- Both A and R must be clearly true or clearly false — do not allow ambiguous statements.',
    '',
    'MATCHING questions:',
    '- Verify every pair used to derive the correct answer.',
    '- Verify that the three incorrect options are actually wrong.',
    '- A single incorrect pair in the supposedly correct option invalidates the question.',
    '',
    'STATUS RULES:',
    '- PASS: factually correct, unambiguous, well-aligned, Hindi/English consistent, type-specific checks passed, within topic scope.',
    '- FAIL: clear factual error with high confidence, obvious ambiguity (two equally valid answers), contradictory translations, severely off-topic, or TOPIC_SCOPE_FAIL in STRICT mode.',
    '- REVIEW: factual uncertainty (cannot confidently verify), minor ambiguity, mild off-topic drift, near-duplicate, disputed quote attribution, or TOPIC_SCOPE_FAIL in NORMAL mode.',
    '  Prefer REVIEW over FAIL when not fully certain — EXCEPT for TOPIC_SCOPE_FAIL which must be FAIL in STRICT mode.',
    '',
    'MANDATORY SELF-CONSISTENCY CHECK (apply before finalising status=FAIL):',
    '1. Re-read your issues[] messages and your suggestedFix.',
    '2. If your suggestedFix says "the correct answer should be [X]" and the question\'s marked correctOption already represents [X], you have produced a self-contradiction: you say the current answer is wrong AND you suggest the same answer as the fix.',
    '3. In that case, change status to REVIEW (not FAIL). NEVER return status=FAIL when your own suggestedFix endorses the current marked answer.',
    '4. If you genuinely cannot verify whether the marked answer is wrong, prefer REVIEW over FAIL.',
    '',
    'IMPORTANT: Do NOT rewrite or alter questions. Only report issues. Do not invent problems that are not present.',
    '',
    'Return ONLY a valid JSON object matching the specified schema. No markdown, no explanations outside the JSON.',
  ].join('\n');
}

// ─── User prompt ──────────────────────────────────────────────────────────────

function buildUserPrompt(
  questions: GeneratedQuestion[],
  exam: string,
  category: string,
  topic: string,
): string {
  const questionsData = questions.map((q) => ({
    order: q.order,
    questionType: (q as GeneratedQuestion & { questionType?: string }).questionType ?? 'DIRECT',
    questionHi: q.questionHi,
    questionEn: q.questionEn,
    optionA: { hi: q.optionAHi, en: q.optionAEn },
    optionB: { hi: q.optionBHi, en: q.optionBEn },
    optionC: { hi: q.optionCHi, en: q.optionCEn },
    optionD: { hi: q.optionDHi, en: q.optionDEn },
    correctOption: q.correctOption,
    explanationHi: q.explanationHi,
    explanationEn: q.explanationEn,
  }));

  return [
    `Validate the following ${questions.length} MCQ questions for ${exam}, category: "${category}", topic: "${topic}".`,
    '',
    'Questions:',
    JSON.stringify(questionsData, null, 2),
    '',
    'Return a JSON object with EXACTLY this shape (no extra keys):',
    `{
  "overallStatus": "READY or VALIDATION_FAILED",
  "validationSummary": "1-2 sentence summary of findings",
  "questions": [
    {
      "order": <same integer as input>,
      "status": "PASS or FAIL or REVIEW",
      "confidence": <float 0.0-1.0>,
      "issues": [
        {
          "type": "FACTUAL_ERROR | TRANSLATION_MISMATCH | AMBIGUITY | TOPIC_MISMATCH | TOPIC_SCOPE_FAIL | DIFFICULTY_MISMATCH | NEAR_DUPLICATE | OTHER",
          "message": "<specific description>",
          "severity": "ERROR | WARNING"
        }
      ],
      "suggestedFix": null or "<brief suggestion>",
      "factualNotes": null or "<factual context or source hint>"
    }
  ]
}`,
    '',
    'Rules:',
    `- Include an entry for ALL ${questions.length} questions in the exact input order.`,
    '- overallStatus = READY only if ALL questions are PASS. Otherwise VALIDATION_FAILED.',
    '- For questions with no issues, use an empty array [] for issues.',
    '- Do not include partial objects.',
    '- TOPIC_SCOPE_FAIL: use this issue type when a question is factually correct but outside the declared topic scope boundary.',
  ].join('\n');
}

// ─── Parse + validate AI output ───────────────────────────────────────────────

function parseAIOutput(raw: string, expectedCount: number): AIValidationOutput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`AI returned non-JSON. Preview: ${raw.slice(0, 300)}`);
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('AI response is not a JSON object');
  }

  const obj = parsed as Record<string, unknown>;

  if (!['READY', 'VALIDATION_FAILED'].includes(obj.overallStatus as string)) {
    throw new Error(`Invalid overallStatus: ${String(obj.overallStatus)}`);
  }
  if (!Array.isArray(obj.questions)) {
    throw new Error('AI response missing "questions" array');
  }
  if (obj.questions.length !== expectedCount) {
    throw new Error(
      `AI returned ${obj.questions.length} question results, expected ${expectedCount}`,
    );
  }

  return parsed as AIValidationOutput;
}

// ─── OpenAI HTTP call ─────────────────────────────────────────────────────────

async function callOpenAI(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: VALIDATION_MODEL,
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 8000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI returned ${response.status}: ${errText.slice(0, 200)}`);
  }

  type OpenAIResp = { choices: Array<{ message: { content: string } }> };
  const data = (await response.json()) as OpenAIResp;
  return data.choices?.[0]?.message?.content ?? '';
}

// ─── Single-batch validation ──────────────────────────────────────────────────

async function validateBatch(
  apiKey: string,
  batch: GeneratedQuestion[],
  exam: string,
  category: string,
  topic: string,
  difficulty: string,
  scope: TopicScopeContext | null,
): Promise<AIQuestionValidation[]> {
  const systemPrompt = buildSystemPrompt(exam, category, topic, difficulty, scope);
  const userPrompt = buildUserPrompt(batch, exam, category, topic);
  const raw = await callOpenAI(apiKey, systemPrompt, userPrompt);
  const output = parseAIOutput(raw, batch.length);
  return output.questions;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export type AIValidationRunResult = {
  /**
   * Validation results keyed by GeneratedQuestion.id (stable questionId).
   * Mapped positionally from the AI's ordered output so position[i] →
   * questions[i].id — this is safe because the AI is instructed to return
   * results in the exact same order as the input.
   */
  questionResults: Map<string, AIQuestionValidation>;
  overallStatus: ValidationOverallStatus;
  validationSummary: string;
  model: string;
};

export async function runAIValidation(
  apiKey: string,
  questions: GeneratedQuestion[],
  exam: string,
  category: string,
  topic: string,
  difficulty: string,
  scope?: TopicScopeContext | null,
): Promise<AIValidationRunResult> {
  const scopeCtx = scope ?? null;

  // Split into batches
  const batches: GeneratedQuestion[][] = [];
  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    batches.push(questions.slice(i, i + BATCH_SIZE));
  }

  const allResults: AIQuestionValidation[] = [];
  for (const batch of batches) {
    const batchResults = await validateBatch(apiKey, batch, exam, category, topic, difficulty, scopeCtx);
    allResults.push(...batchResults);
  }

  // Map by position (questions[i] → allResults[i]) using stable questionId as key.
  // This is safer than keying by `order` because:
  //  - For incremental validation the batch may be a subset (e.g. only Q25, order=25).
  //    The AI is instructed to preserve the order number, but positional mapping is
  //    the ground truth since count equality is already enforced by parseAIOutput.
  //  - Using questionId makes downstream lookups unambiguous regardless of ordering.
  const questionResults = new Map<string, AIQuestionValidation>();
  for (let i = 0; i < allResults.length; i++) {
    const question = questions[i];
    const result = allResults[i];
    if (question && result) {
      if (result.order !== question.order) {
        console.warn(
          `[AI_VAL] Order mismatch at idx=${i}: expected order=${question.order}, AI returned order=${result.order}. ` +
          `Using positional mapping (questionId=${question.id}).`,
        );
      }
      questionResults.set(question.id, result);
    }
  }

  const allPass = allResults.every((r) => r.status === 'PASS');
  const overallStatus: ValidationOverallStatus = allPass ? 'READY' : 'VALIDATION_FAILED';

  const passed = allResults.filter((r) => r.status === 'PASS').length;
  const failed = allResults.filter((r) => r.status === 'FAIL').length;
  const review = allResults.filter((r) => r.status === 'REVIEW').length;

  const validationSummary = allPass
    ? `All ${questions.length} questions passed AI validation.`
    : `AI validation: ${passed} passed, ${failed} failed, ${review} need review.`;

  return { questionResults, overallStatus, validationSummary, model: VALIDATION_MODEL };
}

// ─── Contradiction retry ──────────────────────────────────────────────────────

/**
 * Run a focused single-question AI retry when a previous validation was
 * self-contradictory (the validator's suggestedFix endorsed the current answer
 * while also setting status=FAIL).
 *
 * Uses the same system prompt as regular validation for format consistency,
 * but includes explicit contradiction context so the AI re-evaluates from scratch.
 *
 * Maximum ONE call — no loop. Caller decides what to do with the result.
 */
export async function retryContradictedQuestion(
  apiKey: string,
  question: GeneratedQuestion,
  previousResult: {
    issues: Array<{ type: string; message: string; severity: string }>;
    suggestedFix: string | null;
    factualNotes: string | null;
  },
  exam: string,
  category: string,
  topic: string,
  difficulty: string,
  scope: TopicScopeContext | null,
): Promise<AIQuestionValidation> {
  const systemPrompt = buildSystemPrompt(exam, category, topic, difficulty, scope);

  const correctEnKey = `option${question.correctOption}En` as keyof GeneratedQuestion;
  const correctOptionText = (question[correctEnKey] as string | undefined) ?? '';

  const userPrompt = [
    `Re-evaluate ONE question for ${exam}, category "${category}", topic "${topic}".`,
    '',
    '⚠️  YOUR PREVIOUS VALIDATION WAS INTERNALLY INCONSISTENT.',
    '',
    `You returned status=FAIL with issue(s): "${previousResult.issues.map((i) => i.message).join('; ')}"`,
    ...(previousResult.suggestedFix
      ? [`Your suggested fix was: "${previousResult.suggestedFix}"`]
      : []),
    ...(previousResult.factualNotes
      ? [`Your factual notes were: "${previousResult.factualNotes}"`]
      : []),
    '',
    `The current marked correct answer is Option ${question.correctOption} = "${correctOptionText}"`,
    '',
    'Notice: Your suggested fix described the SAME value as the current marked answer.',
    'You flagged the answer as wrong while simultaneously suggesting the same answer as the fix — that is a self-contradiction.',
    '',
    'INSTRUCTIONS FOR THIS RE-EVALUATION:',
    '1. Evaluate the question completely from scratch with fresh reasoning.',
    '2. Do NOT simply repeat your previous response.',
    '3. Return ONE internally consistent result: PASS, FAIL, or REVIEW.',
    '4. If you cannot find a genuine factual error (i.e. the current answer IS correct), return PASS.',
    '5. If you find a genuine different error with a clearly different correction, return FAIL.',
    '6. Apply the self-consistency check: if your suggestedFix would endorse the current answer, return PASS instead of FAIL.',
    '',
    'Question to re-evaluate:',
    JSON.stringify({
      order: question.order,
      questionType: (question as GeneratedQuestion & { questionType?: string }).questionType ?? 'DIRECT',
      questionHi: question.questionHi,
      questionEn: question.questionEn,
      optionA: { hi: question.optionAHi, en: question.optionAEn },
      optionB: { hi: question.optionBHi, en: question.optionBEn },
      optionC: { hi: question.optionCHi, en: question.optionCEn },
      optionD: { hi: question.optionDHi, en: question.optionDEn },
      correctOption: question.correctOption,
      explanationHi: question.explanationHi,
      explanationEn: question.explanationEn,
    }, null, 2),
    '',
    'Return a JSON object with exactly this shape (same as regular validation, for 1 question):',
    JSON.stringify({
      overallStatus: 'READY or VALIDATION_FAILED',
      validationSummary: '1-sentence summary',
      questions: [{
        order: question.order,
        status: 'PASS or FAIL or REVIEW',
        confidence: 0.9,
        issues: [],
        suggestedFix: null,
        factualNotes: null,
      }],
    }, null, 2),
  ].join('\n');

  const raw = await callOpenAI(apiKey, systemPrompt, userPrompt);

  // Parse — reuse parseAIOutput which expects the standard batch format (1 question)
  let parsed: AIValidationOutput;
  try {
    parsed = parseAIOutput(raw, 1);
  } catch {
    // If the AI didn't return the standard format, try parsing the single-result fallback
    try {
      const obj = JSON.parse(raw) as Record<string, unknown>;
      if (typeof obj.status === 'string') {
        // AI returned a flat single-result object instead of the batch wrapper
        return {
          order: question.order,
          status: (obj.status as 'PASS' | 'FAIL' | 'REVIEW'),
          confidence: typeof obj.confidence === 'number' ? obj.confidence : 0.8,
          issues: Array.isArray(obj.issues) ? (obj.issues as AIQuestionValidation['issues']) : [],
          suggestedFix: typeof obj.suggestedFix === 'string' ? obj.suggestedFix : null,
          factualNotes: typeof obj.factualNotes === 'string' ? obj.factualNotes : null,
        };
      }
    } catch {
      // fall through
    }
    throw new Error(`Contradiction retry returned unparseable response: ${raw.slice(0, 300)}`);
  }

  return parsed.questions[0];
}

/**
 * Merges deterministic results with AI results.
 *
 * Deterministic FAIL always wins — AI is only applied to questions that cleared
 * deterministic checks.
 *
 * aiResults is now keyed by questionId (not by order) to avoid mis-routing when
 * incremental validation sends only a subset of questions to the AI.
 */
export function mergeValidationResults(
  deterministicResults: QuestionValidationInput[],
  aiResults: Map<string, AIQuestionValidation>,
  cleanQuestionIds: Set<string>,
): QuestionValidationInput[] {
  return deterministicResults.map((det) => {
    // Deterministic failure → AI cannot override
    if (!cleanQuestionIds.has(det.questionId)) {
      return det;
    }

    // Look up by stable questionId — never by order/position
    const ai = aiResults.get(det.questionId);
    if (!ai) {
      // AI did not validate this question (not in this incremental batch) — keep det result
      return det;
    }

    return {
      ...det,
      status: ai.status,
      confidence: ai.confidence,
      issues: [...det.issues, ...ai.issues],
      suggestedFix: ai.suggestedFix,
      factualNotes: ai.factualNotes,
    };
  });
}
