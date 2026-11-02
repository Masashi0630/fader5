import type { WeekdayProfileId } from './types';

/** 難易度設定。数値は CLAUDE.md §5 の表(generatorVersion 2: 毎日5本) */
export type Profile = {
  id: WeekdayProfileId;
  /** スライダー本数 */
  n: number;
  /** 非対角の係数の候補(一様に選ぶ) */
  coefs: number[];
  /** 非対角が非ゼロになる確率 */
  p: number;
  /** 逆スクランブルの回数 */
  scramble: number;
  /** 採用するパーの範囲(両端含む) */
  par: [min: number, max: number];
  /** 遠回り(par − parNoWall)の下限 */
  minDetour: number;
};

const PM1 = [-1, 1];
const PM2 = [-2, -1, 1, 2];

export const PROFILES: Record<WeekdayProfileId, Profile> = {
  mon: { id: 'mon', n: 5, coefs: PM1, p: 0.4, scramble: 16, par: [5, 5], minDetour: 0 },
  tue: { id: 'tue', n: 5, coefs: PM1, p: 0.45, scramble: 16, par: [5, 6], minDetour: 1 },
  wed: { id: 'wed', n: 5, coefs: PM2, p: 0.45, scramble: 16, par: [5, 6], minDetour: 1 },
  thu: { id: 'thu', n: 5, coefs: PM2, p: 0.45, scramble: 16, par: [5, 7], minDetour: 2 },
  fri: { id: 'fri', n: 5, coefs: PM2, p: 0.5, scramble: 16, par: [5, 7], minDetour: 2 },
  sat: { id: 'sat', n: 5, coefs: PM2, p: 0.45, scramble: 16, par: [5, 8], minDetour: 2 },
  sun: { id: 'sun', n: 5, coefs: PM2, p: 0.45, scramble: 18, par: [6, 8], minDetour: 2 },
};

/** 月曜始まりの表示順 */
export const PROFILE_IDS: readonly WeekdayProfileId[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/** getUTCDay() の値(0 = 日曜)→ プロファイル */
export function profileForWeekday(day: number): Profile {
  const ids: WeekdayProfileId[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return PROFILES[ids[day]];
}
