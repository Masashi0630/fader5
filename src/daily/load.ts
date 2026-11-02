import type { Puzzle } from '../core/types';
import { monthOf } from './date';

/** 同梱の public/daily/YYYY-MM.json からその日の問題を読む。なければ null */
export async function loadDaily(date: string): Promise<Puzzle | null> {
  try {
    const res = await fetch(`daily/${monthOf(date)}.json`);
    if (!res.ok) return null;
    // 開発サーバーはファイルがないと index.html を返すことがあるので、JSON でなければ「なし」
    const list = (await res.json()) as Puzzle[];
    return list.find((p) => p.date === date) ?? null;
  } catch {
    return null;
  }
}
