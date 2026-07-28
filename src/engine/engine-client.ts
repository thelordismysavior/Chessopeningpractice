import { orientScore, parseInfo, PROVISIONAL_MIN_DEPTH, type EvalScore } from './eval-scale';

export const ENGINE_MOVETIME_MS = 300;
export const ENGINE_STARTUP_MS = 3000;
const ENGINE_URL = '/engine/stockfish.js';

export type EngineStatus = 'idle' | 'starting' | 'ready' | 'unavailable';

/** The slice of Worker this client needs, so tests can supply a fake. */
export type WorkerLike = {
  postMessage(message: string): void;
  onmessage: ((event: { data: string }) => void) | null;
  onerror?: ((event: { message?: string }) => void) | null;
  terminate(): void;
};

export type EngineOptions = {
  createWorker?: () => WorkerLike;
  moveTimeMs?: number;
  startupTimeoutMs?: number;
};

type Request = { fen: string; learnerColor: 'w' | 'b'; onProgress?: (score: EvalScore) => void; resolve: (score: EvalScore | null) => void };

export class EngineClient {
  private readonly createWorker: () => WorkerLike;
  private readonly moveTimeMs: number;
  private readonly startupTimeoutMs: number;
  private readonly memo = new Map<string, EvalScore>();
  private worker: WorkerLike | null = null;
  private state: EngineStatus = 'idle';
  private inFlight: Request | null = null;
  private pending: Request | null = null;
  private latest: EvalScore | null = null;
  private deadline: ReturnType<typeof setTimeout> | null = null;

  constructor(options: EngineOptions = {}) {
    this.createWorker = options.createWorker ?? (() => new Worker(ENGINE_URL) as unknown as WorkerLike);
    this.moveTimeMs = options.moveTimeMs ?? ENGINE_MOVETIME_MS;
    this.startupTimeoutMs = options.startupTimeoutMs ?? ENGINE_STARTUP_MS;
  }

  get status(): EngineStatus {
    return this.state;
  }

  /** Drop completed scores without detaching an active worker search from its request. */
  clearMemo(): void {
    this.memo.clear();
  }

  /** Resolves null when the engine is unavailable, the request was superseded, or no score came back. */
  evaluate(fen: string, learnerColor: 'w' | 'b', onProgress?: (score: EvalScore) => void): Promise<EvalScore | null> {
    if (this.state === 'unavailable') return Promise.resolve(null);
    const cached = this.memo.get(this.key(fen, learnerColor));
    if (cached) return Promise.resolve(cached);
    return new Promise<EvalScore | null>((resolve) => {
      const request: Request = { fen, learnerColor, onProgress, resolve };
      if (!this.ensureWorker()) {
        resolve(null);
        return;
      }
      if (this.inFlight) {
        this.pending?.resolve(null);
        this.pending = request;
        return;
      }
      this.begin(request);
    });
  }

  /** Allows one more start attempt on the next screen entry. */
  reset(): void {
    if (this.state !== 'unavailable') return;
    this.worker = null;
    this.state = 'idle';
  }

  /** Boots the worker ahead of the first position. */
  warm(): void {
    if (this.state !== 'unavailable') this.ensureWorker();
  }

  private key(fen: string, learnerColor: 'w' | 'b'): string {
    return `${learnerColor}|${fen}`;
  }

  private ensureWorker(): boolean {
    if (this.worker) return true;
    try {
      this.worker = this.createWorker();
    } catch {
      this.fail();
      return false;
    }
    this.state = 'starting';
    this.worker.onmessage = (event) => this.receive(String(event.data));
    this.worker.onerror = () => this.fail();
    this.worker.postMessage('uci');
    this.deadline = setTimeout(() => this.fail(), this.startupTimeoutMs);
    return true;
  }

  private begin(request: Request): void {
    this.inFlight = request;
    this.latest = null;
    if (this.state === 'ready') this.search(request);
  }

  private search(request: Request): void {
    this.worker?.postMessage(`position fen ${request.fen}`);
    this.worker?.postMessage(`go movetime ${this.moveTimeMs}`);
  }

  private receive(message: string): void {
    if (message.includes('uciok')) {
      this.worker?.postMessage('isready');
      return;
    }
    if (message.includes('readyok')) {
      if (this.deadline !== null) {
        clearTimeout(this.deadline);
        this.deadline = null;
      }
      this.state = 'ready';
      if (this.inFlight) this.search(this.inFlight);
      return;
    }
    if (message.startsWith('info')) {
      const info = parseInfo(message);
      if (!info) return;
      this.latest = info.score;
      const request = this.inFlight;
      if (request?.onProgress && info.depth >= PROVISIONAL_MIN_DEPTH) {
        request.onProgress(orientScore(info.score, request.fen, request.learnerColor));
      }
      return;
    }
    if (message.startsWith('bestmove')) this.finish();
  }

  private finish(): void {
    if (this.deadline !== null) {
      clearTimeout(this.deadline);
      this.deadline = null;
    }
    const request = this.inFlight;
    this.inFlight = null;
    if (request) {
      const score = this.latest ? orientScore(this.latest, request.fen, request.learnerColor) : null;
      if (score) this.memo.set(this.key(request.fen, request.learnerColor), score);
      request.resolve(score);
    }
    this.latest = null;
    const next = this.pending;
    this.pending = null;
    if (next) this.begin(next);
  }

  private fail(): void {
    if (this.deadline !== null) {
      clearTimeout(this.deadline);
      this.deadline = null;
    }
    this.state = 'unavailable';
    try {
      this.worker?.terminate();
    } catch {
      // A worker that cannot be terminated is already gone.
    }
    this.worker = null;
    this.inFlight?.resolve(null);
    this.inFlight = null;
    this.pending?.resolve(null);
    this.pending = null;
  }
}

export const engine = new EngineClient();
