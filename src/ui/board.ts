import { applyMove, isInBand, type Blocker, type MoveRangeDetail } from '../core/moves';
import type { Game } from '../game/game';
import { ja } from '../i18n/ja';

const SVG_NS = 'http://www.w3.org/2000/svg';

// 寸法は SVG のユーザー単位。表示サイズは viewBox ごと拡縮する
/**
 * 本数ごとの列幅(当たり判定もこの幅)と1段の高さ。
 * 本数が増えると横幅で縮むので、そのぶん縦に伸ばしてスマホ縦画面での1段の大きさをそろえる
 */
const LAYOUTS: Record<number, { col: number; step: number }> = {
  3: { col: 84, step: 30 },
  4: { col: 78, step: 34 },
  5: { col: 70, step: 38 },
};
const PAD_X = 10;
const LED_Y = 20;
const TOP = 50; // 値 max の y
const BOTTOM = 30;
const CAP_W = 44;
const CAP_H = 28;
const TICK_GAP = 25; // トラック中心から目盛りまで

type Column = { root: SVGGElement; handle: SVGGElement };

type Drag = {
  pointerId: number;
  slider: number;
  startClientY: number;
  pxPerStep: number;
  /** ドラッグ開始時の状態で計算した可動区間 */
  range: MoveRangeDetail;
  /** ドラッグ開始時からの段数 */
  t: number;
  clamped: 'min' | 'max' | null;
};

export type BoardEvents = {
  /** 状態が変わったとき(HUD の更新用) */
  onChange: () => void;
  /** 1回の操作(ドラッグ・キー入力)が終わったとき(クリア判定用) */
  onRelease: () => void;
  /** 1段動いたとき。newlyLit = 帯に入ったフェーダーが増えた(効果音用) */
  onStep?: (newlyLit: boolean) => void;
  /** 壁に当たって止まったとき(効果音用) */
  onBump?: () => void;
};

export class Board {
  readonly el: SVGSVGElement;
  private readonly game: Game;
  private readonly events: BoardEvents;
  private readonly cols: Column[] = [];
  private readonly step: number;
  private drag: Drag | null = null;
  /** 帯に入っているフェーダーのビット集合(新しく入ったかの判定用) */
  private litMask = 0;

  constructor(game: Game, events: BoardEvents) {
    this.game = game;
    this.events = events;
    const { n, max, band } = game.puzzle;
    const { col, step } = LAYOUTS[n] ?? LAYOUTS[3];
    this.step = step;
    const width = n * col + PAD_X * 2;
    const height = TOP + max * step + BOTTOM;
    const valueToY = (v: number) => TOP + (max - v) * step;

    this.el = svg('svg', {
      class: 'board',
      viewBox: `0 0 ${width} ${height}`,
      role: 'group',
      'aria-label': ja.boardLabel,
    });
    const tracks = svg('g', { class: 'layer-tracks' }, this.el);
    const bandLayer = svg('g', { class: 'layer-band' }, this.el);
    const handles = svg('g', { class: 'layer-handles' }, this.el);

    for (let j = 0; j < n; j++) {
      const left = PAD_X + col * j;
      const cx = left + col / 2;
      const root = svg(
        'g',
        {
          class: 'col',
          'data-slider': j,
          role: 'slider',
          tabindex: 0,
          'aria-label': ja.sliderLabel(j + 1),
          'aria-orientation': 'vertical',
          'aria-valuemin': 0,
          'aria-valuemax': max,
        },
        tracks,
      );
      svg('rect', { class: 'hit', x: left, y: 0, width: col, height }, root);
      svg('rect', { class: 'focus', x: left + 4, y: 4, width: col - 8, height: height - 8, rx: 10 }, root);
      svg('circle', { class: 'led', cx, cy: LED_Y, r: 5.5 }, root);
      svg('rect', { class: 'wall wall-top', x: cx - 15, y: TOP - 17, width: 30, height: 4, rx: 2 }, root);
      svg('rect', { class: 'track', x: cx - 3, y: TOP - 8, width: 6, height: max * step + 16, rx: 3 }, root);
      svg(
        'rect',
        { class: 'wall wall-bottom', x: cx - 15, y: valueToY(0) + 13, width: 30, height: 4, rx: 2 },
        root,
      );
      for (let v = 0; v <= max; v++) {
        const y = valueToY(v);
        const major = v % 6 === 0;
        const len = major ? 9 : 6;
        const cls = major ? 'tick major' : 'tick';
        svg('line', { class: cls, x1: cx - TICK_GAP, x2: cx - TICK_GAP - len, y1: y, y2: y }, root);
        svg('line', { class: cls, x1: cx + TICK_GAP, x2: cx + TICK_GAP + len, y1: y, y2: y }, root);
      }

      const handle = svg('g', { class: 'handle' }, handles);
      svg('rect', { class: 'cap', x: cx - CAP_W / 2, y: -CAP_H / 2, width: CAP_W, height: CAP_H, rx: 5 }, handle);
      svg('rect', { class: 'groove', x: cx - 14, y: -1, width: 28, height: 2, rx: 1 }, handle);
      svg('rect', { class: 'lamp', x: cx - 16, y: -4, width: 32, height: 8, rx: 4 }, handle);

      this.cols.push({ root, handle });
    }

    const bandTop = valueToY(band.hi) - step / 2;
    const bandBottom = valueToY(band.lo) + step / 2;
    svg('rect', { class: 'band', x: 4, y: bandTop, width: width - 8, height: bandBottom - bandTop, rx: 8 }, bandLayer);
    svg('line', { class: 'band-edge', x1: 4, x2: width - 4, y1: bandTop, y2: bandTop }, bandLayer);
    svg('line', { class: 'band-edge', x1: 4, x2: width - 4, y1: bandBottom, y2: bandBottom }, bandLayer);

    this.el.addEventListener('pointerdown', this.onPointerDown);
    this.el.addEventListener('pointermove', this.onPointerMove);
    this.el.addEventListener('pointerup', this.onPointerUp);
    this.el.addEventListener('pointercancel', this.onPointerUp);
    this.el.addEventListener('lostpointercapture', this.onPointerUp);
    this.el.addEventListener('keydown', this.onKeyDown);

    this.render();
  }

  /**
   * x を省くとゲームの現在の状態を描く(ギブアップの再生では途中の状態を渡す)。
   * 前回より帯に入ったフェーダーが増えたら true
   */
  render(x: readonly number[] = this.game.state): boolean {
    const { max, band } = this.game.puzzle;
    let mask = 0;
    this.cols.forEach((col, j) => {
      const y = TOP + (max - x[j]) * this.step;
      col.handle.style.transform = `translateY(${y}px)`;
      col.root.setAttribute('aria-valuenow', String(x[j]));
      const lit = isInBand(x[j], band);
      if (lit) mask |= 1 << j;
      col.root.classList.toggle('in', lit);
      col.handle.classList.toggle('in', lit);
    });
    this.el.classList.toggle('locked', this.game.finished);
    const newlyLit = (mask & ~this.litMask) !== 0;
    this.litMask = mask;
    return newlyLit;
  }

  /** Undo・リセットの前に呼び、進行中のドラッグを捨てる */
  cancelDrag(): void {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    if (this.el.hasPointerCapture(d.pointerId)) this.el.releasePointerCapture(d.pointerId);
    this.el.classList.remove('dragging');
    this.cols[d.slider].root.classList.remove('active');
  }

  /** ギブアップ: 初期状態から最短解を1段ずつ再生する */
  async playSolution(): Promise<void> {
    const { matrix, start, solution } = this.game.puzzle;
    let x = start.slice();
    this.render(x);
    await wait(400);
    for (const m of solution) {
      const dir = Math.sign(m.delta);
      for (let k = 0; k < Math.abs(m.delta); k++) {
        x = applyMove(matrix, x, m.slider, dir);
        this.render(x);
        await wait(80);
      }
      await wait(320);
    }
    this.render();
  }

  /** クリア演出: 左から順にフェーダーを光らせる */
  async celebrate(): Promise<void> {
    for (const col of this.cols) {
      col.root.classList.add('glow');
      col.handle.classList.add('glow');
      await wait(110);
    }
    this.el.classList.add('cleared');
    await wait(600);
  }

  private onPointerDown = (e: PointerEvent) => {
    if (this.drag || this.game.finished) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const root = (e.target as Element).closest<SVGGElement>('[data-slider]');
    const ctm = this.el.getScreenCTM();
    if (!root || !ctm) return;
    e.preventDefault();
    const j = Number(root.dataset.slider);
    root.focus({ preventScroll: true });
    this.el.setPointerCapture(e.pointerId);
    this.drag = {
      pointerId: e.pointerId,
      slider: j,
      startClientY: e.clientY,
      pxPerStep: this.step * ctm.d,
      range: this.game.range(j),
      t: 0,
      clamped: null,
    };
    this.el.classList.add('dragging', 'pointer');
    root.classList.add('active');
  };

  private onPointerMove = (e: PointerEvent) => {
    const d = this.drag;
    if (!d || e.pointerId !== d.pointerId) return;
    // ポインタの移動量 → 目標の段数 → 可動区間でクランプ(押し戻しや飽和はしない)
    const want = Math.round((d.startClientY - e.clientY) / d.pxPerStep);
    const { tmin, tmax } = d.range;
    const t = Math.min(tmax, Math.max(tmin, want));
    const clamped = want > tmax ? 'max' : want < tmin ? 'min' : null;
    if (clamped && clamped !== d.clamped) {
      this.bump(clamped === 'max' ? d.range.maxBlockers : d.range.minBlockers);
    }
    d.clamped = clamped;
    if (t !== d.t) {
      this.game.move(d.slider, t - d.t);
      d.t = t;
      const newlyLit = this.render();
      this.events.onChange();
      this.events.onStep?.(newlyLit);
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    if (!this.drag || e.pointerId !== this.drag.pointerId) return;
    this.cancelDrag();
    this.events.onRelease();
  };

  private onKeyDown = (e: KeyboardEvent) => {
    const root = (e.target as Element).closest<SVGGElement>('[data-slider]');
    if (!root) return;
    const j = Number(root.dataset.slider);
    this.el.classList.remove('pointer');
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      this.cols[j + (e.key === 'ArrowRight' ? 1 : -1)]?.root.focus();
      return;
    }
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    if (this.drag || this.game.finished) return;
    const delta = e.key === 'ArrowUp' ? 1 : -1;
    const range = this.game.range(j);
    if (delta > range.tmax) {
      this.bump(range.maxBlockers);
    } else if (delta < range.tmin) {
      this.bump(range.minBlockers);
    } else {
      this.game.move(j, delta);
      const newlyLit = this.render();
      this.events.onChange();
      this.events.onStep?.(newlyLit);
    }
    this.events.onRelease();
  };

  /** 壁に当たったスライダーを赤く点滅させる */
  private bump(blockers: readonly Blocker[]): void {
    for (const b of blockers) {
      const { root, handle } = this.cols[b.slider];
      for (const el of [root, handle]) {
        // 同じアニメーションを最初から再生し直すため、一度外してリフローさせる
        el.classList.remove('hit-top', 'hit-bottom');
        void el.getBoundingClientRect();
        el.classList.add(b.wall === 'top' ? 'hit-top' : 'hit-bottom');
      }
    }
    navigator.vibrate?.(15);
    this.events.onBump?.();
  }
}

function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>,
  parent?: Element,
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  parent?.appendChild(el);
  return el;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
