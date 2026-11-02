import { EPOCH } from '../config';

/**
 * 日付は 'YYYY-MM-DD' の文字列で扱う。日数差や曜日は Date.UTC で計算し、
 * タイムゾーンや DST の影響を受けないようにする。
 */

const DAY_MS = 86_400_000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** 端末のローカル日付 */
export function localDateString(d: Date): string {
  return formatDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function formatDate(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** 正しい日付なら [年, 月(1始まり), 日]、そうでなければ null */
export function parseDate(s: string): [y: number, m: number, d: number] | null {
  const match = DATE_RE.exec(s);
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const t = new Date(Date.UTC(y, m - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return null;
  return [y, m, d];
}

function dayIndex(s: string): number {
  const p = parseDate(s);
  if (!p) throw new RangeError(`invalid date: ${s}`);
  return Date.UTC(p[0], p[1] - 1, p[2]) / DAY_MS;
}

/** 問題番号。EPOCH が #1(EPOCH より前は 0 以下) */
export function puzzleNumber(date: string, epoch: string = EPOCH): number {
  return dayIndex(date) - dayIndex(epoch) + 1;
}

/** 0 = 日曜(getUTCDay と同じ) */
export function weekdayOf(date: string): number {
  return new Date(dayIndex(date) * DAY_MS).getUTCDay();
}

export function addDays(date: string, days: number): string {
  const t = new Date((dayIndex(date) + days) * DAY_MS);
  return formatDate(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/** 'YYYY-MM'(月ごとの問題ファイル名) */
export function monthOf(date: string): string {
  return date.slice(0, 7);
}

/** その月の日付をすべて返す。month は 'YYYY-MM' */
export function datesInMonth(month: string): string[] {
  const [y, m] = month.split('-').map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: days }, (_, i) => formatDate(y, m, i + 1));
}
