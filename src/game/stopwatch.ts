/** 経過時間。現在時刻は呼び出し側から渡す(ここでは時計を読まない) */
export class Stopwatch {
  private acc: number;
  private since: number | null = null;

  constructor(elapsedMs = 0) {
    this.acc = elapsedMs;
  }

  get running(): boolean {
    return this.since !== null;
  }

  start(now: number): void {
    if (this.since === null) this.since = now;
  }

  stop(now: number): void {
    if (this.since === null) return;
    this.acc += Math.max(0, now - this.since);
    this.since = null;
  }

  elapsed(now: number): number {
    return this.acc + (this.since === null ? 0 : Math.max(0, now - this.since));
  }
}

/** 0:07, 1:23, 1:02:03 */
export function formatClock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}
