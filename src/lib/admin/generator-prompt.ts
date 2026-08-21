/**
 * Builds the OpenAI prompt for BPSC TRE 4 question generation.
 * Server-side only. Never exposed to browser.
 */

import type { GenerateTestInput } from '@/types/generated-test';

const DIFFICULTY_INSTRUCTIONS: Record<string, string> = {
  Beginner: 'Use simple, basic concepts. Questions should be easy for a first-time learner. Avoid tricky wording.',
  Easy: 'Use straightforward concepts. Avoid ambiguity.',
  Moderate: 'Mix basic recall and applied understanding. Some questions may require reasoning.',
  Hard: 'Include nuanced details, date-specific facts, and multi-step reasoning.',
  'Very Hard': 'Push the difficulty to maximum: obscure but factually accurate details, subtle distinctions between similar events/persons/dates, statement-analysis questions (e.g. "Which of the following is/are correct?"), chronology ordering, cause–effect chains, and questions that require careful reading to avoid plausible-sounding traps. All questions must remain fair and have only ONE unambiguous correct answer.',
  Mixed: 'Include a mix of Beginner, Easy, and Moderate difficulty questions spread across the set.',
};

const JSON_SCHEMA = `{
  "titleHi": "<Hindi title for the test paper — 5 to 10 words>",
  "titleEn": "<English title for the test paper — 5 to 10 words>",
  "questions": [
    {
      "order": 1,
      "category": "<sub-category tag, e.g. Leaders / Important Dates / Causes / Events>",
      "topic": "<specific topic of this question>",
      "difficulty": "<Beginner | Easy | Moderate | Hard | Very Hard>",
      "questionHi": "<Hindi question text>",
      "optionAHi": "<Hindi option A>",
      "optionBHi": "<Hindi option B>",
      "optionCHi": "<Hindi option C>",
      "optionDHi": "<Hindi option D>",
      "explanationHi": "<Hindi explanation — 1-2 sentences max>",
      "questionEn": "<English question text — matching the Hindi>",
      "optionAEn": "<English option A — matching Hindi A>",
      "optionBEn": "<English option B>",
      "optionCEn": "<English option C>",
      "optionDEn": "<English option D>",
      "explanationEn": "<English explanation — 1-2 sentences max>",
      "correctOption": "A"
    }
  ]
}`;

export function buildSystemPrompt(): string {
  return [
    'You are an expert BPSC (Bihar Public Service Commission) TRE 4 exam question generator.',
    'You generate high-quality bilingual practice MCQs in both Hindi and English.',
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
  ].join('\n');
}

export function buildUserPrompt(input: GenerateTestInput): string {
  const difficultyNote = DIFFICULTY_INSTRUCTIONS[input.difficulty] ??
    DIFFICULTY_INSTRUCTIONS.Moderate;

  return [
    `Generate exactly ${input.totalQuestions} unique MCQ practice questions for the following BPSC TRE 4 test:`,
    '',
    `Exam: ${input.exam}`,
    `Category: ${input.category}`,
    `Topic: ${input.topic}`,
    `Difficulty: ${input.difficulty}`,
    `Difficulty guidance: ${difficultyNote}`,
    '',
    'Requirements:',
    `- Exactly ${input.totalQuestions} questions. No more, no less.`,
    '- Each question in BOTH Hindi and English (bilingual).',
    '- Options A, B, C, D only (4 options per question).',
    '- correctOption must be A, B, C, or D. Never E.',
    '- Spread questions across different sub-categories within the topic.',
    '- Use BPSC exam style wording.',
    '- Keep Hindi natural and easy to read.',
    '- Short, clear explanations only.',
    '',
    'Return this exact JSON structure:',
    JSON_SCHEMA,
  ].join('\n');
}
