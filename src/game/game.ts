import { applyMove, isSolved, moveRangeDetail, type MoveRangeDetail } from '../core/moves';
import type { Puzzle } from '../core/types';

/** 手数としてカウントされた1手(同じスライダーへの連続操作のまとまり)。Undo 用 */
type Turn = { slider: number; before: number[] };

export type GameStatus = 'playing' | 'cleared' | 'gaveUp';

/** 途中経過の保存・復元用 */
export type GameSnapshot = {
  x: number[];
  moves: number;
  last: number | null;
  turns: Turn[];
  status: GameStatus;
};

/**
 * 1問ぶんのプレイ状態。DOM 非依存。
 * 手数は「直前と違うスライダーを1段以上動かした時点」で増え、Undo やリセットでは減らない。
 */
export class Game {
  readonly puzzle: Puzzle;
  private x: number[];
  private turns: Turn[] = [];
  private moveCount = 0;
  private last: number | null = null;
  private st: GameStatus = 'playing';

  constructor(puzzle: Puzzle) {
    this.puzzle = puzzle;
    this.x = puzzle.start.slice();
  }

  /** 保存した途中経過から復元する。データが壊れていたら null */
  static restore(puzzle: Puzzle, snap: unknown): Game | null {
    if (!isSnapshot(snap, puzzle)) return null;
    const g = new Game(puzzle);
    g.x = snap.x.slice();
    g.moveCount = snap.moves;
    g.last = snap.last;
    g.turns = snap.turns.map((t) => ({ slider: t.slider, before: t.before.slice() }));
    g.st = snap.status;
    return g;
  }

  snapshot(): GameSnapshot {
    return {
      x: this.x.slice(),
      moves: this.moveCount,
      last: this.last,
      turns: this.turns.map((t) => ({ slider: t.slider, before: t.before.slice() })),
      status: this.st,
    };
  }

  get state(): readonly number[] {
    return this.x;
  }

  get moves(): number {
    return this.moveCount;
  }

  /** 直前に操作したスライダー。Undo・リセット後は null */
  get lastSlider(): number | null {
    return this.last;
  }

  get status(): GameStatus {
    return this.st;
  }

  /** クリアかギブアップで終わった。以後は動かせない */
  get finished(): boolean {
    return this.st !== 'playing';
  }

  get cleared(): boolean {
    return this.st === 'cleared';
  }

  get gaveUp(): boolean {
    return this.st === 'gaveUp';
  }

  get solved(): boolean {
    return isSolved(this.x, this.puzzle.band);
  }

  get canUndo(): boolean {
    return !this.finished && this.turns.length > 0;
  }

  range(j: number): MoveRangeDetail {
    const { matrix, max } = this.puzzle;
    return moveRangeDetail(matrix, this.x, j, max);
  }

  /**
   * スライダー j を現在の状態から delta 段動かす。動いたら true。
   * delta は range(j) の中であること(UI 側でクランプする)。
   */
  move(j: number, delta: number): boolean {
    if (this.finished || delta === 0) return false;
    const { tmin, tmax } = this.range(j);
    if (delta < tmin || delta > tmax) {
      throw new RangeError(`slider ${j}: delta ${delta} is outside [${tmin}, ${tmax}]`);
    }
    if (j !== this.last) {
      this.turns.push({ slider: j, before: this.x.slice() });
      this.moveCount++;
      this.last = j;
    }
    this.x = applyMove(this.puzzle.matrix, this.x, j, delta);
    return true;
  }

  /** 直前の1手を取り消す。手数は戻さない */
  undo(): boolean {
    if (!this.canUndo) return false;
    const turn = this.turns.pop()!;
    this.x = turn.before;
    this.last = null;
    return true;
  }

  /** 初期状態に戻す。手数は戻さない */
  reset(): void {
    if (this.finished) return;
    this.x = this.puzzle.start.slice();
    this.turns = [];
    this.last = null;
  }

  /** 1回の操作(ドラッグやキー入力)の終わりに呼ぶ。帯に揃っていればクリアを確定する */
  finish(): boolean {
    if (this.st === 'playing' && this.solved) this.st = 'cleared';
    return this.cleared;
  }

  /** ギブアップ。状態は最短解を適用した後(UI は初期状態から解を再生して見せる) */
  giveUp(): boolean {
    if (this.finished) return false;
    const { matrix, start, solution } = this.puzzle;
    this.x = solution.reduce((x, m) => applyMove(matrix, x, m.slider, m.delta), start.slice());
    this.turns = [];
    this.last = null;
    this.st = 'gaveUp';
    return true;
  }
}

function isSnapshot(s: unknown, puzzle: Puzzle): s is GameSnapshot {
  const { n, max } = puzzle;
  const isState = (v: unknown): v is number[] =>
    Array.isArray(v) && v.length === n && v.every((a) => Number.isInteger(a) && a >= 0 && a <= max);
  const isSlider = (v: unknown) => Number.isInteger(v) && (v as number) >= 0 && (v as number) < n;
  if (typeof s !== 'object' || s === null) return false;
  const o = s as Record<string, unknown>;
  return (
    isState(o.x) &&
    Number.isInteger(o.moves) &&
    (o.moves as number) >= 0 &&
    (o.last === null || isSlider(o.last)) &&
    Array.isArray(o.turns) &&
    o.turns.every((t: { slider?: unknown; before?: unknown }) => isSlider(t?.slider) && isState(t?.before)) &&
    (o.status === 'playing' || o.status === 'cleared' || o.status === 'gaveUp')
  );
}
