-- Agent 5 — Topic Planner / Curriculum Manager
-- All changes are purely additive. No existing tables or data are modified.

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. DailyAutomationConfig: add topicMode column
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE "DailyAutomationConfig"
  ADD COLUMN IF NOT EXISTS "topicMode" TEXT NOT NULL DEFAULT 'MANUAL';

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. AutomationRun: add Agent 5 tracking columns
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE "AutomationRun"
  ADD COLUMN IF NOT EXISTS "selectedTopicId"      TEXT,
  ADD COLUMN IF NOT EXISTS "topicSelectionSource" TEXT;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. ExamTopic: new table
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ExamTopic" (
  "id"                    TEXT NOT NULL,
  "exam"                  TEXT NOT NULL,
  "category"              TEXT NOT NULL,
  "topic"                 TEXT NOT NULL,
  "slug"                  TEXT NOT NULL,
  "difficultyDefault"     TEXT,
  "questionCountDefault"  INTEGER,
  "durationMinutesDefault" INTEGER,
  "priority"              INTEGER NOT NULL DEFAULT 50,
  "sequenceOrder"         INTEGER,
  "cooldownDays"          INTEGER NOT NULL DEFAULT 30,
  "earliestUseDate"       TIMESTAMP(3),
  "preferredDayOfWeek"    INTEGER,
  "notes"                 TEXT,
  "enabled"               BOOLEAN NOT NULL DEFAULT true,
  "status"                TEXT NOT NULL DEFAULT 'ACTIVE',
  "lastUsedAt"            TIMESTAMP(3),
  "timesUsed"             INTEGER NOT NULL DEFAULT 0,
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ExamTopic_pkey" PRIMARY KEY ("id")
);

-- Unique slug
CREATE UNIQUE INDEX IF NOT EXISTS "ExamTopic_slug_key"
  ON "ExamTopic"("slug");

-- Priority-based selection index (exam, status, priority DESC)
CREATE INDEX IF NOT EXISTS "ExamTopic_exam_status_priority_idx"
  ON "ExamTopic"("exam", "status", "priority" DESC);

-- Category filter index
CREATE INDEX IF NOT EXISTS "ExamTopic_exam_category_status_idx"
  ON "ExamTopic"("exam", "category", "status");
