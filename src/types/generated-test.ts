// ─── Question type ────────────────────────────────────────────────────────────
/**
 * Classifies the structural/cognitive format of a generated question.
 * Stored in GeneratedQuestion.questionType (defaults to DIRECT for legacy rows).
 */
export type QuestionType =
  | 'DIRECT'             // Standard single-answer factual/conceptual MCQ
  | 'STATEMENT'          // "Which of the following statements is/are correct?"
  | 'QUOTE_ATTRIBUTION'  // "Who said this?" — with a historically-verified quote
  | 'CHRONOLOGY'         // Arrange events in correct chronological order
  | 'MATCHING'           // "Which of the following pairs is correctly matched?"
  | 'ASSERTION_REASON';  // Assertion (A) / Reason (R) format

export const QUESTION_TYPES: QuestionType[] = [
  'DIRECT',
  'STATEMENT',
  'QUOTE_ATTRIBUTION',
  'CHRONOLOGY',
  'MATCHING',
  'ASSERTION_REASON',
];

// ─── Status ───────────────────────────────────────────────────────────────────
export type GeneratedTestStatus =
  | 'DRAFT'
  | 'GENERATING'
  | 'GENERATED'
  | 'VALIDATING'
  | 'VALIDATION_FAILED'
  | 'READY'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'ARCHIVED';

// ─── Difficulty (generator-specific, different from static Difficulty in exam.ts) ──
export type GeneratedDifficulty = 'Beginner' | 'Easy' | 'Moderate' | 'Hard' | 'Very Hard' | 'Mixed';

export const GENERATED_DIFFICULTIES: GeneratedDifficulty[] = [
  'Beginner', 'Easy', 'Moderate', 'Hard', 'Very Hard', 'Mixed',
];

export const SUPPORTED_EXAMS = ['BPSC TRE 4'] as const;
export type SupportedExam = typeof SUPPORTED_EXAMS[number];

export const EXAM_CATEGORIES: Record<SupportedExam, string[]> = {
  'BPSC TRE 4': [
    'History',
    'Geography',
    'General Science',
    'General Awareness',
    'Mathematics',
    'Mental Ability',
    'Social Science',
    'Indian National Movement',
    'Environment',
  ],
};

// ─── DB Model shapes (as returned from API) ───────────────────────────────────
export type GeneratedTest = {
  id: string;
  exam: string;
  category: string;
  topic: string;
  slug: string;
  titleHi: string;
  titleEn: string;
  difficulty: string;
  totalQuestions: number;
  durationMinutes: number;
  status: GeneratedTestStatus;
  plannedPublishAt: string | null;
  publishAt: string | null;
  publishedAt: string | null;
  contentVersion: number;
  generationSource: string;
  generationModel: string | null;
  generationMs: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GeneratedQuestion = {
  id: string;
  testId: string;
  order: number;
  category: string;
  topic: string;
  difficulty: string;
  /** Question format classification. Defaults to 'DIRECT' for legacy rows. */
  questionType: string;
  questionHi: string;
  optionAHi: string;
  optionBHi: string;
  optionCHi: string;
  optionDHi: string;
  optionEHi: string;
  explanationHi: string;
  questionEn: string;
  optionAEn: string;
  optionBEn: string;
  optionCEn: string;
  optionDEn: string;
  optionEEn: string;
  explanationEn: string;
  correctOption: string;
  createdAt: string;
};

export type GeneratedTestWithQuestions = GeneratedTest & {
  questions: GeneratedQuestion[];
};

// ─── AI output (before server adds option E) ──────────────────────────────────
export type AIQuestion = {
  order: number;
  category: string;
  topic: string;
  difficulty: string;
  /** Question format type — included in AI output for new generations.
   *  Optional for backward compatibility with old tests that predate this field. */
  questionType?: QuestionType;
  questionHi: string;
  optionAHi: string;
  optionBHi: string;
  optionCHi: string;
  optionDHi: string;
  explanationHi: string;
  questionEn: string;
  optionAEn: string;
  optionBEn: string;
  optionCEn: string;
  optionDEn: string;
  explanationEn: string;
  correctOption: string;
};

export type AIGenerationResult = {
  titleHi: string;
  titleEn: string;
  questions: AIQuestion[];
};

// ─── Admin form input ─────────────────────────────────────────────────────────
export type GenerateTestInput = {
  exam: SupportedExam;
  category: string;
  topic: string;
  difficulty: GeneratedDifficulty;
  totalQuestions: number;
  durationMinutes: number;
  plannedPublishAt?: string; // ISO string, optional
};

// ─── Validation result ────────────────────────────────────────────────────────
export type ValidationError = {
  field: string;
  message: string;
};

export type ValidationResult =
  | { valid: true }
  | { valid: false; errors: ValidationError[] };
