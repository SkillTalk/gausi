import type { ExamConfig } from '@/types/exam';

// Single source of truth for TRE4 marking scheme.
// Import TRE4_MARKS anywhere this scheme is needed (e.g. test-provider.ts).
export const TRE4_MARKS = {
  correct: 1,
  wrong: -(1 / 3), // BPSC TRE 4: deduct 1/3 mark per wrong answer
  optionE: 0,
  unanswered: -0.25,
} as const;

export const tre4ExamConfig: ExamConfig = {
  examId: 'bpsc-tre4',
  examName: 'BPSC TRE 4',
  totalQuestions: 25,
  durationMinutes: 15,
  marks: TRE4_MARKS,
};
