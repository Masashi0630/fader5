import type { Puzzle, WeekdayProfileId } from '../core/types';
import type { GenerateRequest, GenerateResponse } from './generate.worker';

type Pending = { resolve: (p: Puzzle) => void; reject: (e: Error) => void };

/** 練習用の問題を Web Worker で生成する(BFS をメインスレッドで回さない) */
export class PuzzleGenerator {
  private worker: Worker | null = null;
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();

  generate(profile: WeekdayProfileId, seed: number): Promise<Puzzle> {
    this.worker ??= this.spawn();
    const req: GenerateRequest = { id: this.nextId++, profile, seed };
    return new Promise((resolve, reject) => {
      this.pending.set(req.id, { resolve, reject });
      this.worker!.postMessage(req);
    });
  }

  private spawn(): Worker {
    const worker = new Worker(new URL('./generate.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<GenerateResponse>) => {
      const res = e.data;
      const p = this.pending.get(res.id);
      if (!p) return;
      this.pending.delete(res.id);
      if ('error' in res) p.reject(new Error(res.error));
      else p.resolve(res.puzzle);
    };
    worker.onerror = (e) => {
      // Worker ごと落ちたら待っている要求をすべて失敗にし、次回は作り直す
      for (const p of this.pending.values()) p.reject(new Error(e.message));
      this.pending.clear();
      worker.terminate();
      this.worker = null;
    };
    return worker;
  }
}

/** 練習用のシード(32bit) */
export function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}
