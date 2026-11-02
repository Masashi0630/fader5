import { EPOCH } from '../config';
import { GENERATOR_VERSION, generatePuzzle } from '../core/generator';
import { profileForWeekday } from '../core/profiles';
import { hashString } from '../core/rng';
import type { Puzzle } from '../core/types';
import { validatePuzzle } from '../core/validate';
import { datesInMonth, puzzleNumber, weekdayOf } from './date';

/** シード文字列の 'faders' は仮タイトル時代の名残。変えると全問題が変わるので、改名してもそのままにする */
export function dailySeed(date: string, version: number = GENERATOR_VERSION): number {
  return hashString(`faders-v${version}-${date}`);
}

/** その日のデイリー問題を作る(プロファイルは曜日で決まる) */
export function generateDaily(date: string): Puzzle {
  const puzzle = generatePuzzle(profileForWeekday(weekdayOf(date)), dailySeed(date));
  return { ...puzzle, id: puzzleNumber(date), date };
}

/** その月のファイルに入るべき日付(EPOCH より前の日は含まない) */
export function dailyDatesInMonth(month: string): string[] {
  return datesInMonth(month).filter((d) => d >= EPOCH);
}

/** 月ファイルの中身(JSON 文字列)。1行1問にして差分を見やすくする */
export function serializeMonth(puzzles: Puzzle[]): string {
  return `[\n${puzzles.map((p) => JSON.stringify(p)).join(',\n')}\n]\n`;
}

/**
 * 月ファイル(month = 'YYYY-MM')の中身を検証し、問題点を返す(空なら OK)。
 * 日付・番号・曜日プロファイルの対応、validatePuzzle(パーと解の再計算)、
 * さらに generatorVersion が現行なら再生成した結果と一致するか(=生成器を黙って変えていないか)を見る。
 */
export function verifyMonth(month: string, data: unknown): string[] {
  if (!Array.isArray(data)) return [`${month}: 配列ではない`];
  const expected = dailyDatesInMonth(month);
  const errors: string[] = [];
  if (data.length !== expected.length) {
    errors.push(`${month}: ${expected.length} 日分あるべきところ ${data.length} 件`);
  }
  data.forEach((p: Puzzle, i) => {
    const date = expected[i];
    const where = `${month}[${i}]`;
    if (!date) return;
    if (p.date !== date) {
      errors.push(`${where}: date が ${date} ではない: ${p.date}`);
      return;
    }
    const profile = profileForWeekday(weekdayOf(date));
    if (p.id !== puzzleNumber(date)) errors.push(`${date}: id が ${puzzleNumber(date)} ではない: ${p.id}`);
    if (p.profile !== profile.id) errors.push(`${date}: profile が ${profile.id} ではない: ${p.profile}`);
    for (const e of validatePuzzle(p, profile)) errors.push(`${date}: ${e}`);
    if (p.generatorVersion > GENERATOR_VERSION) {
      errors.push(`${date}: generatorVersion ${p.generatorVersion} が現行 ${GENERATOR_VERSION} より新しい`);
    } else if (p.generatorVersion === GENERATOR_VERSION) {
      const again = generateDaily(date);
      const same = (['matrix', 'band', 'start', 'par', 'parNoWall', 'solution'] as const).every(
        (k) => JSON.stringify(p[k]) === JSON.stringify(again[k]),
      );
      if (!same) errors.push(`${date}: 再生成した問題と違う(生成器を変えたなら generatorVersion を上げる)`);
    }
  });
  return errors;
}
