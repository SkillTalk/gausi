-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "testSlug" TEXT NOT NULL,
    "testTitle" TEXT NOT NULL,
    "subject" TEXT,
    "topic" TEXT,
    "language" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "submissionReason" TEXT NOT NULL,
    "timeUsedSeconds" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "correct" INTEGER NOT NULL,
    "wrong" INTEGER NOT NULL,
    "optionE" INTEGER NOT NULL,
    "unanswered" INTEGER NOT NULL,
    "attempted" INTEGER NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "answers" JSONB NOT NULL,
    "topicBreakdown" JSONB,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TestAttempt_idempotencyKey_key" ON "TestAttempt"("idempotencyKey");

-- CreateIndex
CREATE INDEX "TestAttempt_userId_submittedAt_idx" ON "TestAttempt"("userId", "submittedAt" DESC);

-- CreateIndex
CREATE INDEX "TestAttempt_userId_testId_idx" ON "TestAttempt"("userId", "testId");

-- AddForeignKey
ALTER TABLE "TestAttempt" ADD CONSTRAINT "TestAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
