import { describe, expect, it } from 'vitest';
import { validatePuzzle } from '../src/core/validate';
import { SAMPLES } from './fixtures/samples';

describe('サンプル問題', () => {
  it.each(SAMPLES.map((p, i) => [i + 1, p] as const))('サンプル %i が妥当(パーと解を再計算して照合)', (_, p) => {
    expect(validatePuzzle(p)).toEqual([]);
  });
});
