import { BAND_WIDTH, MAX } from '../config';
import { det } from './matrix';
import { applyMove, isInBand, moveRange } from './moves';
import type { Profile } from './profiles';
import { mulberry32 } from './rng';
import { bfsSolve, parNoWall } from './solver';
import type { Band, Puzzle } from './types';

/** 生成アルゴリズムを変えたら上げる(公開済みのデイリーは再生成しない) */
export const GENERATOR_VERSION = 2;

/** 行列の作り直し回数の上限(sim.mjs と同じ)。超えたら候補ごと棄却 */
const MATRIX_TRIES = 1000;

/** 棄却サンプリングの上限。プロファイルの条件が厳しすぎるときの無限ループよけ */
const MAX_ATTEMPTS = 100_000;

type Candidate = { matrix: number[][]; band: Band; start: number[] };

/**
 * 対角 1、非対角は確率 p で coefs から一様に選ぶ(それ以外 0)。
 * 各列に非対角の非ゼロが1つ以上あり |det| >= 0.5 になるまで作り直す。
 */
export function generateMatrix(
  n: number,
  rnd: () => number,
  p: number,
  coefs: readonly number[],
): number[][] | null {
  for (let tries = 0; tries < MATRIX_TRIES; tries++) {
    const M = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => {
        if (i === j) return 1;
        return rnd() < p ? coefs[Math.floor(rnd() * coefs.length)] : 0;
      }),
    );
    let ok = true;
    for (let j = 0; j < n; j++) if (!M.some((row, i) => i !== j && row[j] !== 0)) ok = false;
    if (!ok) continue;
    if (Math.abs(det(M)) < 0.5) continue;
    return M;
  }
  return null;
}

/** 帯の中の解けた状態から、壁を守った操作でスクランブルした候補。帯内が2本以上なら null */
function scrambleCandidate(profile: Profile, rnd: () => number): Candidate | null {
  const { n } = profile;
  const matrix = generateMatrix(n, rnd, profile.p, profile.coefs);
  if (!matrix) return null;
  const lo = 2 + Math.floor(rnd() * 6);
  const band = { lo, hi: lo + BAND_WIDTH - 1 };
  let x = Array.from({ length: n }, () => lo + Math.floor(rnd() * BAND_WIDTH));
  let prev = -1;
  for (let s = 0; s < profile.scramble; s++) {
    let j: number;
    do {
      j = Math.floor(rnd() * n);
    } while (j === prev);
    const [tmin, tmax] = moveRange(matrix, x, j, MAX);
    const options: number[] = [];
    for (let t = tmin; t <= tmax; t++) if (Math.abs(t) >= 2) options.push(t);
    if (options.length === 0) continue;
    const t = options[Math.floor(rnd() * options.length)];
    x = applyMove(matrix, x, j, t);
    prev = j;
  }
  if (x.filter((v) => isInBand(v, band)).length > 1) return null;
  return { matrix, band, start: x };
}

/**
 * 逆スクランブル + 棄却サンプリングで問題を作る。同じ profile + seed なら常に同じ問題。
 * id は 0(デイリーは呼び出し側で付ける)。
 */
export function generatePuzzle(profile: Profile, seed: number): Puzzle {
  const rnd = mulberry32(seed);
  const [parMin, parMax] = profile.par;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const c = scrambleCandidate(profile, rnd);
    if (!c) continue;
    // parNoWall <= par なので、下限が範囲を超えていれば BFS を回すまでもなく棄却
    const nw = parNoWall(c.matrix, c.start, c.band);
    if (nw > parMax) continue;
    // パーが範囲を超える候補は採用しないので、BFS もそこで打ち切る
    const solved = bfsSolve(c.matrix, c.start, c.band, MAX, parMax);
    if (!solved) continue;
    const { par, solution } = solved;
    if (par < parMin || par - nw < profile.minDetour) continue;
    return {
      id: 0,
      profile: profile.id,
      n: profile.n,
      max: MAX,
      matrix: c.matrix,
      band: c.band,
      start: c.start,
      par,
      parNoWall: nw,
      solution,
      generatorVersion: GENERATOR_VERSION,
      seed,
    };
  }
  throw new Error(`generatePuzzle: no puzzle for profile ${profile.id} within ${MAX_ATTEMPTS} attempts`);
}
