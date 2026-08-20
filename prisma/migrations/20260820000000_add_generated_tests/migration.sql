-- Migration: 20260820000000_add_generated_tests
-- Agent 1: Question Generator — additive only
-- Existing User and TestAttempt tables are NOT modified.

-- ─── GeneratedTest ─────────────────────────────────────────────────────────
CREATE TABLE "GeneratedTest" (
    "id"               TEXT NOT NULL,
    "exam"             TEXT NOT NULL,
    "category"         TEXT NOT NULL,
    "topic"            TEXT NOT NULL,
    "slug"             TEXT NOT NULL,
    "titleHi"          TEXT NOT NULL,
    "titleEn"          TEXT NOT NULL,
    "difficulty"       TEXT NOT NULL,
    "totalQuestions"   INTEGER NOT NULL,
    "durationMinutes"  INTEGER NOT NULL,
    "status"           TEXT NOT NULL DEFAULT 'DRAFT',
    "plannedPublishAt" TIMESTAMP(3),
    "generationSource" TEXT NOT NULL DEFAULT 'openai',
    "generationModel"  TEXT,
    "generationMs"     INTEGER,
    "errorMessage"     TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedTest_pkey" PRIMARY KEY ("id")
);

-- ─── GeneratedQuestion ──────────────────────────────────────────────────────
CREATE TABLE "GeneratedQuestion" (
    "id"            TEXT NOT NULL,
    "testId"        TEXT NOT NULL,
    "order"         INTEGER NOT NULL,
    "category"      TEXT NOT NULL,
    "topic"         TEXT NOT NULL,
    "difficulty"    TEXT NOT NULL,
    "questionHi"    TEXT NOT NULL,
    "optionAHi"     TEXT NOT NULL,
    "optionBHi"     TEXT NOT NULL,
    "optionCHi"     TEXT NOT NULL,
    "optionDHi"     TEXT NOT NULL,
    "optionEHi"     TEXT NOT NULL DEFAULT 'उत्तर नहीं देना चाहता',
    "explanationHi" TEXT NOT NULL,
    "questionEn"    TEXT NOT NULL,
    "optionAEn"     TEXT NOT NULL,
    "optionBEn"     TEXT NOT NULL,
    "optionCEn"     TEXT NOT NULL,
    "optionDEn"     TEXT NOT NULL,
    "optionEEn"     TEXT NOT NULL DEFAULT 'I do not want to answer',
    "explanationEn" TEXT NOT NULL,
    "correctOption" TEXT NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedQuestion_pkey" PRIMARY KEY ("id")
);

-- ─── Indexes ────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX "GeneratedTest_slug_key"
    ON "GeneratedTest"("slug");

CREATE INDEX "GeneratedTest_status_createdAt_idx"
    ON "GeneratedTest"("status", "createdAt" DESC);

CREATE INDEX "GeneratedTest_exam_category_status_idx"
    ON "GeneratedTest"("exam", "category", "status");

CREATE UNIQUE INDEX "GeneratedQuestion_testId_order_key"
    ON "GeneratedQuestion"("testId", "order");

CREATE INDEX "GeneratedQuestion_testId_idx"
    ON "GeneratedQuestion"("testId");

-- ─── Foreign Key ────────────────────────────────────────────────────────────
ALTER TABLE "GeneratedQuestion"
    ADD CONSTRAINT "GeneratedQuestion_testId_fkey"
    FOREIGN KEY ("testId") REFERENCES "GeneratedTest"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
