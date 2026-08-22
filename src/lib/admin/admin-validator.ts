/**
 * Validates admin form input before sending to OpenAI.
 * Server-side only — never exposed to the browser directly.
 */
import type {
  GenerateTestInput,
  ValidationResult,
  ValidationError,
  SupportedExam,
  TopicAdherenceMode,
} from '@/types/generated-test';
import {
  SUPPORTED_EXAMS,
  EXAM_CATEGORIES,
  GENERATED_DIFFICULTIES,
  TOPIC_ADHERENCE_MODES,
} from '@/types/generated-test';

const MAX_SCOPE_LENGTH = 2000;
const MAX_EXCLUDE_LENGTH = 1000;

const MIN_QUESTIONS = 5;
const MAX_QUESTIONS = 50;
const MIN_DURATION = 5;
const MAX_DURATION = 180;

export function validateGenerateInput(input: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!input || typeof input !== 'object') {
    return { valid: false, errors: [{ field: 'body', message: 'Request body must be a JSON object.' }] };
  }

  const body = input as Record<string, unknown>;

  // exam
  if (!body.exam || !SUPPORTED_EXAMS.includes(body.exam as SupportedExam)) {
    errors.push({
      field: 'exam',
      message: `exam must be one of: ${SUPPORTED_EXAMS.join(', ')}`,
    });
  }

  // category
  const validExam = SUPPORTED_EXAMS.includes(body.exam as SupportedExam)
    ? (body.exam as SupportedExam)
    : null;
  if (!body.category || typeof body.category !== 'string' || body.category.trim().length === 0) {
    errors.push({ field: 'category', message: 'category is required.' });
  } else if (validExam && !EXAM_CATEGORIES[validExam].includes(body.category as string)) {
    errors.push({
      field: 'category',
      message: `category must be one of: ${EXAM_CATEGORIES[validExam].join(', ')}`,
    });
  }

  // topic
  if (!body.topic || typeof body.topic !== 'string' || body.topic.trim().length === 0) {
    errors.push({ field: 'topic', message: 'topic is required.' });
  } else if ((body.topic as string).length > 200) {
    errors.push({ field: 'topic', message: 'topic must be 200 characters or fewer.' });
  }

  // difficulty
  if (!body.difficulty || !GENERATED_DIFFICULTIES.includes(body.difficulty as never)) {
    errors.push({
      field: 'difficulty',
      message: `difficulty must be one of: ${GENERATED_DIFFICULTIES.join(', ')}`,
    });
  }

  // totalQuestions
  if (
    typeof body.totalQuestions !== 'number' ||
    !Number.isInteger(body.totalQuestions) ||
    body.totalQuestions < MIN_QUESTIONS ||
    body.totalQuestions > MAX_QUESTIONS
  ) {
    errors.push({
      field: 'totalQuestions',
      message: `totalQuestions must be an integer between ${MIN_QUESTIONS} and ${MAX_QUESTIONS}.`,
    });
  }

  // durationMinutes
  if (
    typeof body.durationMinutes !== 'number' ||
    !Number.isInteger(body.durationMinutes) ||
    body.durationMinutes < MIN_DURATION ||
    body.durationMinutes > MAX_DURATION
  ) {
    errors.push({
      field: 'durationMinutes',
      message: `durationMinutes must be an integer between ${MIN_DURATION} and ${MAX_DURATION}.`,
    });
  }

  // plannedPublishAt (optional)
  if (body.plannedPublishAt !== undefined && body.plannedPublishAt !== null) {
    if (typeof body.plannedPublishAt !== 'string' || isNaN(Date.parse(body.plannedPublishAt as string))) {
      errors.push({ field: 'plannedPublishAt', message: 'plannedPublishAt must be a valid ISO date string.' });
    }
  }

  // strictTopicScope (optional)
  if (body.strictTopicScope !== undefined && body.strictTopicScope !== null) {
    if (typeof body.strictTopicScope !== 'string') {
      errors.push({ field: 'strictTopicScope', message: 'strictTopicScope must be a string.' });
    } else if ((body.strictTopicScope as string).length > MAX_SCOPE_LENGTH) {
      errors.push({ field: 'strictTopicScope', message: `strictTopicScope must be ${MAX_SCOPE_LENGTH} characters or fewer.` });
    }
  }

  // excludeScope (optional)
  if (body.excludeScope !== undefined && body.excludeScope !== null) {
    if (typeof body.excludeScope !== 'string') {
      errors.push({ field: 'excludeScope', message: 'excludeScope must be a string.' });
    } else if ((body.excludeScope as string).length > MAX_EXCLUDE_LENGTH) {
      errors.push({ field: 'excludeScope', message: `excludeScope must be ${MAX_EXCLUDE_LENGTH} characters or fewer.` });
    }
  }

  // topicAdherenceMode (optional, defaults to STRICT)
  if (body.topicAdherenceMode !== undefined && body.topicAdherenceMode !== null) {
    if (!TOPIC_ADHERENCE_MODES.includes(body.topicAdherenceMode as TopicAdherenceMode)) {
      errors.push({ field: 'topicAdherenceMode', message: `topicAdherenceMode must be one of: ${TOPIC_ADHERENCE_MODES.join(', ')}` });
    }
  }

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true };
}

export function sanitizeInput(body: Record<string, unknown>): GenerateTestInput {
  const scope = typeof body.strictTopicScope === 'string' && body.strictTopicScope.trim()
    ? body.strictTopicScope.trim()
    : undefined;
  const exclude = typeof body.excludeScope === 'string' && body.excludeScope.trim()
    ? body.excludeScope.trim()
    : undefined;
  const mode = TOPIC_ADHERENCE_MODES.includes(body.topicAdherenceMode as TopicAdherenceMode)
    ? (body.topicAdherenceMode as TopicAdherenceMode)
    : 'STRICT';

  return {
    exam: (body.exam as SupportedExam),
    category: (body.category as string).trim(),
    topic: (body.topic as string).trim(),
    difficulty: body.difficulty as GenerateTestInput['difficulty'],
    totalQuestions: body.totalQuestions as number,
    durationMinutes: body.durationMinutes as number,
    plannedPublishAt: body.plannedPublishAt as string | undefined,
    strictTopicScope: scope,
    excludeScope: exclude,
    topicAdherenceMode: mode,
  };
}
