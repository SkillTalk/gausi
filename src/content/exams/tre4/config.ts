import type { ExamConfig } from '@/types/exam';

export const tre4ExamConfig: ExamConfig = {
  examId: 'bpsc-tre4',
  examName: 'BPSC TRE 4',
  totalQuestions: 25,
  durationMinutes: 15,
  marks: {
    correct: 1,
    wrong: -0.25,
    optionE: 0,
    unanswered: -0.25,
  },
};
