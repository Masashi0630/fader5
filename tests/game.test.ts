import { describe, expect, it } from 'vitest';
import type { Puzzle } from '../src/core/types';
import { Game } from '../src/game/game';

const puzzle: Puzzle = {
  id: 0,
  profile: 'sample',
  n: 3,
  max: 12,
  matrix: [
    [1, 1, 0],
    [-1, 1, 1],
    [-1, 0, 1],
  ],
  band: { lo: 3, hi: 5 },
  start: [6, 6, 12],
  par: 4,
  parNoWall: 3,
  solution: [
    { slider: 1, delta: 4 },
    { slider: 2, delta: -10 },
    { slider: 0, delta: -7 },
    { slider: 2, delta: -4 },
  ],
  generatorVersion: 0,
};

describe('Game の手数', () => {
  it('同じスライダーを続けて動かすのは1手', () => {
    const g = new Game(puzzle);
    g.move(2, -1);
    g.move(2, -1);
    g.move(2, 1);
    expect(g.moves).toBe(1);
    expect(g.lastSlider).toBe(2);
  });

  it('違うスライダーに触れたら +1、戻っても +1', () => {
    const g = new Game(puzzle);
    g.move(2, -2);
    g.move(0, 1);
    g.move(2, -1);
    expect(g.moves).toBe(3);
  });

  it('値が変わらない操作(0 段)は数えない', () => {
    const g = new Game(puzzle);
    expect(g.move(1, 0)).toBe(false);
    expect(g.moves).toBe(0);
    expect(g.lastSlider).toBeNull();
  });

  it('区間外の delta は例外', () => {
    const g = new Game(puzzle);
    // スライダー2は 12(上の壁)にいる
    expect(() => g.move(2, 1)).toThrow(RangeError);
    expect(g.moves).toBe(0);
  });

  it('連動して他のスライダーも動く', () => {
    const g = new Game(puzzle);
    g.move(0, 2);
    expect(g.state).toEqual([8, 4, 10]);
  });
});

describe('Game の Undo / リセット', () => {
  it('Undo は直前の1手(連続操作のまとまり)を戻し、手数は戻さない', () => {
    const g = new Game(puzzle);
    g.move(2, -3);
    const afterFirst = g.state.slice();
    g.move(0, 1);
    g.move(0, 1);
    expect(g.moves).toBe(2);
    expect(g.undo()).toBe(true);
    expect(g.state).toEqual(afterFirst);
    expect(g.moves).toBe(2);
  });

  it('Undo 後は直前のスライダーがリセットされ、同じスライダーでも新しい1手になる', () => {
    const g = new Game(puzzle);
    g.move(2, -3);
    g.move(0, 1);
    g.undo();
    expect(g.lastSlider).toBeNull();
    g.move(2, -1);
    expect(g.moves).toBe(3);
  });

  it('Undo を重ねると初期状態まで戻れ、それ以上は戻らない', () => {
    const g = new Game(puzzle);
    g.move(2, -3);
    g.move(0, 1);
    expect(g.undo()).toBe(true);
    expect(g.undo()).toBe(true);
    expect(g.state).toEqual(puzzle.start);
    expect(g.canUndo).toBe(false);
    expect(g.undo()).toBe(false);
  });

  it('リセットは初期状態に戻し、手数は戻さない', () => {
    const g = new Game(puzzle);
    g.move(2, -3);
    g.move(0, 1);
    g.reset();
    expect(g.state).toEqual(puzzle.start);
    expect(g.moves).toBe(2);
    expect(g.lastSlider).toBeNull();
    expect(g.canUndo).toBe(false);
    g.move(0, 1);
    expect(g.moves).toBe(3);
  });

  it('リセットしても puzzle.start は書き換わらない', () => {
    const g = new Game(puzzle);
    g.reset();
    g.move(2, -3);
    expect(puzzle.start).toEqual([6, 6, 12]);
  });
});

describe('Game のクリア', () => {
  it('解を適用して finish() するとクリアが確定し、以後は動かせない', () => {
    const g = new Game(puzzle);
    for (const m of puzzle.solution) g.move(m.slider, m.delta);
    expect(g.solved).toBe(true);
    expect(g.cleared).toBe(false);
    expect(g.finish()).toBe(true);
    expect(g.cleared).toBe(true);
    expect(g.moves).toBe(puzzle.par);
    expect(g.move(0, 1)).toBe(false);
    expect(g.canUndo).toBe(false);
  });

  it('帯に揃っていなければ finish() してもクリアにならない', () => {
    const g = new Game(puzzle);
    g.move(1, 4);
    expect(g.finish()).toBe(false);
    expect(g.cleared).toBe(false);
  });

  it('ドラッグ中に一瞬揃っても、離したときに外れていればクリアではない', () => {
    const g = new Game(puzzle);
    for (const m of puzzle.solution) g.move(m.slider, m.delta);
    expect(g.solved).toBe(true);
    g.move(2, -1); // 同じスライダーのまま帯から出す
    expect(g.finish()).toBe(false);
  });
});

describe('Game のギブアップ', () => {
  it('最短解を適用した状態で終わり、以後は動かせない。手数は変えない', () => {
    const g = new Game(puzzle);
    g.move(2, -1);
    expect(g.giveUp()).toBe(true);
    expect(g.status).toBe('gaveUp');
    expect(g.finished).toBe(true);
    expect(g.cleared).toBe(false);
    expect(g.solved).toBe(true);
    expect(g.moves).toBe(1);
    expect(g.move(0, 1)).toBe(false);
    expect(g.canUndo).toBe(false);
    expect(g.finish()).toBe(false);
  });

  it('クリア後はギブアップできない', () => {
    const g = new Game(puzzle);
    for (const m of puzzle.solution) g.move(m.slider, m.delta);
    g.finish();
    expect(g.giveUp()).toBe(false);
    expect(g.status).toBe('cleared');
  });
});

describe('Game の保存と復元', () => {
  it('snapshot → restore で同じ状態に戻る(Undo も続けられる)', () => {
    const g = new Game(puzzle);
    g.move(2, -3);
    g.move(0, 1);
    const snap = JSON.parse(JSON.stringify(g.snapshot()));
    const r = Game.restore(puzzle, snap)!;
    expect(r.state).toEqual(g.state);
    expect(r.moves).toBe(2);
    expect(r.lastSlider).toBe(0);
    // 同じスライダーの続きは同じ手
    r.move(0, 1);
    expect(r.moves).toBe(2);
    r.undo();
    expect(r.state).toEqual([6, 3, 9]);
  });

  it('終わった状態も復元できる', () => {
    const g = new Game(puzzle);
    g.giveUp();
    const r = Game.restore(puzzle, g.snapshot())!;
    expect(r.gaveUp).toBe(true);
    expect(r.move(0, 1)).toBe(false);
  });

  it('壊れたデータや別の問題のデータは null', () => {
    const g = new Game(puzzle);
    g.move(2, -3);
    const snap = g.snapshot();
    expect(Game.restore(puzzle, null)).toBeNull();
    expect(Game.restore(puzzle, { ...snap, x: [1, 2] })).toBeNull();
    expect(Game.restore(puzzle, { ...snap, x: [1, 2, 13] })).toBeNull();
    expect(Game.restore(puzzle, { ...snap, moves: -1 })).toBeNull();
    expect(Game.restore(puzzle, { ...snap, last: 3 })).toBeNull();
    expect(Game.restore(puzzle, { ...snap, status: 'won' })).toBeNull();
    expect(Game.restore({ ...puzzle, n: 4 }, snap)).toBeNull();
  });
});
