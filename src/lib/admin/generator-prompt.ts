/**
 * Builds the OpenAI prompt for BPSC TRE 4 question generation.
 *
 * Produces diverse BPSC-style question papers using a balanced mix of
 * question types rather than 25 similar direct factual MCQs.
 *
 * Supported types:
 *   DIRECT           — Standard factual/conceptual MCQ
 *   STATEMENT        — "Which of the following statements is/are correct?"
 *   QUOTE_ATTRIBUTION — "Who made this statement?" (verified quotes only)
 *   CHRONOLOGY       — Arrange events in chronological order
 *   MATCHING         — "Which of the following pairs is correctly matched?"
 *   ASSERTION_REASON — Assertion (A) / Reason (R) format
 *
 * Server-side only. Never exposed to the browser.
 */

import type { GenerateTestInput } from '@/types/generated-test';

// ─── Distribution by difficulty ───────────────────────────────────────────────

type TypeCount = {
  DIRECT: number;
  STATEMENT: number;
  QUOTE_ATTRIBUTION: number;
  CHRONOLOGY: number;
  MATCHING: number;
  ASSERTION_REASON: number;
};

/**
 * Compute recommended question-type counts for a given difficulty and total.
 * Ratios are scaled to the actual totalQuestions and rounded so they always
 * sum exactly to totalQuestions (any rounding residual goes to DIRECT).
 */
function computeDistribution(difficulty: string, total: number): TypeCount {
  // Raw ratios (must sum to 1.0 per difficulty row)
  type Ratios = Omit<TypeCount, 'DIRECT'>;
  const NON_DIRECT_RATIOS: Record<string, Ratios> = {
    Beginner:     { STATEMENT: 0.16, QUOTE_ATTRIBUTION: 0.00, CHRONOLOGY: 0.04, MATCHING: 0.08, ASSERTION_REASON: 0.00 },
    Easy:         { STATEMENT: 0.20, QUOTE_ATTRIBUTION: 0.04, CHRONOLOGY: 0.08, MATCHING: 0.12, ASSERTION_REASON: 0.00 },
    Moderate:     { STATEMENT: 0.20, QUOTE_ATTRIBUTION: 0.12, CHRONOLOGY: 0.12, MATCHING: 0.12, ASSERTION_REASON: 0.08 },
    Hard:         { STATEMENT: 0.24, QUOTE_ATTRIBUTION: 0.12, CHRONOLOGY: 0.12, MATCHING: 0.12, ASSERTION_REASON: 0.12 },
    'Very Hard':  { STATEMENT: 0.28, QUOTE_ATTRIBUTION: 0.08, CHRONOLOGY: 0.16, MATCHING: 0.16, ASSERTION_REASON: 0.12 },
    Mixed:        { STATEMENT: 0.20, QUOTE_ATTRIBUTION: 0.12, CHRONOLOGY: 0.12, MATCHING: 0.08, ASSERTION_REASON: 0.08 },
  };

  const ratios = NON_DIRECT_RATIOS[difficulty] ?? NON_DIRECT_RATIOS.Moderate;
  let nonDirectSum = 0;
  const dist = {
    STATEMENT:        Math.round(ratios.STATEMENT * total),
    QUOTE_ATTRIBUTION: Math.round(ratios.QUOTE_ATTRIBUTION * total),
    CHRONOLOGY:       Math.round(ratios.CHRONOLOGY * total),
    MATCHING:         Math.round(ratios.MATCHING * total),
    ASSERTION_REASON: Math.round(ratios.ASSERTION_REASON * total),
  };
  for (const v of Object.values(dist)) nonDirectSum += v;
  return { DIRECT: Math.max(0, total - nonDirectSum), ...dist };
}

function formatDistribution(dist: TypeCount): string {
  return [
    `DIRECT: ${dist.DIRECT}`,
    `STATEMENT: ${dist.STATEMENT}`,
    `QUOTE_ATTRIBUTION: ${dist.QUOTE_ATTRIBUTION}`,
    `CHRONOLOGY: ${dist.CHRONOLOGY}`,
    `MATCHING: ${dist.MATCHING}`,
    `ASSERTION_REASON: ${dist.ASSERTION_REASON}`,
    `─── TOTAL: ${Object.values(dist).reduce((a, b) => a + b, 0)} (must equal ${Object.values(dist).reduce((a, b) => a + b, 0)})`,
  ].join('\n');
}

// ─── Difficulty instructions ──────────────────────────────────────────────────

const DIFFICULTY_INSTRUCTIONS: Record<string, string> = {
  Beginner:
    'Use simple, basic concepts. Questions should be easy for a first-time learner. Avoid tricky wording. Focus on well-known facts.',
  Easy:
    'Use straightforward concepts. Avoid ambiguity. Questions require basic recall.',
  Moderate:
    'Mix basic recall with applied understanding. Some questions may require reasoning or comparison.',
  Hard:
    'Include nuanced details, date-specific facts, subtle distinctions, and multi-step reasoning.',
  'Very Hard':
    'Push to maximum difficulty through REASONING and PRECISION — not just obscure trivia. Use: statement evaluation requiring knowledge of ALL statements, assertion-reason requiring both factual and logical verification, tight chronological sequences, cause-effect chains, close-alternative distractors. Every question must remain fair with exactly ONE unambiguous correct answer.',
  Mixed:
    'Include a balanced mix of difficulty levels appropriate for BPSC TRE 4 examination.',
};

// ─── Format templates ─────────────────────────────────────────────────────────

const FORMAT_GUIDE = `
────────────────────────────────────────────────────
QUESTION TYPE FORMAT TEMPLATES
────────────────────────────────────────────────────

■ DIRECT — Standard MCQ
Use for factual, conceptual, or identification questions.
questionType: "DIRECT"

Example:
  questionEn: "Who founded the Indian National Congress in 1885?"
  Options: A. Allan Octavian Hume  B. Bal Gangadhar Tilak  C. Dadabhai Naoroji  D. Surendranath Banerjee
  correctOption: "A"

────────────────────────────────────────────────────

■ STATEMENT — Statement evaluation
Use newline characters (\\n) in questionHi and questionEn to format numbered statements clearly.
questionType: "STATEMENT"

2-statement format:
  questionHi: "निम्नलिखित कथनों पर विचार करें:\\n\\nकथन 1: [कथन]\\nकथन 2: [कथन]\\n\\nउपरोक्त में से कौन सा/से कथन सही है/हैं?"
  questionEn: "Consider the following statements:\\n\\nStatement 1: [statement]\\nStatement 2: [statement]\\n\\nWhich of the above statements is/are correct?"
  optionAHi: "केवल 1"  optionAEn: "Only 1"
  optionBHi: "केवल 2"  optionBEn: "Only 2"
  optionCHi: "1 और 2 दोनों"  optionCEn: "Both 1 and 2"
  optionDHi: "न 1 और न 2"  optionDEn: "Neither 1 nor 2"

3-statement format:
  Options example: A: Only 1 and 2, B: Only 1 and 3, C: Only 2 and 3, D: All three
  (Vary the correct-statement combinations so answers differ across questions)

RULE: Every statement must be independently verifiable. Choose statements where exactly the combination indicated by correctOption is true.

────────────────────────────────────────────────────

■ QUOTE_ATTRIBUTION — Quote attribution
Only use quotes that are historically verified and widely accepted.
Never invent or paraphrase quotes. Do not use internet-era apocryphal quotes.
Agent 2 will mark disputed attribution as REVIEW — so only include high-confidence quotes.
questionType: "QUOTE_ATTRIBUTION"

  questionHi: '"[verified quote in Hindi or English]"\\n\\nयह वक्तव्य किसने दिया था?'
  questionEn: '"[verified quote in English]"\\n\\nWho made this statement?'
  Options: 4 historical figures (1 correct, 3 plausible distractors)

────────────────────────────────────────────────────

■ CHRONOLOGY — Arrange in correct chronological order
Use \\n to separate each event number.
questionType: "CHRONOLOGY"

  questionHi: "निम्नलिखित घटनाओं को सही कालानुक्रमिक क्रम में व्यवस्थित कीजिए:\\n\\n1. [घटना/वर्ष]\\n2. [घटना/वर्ष]\\n3. [घटना/वर्ष]\\n4. [घटना/वर्ष]\\n\\nसही क्रम का चयन करें:"
  questionEn: "Arrange the following events in correct chronological order:\\n\\n1. [event/year]\\n2. [event/year]\\n3. [event/year]\\n4. [event/year]\\n\\nSelect the correct sequence:"
  optionAHi: "1 → 2 → 3 → 4"  optionAEn: "1 → 2 → 3 → 4"
  optionBHi: "3 → 1 → 4 → 2"  optionBEn: "3 → 1 → 4 → 2"
  optionCHi: "2 → 4 → 1 → 3"  optionCEn: "2 → 4 → 1 → 3"
  optionDHi: "4 → 3 → 2 → 1"  optionDEn: "4 → 3 → 2 → 1"

RULE: Exactly one sequence must be historically correct. Use real verifiable dates/years.
The 4 options must contain 4 different orderings (no two options the same).

────────────────────────────────────────────────────

■ MATCHING — Correctly matched pairs
Mobile-friendly: keep each option short. Exactly ONE option is correctly matched.
questionType: "MATCHING"

  questionHi: "निम्नलिखित में से कौन सा युग्म सही सुमेलित है?"
  questionEn: "Which of the following pairs is correctly matched?"
  optionAHi/En: "[Person/Event/Year] — [Role/Place/Description]"
  optionBHi/En: "[Person/Event/Year] — [Role/Place/Description]"  (incorrect match)
  optionCHi/En: "[Person/Event/Year] — [Role/Place/Description]"  (incorrect match)
  optionDHi/En: "[Person/Event/Year] — [Role/Place/Description]"  (incorrect match)

RULE: Verify every pair. Three incorrect pairs must be plausibly wrong (not obviously wrong).

────────────────────────────────────────────────────

■ ASSERTION_REASON — Assertion and Reason
Both assertion and reason must be independently verifiable statements.
questionType: "ASSERTION_REASON"

  questionHi: "अभिकथन (A): [assertion in Hindi]\\nकारण (R): [reason in Hindi]"
  questionEn: "Assertion (A): [assertion in English]\\nReason (R): [reason in English]"

OPTIONS — use EXACTLY these standard texts:
  optionAHi: "A और R दोनों सत्य हैं और R, A की सही व्याख्या है"
  optionBHi: "A और R दोनों सत्य हैं किन्तु R, A की सही व्याख्या नहीं है"
  optionCHi: "A सत्य है किन्तु R असत्य है"
  optionDHi: "A असत्य है किन्तु R सत्य है"

  optionAEn: "Both A and R are true and R is the correct explanation of A"
  optionBEn: "Both A and R are true but R is not the correct explanation of A"
  optionCEn: "A is true but R is false"
  optionDEn: "A is false but R is true"

RULE: Verify assertion truth and reason truth independently. Then verify their explanatory relationship.

────────────────────────────────────────────────────`;

// ─── System prompt ────────────────────────────────────────────────────────────

export function buildSystemPrompt(mode: 'STRICT' | 'NORMAL' = 'STRICT'): string {
  const scopeRule = mode === 'STRICT'
    ? '18. TOPIC SCOPE — STRICT MODE: Every question MUST directly test the exact topic and scope specified. Do NOT generate adjacent-topic or broader-subject questions even if factually correct. If a strict topic scope and exclude list are provided, treat them as hard constraints — questions outside that boundary will be REJECTED.'
    : '18. TOPIC SCOPE — NORMAL MODE: Questions should relate to the specified topic and category. Closely adjacent concepts are acceptable if clearly relevant.';

  return [
    'You are an expert BPSC (Bihar Public Service Commission) TRE 4 exam question generator.',
    'You generate high-quality bilingual MCQ practice papers in both Hindi and English.',
    'Your output is used for GAUSI — a free government exam preparation platform.',
    '',
    'CRITICAL RULES — follow exactly:',
    '1. Return ONLY valid JSON. No markdown, no commentary, no code fences.',
    '2. The JSON must match the exact schema provided.',
    '3. correctOption must ONLY be one of: A, B, C, D. NEVER use E.',
    '4. Hindi and English versions of each question must have matching meaning.',
    '5. Write natural Hindi — avoid overly literal machine translation.',
    '6. Each question must have exactly 4 options (A, B, C, D). Do not add option E.',
    '7. No duplicate questions in the set.',
    '8. No duplicate answer choices within a single question.',
    '9. Explanations must be concise — 1 to 2 sentences only.',
    '10. These are PRACTICE questions — do not claim they are official BPSC questions.',
    '11. Verify your own JSON is valid before returning it.',
    '12. Use \\n for newlines inside question strings (valid JSON escape). Do NOT use literal newlines inside JSON string values.',
    '13. The questionType field is REQUIRED in every question. It must match the actual format used.',
    '14. For QUOTE_ATTRIBUTION: only use historically verified, widely accepted quotes. Never invent.',
    '15. For CHRONOLOGY: use actual historical dates/years. All 4 orderings in options must be different.',
    '16. For ASSERTION_REASON: use the EXACT standard Hindi/English option texts specified in the format guide.',
    '17. AVOID having the same question structure back-to-back more than twice. Vary the sequence.',
    scopeRule,
    '19. TITLE INTEGRITY: Use the admin-provided topic name exactly in the "topic" field of every question. Do NOT rename, abbreviate or broaden the topic silently.',
  ].join('\n');
}

// ─── User prompt ──────────────────────────────────────────────────────────────

export function buildUserPrompt(input: GenerateTestInput): string {
  const difficultyNote =
    DIFFICULTY_INSTRUCTIONS[input.difficulty] ?? DIFFICULTY_INSTRUCTIONS.Moderate;

  const dist = computeDistribution(input.difficulty, input.totalQuestions);
  const distStr = formatDistribution(dist);
  const mode = input.topicAdherenceMode ?? 'STRICT';

  // Build scope block — only present if admin defined it
  const scopeLines: string[] = [];
  if (input.strictTopicScope || input.excludeScope) {
    scopeLines.push('');
    scopeLines.push('═══════════════════════════════════════════');
    scopeLines.push(`TOPIC SCOPE BOUNDARY (mode: ${mode})`);
    scopeLines.push('═══════════════════════════════════════════');
    if (input.strictTopicScope) {
      scopeLines.push('WHAT THIS TOPIC COVERS (questions must stay within this):');
      scopeLines.push(input.strictTopicScope);
    }
    if (input.excludeScope) {
      scopeLines.push('');
      scopeLines.push('EXCLUDE / OUT OF SCOPE (do NOT generate questions on these):');
      scopeLines.push(input.excludeScope);
    }
    if (mode === 'STRICT') {
      scopeLines.push('');
      scopeLines.push('⚠️  STRICT MODE: Every question must directly test the declared scope above.');
      scopeLines.push('    A question that is factually correct but outside this boundary will FAIL validation.');
      scopeLines.push('    Do not generate adjacent-topic or broader-subject questions.');
    }
  }

  const lines: string[] = [
    `Generate exactly ${input.totalQuestions} unique bilingual MCQ practice questions for the following BPSC TRE 4 test:`,
    '',
    `Exam: ${input.exam}`,
    `Category: ${input.category}`,
    `Topic: ${input.topic}`,
    `Difficulty: ${input.difficulty}`,
    `Difficulty guidance: ${difficultyNote}`,
    ...scopeLines,
    '',
    '═══════════════════════════════════════════',
    'REQUIRED QUESTION TYPE DISTRIBUTION',
    '═══════════════════════════════════════════',
    distStr,
    '',
    'IMPORTANT DISTRIBUTION NOTES:',
    '- The total MUST equal exactly ' + input.totalQuestions + '.',
    '- If a question type is not suitable for this topic (e.g., QUOTE_ATTRIBUTION for Mathematics),',
    '  substitute those slots with DIRECT questions.',
    '- Do NOT repeat the same question type more than 3 times in a row.',
    '- Interleave types throughout the paper for variety.',
    '',
    FORMAT_GUIDE,
    '',
    '═══════════════════════════════════════════',
    'JSON SCHEMA (return ONLY this, no other text)',
    '═══════════════════════════════════════════',
    `{
  "titleHi": "<Hindi title — 6 to 12 words>",
  "titleEn": "<English title — 5 to 10 words>",
  "questions": [
    {
      "order": 1,
      "category": "<sub-category tag, e.g. Leaders / Dates / Causes>",
      "topic": "${input.topic}",
      "difficulty": "<Beginner | Easy | Moderate | Hard | Very Hard>",
      "questionType": "<DIRECT | STATEMENT | QUOTE_ATTRIBUTION | CHRONOLOGY | MATCHING | ASSERTION_REASON>",
      "questionHi": "<Hindi question text — use \\\\n for newlines in multi-line formats>",
      "optionAHi": "<Hindi option A>",
      "optionBHi": "<Hindi option B>",
      "optionCHi": "<Hindi option C>",
      "optionDHi": "<Hindi option D>",
      "explanationHi": "<Hindi explanation — 1-2 sentences>",
      "questionEn": "<English question text — matching Hindi meaning>",
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
    'Generate all ' + input.totalQuestions + ' questions now, with the distribution specified above.',
    'Maintain the required counts for each questionType.',
  ];

  return lines.join('\n');
}

// ─── Export utilities for tests ───────────────────────────────────────────────

export { computeDistribution, formatDistribution };
