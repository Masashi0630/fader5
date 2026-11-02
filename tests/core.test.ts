import { describe, expect, it } from 'vitest';
import { det, inverse } from '../src/core/matrix';
import { profileForWeekday } from '../src/core/profiles';
import { hashString, mulberry32 } from '../src/core/rng';
import { bfsSolve, parNoWall } from '../src/core/solver';
import type { Puzzle } from '../src/core/types';
import { validatePuzzle } from '../src/core/validate';
import { SAMPLES } from './fixtures/samples';

describe('matrix', () => {
  it('det', () => {
    expect(det([[1]])).toBe(1);
    expect(
      det([
        [1, -1, -1],
        [0, 1, 0],
        [1, 0, 1],
      ]),
    ).toBeCloseTo(2);
    // 2行目 = 1行目 + 3行目 → 特異
    expect(
      det([
        [1, 1, 0],
        [1, 2, 1],
        [0, 1, 1],
      ]),
    ).toBe(0);
  });

  it('inverse で M·M⁻¹ = I', () => {
    const M = [
      [1, 1, 0, -2],
      [-1, 1, 1, 0],
      [-1, 0, 1, 1],
      [2, 0, -1, 1],
    ];
    const inv = inverse(M);
    for (let i = 0; i < 4; i++) {
      for (let k = 0; k < 4; k++) {
        const v = M[i].reduce((s, a, j) => s + a * inv[j][k], 0);
        expect(v).toBeCloseTo(i === k ? 1 : 0, 9);
      }
    }
  });
});

describe('rng', () => {
  it('mulberry32 は同じシードで同じ列、[0, 1) に収まる', () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    for (let i = 0; i < 1000; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    expect(mulberry32(124)()).not.toBe(mulberry32(123)());
  });

  it('hashString は FNV-1a(32bit)', () => {
    expect(hashString('')).toBe(0x811c9dc5);
    expect(hashString('a')).toBe(0xe40c292c);
    expect(hashString('foobar')).toBe(0xbf9cf968);
    expect(hashString('faders-v1-2026-12-01')).not.toBe(hashString('faders-v1-2026-12-02'));
  });
});

describe('profileForWeekday', () => {
  it('getUTCDay() の 0 が日曜', () => {
    expect(profileForWeekday(0).id).toBe('sun');
    expect(profileForWeekday(1).id).toBe('mon');
    expect(profileForWeekday(6).id).toBe('sat');
  });
});

describe('bfsSolve', () => {
  it.each(SAMPLES.map((p, i) => [i + 1, p] as const))('サンプル %i のパーと最短解', (_, p) => {
    const r = bfsSolve(p.matrix, p.start, p.band, p.max)!;
    expect(r.par).toBe(p.par);
    // 探索順が sim.mjs と同じなので、同じ解が出る
    expect(r.solution).toEqual(p.solution);
  });

  it('初期状態がクリアならパー 0', () => {
    const p = SAMPLES[0];
    expect(bfsSolve(p.matrix, [4, 5, 6], p.band, p.max)).toEqual({ par: 0, solution: [] });
  });

  it('連動なしなら本数ぶんの手数', () => {
    const M = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
    const r = bfsSolve(M, [0, 12, 5], { lo: 4, hi: 6 }, 12)!;
    expect(r.par).toBe(2);
    // 探索順(スライダー昇順・t 昇順)で最初に見つかる解: 0 を帯の下端へ、1 を帯の下端へ
    expect(r.solution).toEqual([
      { slider: 0, delta: 4 },
      { slider: 1, delta: -8 },
    ]);
  });

  it('maxDepth 手以内に解がなければ null', () => {
    const p = SAMPLES[2];
    expect(bfsSolve(p.matrix, p.start, p.band, p.max, p.par - 1)).toBeNull();
    expect(bfsSolve(p.matrix, p.start, p.band, p.max, p.par)?.par).toBe(p.par);
  });
});

describe('parNoWall', () => {
  it('サンプルの値と一致し、パー以下', () => {
    for (const p of SAMPLES) {
      const nw = parNoWall(p.matrix, p.start, p.band);
      expect(nw).toBe(p.parNoWall);
      expect(nw).toBeLessThanOrEqual(p.par);
    }
  });

  it('壁のせいで遠回りになる問題では par > parNoWall', () => {
    const p = SAMPLES[2];
    expect(p.par - parNoWall(p.matrix, p.start, p.band)).toBe(2);
  });
});

describe('validatePuzzle', () => {
  const base = SAMPLES[1];
  const broken = (patch: Partial<Puzzle>): Puzzle => ({ ...structuredClone(base), ...patch });

  it('正しい問題はエラーなし', () => {
    expect(validatePuzzle(base)).toEqual([]);
  });

  it('壊れた問題を検出する', () => {
    expect(validatePuzzle(broken({ par: 3 }))).not.toEqual([]);
    expect(validatePuzzle(broken({ parNoWall: 2 }))).not.toEqual([]);
    expect(validatePuzzle(broken({ solution: base.solution.slice(0, 3) }))).not.toEqual([]);
    expect(validatePuzzle(broken({ start: [4, 4, 12] }))).not.toEqual([]);
    expect(validatePuzzle(broken({ band: { lo: 3, hi: 6 } }))).not.toEqual([]);
    const m = structuredClone(base.matrix);
    m[0][0] = 2;
    expect(validatePuzzle(broken({ matrix: m }))).not.toEqual([]);
  });
});
