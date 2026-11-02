import type { Band } from './types';

/** スライダー j を動かせる段数の区間。壁があるので必ず 0 を含む連続区間になる */
export type MoveRange = [tmin: number, tmax: number];

/** 区間の端を決めている制約。slider が wall(top = max, bottom = 0)にぶつかる */
export type Blocker = { slider: number; wall: 'top' | 'bottom' };

export type MoveRangeDetail = {
  tmin: number;
  tmax: number;
  /** t を tmin より下げようとしたときにぶつかるスライダー */
  minBlockers: Blocker[];
  /** t を tmax より上げようとしたときにぶつかるスライダー */
  maxBlockers: Blocker[];
};

/**
 * スライダー j を t 段動かしても全スライダーが 0..max に収まる t の区間。
 * BFS の内側で呼ぶのでアロケーションしない。
 */
export function moveRange(M: number[][], x: readonly number[], j: number, max: number): MoveRange {
  let tmin = -Infinity;
  let tmax = Infinity;
  for (let i = 0; i < x.length; i++) {
    const c = M[i][j];
    if (c === 0) continue;
    if (c > 0) {
      tmin = Math.max(tmin, Math.ceil(-x[i] / c));
      tmax = Math.min(tmax, Math.floor((max - x[i]) / c));
    } else {
      tmin = Math.max(tmin, Math.ceil((max - x[i]) / c));
      tmax = Math.min(tmax, Math.floor(-x[i] / c));
    }
  }
  // Math.ceil(-0) などで出る −0 を 0 にそろえる
  return [tmin + 0, tmax + 0];
}

/** moveRange と同じ区間に加え、どのスライダーが壁にぶつかるかを返す(UI 用) */
export function moveRangeDetail(
  M: number[][],
  x: readonly number[],
  j: number,
  max: number,
): MoveRangeDetail {
  let tmin = -Infinity;
  let tmax = Infinity;
  let minBlockers: Blocker[] = [];
  let maxBlockers: Blocker[] = [];
  for (let i = 0; i < x.length; i++) {
    const c = M[i][j];
    if (c === 0) continue;
    // c > 0 なら t を上げると i は上(max)へ、c < 0 なら下(0)へ向かう
    const lower = c > 0 ? Math.ceil(-x[i] / c) : Math.ceil((max - x[i]) / c);
    const upper = c > 0 ? Math.floor((max - x[i]) / c) : Math.floor(-x[i] / c);
    const lowerWall = c > 0 ? 'bottom' : 'top';
    const upperWall = c > 0 ? 'top' : 'bottom';
    if (lower > tmin) {
      tmin = lower;
      minBlockers = [{ slider: i, wall: lowerWall }];
    } else if (lower === tmin) {
      minBlockers.push({ slider: i, wall: lowerWall });
    }
    if (upper < tmax) {
      tmax = upper;
      maxBlockers = [{ slider: i, wall: upperWall }];
    } else if (upper === tmax) {
      maxBlockers.push({ slider: i, wall: upperWall });
    }
  }
  return { tmin: tmin + 0, tmax: tmax + 0, minBlockers, maxBlockers };
}

/** x'[i] = x[i] + t * M[i][j]。範囲チェックはしない(呼び出し側で moveRange 内に収める) */
export function applyMove(M: number[][], x: readonly number[], j: number, t: number): number[] {
  return x.map((v, i) => v + t * M[i][j]);
}

export function isInBand(v: number, band: Band): boolean {
  return v >= band.lo && v <= band.hi;
}

export function isSolved(x: readonly number[], band: Band): boolean {
  return x.every((v) => isInBand(v, band));
}
