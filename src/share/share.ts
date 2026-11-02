import { TITLE } from '../config';
import type { Band } from '../core/types';
import { formatClock } from '../game/stopwatch';
import { ja } from '../i18n/ja';

export type ShareInput = {
  id: number;
  moves: number;
  timeMs: number;
  gaveUp: boolean;
  band: Band;
  /** 終わったときの状態(クリアなら全部が帯の中) */
  final: readonly number[];
  url: string;
};

const KNOB = '🟩';
const EMPTY = '⬛';

/**
 * 最終形の並び: 帯を上・中・下の段で描き、各フェーダーを帯のどの高さで止めたかを示す。
 * 1列 = 1本、上の行が帯の上端。手順は伏せる。ギブアップは盤面なし。
 */
export function finalShape(final: readonly number[], band: Band): string[] {
  const rows: string[] = [];
  for (let v = band.hi; v >= band.lo; v--) rows.push(final.map((x) => (x === v ? KNOB : EMPTY)).join(''));
  return rows;
}

export function shareText(s: ShareInput): string {
  const result = s.gaveUp ? ja.shareGaveUp : ja.shareScore(s.moves, formatClock(s.timeMs));
  const rows = s.gaveUp ? [] : finalShape(s.final, s.band);
  return [`${TITLE} #${s.id}  ${result}`, ...rows, s.url].filter((line) => line !== '').join('\n');
}
