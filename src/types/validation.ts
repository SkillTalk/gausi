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
};

// Stored in TestValidation table
export type StoredTestValidation = {
  id: string;
  testId: string;
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
