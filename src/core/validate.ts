import { BAND_WIDTH, MAX } from '../config';
import { det } from './matrix';
import { applyMove, isInBand, isSolved, moveRange } from './moves';
import type { Profile } from './profiles';
import { bfsSolve, parNoWall } from './solver';
import type { Puzzle } from './types';

/**
 * 問題データの妥当性を検証し、見つかった問題点を返す(空なら OK)。
 * パーと parNoWall は再計算して照合する。profile を渡すとその条件(本数・係数・パー範囲・遠回り)も見る。
 */
export function validatePuzzle(p: Puzzle, profile?: Profile): string[] {
  const errors: string[] = [];
  const { n, matrix, band, start } = p;

  if (p.max !== MAX) errors.push(`max が ${MAX} ではない: ${p.max}`);
  if (matrix.length !== n || matrix.some((row) => row.length !== n)) {
    errors.push('行列が n×n ではない');
    return errors;
  }
  if (start.length !== n) {
    errors.push('start の長さが n ではない');
    return errors;
  }
  for (let i = 0; i < n; i++) {
    if (matrix[i][i] !== 1) errors.push(`対角 M[${i}][${i}] が 1 ではない`);
  }
  for (let j = 0; j < n; j++) {
    let nonZero = 0;
    for (let i = 0; i < n; i++) {
      if (i === j) continue;
      const c = matrix[i][j];
      if (!Number.isInteger(c) || Math.abs(c) > 2) errors.push(`M[${i}][${j}] が -2..2 の整数ではない`);
      if (profile && c !== 0 && !profile.coefs.includes(c)) errors.push(`M[${i}][${j}] がプロファイルの係数にない`);
      if (c !== 0) nonZero++;
    }
    if (nonZero === 0) errors.push(`列 ${j} に非対角の非ゼロがない`);
  }
  if (Math.abs(det(matrix)) < 0.5) errors.push('|det(M)| < 0.5');

  if (band.hi - band.lo !== BAND_WIDTH - 1) errors.push('帯の幅が違う');
  if (band.lo < 2 || band.lo > 7) errors.push(`帯の lo が 2..7 ではない: ${band.lo}`);
  if (start.some((v) => !Number.isInteger(v) || v < 0 || v > p.max)) errors.push('start が 0..max の整数ではない');
  if (start.filter((v) => isInBand(v, band)).length > 1) errors.push('初期状態で帯に2本以上入っている');
  if (errors.length > 0) return errors;

  let x: readonly number[] = start;
  p.solution.forEach((m, k) => {
    const [tmin, tmax] = moveRange(matrix, x, m.slider, p.max);
    if (m.delta === 0 || m.delta < tmin || m.delta > tmax) {
      errors.push(`solution[${k}] が壁を越える、または 0 段`);
    } else {
      x = applyMove(matrix, x, m.slider, m.delta);
    }
  });
  if (!isSolved(x, band)) errors.push('solution を適用してもクリアにならない');
  if (p.solution.length !== p.par) errors.push(`solution の長さ ${p.solution.length} がパー ${p.par} と違う`);

  const solved = bfsSolve(matrix, start, band, p.max);
  if (!solved) errors.push('BFS で解けない');
  else if (solved.par !== p.par) errors.push(`パーが再計算と違う: ${p.par} != ${solved.par}`);
  const nw = parNoWall(matrix, start, band);
  if (nw !== p.parNoWall) errors.push(`parNoWall が再計算と違う: ${p.parNoWall} != ${nw}`);

  if (profile) {
    if (n !== profile.n) errors.push(`本数がプロファイルと違う: ${n}`);
    if (p.par < profile.par[0] || p.par > profile.par[1]) errors.push(`パー ${p.par} がプロファイルの範囲外`);
    if (p.par - p.parNoWall < profile.minDetour) errors.push('遠回りがプロファイルの下限未満');
  }
  return errors;
}
