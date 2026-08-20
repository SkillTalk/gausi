-- Migration: 20260820020000_add_publishing
-- Agent 3: Publish & Scheduling — additive only.
-- No existing data is modified. GeneratedQuestion, User, TestAttempt untouched.

-- ─── GeneratedTest: publishing fields ──────────────────────────────────────
ALTER TABLE "GeneratedTest"
  ADD COLUMN "publishAt"      TIMESTAMP(3),
  ADD COLUMN "publishedAt"    TIMESTAMP(3),
  ADD COLUMN "contentVersion" INTEGER NOT NULL DEFAULT 1;

-- ─── TestValidation: staleness tracking ────────────────────────────────────
ALTER TABLE "TestValidation"
  ADD COLUMN "contentVersion" INTEGER NOT NULL DEFAULT 1;

-- ─── Index for cron: find due scheduled tests efficiently ──────────────────
CREATE INDEX "GeneratedTest_status_publishAt_idx"
  ON "GeneratedTest"("status", "publishAt");
