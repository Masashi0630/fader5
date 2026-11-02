import { describe, expect, it } from 'vitest';
import { applyMove, isInBand, isSolved, moveRange, moveRangeDetail } from '../src/core/moves';
import { mulberry32 } from '../src/core/rng';

const MAX = 12;

/** 対角 1、非対角 -2..2 のランダム行列とランダム状態 */
function randomCase(rnd: () => number, n: number) {
  const M = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : Math.floor(rnd() * 5) - 2)),
  );
  const x = Array.from({ length: n }, () => Math.floor(rnd() * (MAX + 1)));
  return { M, x };
}

const inRange = (x: number[]) => x.every((v) => v >= 0 && v <= MAX);

describe('moveRange', () => {
  it('連動なしなら自分の位置だけで決まる', () => {
    const M = [
      [1, 0],
      [0, 1],
    ];
    expect(moveRange(M, [5, 5], 0, MAX)).toEqual([-5, 7]);
  });

  it('正の係数: 相手が上の壁に先に当たる', () => {
    // 列 0 = (1, 2): スライダー0を1段上げるとスライダー1が2段上がる
    const M = [
      [1, 0],
      [2, 1],
    ];
    // 1 は t >= ceil(-5/2) = -2, t <= floor(7/2) = 3
    expect(moveRange(M, [5, 5], 0, MAX)).toEqual([-2, 3]);
  });

  it('負の係数: 向きが逆になる', () => {
    const M = [
      [1, 0],
      [-1, 1],
    ];
    // 1 は 10 から逆向きに動く: 上げると下がる → t <= 10、下げると上がる → t >= -2
    expect(moveRange(M, [5, 10], 0, MAX)).toEqual([-2, 7]);
    // 係数 -2: t >= ceil((12-3)/-2) = -4, t <= floor(-3/-2) = 1
    const M2 = [
      [1, 0],
      [-2, 1],
    ];
    expect(moveRange(M2, [5, 3], 0, MAX)).toEqual([-4, 1]);
  });

  it('係数 0 のスライダーは壁にいても影響しない', () => {
    const M = [
      [1, 0],
      [0, 1],
    ];
    expect(moveRange(M, [6, 0], 0, MAX)).toEqual([-6, 6]);
    expect(moveRange(M, [6, 12], 0, MAX)).toEqual([-6, 6]);
  });

  it('端にいると片側が 0 になる(−0 ではなく 0)', () => {
    const M = [
      [1, 0],
      [1, 1],
    ];
    const [lo, hi] = moveRange(M, [0, 4], 0, MAX);
    expect(Object.is(lo, 0)).toBe(true);
    expect(hi).toBe(8);
    expect(moveRange(M, [12, 4], 0, MAX)).toEqual([-4, 0]);
  });

  it('ランダムな行列・状態で、区間は 0 を含み、端の1つ外は壁を越える', () => {
    const rnd = mulberry32(42);
    for (let k = 0; k < 2000; k++) {
      const n = 3 + Math.floor(rnd() * 3);
      const { M, x } = randomCase(rnd, n);
      const j = Math.floor(rnd() * n);
      const [tmin, tmax] = moveRange(M, x, j, MAX);
      expect(tmin).toBeLessThanOrEqual(0);
      expect(tmax).toBeGreaterThanOrEqual(0);
      expect(inRange(applyMove(M, x, j, tmin))).toBe(true);
      expect(inRange(applyMove(M, x, j, tmax))).toBe(true);
      expect(inRange(applyMove(M, x, j, tmin - 1))).toBe(false);
      expect(inRange(applyMove(M, x, j, tmax + 1))).toBe(false);
    }
  });
});

describe('moveRangeDetail', () => {
  it('moveRange と同じ区間を返す', () => {
    const rnd = mulberry32(7);
    for (let k = 0; k < 500; k++) {
      const { M, x } = randomCase(rnd, 4);
      const j = Math.floor(rnd() * 4);
      const d = moveRangeDetail(M, x, j, MAX);
      expect([d.tmin, d.tmax]).toEqual(moveRange(M, x, j, MAX));
    }
  });

  it('ぶつかるスライダーと壁を返す', () => {
    // 列 0 = (1, -1, 2)
    const M = [
      [1, 0, 0],
      [-1, 1, 0],
      [2, 0, 1],
    ];
    // 上げる: 0 は 12 まで 6、1 は 0 まで 2、2 は 12 まで floor(4/2) = 2 → tmax = 2(1 が下、2 が上)
    // 下げる: 0 は 0 まで -6、1 は 12 まで -10、2 は 0 まで ceil(-8/2) = -4 → tmin = -4(2 が下)
    const d = moveRangeDetail(M, [6, 2, 8], 0, MAX);
    expect(d.tmin).toBe(-4);
    expect(d.tmax).toBe(2);
    expect(d.minBlockers).toEqual([{ slider: 2, wall: 'bottom' }]);
    expect(d.maxBlockers).toEqual([
      { slider: 1, wall: 'bottom' },
      { slider: 2, wall: 'top' },
    ]);
  });

  it('自分自身が壁にいるときは自分がぶつかる', () => {
    const M = [
      [1, 0],
      [0, 1],
    ];
    const d = moveRangeDetail(M, [12, 3], 0, MAX);
    expect(d.tmax).toBe(0);
    expect(d.maxBlockers).toEqual([{ slider: 0, wall: 'top' }]);
  });
});

describe('applyMove', () => {
  it('列 j の係数ぶんだけ全スライダーが動く', () => {
    const M = [
      [1, 1, 0],
      [-1, 1, 1],
      [-1, 0, 1],
    ];
    expect(applyMove(M, [6, 6, 12], 2, -4)).toEqual([6, 2, 8]);
    expect(applyMove(M, [6, 6, 12], 0, 3)).toEqual([9, 3, 9]);
  });

  it('元の配列を書き換えない', () => {
    const M = [
      [1, 0],
      [1, 1],
    ];
    const x = [3, 3];
    applyMove(M, x, 0, 2);
    expect(x).toEqual([3, 3]);
  });

  it('区間内の t なら必ず 0..MAX に収まる', () => {
    const rnd = mulberry32(99);
    for (let k = 0; k < 1000; k++) {
      const n = 3 + Math.floor(rnd() * 3);
      const { M, x } = randomCase(rnd, n);
      const j = Math.floor(rnd() * n);
      const [tmin, tmax] = moveRange(M, x, j, MAX);
      for (let t = tmin; t <= tmax; t++) expect(inRange(applyMove(M, x, j, t))).toBe(true);
    }
  });
});

describe('isInBand / isSolved', () => {
  const band = { lo: 4, hi: 6 };

  it('帯は両端を含む', () => {
    expect(isInBand(3, band)).toBe(false);
    expect(isInBand(4, band)).toBe(true);
    expect(isInBand(6, band)).toBe(true);
    expect(isInBand(7, band)).toBe(false);
  });

  it('全部が帯の中ならクリア', () => {
    expect(isSolved([4, 5, 6], band)).toBe(true);
    expect(isSolved([4, 5, 7], band)).toBe(false);
  });
});
