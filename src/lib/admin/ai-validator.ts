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
    'Validate each question for:',
    '1. HINDI/ENGLISH CONSISTENCY — Do Hindi and English question texts convey the same meaning? Do all A/B/C/D options match semantically? Does the marked correct answer remain logically identical across both languages?',
    '2. FACTUAL ACCURACY — Are dates, names, places, events, and historical facts correct? If you are uncertain about a fact, use REVIEW status instead of FAIL (do not invent certainty).',
    '3. AMBIGUITY — Is there more than one plausible correct answer? Is the wording vague? Are distractors misleading or trick questions?',
    '4. NEAR-DUPLICATE — Is this question semantically very similar to another in this same batch (same concept, different wording)?',
    '5. TOPIC ALIGNMENT — Does the question clearly belong to the specified category and topic?',
    '6. DIFFICULTY ALIGNMENT — Is the question appropriate for the specified difficulty level?',
    '',
    'STATUS RULES:',
    '- PASS: factually correct, unambiguous, well-aligned, Hindi/English consistent.',
    '- FAIL: clear factual error confirmed with high confidence, obvious ambiguity (two equally valid answers), contradictory translations, or severely off-topic.',
    '- REVIEW: factual uncertainty (cannot confidently verify), minor ambiguity, mild off-topic drift, near-duplicate detected.',
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
