import type { Puzzle } from '../core/types';

/** チュートリアル用の手作り問題。par / solution は bfsSolve で確かめた値(tests/tutorial.test.ts) */
function tutorial(matrix: number[][], start: number[], lo: number, solution: Puzzle['solution']): Puzzle {
  return {
    id: 0,
    profile: 'tutorial',
    n: start.length,
    max: 12,
    matrix,
    band: { lo, hi: lo + 2 },
    start,
    par: solution.length,
    parNoWall: solution.length,
    solution,
    generatorVersion: 0,
  };
}

export const TUTORIAL: Puzzle[] = [
  // 1. 連動なしの1本を帯に入れる
  tutorial([[1]], [1], 6, [{ slider: 0, delta: 5 }]),
  // 2. 左を動かすと右もつられて動く
  tutorial(
    [
      [1, 0],
      [1, 1],
    ],
    [1, 6],
    5,
    [
      { slider: 0, delta: 4 },
      { slider: 1, delta: -5 },
    ],
  ),
  // 3. 右が上の端にいるので、左を上げようとすると止まる(先に右を下げる)
  tutorial(
    [
      [1, 0],
      [1, 1],
    ],
    [2, 11],
    5,
    [
      { slider: 1, delta: -11 },
      { slider: 0, delta: 5 },
    ],
  ),
];
