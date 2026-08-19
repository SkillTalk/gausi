import { NextResponse } from 'next/server';

const MAX_QUESTION_LENGTH = 500;
const MAX_ANSWER_LENGTH = 200;

type RequestBody = {
  question: string;
  correctAnswer: string;
  selectedAnswer?: string;
  language?: 'hi' | 'en';
};

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI explanation is currently unavailable.' },
      { status: 503 }
    );
  }

  let body: RequestBody;
  try {
    body = await request.json() as RequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  // Validation
  const { question, correctAnswer, selectedAnswer, language = 'en' } = body;

  if (typeof question !== 'string' || question.trim().length === 0) {
    return NextResponse.json({ error: 'question is required.' }, { status: 400 });
  }
  if (typeof correctAnswer !== 'string' || correctAnswer.trim().length === 0) {
    return NextResponse.json({ error: 'correctAnswer is required.' }, { status: 400 });
  }
  if (question.length > MAX_QUESTION_LENGTH || correctAnswer.length > MAX_ANSWER_LENGTH) {
    return NextResponse.json({ error: 'Input too long.' }, { status: 400 });
  }

  const lang = language === 'hi' ? 'Hindi' : 'English';

  const systemPrompt =
    `You are a concise, beginner-friendly exam tutor explaining BPSC exam questions. ` +
    `Respond in ${lang}. Keep the explanation under 80 words. ` +
    `Do not change the official correct answer. Do not hallucinate facts.`;

  const userPrompt =
    `Question: ${question}\n` +
    `Correct answer: ${correctAnswer}\n` +
    (selectedAnswer ? `Student selected: ${selectedAnswer}\n` : '') +
    `\nExplain why the correct answer is right. ` +
    (selectedAnswer && selectedAnswer !== correctAnswer
      ? 'Also briefly explain why the student\'s answer is wrong.'
      : '');

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 200,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[AI EXPLAIN] OpenAI error:', err);
      return NextResponse.json({ error: 'AI service returned an error.' }, { status: 502 });
    }

    type OpenAIResponse = {
      choices: Array<{
        message: { content: string };
      }>;
    };

    const data = await response.json() as OpenAIResponse;
    const explanation = data.choices?.[0]?.message?.content?.trim() ?? '';

    return NextResponse.json({ explanation });
  } catch (err) {
    console.error('[AI EXPLAIN] Fetch error:', err);
    return NextResponse.json({ error: 'Failed to reach AI service.' }, { status: 502 });
  }
}
