import { describe, expect, it } from 'vitest';
import { EPOCH } from '../src/config';
import { GENERATOR_VERSION } from '../src/core/generator';
import { hashString } from '../src/core/rng';
import { dailyDatesInMonth, dailySeed, generateDaily, verifyMonth } from '../src/daily/daily';

describe('generateDaily', () => {
  it('番号・日付・曜日プロファイル・シードが決まる', () => {
    const p = generateDaily(EPOCH);
    expect(p.id).toBe(1);
    expect(p.date).toBe(EPOCH);
    expect(p.profile).toBe('mon'); // 2026-11-02 は月曜
    expect(p.seed).toBe(hashString(`faders-v${GENERATOR_VERSION}-${EPOCH}`));
    expect(dailySeed(EPOCH)).toBe(p.seed);
    expect(generateDaily(EPOCH)).toEqual(p);
  });

  it('日曜は日曜のプロファイル', () => {
    expect(generateDaily('2026-11-08').profile).toBe('sun');
  });
});

describe('verifyMonth', () => {
  const month = '2026-11';
  const puzzles = dailyDatesInMonth(month).map(generateDaily);

  it('EPOCH より前の日は含めない', () => {
    expect(puzzles[0].date).toBe('2026-11-02');
    expect(puzzles).toHaveLength(29);
  });

  it('生成したままの月はエラーなし', () => {
    expect(verifyMonth(month, puzzles)).toEqual([]);
  });

  it('改変・欠け・取り違えを検出する', () => {
    const clone = () => structuredClone(puzzles);
    const changedPar = clone();
    changedPar[3].par += 1;
    expect(verifyMonth(month, changedPar).length).toBeGreaterThan(0);

    const missing = clone();
    missing.splice(5, 1);
    expect(verifyMonth(month, missing).length).toBeGreaterThan(0);

    const wrongId = clone();
    wrongId[0].id = 2;
    expect(verifyMonth(month, wrongId)).toEqual([expect.stringContaining('id')]);

    // 解としては正しいが、生成器の出力と違う(=生成器を黙って変えた)
    const tampered = clone();
    const other = generateDaily('2026-11-09'); // 同じ月曜プロファイル
    Object.assign(tampered[0], {
      matrix: other.matrix,
      band: other.band,
      start: other.start,
      par: other.par,
      parNoWall: other.parNoWall,
      solution: other.solution,
    });
    expect(verifyMonth(month, tampered)).toEqual([expect.stringContaining('再生成')]);

    expect(verifyMonth(month, { not: 'array' })).toHaveLength(1);
  });
});
