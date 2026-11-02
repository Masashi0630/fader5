import { describe, expect, it } from 'vitest';
import { GENERATOR_VERSION, generatePuzzle } from '../src/core/generator';
import { PROFILES, PROFILE_IDS } from '../src/core/profiles';
import { hashString } from '../src/core/rng';
import { validatePuzzle } from '../src/core/validate';

describe.each(PROFILE_IDS.map((id) => [id, PROFILES[id]] as const))('generatePuzzle(%s)', (id, profile) => {
  it('プロファイルの条件(本数・係数・パー範囲・遠回り下限・行列条件)を満たす', () => {
    for (let seed = 1; seed <= 8; seed++) {
      const p = generatePuzzle(profile, seed);
      expect(validatePuzzle(p, profile), `seed ${seed}`).toEqual([]);
      expect(p.profile).toBe(id);
      expect(p.generatorVersion).toBe(GENERATOR_VERSION);
      expect(p.seed).toBe(seed);
    }
  });

  it('決定的: 同じシード → 同じ問題', () => {
    const seed = hashString(`faders-v${GENERATOR_VERSION}-2026-12-01`);
    const a = generatePuzzle(profile, seed);
    expect(generatePuzzle(profile, seed)).toEqual(a);
    expect(a).toMatchSnapshot();
  });
});

it('シードが違えば別の問題になる', () => {
  const keys = new Set<string>();
  for (let seed = 1; seed <= 10; seed++) {
    const p = generatePuzzle(PROFILES.wed, seed);
    keys.add(JSON.stringify([p.matrix, p.start, p.band]));
  }
  expect(keys.size).toBe(10);
});
