import type {
  ExamTest,
  ExamSession,
  ExamResult,
  QuestionResult,
  CategoryResult,
  OptionKey,
} from '@/types/exam';

/** Calculate the full exam result from a completed session. */
export function calculateResult(test: ExamTest, session: ExamSession): ExamResult {
  const { config, questions } = test;
  const { marks } = config;

  const questionResults: QuestionResult[] = questions.map((q) => {
    const selected = (session.answers[q.id] ?? null) as OptionKey | null;
    const markedForReview = session.markedForReview[q.id] ?? false;

    let status: QuestionResult['status'];
    let marksAwarded: number;

    if (selected === null) {
      status = 'unanswered';
      marksAwarded = marks.unanswered;
    } else if (selected === 'E') {
      status = 'optionE';
      marksAwarded = marks.optionE;
    } else if (selected === q.correctOption) {
      status = 'correct';
      marksAwarded = marks.correct;
    } else {
      status = 'wrong';
      marksAwarded = marks.wrong;
    }

    return {
      questionId: q.id,
      selectedOption: selected,
      correctOption: q.correctOption,
      status,
      marksAwarded,
      markedForReview,
      category: q.category,
    };
  });

  const correct = questionResults.filter((r) => r.status === 'correct').length;
  const wrong = questionResults.filter((r) => r.status === 'wrong').length;
  const optionE = questionResults.filter((r) => r.status === 'optionE').length;
  const unanswered = questionResults.filter((r) => r.status === 'unanswered').length;
  const attempted = correct + wrong + optionE;

  const score = questionResults.reduce((sum, r) => sum + r.marksAwarded, 0);
  // Round to avoid floating point artefacts (e.g. 18.250000000000004)
  const roundedScore = Math.round(score * 100) / 100;
  const maxScore = config.totalQuestions * marks.correct;
  const accuracy = attempted > 0 ? Math.round((correct / attempted) * 1000) / 10 : 0;

  const timeUsedMs = Math.min(
    Date.now() - session.startedAt,
    config.durationMinutes * 60 * 1000
  );

  // Category breakdown
  const categoryMap = new Map<string, CategoryResult>();
  for (const r of questionResults) {
    if (!categoryMap.has(r.category)) {
      categoryMap.set(r.category, {
        category: r.category,
        total: 0,
        correct: 0,
        wrong: 0,
        optionE: 0,
        unanswered: 0,
      });
    }
    const cat = categoryMap.get(r.category)!;
    cat.total++;
    if (r.status === 'correct') cat.correct++;
    else if (r.status === 'wrong') cat.wrong++;
    else if (r.status === 'optionE') cat.optionE++;
    else cat.unanswered++;
  }

  return {
    sessionId: session.sessionId,
    testId: test.id,
    language: session.language,
    score: roundedScore,
    maxScore,
    correct,
    wrong,
    optionE,
    unanswered,
    attempted,
    accuracy,
    timeUsedMs,
    totalTimeMs: config.durationMinutes * 60 * 1000,
    questions: questionResults,
    categoryResults: Array.from(categoryMap.values()),
    completedAt: Date.now(),
  };
}

/** Format milliseconds as MM:SS */
export function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** Format milliseconds as human readable (e.g. "12 min 30 sec") */
export function formatTimeHuman(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds} sec`;
  if (seconds === 0) return `${minutes} min`;
  return `${minutes} min ${seconds} sec`;
}
