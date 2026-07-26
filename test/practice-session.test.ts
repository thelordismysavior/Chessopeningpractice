import { describe, expect, test } from 'vitest';
import { COURSES } from '../src/courses';
import { createPracticeSession } from '../src/practice-session';

const lesson = COURSES[0].lessons.beginner;
const blackLesson = COURSES.find((course) => course.id === 'classical-sicilian')!.lessons.beginner;

describe('practice session boundary', () => {
  test('accepts the exact repertoire move and advances in course order', () => {
    const session = createPracticeSession(lesson);
    expect(session.snapshot.position?.id).toBe('beginner-1');
    const feedback = session.submitMove(lesson.positions[0].expectedMove);
    expect(feedback.kind).toBe('correct');
    expect(session.snapshot.position?.id).toBe('beginner-2');
  });

  test('rejects legal alternatives and requires the expected move on retry', () => {
    const session = createPracticeSession(lesson);
    expect(session.submitMove('b1c3').kind).toBe('incorrect');
    expect(session.snapshot.status).toBe('retrying');
    expect(session.submitMove(lesson.positions[0].expectedMove).kind).toBe('correct');
    expect(session.snapshot.position?.id).toBe('beginner-2');
    expect(session.snapshot.missedPositionIds).toEqual(['beginner-1']);
  });

  test('rejects illegal moves without advancing', () => {
    const session = createPracticeSession(lesson);
    const feedback = session.submitMove('a1a8');
    expect(feedback.kind).toBe('illegal');
    expect(session.snapshot.positionIndex).toBe(0);
  });

  test('requires a clean run before completing a lesson', () => {
    const session = createPracticeSession(lesson);
    session.submitMove('b1c3');
    session.submitMove(lesson.positions[0].expectedMove);
    for (const position of lesson.positions.slice(1)) session.submitMove(position.expectedMove);
    expect(session.snapshot.status).toBe('needs-clean-run');
    session.restartCleanRun();
    for (const position of lesson.positions) session.submitMove(position.expectedMove);
    expect(session.snapshot.status).toBe('complete');
  });

  test('review mode follows only the requested missed positions', () => {
    const session = createPracticeSession(lesson, { reviewPositionIds: ['beginner-3', 'beginner-1'] });
    expect(session.snapshot.position?.id).toBe('beginner-3');
    session.submitMove(lesson.positions[2].expectedMove);
    expect(session.snapshot.position?.id).toBe('beginner-1');
    session.submitMove(lesson.positions[0].expectedMove);
    expect(session.snapshot.lessonComplete).toBe(false);
  });

  test('accepts the exact Black repertoire move', () => {
    const session = createPracticeSession(blackLesson);
    const feedback = session.submitMove(blackLesson.positions[0].expectedMove);
    expect(feedback.kind).toBe('correct');
    expect(session.snapshot.position?.id).toBe('beginner-2');
  });
});
