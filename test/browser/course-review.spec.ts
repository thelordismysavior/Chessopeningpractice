import { expect, test } from '@playwright/test';
import { COURSES } from '../../src/courses';
import { expectNoOverflow, openDashboard, playMove, seedProgress } from './app-stubs';

const VIEWPORTS = [
  { width: 1440, height: 1000 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 320, height: 844 },
];

const dueRecord = { attempts: 1, corrects: 0, misses: 1, hints: 0, reviewStreak: 0, due: true, nextReviewAt: 0 };

for (const viewport of VIEWPORTS) {
  test(`Course Review keeps due work, refresh, Back, and completion in the active Course at ${viewport.width}px`, async ({ page }) => {
  const course = COURSES[0];
  const foreignCourse = COURSES[3];
  const firstLine = course.lessons.beginner.variations[0];
  const middleLine = course.lessons.intermediate.variations[0];
  const oldestLine = course.lessons.advanced.variations[0];
  const foreignLine = foreignCourse.lessons.beginner.variations[0];

  await openDashboard(page, viewport.width, viewport.height);
  await seedProgress(page, course.id, {
    completedLevels: [],
    unlockedLevel: 0,
    completedVariationIds: [firstLine.id, middleLine.id, oldestLine.id],
    positions: {
      [firstLine.positions[0].id]: dueRecord,
      [firstLine.positions[1].id]: dueRecord,
      [oldestLine.positions[0].id]: { ...dueRecord, nextReviewAt: -1 },
      [middleLine.positions[0].id]: { ...dueRecord, nextReviewAt: 1 },
    },
    practiceMs: 0,
  });
  await seedProgress(page, foreignCourse.id, {
    completedLevels: [],
    unlockedLevel: 0,
    completedVariationIds: [foreignLine.id],
    positions: { [foreignLine.positions[0].id]: { ...dueRecord, nextReviewAt: -2 } },
    practiceMs: 0,
  });

  await page.locator('.course-card').first().click();
  await expect(page.locator('#course-review')).toHaveText('Review Jobava London');
  await page.locator('#course-review').click();
  await expect(page).toHaveURL(/#\/practice\/jobava-london\/advanced/);
  await expect(page.locator('.lesson-copy > .eyebrow')).toContainText('Course Review · Jobava London');

  await page.reload();
  await expect(page.locator('.lesson-copy > .eyebrow')).toContainText('Course Review · Jobava London');
  await page.goBack();
  await expect(page.locator('.course-page')).toBeVisible();
  await page.goForward();
  await expect(page.locator('.lesson-copy > .eyebrow')).toContainText('Course Review · Jobava London');

  await playMove(page, oldestLine.positions[0].expectedMove);
  await seedProgress(page, course.id, {
    completedLevels: [],
    unlockedLevel: 0,
    completedVariationIds: [firstLine.id, middleLine.id, oldestLine.id],
    positions: {
      [firstLine.positions[0].id]: dueRecord,
      [firstLine.positions[1].id]: dueRecord,
      [oldestLine.positions[0].id]: { ...dueRecord, due: false, nextReviewAt: Date.now() + 60_000 },
      [middleLine.positions[0].id]: { ...dueRecord, nextReviewAt: 1 },
    },
    practiceMs: 0,
  });
  await expect(page.locator('#next-group')).toBeVisible();
  await page.locator('#next-group').click();
  await page.reload();
  await expect(page.locator('.lesson-copy > .eyebrow')).toContainText('Course Review · Jobava London');
  await playMove(page, firstLine.positions[0].expectedMove);
  await playMove(page, firstLine.positions[1].expectedMove);
  await expect(page.locator('#next-group')).toBeVisible();
  await page.locator('#next-group').click();
  await playMove(page, middleLine.positions[0].expectedMove);
  const backToCourse = page.getByRole('button', { name: 'Back to Jobava London' });
  await expect(backToCourse).toBeVisible();
  await backToCourse.click();
  await expect(page.locator('.course-page')).toBeVisible();
  await expect(page.locator('#course-review-empty')).toHaveText('No due work in Jobava London.');
  await expectNoOverflow(page);
  });
}
