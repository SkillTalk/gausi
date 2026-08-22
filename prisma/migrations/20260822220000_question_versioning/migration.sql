-- Migration: question versioning + admin answer override audit
-- All changes are strictly ADDITIVE (no existing data altered).

-- 1. Per-question version counter on GeneratedQuestion
ALTER TABLE "GeneratedQuestion"
  ADD COLUMN IF NOT EXISTS "questionVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "answerSource"    TEXT    NOT NULL DEFAULT 'AI_VALIDATED';

-- 2. Snapshot version on QuestionValidationResult
ALTER TABLE "QuestionValidationResult"
  ADD COLUMN IF NOT EXISTS "questionVersion" INTEGER NOT NULL DEFAULT 1;

-- 3. Admin correct-answer override audit table
CREATE TABLE IF NOT EXISTS "QuestionAnswerOverride" (
  "id"                    TEXT         NOT NULL,
  "testId"                TEXT         NOT NULL,
  "questionId"            TEXT         NOT NULL,
  "previousCorrectOption" TEXT         NOT NULL,
  "newCorrectOption"      TEXT         NOT NULL,
  "adminNote"             TEXT,
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "QuestionAnswerOverride_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "QuestionAnswerOverride_testId_idx"     ON "QuestionAnswerOverride"("testId");
CREATE INDEX IF NOT EXISTS "QuestionAnswerOverride_questionId_idx" ON "QuestionAnswerOverride"("questionId");
