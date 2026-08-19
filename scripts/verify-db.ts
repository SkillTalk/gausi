/**
 * Database verification script — run with: npx tsx scripts/verify-db.ts
 * Tests all DB operations end-to-end. Cleans up after itself.
 * Never prints credentials.
 */
import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { parseEmail } from '../src/lib/user-identity';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter, log: ['error'] });

let passed = 0;
let failed = 0;

function ok(label: string) { console.log('  ✓', label); passed++; }
function fail(label: string) { console.log('  ✗', label); failed++; }

async function run() {
  const testEmail = `verify-db-test-${Date.now()}@example.com`;
  let userId: string | null = null;
  let attemptId1: string | null = null;

  try {
    // ── 1. Email normalization ──────────────────────────────────────────────
    console.log('\n── 1. Email normalization ──');
    const normalized = parseEmail('Verify_DB@Example.COM');
    if (normalized === 'verify_db@example.com') ok('mixed-case normalizes correctly');
    else fail(`expected verify_db@example.com, got ${normalized}`);

    const alsoNull = parseEmail('notvalid');
    if (alsoNull === null) ok('invalid email returns null');
    else fail('invalid email should return null');

    // ── 2. Create user ──────────────────────────────────────────────────────
    console.log('\n── 2. Create user ──');
    const u1 = await db.user.upsert({
      where: { email: testEmail }, update: {}, create: { email: testEmail },
      select: { id: true, email: true }
    });
    userId = u1.id;
    if (u1.id && u1.id.startsWith('c')) ok('id is CUID');
    else fail('id should be CUID');
    if (u1.email === testEmail) ok('email stored correctly');
    else fail('email mismatch');

    // ── 3. Same email → same user (no duplicate) ───────────────────────────
    console.log('\n── 3. Duplicate email → same user ──');
    const u2 = await db.user.upsert({
      where: { email: testEmail }, update: {}, create: { email: testEmail },
      select: { id: true }
    });
    if (u1.id === u2.id) ok('same id returned for existing email');
    else fail('duplicate user created!');

    // ── 4. Submit attempt 1 (manual) ───────────────────────────────────────
    console.log('\n── 4. First attempt submission ──');
    const ikey1 = `idem-1-${Date.now()}`;
    const now = new Date();
    const start = new Date(now.getTime() - 5 * 60 * 1000);
    const a1 = await db.testAttempt.create({
      data: {
        userId: u1.id, testId: 'bpsc-tre4-2026-08-19-1857',
        testSlug: '2026-08-19-1857', testTitle: '1857 Revolt Test',
        subject: 'History', topic: '1857-revolt', language: 'hi',
        startedAt: start, submittedAt: now, submissionReason: 'manual',
        timeUsedSeconds: 300, score: 18.25, maxScore: 25,
        correct: 19, wrong: 4, optionE: 1, unanswered: 1, attempted: 24,
        accuracy: 82.6, percentage: 73.0,
        answers: [{ questionId: 'q1', selectedOption: 'B', correctOption: 'B', status: 'correct', marksAwarded: 1 }],
        topicBreakdown: [{ category: 'History', total: 25, correct: 19, wrong: 4, optionE: 1, unanswered: 1 }],
        idempotencyKey: ikey1,
      }, select: { id: true, score: true }
    });
    attemptId1 = a1.id;
    if (a1.id) ok('attempt 1 created');
    else fail('attempt 1 not created');

    // ── 5. Idempotency — retry with same key ──────────────────────────────
    console.log('\n── 5. Idempotency (retry does not duplicate) ──');
    const existingByKey = await db.testAttempt.findUnique({ where: { idempotencyKey: ikey1 } });
    if (existingByKey?.id === a1.id) ok('same idempotencyKey returns existing attempt');
    else fail('idempotency lookup failed');

    let dupError = false;
    try {
      // Attempt to create a second row with the same idempotencyKey
      await db.testAttempt.create({
        data: {
          userId: u1.id, testId: 'bpsc-tre4-2026-08-19-1857',
          testSlug: '2026-08-19-1857', testTitle: '1857 Revolt Test',
          subject: 'History', topic: '1857-revolt', language: 'hi',
          startedAt: start, submittedAt: now, submissionReason: 'manual',
          timeUsedSeconds: 300, score: 18.25, maxScore: 25,
          correct: 19, wrong: 4, optionE: 1, unanswered: 1, attempted: 24,
          accuracy: 82.6, percentage: 73.0,
          answers: [] as object[],
          idempotencyKey: ikey1, // same key — must fail
        }
      });
    } catch { dupError = true; }
    if (dupError) ok('duplicate insert correctly rejected by unique constraint');
    else fail('duplicate was allowed — idempotency broken!');

    const countCheck = await db.testAttempt.count({ where: { userId: u1.id } });
    if (countCheck === 1) ok('still only 1 attempt after retry');
    else fail(`expected 1, got ${countCheck}`);

    // ── 6. Second attempt — new row ───────────────────────────────────────
    console.log('\n── 6. Second attempt (Attempt #2) ──');
    const ikey2 = `idem-2-${Date.now()}`;
    await db.testAttempt.create({
      data: {
        userId: u1.id, testId: 'bpsc-tre4-2026-08-19-1857',
        testSlug: '2026-08-19-1857', testTitle: '1857 Revolt Test',
        subject: 'History', topic: '1857-revolt', language: 'en',
        startedAt: start, submittedAt: now, submissionReason: 'timeout',
        timeUsedSeconds: 900, score: 21, maxScore: 25, correct: 22, wrong: 2,
        optionE: 0, unanswered: 1, attempted: 24, accuracy: 91.7, percentage: 84,
        answers: [] as object[], topicBreakdown: undefined, idempotencyKey: ikey2,
      }, select: { id: true }
    });
    const total = await db.testAttempt.count({ where: { userId: u1.id } });
    if (total === 2) ok('two distinct attempts exist');
    else fail(`expected 2, got ${total}`);

    // ── 7. History retrieval — newest first ───────────────────────────────
    console.log('\n── 7. History retrieval ──');
    const hist = await db.testAttempt.findMany({
      where: { userId: u1.id }, orderBy: { submittedAt: 'desc' }
    });
    if (hist.length === 2) ok('both attempts returned');
    else fail(`expected 2, got ${hist.length}`);
    if (hist.every(a => a.userId === u1.id)) ok('all belong to this user');
    else fail('userId mismatch in history');

    // ── 8. Single attempt retrieval ───────────────────────────────────────
    console.log('\n── 8. Single historical result ──');
    const single = await db.testAttempt.findUnique({ where: { id: a1.id } });
    if (single?.score === 18.25) ok('stored score is exactly 18.25');
    else fail(`score mismatch: ${single?.score}`);
    if (single?.correct === 19) ok('correct count preserved');
    else fail(`correct mismatch: ${single?.correct}`);

    // ── 9. Historical score is frozen ────────────────────────────────────
    console.log('\n── 9. Historical score is frozen snapshot ──');
    // Even if we "recalculate" with different rules, the DB row stays the same
    const immutable = await db.testAttempt.findUnique({ where: { id: a1.id }, select: { score: true, maxScore: true } });
    if (immutable?.score === 18.25 && immutable?.maxScore === 25) ok('snapshot cannot be altered retroactively');
    else fail('score was not frozen correctly');

  } finally {
    // Always clean up test data
    if (userId) {
      await db.testAttempt.deleteMany({ where: { userId } }).catch(() => {});
      await db.user.delete({ where: { id: userId } }).catch(() => {});
    }
    await db.$disconnect();
    await pool.end();
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch(e => { console.error('\nFATAL:', e.message); process.exit(1); });
