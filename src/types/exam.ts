// ─── Option Keys ─────────────────────────────────────────────────────────────
export type OptionKey = 'A' | 'B' | 'C' | 'D' | 'E';
export type CorrectOptionKey = 'A' | 'B' | 'C' | 'D';

// ─── Language ─────────────────────────────────────────────────────────────────
export type Lang = 'hi' | 'en';

// ─── Question Translation ─────────────────────────────────────────────────────
export type QuestionTranslation = {
  question: string;
  options: Record<OptionKey, string>;
  explanation: string;
};

// ─── Question ─────────────────────────────────────────────────────────────────
export type Question = {
  id: string;
  category: string;
  hi: QuestionTranslation;
  en: QuestionTranslation;
  correctOption: CorrectOptionKey;
};

// ─── Difficulty ───────────────────────────────────────────────────────────────
export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

// ─── Exam Config ──────────────────────────────────────────────────────────────
export type MarkingScheme = {
  correct: number;
  wrong: number;
  /** marks for option E (I do not want to answer) */
  optionE: number;
  /** marks when no option selected at all */
  unanswered: number;
};

export type ExamConfig = {
  examId: string;
  examName: string;
  totalQuestions: number;
  durationMinutes: number;
  marks: MarkingScheme;
};

// ─── Topic ────────────────────────────────────────────────────────────────────
export type TopicGroup = {
  id: string;
  label: string;
  labelHi: string;
  color: string; // Tailwind gradient class or hex
  topics: Topic[];
};

export type Topic = {
  id: string;
  label: string;
  labelHi: string;
  available: boolean;
};

// ─── Exam Test (a single test/quiz) ──────────────────────────────────────────
export type ExamTest = {
  id: string; // e.g. "tre4-2026-08-19-1857"
  slug: string; // e.g. "2026-08-19-1857"
  date: string; // ISO date e.g. "2026-08-19"
  title: string;
  titleHi: string;
  subject: string;
  subjectHi: string;
  topicId: string;
  difficulty: Difficulty;
  config: ExamConfig;
  questions: Question[];
  /** SEO description */
  description?: string;
};

// ─── Question Status (during exam) ───────────────────────────────────────────
export type QuestionStatus =
  | 'not-visited'
  | 'answered'
  | 'not-answered'
  | 'marked-for-review'
  | 'answered-marked-for-review';

// ─── Exam Session (persisted to localStorage) ─────────────────────────────────
export type AnswerMap = Partial<Record<string, OptionKey>>;
export type ReviewMap = Partial<Record<string, boolean>>;
export type VisitedMap = Partial<Record<string, boolean>>;

export type ExamSession = {
  sessionId: string;
  testId: string;
  startedAt: number; // Unix ms
  expiresAt: number; // Unix ms
  language: Lang;
  currentQuestion: number; // 0-indexed
  answers: AnswerMap; // questionId → OptionKey
  markedForReview: ReviewMap; // questionId → bool
  visited: VisitedMap; // questionId → bool
  submitted: boolean;
  submittedAt?: number;
};

// ─── Exam Result ──────────────────────────────────────────────────────────────
export type QuestionResult = {
  questionId: string;
  selectedOption: OptionKey | null;
  correctOption: CorrectOptionKey;
  status: 'correct' | 'wrong' | 'optionE' | 'unanswered';
  marksAwarded: number;
  markedForReview: boolean;
  category: string;
};

export type CategoryResult = {
  category: string;
  total: number;
  correct: number;
  wrong: number;
  optionE: number;
  unanswered: number;
};

export type ExamResult = {
  sessionId: string;
  testId: string;
  language: Lang;
  score: number;
  maxScore: number;
  correct: number;
  wrong: number;
  optionE: number;
  unanswered: number;
  attempted: number;
  accuracy: number; // percentage
  timeUsedMs: number;
  totalTimeMs: number;
  questions: QuestionResult[];
  categoryResults: CategoryResult[];
  completedAt: number;
};

// ─── Attempt History (localStorage) ──────────────────────────────────────────
export type AttemptRecord = {
  id: string;
  testId: string;
  testTitle: string;
  date: string; // ISO date of the test
  completedAt: number;
  score: number;
  maxScore: number;
  correct: number;
  wrong: number;
  optionE: number;
  unanswered: number;
  accuracy: number;
  timeUsedMs: number;
};

// ─── Revision Question (localStorage) ────────────────────────────────────────
export type RevisionQuestion = {
  id: string; // questionId
  testId: string;
  addedAt: number;
  reason: 'wrong' | 'optionE' | 'manual';
  selectedOption: OptionKey | null;
  correctOption: CorrectOptionKey;
};

// ─── User Identity (localStorage — lightweight, no auth token) ─────────────
export type UserIdentity = {
  userId: string;
  email: string;
};

// ─── Answer Snapshot (stored in DB per attempt) ───────────────────────────────
export type AnswerSnapshot = {
  questionId: string;
  selectedOption: OptionKey | null;
  correctOption: CorrectOptionKey;
  status: 'correct' | 'wrong' | 'optionE' | 'unanswered';
  marksAwarded: number;
};

// ─── DB Attempt (returned from /api/attempts) ─────────────────────────────────
export type DbAttempt = {
  id: string;
  userId: string;
  testId: string;
  testSlug: string;
  testTitle: string;
  subject: string | null;
  topic: string | null;
  language: string;
  startedAt: string;       // ISO string
  submittedAt: string;     // ISO string
  submissionReason: string;
  timeUsedSeconds: number;
  score: number;
  maxScore: number;
  correct: number;
  wrong: number;
  optionE: number;
  unanswered: number;
  attempted: number;
  accuracy: number;
  percentage: number;
  answers: AnswerSnapshot[];
  topicBreakdown: CategoryResult[] | null;
  attemptNumber: number;   // computed: 1-based rank per user+test
  createdAt: string;       // ISO string
};

// ─── Pending Submission (localStorage retry state) ────────────────────────────
export type PendingSubmission = {
  idempotencyKey: string;
  userId: string;
  testId: string;
  testSlug: string;
  testTitle: string;
  subject: string | null;
  topic: string | null;
  language: string;
  startedAt: number;       // Unix ms
  submittedAt: number;     // Unix ms
  submissionReason: string;
  timeUsedSeconds: number;
  answers: Record<string, OptionKey>; // questionId → selected option
};
