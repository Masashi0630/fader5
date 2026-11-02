import { inverse } from './matrix';
import { moveRange } from './moves';
import type { Band, Move } from './types';

export type SolveResult = { par: number; solution: Move[] };

/** BFS の探索深さの上限(reference/sim.mjs と同じ) */
export const MAX_DEPTH = 30;

/**
 * 壁ありの最短手数(パー)と最短解の1つを幅優先探索で求める。maxDepth 手以内で解けなければ null。
 * 探索順(状態 → スライダー j 昇順 → t 昇順)は sim.mjs と同じなので、同じ入力なら同じ解を返す。
 */
export function bfsSolve(
  matrix: number[][],
  start: readonly number[],
  band: Band,
  max: number,
  maxDepth = MAX_DEPTH,
): SolveResult | null {
  const n = start.length;
  const base = max + 1;
  // 状態は基数 base の整数(先頭のスライダーが最上位桁)。値の変化は線形なので、
  // スライダー j を t 段動かすと状態の整数は t * colStep[j] だけ変わる
  const weight = new Array<number>(n);
  for (let i = n - 1, w = 1; i >= 0; i--, w *= base) weight[i] = w;
  const colStep = Array.from({ length: n }, (_, j) =>
    matrix.reduce((s, row, i) => s + row[j] * weight[i], 0),
  );

  const total = base ** n;
  const dist = new Int8Array(total).fill(-1);
  const parent = new Int32Array(total);
  const moveSlider = new Int8Array(total);
  const moveDelta = new Int8Array(total);

  const startKey = start.reduce((s, v) => s * base + v, 0);
  dist[startKey] = 0;
  if (start.every((v) => v >= band.lo && v <= band.hi)) return { par: 0, solution: [] };

  const trace = (key: number): Move[] => {
    const solution: Move[] = [];
    for (let k = key; dist[k] > 0; k = parent[k]) {
      solution.push({ slider: moveSlider[k], delta: moveDelta[k] });
    }
    return solution.reverse();
  };

  const x = new Array<number>(n);
  let frontier: number[] = [startKey];
  for (let depth = 1; depth <= maxDepth; depth++) {
    const next: number[] = [];
    for (const key of frontier) {
      for (let i = n - 1, k = key; i >= 0; i--) {
        x[i] = k % base;
        k = Math.floor(k / base);
      }
      for (let j = 0; j < n; j++) {
        const [tmin, tmax] = moveRange(matrix, x, j, max);
        for (let t = tmin; t <= tmax; t++) {
          if (t === 0) continue;
          const to = key + t * colStep[j];
          if (dist[to] !== -1) continue;
          dist[to] = depth;
          parent[to] = key;
          moveSlider[to] = j;
          moveDelta[to] = t;
          if (solvedAfter(matrix, x, j, t, band)) return { par: depth, solution: trace(to) };
          next.push(to);
        }
      }
    }
    if (next.length === 0) return null;
    frontier = next;
  }
  return null;
}

/** x からスライダー j を t 段動かした結果がクリア状態か(配列を作らずに判定) */
function solvedAfter(matrix: number[][], x: readonly number[], j: number, t: number, band: Band): boolean {
  for (let i = 0; i < x.length; i++) {
    const v = x[i] + t * matrix[i][j];
    if (v < band.lo || v > band.hi) return false;
  }
  return true;
}

/**
 * 壁を無視したときの最短手数(下限)。帯内の各目標点 y について d = M⁻¹(y − x0) が整数なら
 * d の非ゼロ成分数を候補とし、その最小値。整数解がなければ Infinity。
 */
export function parNoWall(matrix: number[][], start: readonly number[], band: Band): number {
  const n = start.length;
  const width = band.hi - band.lo + 1;
  const inv = inverse(matrix);
  const idx = new Array<number>(n).fill(0);
  let best = Infinity;
  for (let c = 0; c < width ** n; c++) {
    let k = c;
    for (let i = 0; i < n; i++) {
      idx[i] = k % width;
      k = Math.floor(k / width);
    }
    const r = start.map((v, i) => band.lo + idx[i] - v);
    const d = inv.map((row) => row.reduce((s, a, i) => s + a * r[i], 0));
    if (d.every((v) => Math.abs(v - Math.round(v)) < 1e-6)) {
      best = Math.min(best, d.filter((v) => Math.abs(v) > 1e-6).length);
    }
  }
  return best;
}
