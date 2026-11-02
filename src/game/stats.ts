/** デイリーの1問ぶんの結果 */
export type DailyResult = {
  moves: number;
  par: number;
  timeMs: number;
  gaveUp: boolean;
};

/** デイリーの記録。問題番号 → 結果(練習は含めない) */
export type Stats = { results: Record<number, DailyResult> };

export type StatsSummary = {
  plays: number;
  clears: number;
  currentStreak: number;
  maxStreak: number;
  /** 最短手数との差の分布。添字 0..3 は差そのもの、4 は 4 以上 */
  distribution: number[];
};

export const DISTRIBUTION_BUCKETS = 5;

export function emptyStats(): Stats {
  return { results: {} };
}

/** 結果を記録する。同じ問題を2回記録しない(最初の結果を残す) */
export function recordResult(stats: Stats, id: number, result: DailyResult): Stats {
  if (stats.results[id]) return stats;
  return { results: { ...stats.results, [id]: result } };
}

/**
 * 集計。連続日数はクリアした問題番号が連続している長さ(ギブアップや未プレイで切れる)。
 * 今日の問題をまだ終えていなければ、昨日まで続いていれば現在の連続に数える。
 */
export function summarize(stats: Stats, todayId: number): StatsSummary {
  const entries = Object.entries(stats.results).map(([id, r]) => [Number(id), r] as const);
  const cleared = new Set(entries.filter(([, r]) => !r.gaveUp).map(([id]) => id));
  const distribution = new Array<number>(DISTRIBUTION_BUCKETS).fill(0);
  for (const [, r] of entries) {
    if (r.gaveUp) continue;
    distribution[Math.min(DISTRIBUTION_BUCKETS - 1, Math.max(0, r.moves - r.par))]++;
  }

  let currentStreak = 0;
  const from = stats.results[todayId] ? todayId : todayId - 1;
  for (let id = from; cleared.has(id); id--) currentStreak++;

  let maxStreak = 0;
  for (const id of cleared) {
    if (cleared.has(id - 1)) continue;
    let len = 0;
    while (cleared.has(id + len)) len++;
    maxStreak = Math.max(maxStreak, len);
  }

  return { plays: entries.length, clears: cleared.size, currentStreak, maxStreak, distribution };
}

/** localStorage から読んだ値を検証する。壊れていたら空の記録 */
export function parseStats(raw: unknown): Stats {
  if (typeof raw !== 'object' || raw === null) return emptyStats();
  const results = (raw as { results?: unknown }).results;
  if (typeof results !== 'object' || results === null) return emptyStats();
  const out: Record<number, DailyResult> = {};
  for (const [k, v] of Object.entries(results)) {
    const id = Number(k);
    const r = v as Partial<DailyResult>;
    if (!Number.isInteger(id) || id < 1) continue;
    if (typeof r?.moves !== 'number' || typeof r.par !== 'number' || typeof r.gaveUp !== 'boolean') continue;
    out[id] = { moves: r.moves, par: r.par, timeMs: typeof r.timeMs === 'number' ? r.timeMs : 0, gaveUp: r.gaveUp };
  }
  return { results: out };
}
