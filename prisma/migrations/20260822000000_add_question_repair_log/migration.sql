-- Single-question repair audit trail (QuestionRepairLog).
-- All changes are purely additive. No existing tables or columns are modified.

CREATE TABLE IF NOT EXISTS "QuestionRepairLog" (
  "id"                TEXT        NOT NULL,
  "testId"            TEXT        NOT NULL,
  "questionId"        TEXT        NOT NULL,
  "repairMode"        TEXT        NOT NULL,
  "previousSnapshot"  JSONB       NOT NULL DEFAULT '{}',
  "repairedSnapshot"  JSONB       NOT NULL DEFAULT '{}',
  "validatorIssue"    TEXT,
  "suggestedFix"      TEXT,
  "adminInstruction"  TEXT,
  "model"             TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuestionRepairLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "QuestionRepairLog_testId_idx"
  ON "QuestionRepairLog"("testId");
CREATE INDEX IF NOT EXISTS "QuestionRepairLog_questionId_idx"
  ON "QuestionRepairLog"("questionId");
