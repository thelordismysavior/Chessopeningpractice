import { expect, test } from '@playwright/test';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

test('the vendored engine answers a real search', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async (fen) => {
    const worker = new Worker('/engine/stockfish.js');
    const log: string[] = [];
    const done = new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`no bestmove; saw ${log.join(' | ')}`)), 30_000);
      worker.onmessage = (event) => {
        const message = String(event.data);
        log.push(message);
        if (message.includes('uciok')) worker.postMessage('isready');
        if (message.includes('readyok')) {
          worker.postMessage(`position fen ${fen}`);
          worker.postMessage('go movetime 300');
        }
        if (message.startsWith('bestmove')) {
          clearTimeout(timer);
          resolve(log.join('\n'));
        }
      };
      worker.onerror = (event) => reject(new Error(String(event.message ?? 'worker error')));
    });
    worker.postMessage('uci');
    const transcript = await done;
    worker.terminate();
    return transcript;
  }, START);

  expect(result).toContain('uciok');
  expect(result).toMatch(/score (cp|mate) -?\d+/);
  expect(result).toMatch(/bestmove \w+/);
});
