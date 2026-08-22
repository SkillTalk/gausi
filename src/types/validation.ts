// Agent 2 – Validator types
// These types mirror the DB models (TestValidation, QuestionValidationResult)
// and the runtime structures used during validation.

export type ValidationQuestionStatus = 'PASS' | 'FAIL' | 'REVIEW';
export type ValidationOverallStatus = 'READY' | 'VALIDATION_FAILED';

export type IssueSeverity = 'ERROR' | 'WARNING';

export type IssueType =
  | 'MISSING_FIELD'
  | 'INVALID_CORRECT_OPTION'
  | 'WRONG_OPTION_E'
  | 'DUPLICATE_QUESTION'
  | 'FACTUAL_ERROR'
  | 'TRANSLATION_MISMATCH'
  | 'AMBIGUITY'
  | 'TOPIC_MISMATCH'
  /**
   * TOPIC_SCOPE_FAIL — Question is outside the admin-defined strictTopicScope.
   * In STRICT mode this overrides an otherwise factually-correct PASS → FAIL.
   * In NORMAL mode the question is flagged REVIEW instead.
   */
  | 'TOPIC_SCOPE_FAIL'
  | 'DIFFICULTY_MISMATCH'
  | 'NEAR_DUPLICATE'
  | 'OTHER';

export type ValidationIssue = {
  type: IssueType;
  message: string;
  severity: IssueSeverity;
};

// Returned per-question from both deterministic and AI validators
export type QuestionValidationInput = {
  questionId: string;
  order: number;
  status: ValidationQuestionStatus;
  confidence: number;
  issues: ValidationIssue[];
  suggestedFix: string | null;
  factualNotes: string | null;
};

// Stored in QuestionValidationResult table
export type StoredQuestionValidation = {
  id: string;
  validationId: string;
  questionId: string;
  order: number;
  status: ValidationQuestionStatus;
  confidence: number;
  issues: ValidationIssue[];
  suggestedFix: string | null;
  factualNotes: string | null;
  /** Snapshot of GeneratedQuestion.questionVersion at validation time.
   *  A result is CURRENT iff this equals the question's current questionVersion. */
  questionVersion: number;
};

// Stored in TestValidation table
export type StoredTestValidation = {
  id: string;
  testId: string;
  /** Snapshot of GeneratedTest.contentVersion at the time of validation. */
  contentVersion: number;
  totalQuestions: number;
  passed: number;
  failed: number;
  reviewNeeded: number;
  overallStatus: ValidationOverallStatus;
  validationSummary: string | null;
  validatorModel: string | null;
  validationMs: number | null;
  validatedAt: string;
  questionResults: StoredQuestionValidation[];
  /**
   * Derived at API time (not stored in DB).
   * True when GeneratedTest.contentVersion > TestValidation.contentVersion.
   */
  isStale?: boolean;
  /**
   * Derived at API time (not stored in DB).
   * questionIds where GeneratedQuestion.questionVersion != QuestionValidationResult.questionVersion.
   * These questions are stale and must be sent to Agent 2 on the next Revalidate click.
   * Supersedes the older repairedQuestionIds approach (kept for legacy renders).
   */
  staleQuestionIds?: string[];
  /**
   * @deprecated Use staleQuestionIds instead.
   * questionIds repaired after this validation's validatedAt timestamp (legacy signal).
   */
  repairedQuestionIds?: string[];
  /**
   * How many questions were actually sent to AI in the most recent incremental run.
   * e.g. 1 out of 25 total when only one question was stale.
   */
  questionsValidated?: number;
};

// AI validator response shape (structured JSON from OpenAI)
export type AIQuestionValidation = {
  order: number;
  status: ValidationQuestionStatus;
  confidence: number;
  issues: ValidationIssue[];
  suggestedFix: string | null;
  factualNotes: string | null;
};

export type AIValidationOutput = {
  overallStatus: ValidationOverallStatus;
  validationSummary: string;
  questions: AIQuestionValidation[];
};
