-- Add questionType column to GeneratedQuestion for diverse question-format tracking.
-- All changes are purely additive. Existing rows default to 'DIRECT'.
-- No existing data is modified.

ALTER TABLE "GeneratedQuestion"
  ADD COLUMN IF NOT EXISTS "questionType" TEXT NOT NULL DEFAULT 'DIRECT';
