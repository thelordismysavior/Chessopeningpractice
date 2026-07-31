import { expect, test, type Page } from '@playwright/test';
import { COURSES } from '../../src/courses';
import { expectNoOverflow, openDashboard } from './app-stubs';

const ENGINE_STUB = `
  let fen = '';
  onmessage = (event) => {
    const message = String(event.data);
    if (message === 'uci') postMessage('uciok');
    else if (message === 'isready') postMessage('readyok');
    else if (message.startsWith('position fen ')) fen = message.slice('position fen '.length).trim();
    else if (message.startsWith('go')) {
      const whiteToMove = fen.split(' ')[1] === 'w';
      postMessage('info depth 12 score cp ' + (whiteToMove ? 120 : -120));
      postMessage('bestmove e2e4');
    }
  };
`;

async function openPreview(page: Page): Promise<void> {
  await page.route('**/engine/stockfish.js', (route) => route.fulfill({ contentType: 'application/javascript', body: ENGINE_STUB }));
  await openDashboard(page, 1440, 1000);
  await page.locator('#browse-all').click();
  await page.locator('.browse-row').first().click();
  await expect(page.locator('.line-preview-page')).toBeVisible();
}

type PreviewGeometry = {
  layout: { left: number; right: number; top: number };
  copy: { left: number; right: number; bottom: number };
  board: { left: number; right: number; top: number; width: number };
  evalBar: { left: number; right: number; width: number } | null;
  controls: { left: number; right: number; top: number; bottom: number }[];
};

async function geometry(page: Page): Promise<PreviewGeometry> {
  return page.evaluate(() => {
    const box = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width };
    };
    const layout = box('.line-preview-layout');
    const copy = box('.line-preview-copy');
    const board = box('.line-preview-layout > .board-panel');
    const evalElement = document.querySelector<HTMLElement>('.eval-bar, .eval-note');
    const evalRect = evalElement?.getBoundingClientRect();
    return {
      layout,
      copy,
      board,
      evalBar: evalRect ? { left: evalRect.left, right: evalRect.right, width: evalRect.width } : null,
      controls: Array.from(document.querySelectorAll<HTMLButtonElement>('.preview-actions button')).map((button) => {
        const rect = button.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
      }),
    };
  });
}

function expectControlsInViewport(controls: PreviewGeometry['controls'], width: number): void {
  for (const control of controls) {
    expect(control.left).toBeGreaterThanOrEqual(0);
    expect(control.right).toBeLessThanOrEqual(width);
  }
}

test('Line Preview keeps its board-led composition across the supported widths', async ({ page }) => {
  await openPreview(page);

  await expect(page.locator('.line-preview-page')).toContainText('Lesson idea');
  await expect(page.locator('.preview-guide')).toContainText('Current authored move');
  await expect(page.locator('.preview-guide')).toContainText(COURSES[0].lessons.beginner.variations[0].positions[0].explanation);

  const wide = await geometry(page);
  expect(wide.board.width).toBeLessThanOrEqual(521);
  expect(wide.copy.right).toBeLessThanOrEqual(wide.board.left + 1);
  expect(wide.evalBar?.width).toBeCloseTo(wide.board.width, 0);
  expectControlsInViewport(wide.controls, 1440);
  await expectNoOverflow(page);

  await page.setViewportSize({ width: 768, height: 1024 });
  const tablet = await geometry(page);
  expect(tablet.copy.right).toBeLessThanOrEqual(tablet.board.left + 1);
  expect(tablet.board.width).toBeGreaterThanOrEqual(300);
  expect(tablet.evalBar?.width).toBeCloseTo(tablet.board.width, 0);
  expectControlsInViewport(tablet.controls, 768);
  await expectNoOverflow(page);

  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 844 }]) {
    await page.setViewportSize(viewport);
    const narrow = await geometry(page);
    expect(narrow.copy.bottom).toBeLessThanOrEqual(narrow.board.top + 1);
    expect(narrow.board.left).toBeGreaterThanOrEqual(0);
    expect(narrow.board.right).toBeLessThanOrEqual(viewport.width);
    expect(narrow.board.width).toBeLessThanOrEqual(viewport.width - 36);
    expect(narrow.evalBar?.width).toBeCloseTo(narrow.board.width, 0);
    expectControlsInViewport(narrow.controls, viewport.width);
    await expectNoOverflow(page);
  }
});

test('Line Preview keeps keyboard focus through navigation and completion', async ({ page }) => {
  await openPreview(page);
  await page.locator('#preview-next').focus();
  await page.locator('#preview-next').click();
  await expect(page.locator('#preview-next')).toBeFocused();

  const variation = COURSES[0].lessons.beginner.variations[0];
  for (let index = 1; index < variation.positions.length; index += 1) {
    await page.locator('#preview-next').click();
  }
  await expect(page.locator('.preview-complete')).toBeVisible();
  await expect(page.locator('#preview-restart')).toBeFocused();
  await expectNoOverflow(page);
});
