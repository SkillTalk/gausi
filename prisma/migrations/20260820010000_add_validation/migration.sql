-- Migration: 20260820010000_add_validation
-- Agent 2: Validator — additive only.
-- GeneratedTest, GeneratedQuestion, User, TestAttempt are NOT modified.

-- ─── TestValidation ─────────────────────────────────────────────────────────
CREATE TABLE "TestValidation" (
    "id"               TEXT NOT NULL,
    "testId"           TEXT NOT NULL,
    "totalQuestions"   INTEGER NOT NULL,
    "passed"           INTEGER NOT NULL,
    "failed"           INTEGER NOT NULL,
    "reviewNeeded"     INTEGER NOT NULL,
    "overallStatus"    TEXT NOT NULL,
    "validationSummary" TEXT,
    "validatorModel"   TEXT,
    "validationMs"     INTEGER,
    "validatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestValidation_pkey" PRIMARY KEY ("id")
);

-- ─── QuestionValidationResult ────────────────────────────────────────────────
CREATE TABLE "QuestionValidationResult" (
    "id"           TEXT NOT NULL,
    "validationId" TEXT NOT NULL,
    "questionId"   TEXT NOT NULL,
    "order"        INTEGER NOT NULL,
    "status"       TEXT NOT NULL,
    "confidence"   DOUBLE PRECISION NOT NULL,
    "issues"       JSONB NOT NULL DEFAULT '[]',
    "suggestedFix" TEXT,
    "factualNotes" TEXT,

    CONSTRAINT "QuestionValidationResult_pkey" PRIMARY KEY ("id")
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX "TestValidation_testId_key"
    ON "TestValidation"("testId");

CREATE INDEX "QuestionValidationResult_validationId_idx"
    ON "QuestionValidationResult"("validationId");

CREATE INDEX "QuestionValidationResult_questionId_idx"
    ON "QuestionValidationResult"("questionId");

-- ─── Foreign Keys ────────────────────────────────────────────────────────────
ALTER TABLE "TestValidation"
    ADD CONSTRAINT "TestValidation_testId_fkey"
    FOREIGN KEY ("testId") REFERENCES "GeneratedTest"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuestionValidationResult"
    ADD CONSTRAINT "QuestionValidationResult_validationId_fkey"
    FOREIGN KEY ("validationId") REFERENCES "TestValidation"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
