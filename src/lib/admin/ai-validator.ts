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

function buildSystemPrompt(exam: string, category: string, topic: string, difficulty: string): string {
  return [
    `You are an expert educational content validator for ${exam} (teacher recruitment) exam question papers.`,
    `You are reviewing MCQ questions in category "${category}", topic "${topic}", difficulty "${difficulty}".`,
    '',
    'Questions may use different formats. Validate each according to its questionType:',
    '',
    'GENERAL CHECKS (apply to ALL question types):',
    '1. HINDI/ENGLISH CONSISTENCY — Do Hindi and English question texts convey the same meaning? Do all A/B/C/D options match semantically? Does the marked correct answer remain logically identical across both languages?',
    '2. FACTUAL ACCURACY — Are dates, names, places, events, and historical facts correct? If you are uncertain about a fact, use REVIEW status instead of FAIL (do not invent certainty).',
    '3. AMBIGUITY — Is there more than one plausible correct answer? Is the wording vague?',
    '4. NEAR-DUPLICATE — Is this question semantically very similar to another in this same batch?',
    '5. TOPIC ALIGNMENT — Does the question clearly belong to the specified category and topic?',
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
    'CHRONOLOGY questions:',
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
    '- PASS: factually correct, unambiguous, well-aligned, Hindi/English consistent, type-specific checks passed.',
    '- FAIL: clear factual error with high confidence, obvious ambiguity (two equally valid answers), contradictory translations, or severely off-topic.',
    '- REVIEW: factual uncertainty (cannot confidently verify), minor ambiguity, mild off-topic drift, near-duplicate, disputed quote attribution.',
    '  Prefer REVIEW over FAIL when not fully certain.',
    '',
    'IMPORTANT: Do NOT rewrite or alter questions. Only report issues. Do not invent problems that are not present.',
    '',
    'Return ONLY a valid JSON object matching the specified schema. No markdown, no explanations outside the JSON.',
  ].join('\n');
}

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
          "type": "FACTUAL_ERROR | TRANSLATION_MISMATCH | AMBIGUITY | TOPIC_MISMATCH | DIFFICULTY_MISMATCH | NEAR_DUPLICATE | OTHER",
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
  ].join('\n');
}

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

async function validateBatch(
  apiKey: string,
  batch: GeneratedQuestion[],
  exam: string,
  category: string,
  topic: string,
  difficulty: string,
): Promise<AIQuestionValidation[]> {
  const systemPrompt = buildSystemPrompt(exam, category, topic, difficulty);
  const userPrompt = buildUserPrompt(batch, exam, category, topic);
  const raw = await callOpenAI(apiKey, systemPrompt, userPrompt);
  const output = parseAIOutput(raw, batch.length);
  return output.questions;
}

export type AIValidationRunResult = {
  questionResults: Map<number, AIQuestionValidation>; // keyed by question order
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
): Promise<AIValidationRunResult> {
  // Split into batches
  const batches: GeneratedQuestion[][] = [];
  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    batches.push(questions.slice(i, i + BATCH_SIZE));
  }

  const allResults: AIQuestionValidation[] = [];
  for (const batch of batches) {
    const batchResults = await validateBatch(apiKey, batch, exam, category, topic, difficulty);
    allResults.push(...batchResults);
  }

  const questionResults = new Map<number, AIQuestionValidation>();
  for (const r of allResults) {
    questionResults.set(r.order, r);
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

/**
 * Merges deterministic results with AI results.
 * Deterministic FAIL always wins — AI is only applied to questions that cleared deterministic checks.
 */
export function mergeValidationResults(
  deterministicResults: QuestionValidationInput[],
  aiResults: Map<number, AIQuestionValidation>,
  cleanQuestionIds: Set<string>,
): QuestionValidationInput[] {
  return deterministicResults.map((det) => {
    // Deterministic failure → AI cannot override
    if (!cleanQuestionIds.has(det.questionId)) {
      return det;
    }

    const ai = aiResults.get(det.order);
    if (!ai) {
      // AI didn't return data for this order — keep deterministic result
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
