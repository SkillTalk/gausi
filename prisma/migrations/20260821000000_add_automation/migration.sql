-- Migration: 20260821000000_add_automation
-- Agent 4: Daily Automation Controller — additive only.
-- No existing data is modified. User, TestAttempt, GeneratedTest, GeneratedQuestion untouched.

-- ─── DailyAutomationConfig ──────────────────────────────────────────────────
CREATE TABLE "DailyAutomationConfig" (
  "id"              TEXT NOT NULL,
  "exam"            TEXT NOT NULL DEFAULT 'BPSC TRE 4',
  "category"        TEXT NOT NULL DEFAULT 'History',
  "topic"           TEXT NOT NULL DEFAULT '',
  "difficulty"      TEXT NOT NULL DEFAULT 'Moderate',
  "totalQuestions"  INTEGER NOT NULL DEFAULT 25,
  "durationMinutes" INTEGER NOT NULL DEFAULT 15,
  "enabled"         BOOLEAN NOT NULL DEFAULT false,
  "autoPublish"     BOOLEAN NOT NULL DEFAULT true,
  "allowRepeat"     BOOLEAN NOT NULL DEFAULT false,
  "generateTime"    TEXT NOT NULL DEFAULT '04:00',
  "publishTime"     TEXT NOT NULL DEFAULT '05:00',
  "timezone"        TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  "lastRunAt"       TIMESTAMP(3),
  "lastRunStatus"   TEXT,
  "nextRunAt"       TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DailyAutomationConfig_pkey" PRIMARY KEY ("id")
);

-- ─── AutomationRun ──────────────────────────────────────────────────────────
CREATE TABLE "AutomationRun" (
  "id"                   TEXT NOT NULL,
  "configId"             TEXT NOT NULL,
  "runKey"               TEXT NOT NULL,
  "scheduledFor"         TIMESTAMP(3) NOT NULL,
  "startedAt"            TIMESTAMP(3),
  "finishedAt"           TIMESTAMP(3),
  "status"               TEXT NOT NULL,
  "generatedTestId"      TEXT,
  "generationStatus"     TEXT,
  "validationStatus"     TEXT,
  "publicationStatus"    TEXT,
  "errorStage"           TEXT,
  "errorMessage"         TEXT,
  "generationDurationMs" INTEGER,
  "validationDurationMs" INTEGER,
  "topic"                TEXT,
  "category"             TEXT,
  "exam"                 TEXT,
  "totalQuestions"       INTEGER,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AutomationRun_pkey" PRIMARY KEY ("id")
);

-- ─── Indexes ────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX "AutomationRun_runKey_key" ON "AutomationRun"("runKey");
CREATE INDEX "AutomationRun_configId_scheduledFor_idx" ON "AutomationRun"("configId", "scheduledFor");
CREATE INDEX "AutomationRun_status_idx" ON "AutomationRun"("status");

-- ─── Foreign key ────────────────────────────────────────────────────────────
ALTER TABLE "AutomationRun"
  ADD CONSTRAINT "AutomationRun_configId_fkey"
  FOREIGN KEY ("configId") REFERENCES "DailyAutomationConfig"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
