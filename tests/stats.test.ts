import { describe, expect, it } from 'vitest';
import { emptyStats, parseStats, recordResult, summarize, type DailyResult } from '../src/game/stats';
import { Stopwatch, formatClock } from '../src/game/stopwatch';

const win = (moves: number, par: number): DailyResult => ({ moves, par, timeMs: 60_000, gaveUp: false });
const lose = (par: number): DailyResult => ({ moves: 9, par, timeMs: 0, gaveUp: true });

function build(entries: [number, DailyResult][]) {
  return entries.reduce((s, [id, r]) => recordResult(s, id, r), emptyStats());
}

describe('stats', () => {
  it('同じ問題は2回記録しない', () => {
    const s = build([
      [1, win(3, 3)],
      [1, lose(3)],
    ]);
    expect(s.results[1].gaveUp).toBe(false);
    expect(summarize(s, 1).plays).toBe(1);
  });

  it('プレイ数・クリア数・最短との差の分布', () => {
    const s = build([
      [1, win(3, 3)],
      [2, win(5, 4)],
      [3, lose(4)],
      [4, win(9, 4)],
    ]);
    const sum = summarize(s, 4);
    expect(sum.plays).toBe(4);
    expect(sum.clears).toBe(3);
    expect(sum.distribution).toEqual([1, 1, 0, 0, 1]);
  });

  it('連続日数はギブアップと未プレイで切れる', () => {
    const s = build([
      [1, win(3, 3)],
      [2, win(3, 3)],
      [3, lose(3)],
      [4, win(3, 3)],
      [5, win(3, 3)],
      [6, win(3, 3)],
      [8, win(3, 3)],
    ]);
    expect(summarize(s, 8).currentStreak).toBe(1);
    expect(summarize(s, 8).maxStreak).toBe(3);
  });

  it('今日をまだ終えていなければ、昨日までの連続を数える', () => {
    const s = build([
      [4, win(3, 3)],
      [5, win(3, 3)],
    ]);
    expect(summarize(s, 6).currentStreak).toBe(2);
    expect(summarize(s, 7).currentStreak).toBe(0);
  });

  it('壊れた保存データは捨てる', () => {
    expect(parseStats(null)).toEqual(emptyStats());
    expect(parseStats('x')).toEqual(emptyStats());
    expect(parseStats({ results: { 1: { moves: 3, par: 3, gaveUp: false }, 2: { moves: 'a' }, x: {} } })).toEqual({
      results: { 1: { moves: 3, par: 3, timeMs: 0, gaveUp: false } },
    });
  });
});

describe('Stopwatch', () => {
  it('start / stop を繰り返すと止めていた間は数えない', () => {
    const w = new Stopwatch();
    expect(w.elapsed(100)).toBe(0);
    w.start(1000);
    expect(w.elapsed(3500)).toBe(2500);
    w.stop(4000);
    expect(w.elapsed(99_000)).toBe(3000);
    w.start(10_000);
    w.start(11_000); // 二重 start は無視
    expect(w.elapsed(12_000)).toBe(5000);
  });

  it('保存した経過時間から再開できる', () => {
    const w = new Stopwatch(65_000);
    w.start(0);
    expect(w.elapsed(1000)).toBe(66_000);
  });

  it('formatClock', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(7_900)).toBe('0:07');
    expect(formatClock(83_000)).toBe('1:23');
    expect(formatClock(3_723_000)).toBe('1:02:03');
  });
});
