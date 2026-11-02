import type { Puzzle } from '../../src/core/types';

/**
 * テスト用の手作り3本問題(M1 で画面に出していたもの)。
 * par / parNoWall / solution は reference/sim.mjs と同じ BFS で求めた値。
 */
export const SAMPLES: Puzzle[] = [
  {
    id: 0,
    profile: 'sample',
    n: 3,
    max: 12,
    matrix: [
      [1, -1, -1],
      [0, 1, 0],
      [1, 0, 1],
    ],
    band: { lo: 4, hi: 6 },
    start: [3, 7, 9],
    par: 3,
    parNoWall: 3,
    solution: [
      { slider: 0, delta: -3 },
      { slider: 1, delta: -3 },
      { slider: 2, delta: -2 },
    ],
    generatorVersion: 0,
  },
  {
    id: 0,
    profile: 'sample',
    n: 3,
    max: 12,
    matrix: [
      [1, 1, 0],
      [-1, 1, 1],
      [-1, 0, 1],
    ],
    band: { lo: 3, hi: 5 },
    start: [6, 6, 12],
    par: 4,
    parNoWall: 3,
    solution: [
      { slider: 1, delta: 4 },
      { slider: 2, delta: -10 },
      { slider: 0, delta: -7 },
      { slider: 2, delta: -4 },
    ],
    generatorVersion: 0,
  },
  {
    id: 0,
    profile: 'sample',
    n: 3,
    max: 12,
    matrix: [
      [1, 0, -1],
      [1, 1, -1],
      [0, -1, 1],
    ],
    band: { lo: 6, hi: 8 },
    start: [6, 12, 11],
    par: 5,
    parNoWall: 3,
    solution: [
      { slider: 0, delta: -6 },
      { slider: 1, delta: -1 },
      { slider: 2, delta: -7 },
      { slider: 0, delta: -1 },
      { slider: 1, delta: -3 },
    ],
    generatorVersion: 0,
  },
];
