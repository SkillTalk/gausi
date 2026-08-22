-- Add strict topic scope fields to GeneratedTest and ExamTopic.
-- All changes are purely additive. Existing rows default to null scope + STRICT mode.
-- No existing data is modified.

-- GeneratedTest: admin-defined boundary used by Agent 1 (generation) + Agent 2 (validation)
ALTER TABLE "GeneratedTest"
  ADD COLUMN IF NOT EXISTS "strictTopicScope"   TEXT,
  ADD COLUMN IF NOT EXISTS "excludeScope"        TEXT,
  ADD COLUMN IF NOT EXISTS "topicAdherenceMode"  TEXT NOT NULL DEFAULT 'STRICT';

-- ExamTopic: carried from queue topic to generated test during Agent 4 automation
ALTER TABLE "ExamTopic"
  ADD COLUMN IF NOT EXISTS "strictTopicScope"   TEXT,
  ADD COLUMN IF NOT EXISTS "excludeScope"        TEXT,
  ADD COLUMN IF NOT EXISTS "topicAdherenceMode"  TEXT NOT NULL DEFAULT 'STRICT';
