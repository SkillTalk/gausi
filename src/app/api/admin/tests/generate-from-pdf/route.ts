/**
 * POST /api/admin/tests/generate-from-pdf
 *
 * Accepts a multipart/form-data request with:
 *   - pdf        : PDF file (required)
 *   - exam       : string  (default 'BPSC TRE 4')
 *   - category   : string  (required)
 *   - topic      : string  (required)
 *   - difficulty : string  (required)
 *   - totalQuestions : number (1–80, default 25)
 *   - durationMinutes: number (5–180, default = totalQuestions)
 *
 * Workflow:
 *   1. Parse PDF → extract plain text (truncated to ~12 000 chars to stay within token budget)
 *   2. Build a PDF-grounded prompt via buildPdfContextPrompt()
 *   3. If totalQuestions ≤ 25: single OpenAI call, plain JSON response
 *      If totalQuestions > 25: multi-batch via generateTestBatched(), streaming NDJSON response
 *
 * Streaming format (NDJSON, one JSON object per line):
 *   {"stage":"starting","totalBatches":N}
 *   {"stage":"batch_complete","batch":N,"totalBatches":N,"totalQuestions":N}
 *   {"stage":"done","testId":"...","status":"GENERATED",...}
 *   {"stage":"error","error":"..."}
 */
export const runtime = 'nodejs';
export const maxDuration = 300;

import { NextResponse } from 'next/server';
import { extractText, getDocumentProxy } from 'unpdf';
import { buildSystemPrompt, buildPdfContextPrompt } from '@/lib/admin/generator-prompt';
import { mapAIQuestionToDBRow } from '@/lib/admin/question-mapper';
import { validateAIOutput } from '@/lib/admin/question-validator';
import { generateTestSlug } from '@/lib/admin/slug-generator';
import { generateTestBatched } from '@/lib/admin/generation.service';
import { db } from '@/lib/db';
import type { AIGenerationResult, AIQuestion, GeneratedDifficulty } from '@/types/generated-test';

const OPENAI_MODEL = 'gpt-4o';
const VALID_DIFFS: GeneratedDifficulty[] = ['Beginner', 'Easy', 'Moderate', 'Hard', 'Very Hard', 'Mixed'];
/** Max characters of PDF text passed to OpenAI (≈ 9 000 tokens). */
const PDF_TEXT_LIMIT = 12_000;

async function markFailed(testId: string, msg: string) {
  await db.generatedTest
    .update({ where: { id: testId }, data: { status: 'DRAFT', errorMessage: msg } })
    .catch(() => {});
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OpenAI API key is not configured.' }, { status: 503 });
  }

  // ── 1. Parse multipart form data ─────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart form data.' }, { status: 400 });
  }

  const pdfFile = formData.get('pdf');
  if (!pdfFile || typeof pdfFile === 'string') {
    return NextResponse.json({ error: 'No PDF file uploaded.' }, { status: 400 });
  }

  const exam      = ((formData.get('exam') as string | null) ?? 'BPSC TRE 4') as 'BPSC TRE 4';
  const category  = (formData.get('category')  as string | null)?.trim() ?? '';
  const topic     = (formData.get('topic')     as string | null)?.trim() ?? '';
  const diffRaw   = (formData.get('difficulty') as string | null)?.trim() ?? 'Moderate';
  const qRaw      = parseInt((formData.get('totalQuestions') as string | null) ?? '25', 10);
  const durRaw    = parseInt((formData.get('durationMinutes') as string | null) ?? String(qRaw), 10);

  if (!category) return NextResponse.json({ error: 'category is required.' }, { status: 400 });
  if (!topic)    return NextResponse.json({ error: 'topic is required.' }, { status: 400 });
  if (!VALID_DIFFS.includes(diffRaw as GeneratedDifficulty)) {
    return NextResponse.json({ error: `difficulty must be one of: ${VALID_DIFFS.join(', ')}.` }, { status: 400 });
  }
  const totalQuestions = Math.min(80, Math.max(1, Number.isInteger(qRaw) ? qRaw : 25));
  const durationMinutes = Math.min(180, Math.max(5, Number.isInteger(durRaw) ? durRaw : totalQuestions));
  const difficulty = diffRaw as GeneratedDifficulty;

  // ── 2. Extract PDF text ──────────────────────────────────────────────────
  let pdfText: string;
  try {
    const arrayBuffer = await (pdfFile as File).arrayBuffer();
    const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
    const { text } = await extractText(pdf, { mergePages: true });
    pdfText = (Array.isArray(text) ? text.join(' ') : text)
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, PDF_TEXT_LIMIT);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'PDF parse failed';
    return NextResponse.json({ error: `Could not read PDF: ${msg}` }, { status: 422 });
  }

  if (pdfText.length < 100) {
    return NextResponse.json({ error: 'PDF has too little extractable text. Please use a text-based PDF (not a scanned image).' }, { status: 422 });
  }

  console.log(`[PDF-GENERATE] pdf_chars=${pdfText.length} | q=${totalQuestions} | cat="${category}" | topic="${topic}"`);

  const userPrompt = buildPdfContextPrompt(pdfText, totalQuestions, category, topic, exam, difficulty);

  // ── 3a. Single batch (≤ 25Q) — plain JSON response ──────────────────────
  if (totalQuestions <= 25) {
    const slug = generateTestSlug(category, topic);
    let testId: string;
    try {
      const created = await db.generatedTest.create({
        data: {
          exam,
          category,
          topic,
          slug,
          titleHi: `${topic} — PDF अभ्यास प्रश्नपत्र`,
          titleEn: `${topic} — PDF Practice Paper`,
          difficulty,
          totalQuestions,
          durationMinutes,
          status: 'GENERATING',
          generationSource: 'openai',
          generationModel: OPENAI_MODEL,
          topicAdherenceMode: 'STRICT',
          strictTopicScope: `PDF-grounded: ${topic}`,
          excludeScope: null,
          plannedPublishAt: null,
        },
      });
      testId = created.id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'DB create failed';
      return NextResponse.json({ error: `Failed to create test record: ${msg}` }, { status: 500 });
    }

    let aiResult: AIGenerationResult;
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: [
            { role: 'system', content: buildSystemPrompt('STRICT') },
            { role: 'user',   content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
          max_tokens: 16000,
        }),
      });
      if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
      type OAResp = { choices: Array<{ message: { content: string } }> };
      const data = await res.json() as OAResp;
      aiResult = JSON.parse(data.choices[0].message.content) as AIGenerationResult;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI call failed';
      await markFailed(testId, msg);
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    const structVal = validateAIOutput(aiResult, totalQuestions);
    if (!structVal.valid) {
      const errMsg = structVal.errors.map((e) => `${e.field}: ${e.message}`).join('; ');
      await markFailed(testId, errMsg);
      return NextResponse.json({ error: `Schema validation failed: ${errMsg}` }, { status: 502 });
    }

    try {
      await db.$transaction(async (tx) => {
        await tx.generatedQuestion.createMany({
          data: (aiResult.questions as AIQuestion[]).map((q) => mapAIQuestionToDBRow(q, testId)),
        });
        await tx.generatedTest.update({
          where: { id: testId },
          data: {
            titleHi: aiResult.titleHi?.trim() || `${topic} — PDF अभ्यास प्रश्नपत्र`,
            titleEn: aiResult.titleEn?.trim() || `${topic} — PDF Practice Paper`,
            status: 'GENERATED',
            generationMs: 0,
            errorMessage: null,
          },
        });
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'DB write failed';
      await markFailed(testId, msg);
      return NextResponse.json({ error: `DB write failed: ${msg}` }, { status: 500 });
    }

    return NextResponse.json({ testId, status: 'GENERATED', totalQuestions, source: 'pdf' });
  }

  // ── 3b. Multi-batch (> 25Q) — streaming NDJSON response ─────────────────
  // For multi-batch PDF generation we reuse generateTestBatched() but override
  // the topic scope so every batch receives the PDF text as strictTopicScope.
  const totalBatches = Math.ceil(totalQuestions / 25);
  const encoder = new TextEncoder();
  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();
  const send = (obj: Record<string, unknown>) =>
    writer.write(encoder.encode(JSON.stringify(obj) + '\n'));

  void (async () => {
    try {
      await send({ stage: 'starting', totalBatches });

      // Pass PDF text as strictTopicScope — the batch prompt builder will use it.
      const result = await generateTestBatched(
        {
          exam,
          category,
          topic,
          difficulty,
          totalQuestions,
          durationMinutes,
          topicAdherenceMode: 'STRICT',
          strictTopicScope: pdfText,
        },
        apiKey,
        {
          onBatchComplete: (batchNum, totalSoFar) => {
            void send({ stage: 'batch_complete', batch: batchNum, totalBatches, totalQuestions: totalSoFar });
          },
        },
      );

      if (!result.ok) {
        await send({ stage: 'error', error: result.error });
      } else {
        await send({ stage: 'done', testId: result.testId, status: 'GENERATED', totalQuestions, source: 'pdf' });
      }
    } catch (err) {
      await send({ stage: 'error', error: err instanceof Error ? err.message : 'Unexpected error' });
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
}
