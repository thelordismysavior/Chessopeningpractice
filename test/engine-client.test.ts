import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { EngineClient, type WorkerLike } from '../src/engine/engine-client';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

class FakeWorker implements WorkerLike {
  onmessage: ((event: { data: string }) => void) | null = null;
  readonly sent: string[] = [];
  terminated = false;

  postMessage(message: string): void {
    this.sent.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  reply(data: string): void {
    this.onmessage?.({ data });
  }

  handshake(): void {
    this.reply('uciok');
    this.reply('readyok');
  }

  finish(cp: number): void {
    this.reply(`info depth 12 score cp ${cp} pv e2e4`);
    this.reply('bestmove e2e4');
  }

  get goCount(): number {
    return this.sent.filter((message) => message.startsWith('go ')).length;
  }
}

let worker: FakeWorker;
let client: EngineClient;

beforeEach(() => {
  vi.useFakeTimers();
  worker = new FakeWorker();
  client = new EngineClient({ createWorker: () => worker });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('startup', () => {
  test('completes the UCI handshake before searching', async () => {
    const pending = client.evaluate(START, 'w');
    expect(worker.sent).toEqual(['uci']);
    worker.reply('uciok');
    expect(worker.sent).toEqual(['uci', 'isready']);
    worker.reply('readyok');
    expect(worker.sent).toContain(`position fen ${START}`);
    expect(worker.goCount).toBe(1);
    worker.finish(35);
    await expect(pending).resolves.toEqual({ kind: 'cp', cp: 35 });
    expect(client.status).toBe('ready');
  });

  test('goes unavailable when the worker cannot be constructed', async () => {
    const failing = new EngineClient({ createWorker: () => { throw new Error('no worker'); } });
    await expect(failing.evaluate(START, 'w')).resolves.toBeNull();
    expect(failing.status).toBe('unavailable');
  });

  test('goes unavailable when no first result arrives before the deadline', async () => {
    const pending = client.evaluate(START, 'w');
    vi.advanceTimersByTime(3000);
    await expect(pending).resolves.toBeNull();
    expect(client.status).toBe('unavailable');
    expect(worker.terminated).toBe(true);
  });

  test('resolves null without a worker once unavailable, until reset', async () => {
    const pending = client.evaluate(START, 'w');
    vi.advanceTimersByTime(3000);
    await pending;
    await expect(client.evaluate(AFTER_E4, 'w')).resolves.toBeNull();
    client.reset();
    expect(client.status).toBe('idle');
  });
});

describe('evaluation', () => {
  test('orients the score to the learner', async () => {
    const pending = client.evaluate(AFTER_E4, 'w');
    worker.handshake();
    worker.finish(40);
    await expect(pending).resolves.toEqual({ kind: 'cp', cp: -40 });
  });

  test('keeps the last info score before bestmove', async () => {
    const pending = client.evaluate(START, 'w');
    worker.handshake();
    worker.reply('info depth 4 score cp 10 pv e2e4');
    worker.reply('info depth 12 score cp 26 pv d2d4');
    worker.reply('bestmove d2d4');
    await expect(pending).resolves.toEqual({ kind: 'cp', cp: 26 });
  });

  test('memoizes by position and learner side', async () => {
    const first = client.evaluate(START, 'w');
    worker.handshake();
    worker.finish(35);
    await first;
    await expect(client.evaluate(START, 'w')).resolves.toEqual({ kind: 'cp', cp: 35 });
    expect(worker.goCount).toBe(1);
    const flipped = client.evaluate(START, 'b');
    expect(worker.goCount).toBe(2);
    worker.finish(35);
    await expect(flipped).resolves.toEqual({ kind: 'cp', cp: -35 });
  });

  test('drops a superseded request and searches only the latest', async () => {
    const first = client.evaluate(START, 'w');
    worker.handshake();
    const superseded = client.evaluate(AFTER_E4, 'w');
    const latest = client.evaluate(START, 'b');
    await expect(superseded).resolves.toBeNull();
    worker.finish(35);
    await expect(first).resolves.toEqual({ kind: 'cp', cp: 35 });
    expect(worker.sent).toContain(`position fen ${START}`);
    worker.finish(35);
    await expect(latest).resolves.toEqual({ kind: 'cp', cp: -35 });
    expect(worker.goCount).toBe(2);
  });

  test('keeps an active search attached to its FEN when the memo is cleared', async () => {
    const first = client.evaluate(START, 'w');
    worker.handshake();
    client.clearMemo();
    const second = client.evaluate(AFTER_E4, 'w');

    worker.finish(35);
    await expect(first).resolves.toEqual({ kind: 'cp', cp: 35 });
    expect(worker.sent).toContain(`position fen ${AFTER_E4}`);

    worker.finish(70);
    await expect(second).resolves.toEqual({ kind: 'cp', cp: -70 });
  });

  test('resolves null when a search reports no score', async () => {
    const pending = client.evaluate(START, 'w');
    worker.handshake();
    worker.reply('bestmove e2e4');
    await expect(pending).resolves.toBeNull();
  });
});
