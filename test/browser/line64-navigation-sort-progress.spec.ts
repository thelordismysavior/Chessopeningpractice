import { expect, test } from '@playwright/test';
import { expectNoOverflow, openDashboard } from './app-stubs';

const VIEWPORTS = [
  { width: 1440, height: 1000 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 320, height: 844 },
] as const;

for (const viewport of VIEWPORTS) {
  test.describe(`LINE/64 navigation and progress at ${viewport.width}px`, () => {
    test('primary navigation exposes a quiet current-page state without wrapping or overflow', async ({ page }) => {
      await openDashboard(page, viewport.width, viewport.height);

      const primaryNav = page.locator('nav[aria-label="Primary navigation"]');
      await expect(primaryNav).toBeVisible();
      await expect(primaryNav.locator('[aria-current="page"]')).toHaveText('Courses');
      expect(await primaryNav.locator('a').evaluateAll((links) => links.every((link) => !link.classList.contains('quiet-button')))).toBe(true);

      const navStyles = await primaryNav.locator('a').first().evaluate((link) => {
        const styles = getComputedStyle(link);
        return { background: styles.backgroundColor, radius: styles.borderRadius };
      });
      expect(navStyles.background).toBe('rgba(0, 0, 0, 0)');
      expect(navStyles.radius).toBe('0px');

      const destination = primaryNav.locator('#queue-nav');
      const defaultColor = await destination.evaluate((link) => getComputedStyle(link).color);
      const currentColor = await primaryNav.locator('[aria-current="page"]').evaluate((link) => getComputedStyle(link).color);
      await destination.hover();
      await expect.poll(() => destination.evaluate((link) => getComputedStyle(link).color)).toBe(currentColor);
      await destination.focus();
      await expect.poll(() => destination.evaluate((link) => getComputedStyle(link).color)).toBe(currentColor);
      expect(defaultColor).not.toBe(currentColor);

      await expectNoOverflow(page);
    });

    test('Sort by has one bounded select and preserves every sort option', async ({ page }) => {
      await openDashboard(page, viewport.width, viewport.height);
      await page.locator('.course-card').first().click();
      await expect(page.locator('.course-page')).toBeVisible();

      const sortField = page.locator('.sort-field');
      const sortLabel = sortField.locator('label');
      const sortSelect = sortField.locator('select');
      await expect(sortLabel).toHaveText('Sort by');
      await expect(sortLabel).toHaveAttribute('for', 'course-line-sort');
      await expect(sortSelect).toHaveCount(1);
      await expect(sortSelect.locator('option')).toHaveText(['Recommended', 'Level', 'Category', 'Status', 'Name']);

      const boundaryStyles = await sortField.evaluate((field) => ({
        fieldBorder: getComputedStyle(field).borderStyle,
        selectBorder: getComputedStyle(field.querySelector('select')!).borderStyle,
      }));
      expect(boundaryStyles.fieldBorder).toBe('none');
      expect(boundaryStyles.selectBorder).toBe('solid');
      await expectNoOverflow(page);
    });

    test('Overall Progress has a non-overlapping hierarchy and accurate progress semantics', async ({ page }) => {
      await openDashboard(page, viewport.width, viewport.height);

      const progress = page.locator('.mastery-figure');
      const label = progress.locator('.mastery-heading .state');
      const percentage = progress.locator('.mastery-heading strong');
      const banked = progress.locator('.progress-label');
      const bar = progress.locator('[role="progressbar"]');
      await expect(label).toHaveText('OVERALL PROGRESS');
      await expect(percentage).toBeVisible();
      await expect(banked).toBeVisible();
      await expect(bar).toHaveAttribute('aria-valuenow', '0');

      const geometry = await Promise.all([label, percentage, banked, bar].map((locator) => locator.boundingBox()));
      const [labelBox, percentageBox, bankedBox, barBox] = geometry;
      expect(labelBox && percentageBox && bankedBox && barBox).toBeTruthy();
      expect(percentageBox!.y).toBeGreaterThanOrEqual(labelBox!.y + labelBox!.height);
      expect(bankedBox!.y).toBeGreaterThanOrEqual(percentageBox!.y + percentageBox!.height);
      expect(barBox!.y).toBeGreaterThanOrEqual(bankedBox!.y + bankedBox!.height);
      await expectNoOverflow(page);
    });
  });
}

test('Course sorting remains operable after the control boundary repair', async ({ page }) => {
  await openDashboard(page, 1440, 1000);
  await page.locator('.course-card').first().click();
  await expect(page.locator('.course-page')).toBeVisible();

  const firstRecommendedLine = await page.locator('.course-line-row').first().locator('strong').textContent();
  await page.locator('#course-line-sort').selectOption('name');
  await expect(page.locator('#course-line-sort')).toHaveValue('name');
  await expect(page.locator('.course-line-row')).not.toHaveCount(0);
  await page.locator('#course-line-sort').selectOption('recommended');
  await expect(page.locator('.course-line-row').first().locator('strong')).toHaveText(firstRecommendedLine!);
});
