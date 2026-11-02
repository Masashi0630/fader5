import { describe, expect, it } from 'vitest';
import { applyMove, isSolved, moveRange } from '../src/core/moves';
import { bfsSolve } from '../src/core/solver';
import { TUTORIAL } from '../src/tutorial/puzzles';

describe.each(TUTORIAL.map((p, i) => [i + 1, p] as const))('チュートリアル %i', (_, p) => {
  it('初期状態はクリアではなく、パーと解が BFS と一致する', () => {
    expect(isSolved(p.start, p.band)).toBe(false);
    const r = bfsSolve(p.matrix, p.start, p.band, p.max)!;
    expect(r.par).toBe(p.par);
    let x: readonly number[] = p.start;
    for (const m of p.solution) {
      const [tmin, tmax] = moveRange(p.matrix, x, m.slider, p.max);
      expect(m.delta).toBeGreaterThanOrEqual(tmin);
      expect(m.delta).toBeLessThanOrEqual(tmax);
      x = applyMove(p.matrix, x, m.slider, m.delta);
    }
    expect(isSolved(x, p.band)).toBe(true);
  });
});

it('ステップ3は、いきなり左を帯まで上げようとすると壁で止まる', () => {
  const p = TUTORIAL[2];
  const [, tmax] = moveRange(p.matrix, p.start, 0, p.max);
  expect(p.start[0] + tmax).toBeLessThan(p.band.lo);
});
