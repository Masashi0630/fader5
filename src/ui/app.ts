import { EPOCH, TITLE } from '../config';
import { PROFILES, PROFILE_IDS } from '../core/profiles';
import type { Puzzle, WeekdayProfileId } from '../core/types';
import { parseDate, puzzleNumber, weekdayOf } from '../daily/date';
import { loadDaily } from '../daily/load';
import { Game } from '../game/game';
import { recordResult, summarize } from '../game/stats';
import { Stopwatch, formatClock } from '../game/stopwatch';
import { ja } from '../i18n/ja';
import { shareText } from '../share/share';
import { SITE_URL } from '../site';
import {
  loadProgress,
  loadSettings,
  loadStats,
  pruneProgress,
  saveProgress,
  saveSettings,
  saveStats,
  type Settings,
} from '../storage/storage';
import { TUTORIAL } from '../tutorial/puzzles';
import { PuzzleGenerator, randomSeed } from '../workers/client';
import { Board } from './board';
import { Sound } from './sound';

/** いま遊んでいる問題の出どころ */
export type Source =
  | { kind: 'daily'; date: string }
  /** seed を省くと新しいランダム問題 */
  | { kind: 'practice'; profile: WeekdayProfileId; seed?: number }
  | { kind: 'tutorial'; step: number };

export type AppOptions = {
  source: Source;
  /** 端末のローカル日付 'YYYY-MM-DD' */
  today: string;
  debug: boolean;
};

type ResultAction = { label: string; run: () => void };

export class App {
  private readonly today: string;
  private readonly settings: Settings;
  private readonly sound: Sound;
  private readonly generator = new PuzzleGenerator();
  private source: Source;
  private game: Game | null = null;
  private board: Board | null = null;
  private stopwatch = new Stopwatch();
  /** 生成・読み込み中に別の問題を選んだら古い結果を捨てるための番号 */
  private loadToken = 0;
  private giveUpMode: 'giveUp' | 'result' | null = null;
  private resultActions: [secondary: ResultAction, primary: ResultAction] | null = null;
  private toastTimer = 0;

  private readonly root: HTMLElement;
  private readonly labelEl: HTMLElement;
  private readonly movesEl: HTMLElement;
  private readonly timeEl: HTMLElement;
  private readonly stageEl: HTMLElement;
  private readonly undoBtn: HTMLButtonElement;
  private readonly resetBtn: HTMLButtonElement;
  private readonly giveUpBtn: HTMLButtonElement;
  private readonly resultDlg: HTMLDialogElement;
  private readonly menuDlg: HTMLDialogElement;
  private readonly confirmDlg: HTMLDialogElement;
  private readonly toastEl: HTMLElement;
  private readonly debugEl: HTMLPreElement | null;

  constructor(root: HTMLElement, opts: AppOptions) {
    this.root = root;
    this.today = opts.today;
    this.source = opts.source;
    this.settings = loadSettings();
    this.sound = new Sound(this.settings.muted);

    const todayId = puzzleNumber(this.today);
    const practiceItems = PROFILE_IDS.map((id) => {
      const p = PROFILES[id];
      return `<button type="button" class="menu-item" data-practice="${id}">
          <span class="menu-name">${ja.weekday[id]}</span>
          <span class="menu-meta">${ja.profileMeta(p.n, p.par[0], p.par[1])}</span>
        </button>`;
    }).join('');

    root.innerHTML = `
      <div class="app">
        <header class="hud">
          <div class="hud-title">
            <span class="logo">${TITLE}</span>
            <span class="label" data-ref="label"></span>
          </div>
          <div class="hud-stats">
            <div class="stat"><span class="stat-label">${ja.moves}</span><span class="stat-value" data-ref="moves"></span></div>
            <div class="stat stat-time"><span class="stat-label">${ja.time}</span><span class="stat-value" data-ref="time"></span></div>
          </div>
        </header>
        <main class="stage" data-ref="stage"></main>
        <footer class="controls">
          <button type="button" class="tool" data-ref="undo">${icon('undo')}<span>${ja.undo}</span></button>
          <button type="button" class="tool" data-ref="reset">${icon('reset')}<span>${ja.reset}</span></button>
          <button type="button" class="tool" data-ref="giveUp"></button>
          <button type="button" class="tool" data-ref="menu">${icon('menu')}<span>${ja.menu}</span></button>
        </footer>
      </div>
      <dialog class="modal" data-ref="result">
        <button type="button" class="modal-close" data-close aria-label="${ja.close}">${icon('close')}</button>
        <h2 class="modal-title" data-ref="resultTitle"></h2>
        <p class="result-score" data-ref="score"></p>
        <p class="result-note" data-ref="note"></p>
        <div class="result-stats" data-ref="stats"></div>
        <div class="modal-actions">
          <button type="button" class="btn" data-ref="resultSecondary"></button>
          <button type="button" class="btn primary" data-ref="resultPrimary"></button>
        </div>
      </dialog>
      <dialog class="modal" data-ref="menuDlg">
        <button type="button" class="modal-close" data-close aria-label="${ja.close}">${icon('close')}</button>
        <h2 class="modal-title">${ja.menuTitle}</h2>
        <p class="menu-heading">${ja.dailyHeading}</p>
        <div class="menu-list">
          <button type="button" class="menu-item" data-daily>
            <span class="menu-name">${todayId >= 1 ? ja.dailyItem(todayId) : '—'}</span>
            <span class="menu-meta">${dateText(this.today)}</span>
          </button>
        </div>
        <p class="menu-heading">${ja.practiceHeading}</p>
        <div class="menu-list">${practiceItems}</div>
        <div class="menu-tools">
          <button type="button" class="btn" data-ref="openHelp">${ja.help}</button>
          <button type="button" class="btn" data-ref="openTutorial">${ja.menuTutorial}</button>
          <button type="button" class="btn" data-ref="toggleSound" aria-pressed="false"></button>
        </div>
      </dialog>
      <dialog class="modal" data-ref="helpDlg">
        <h2 class="modal-title">${ja.helpTitle}</h2>
        <ul class="help-list">${ja.helpItems.map((s) => `<li>${s}</li>`).join('')}</ul>
        <div class="modal-actions">
          <button type="button" class="btn primary" data-close>${ja.close}</button>
        </div>
      </dialog>
      <dialog class="modal" data-ref="confirm">
        <h2 class="modal-title">${ja.giveUpTitle}</h2>
        <p class="confirm-body" data-ref="confirmBody"></p>
        <div class="modal-actions">
          <button type="button" class="btn" data-close>${ja.cancel}</button>
          <button type="button" class="btn danger" data-ref="confirmGiveUp">${ja.giveUp}</button>
        </div>
      </dialog>
      <div class="toast" data-ref="toast" role="status" aria-live="polite"></div>
      ${opts.debug ? '<pre class="debug" data-ref="debug"></pre>' : ''}
    `;
    this.labelEl = this.ref('label');
    this.movesEl = this.ref('moves');
    this.timeEl = this.ref('time');
    this.stageEl = this.ref('stage');
    this.undoBtn = this.ref('undo');
    this.resetBtn = this.ref('reset');
    this.giveUpBtn = this.ref('giveUp');
    this.resultDlg = this.ref('result');
    this.menuDlg = this.ref('menuDlg');
    this.confirmDlg = this.ref('confirm');
    this.toastEl = this.ref('toast');
    this.debugEl = opts.debug ? this.ref('debug') : null;
    const helpDlg = this.ref<HTMLDialogElement>('helpDlg');

    // どのダイアログも、[data-close] か背景のタップで閉じる
    for (const dlg of root.querySelectorAll('dialog')) {
      dlg.addEventListener('click', (e) => {
        if (e.target === dlg || (e.target as Element).closest('[data-close]')) dlg.close();
      });
    }

    this.undoBtn.addEventListener('click', () => {
      this.board?.cancelDrag();
      if (this.game?.undo()) {
        this.refresh();
        this.persist();
      }
    });
    this.resetBtn.addEventListener('click', () => {
      this.board?.cancelDrag();
      this.game?.reset();
      this.refresh();
      this.persist();
    });
    this.giveUpBtn.addEventListener('click', () => {
      if (!this.game) return;
      if (this.game.finished) {
        this.showResult();
        return;
      }
      this.ref('confirmBody').textContent = this.isTodayDaily() ? ja.giveUpBodyDaily : ja.giveUpBody;
      this.confirmDlg.showModal();
    });
    this.ref('confirmGiveUp').addEventListener('click', () => {
      this.confirmDlg.close();
      void this.giveUp();
    });
    this.ref('menu').addEventListener('click', () => this.openMenu());
    this.ref('openHelp').addEventListener('click', () => {
      this.menuDlg.close();
      helpDlg.showModal();
    });
    this.ref('openTutorial').addEventListener('click', () => {
      this.menuDlg.close();
      void this.open({ kind: 'tutorial', step: 0 });
    });
    const soundBtn = this.ref('toggleSound');
    const showSound = () => {
      soundBtn.textContent = this.sound.muted ? ja.soundOff : ja.soundOn;
      soundBtn.setAttribute('aria-pressed', String(!this.sound.muted));
    };
    showSound();
    soundBtn.addEventListener('click', () => {
      this.sound.muted = !this.sound.muted;
      this.settings.muted = this.sound.muted;
      saveSettings(this.settings);
      this.sound.unlock();
      showSound();
    });
    // 音はユーザー操作の中でないと鳴らし始められない
    for (const type of ['pointerdown', 'keydown'] as const) {
      document.addEventListener(type, () => this.sound.unlock(), { capture: true });
    }
    this.menuDlg.addEventListener('click', (e) => {
      const btn = (e.target as Element).closest<HTMLButtonElement>('button[data-practice], button[data-daily]');
      if (!btn) return;
      this.menuDlg.close();
      const { practice } = btn.dataset;
      if (practice) void this.open({ kind: 'practice', profile: practice as WeekdayProfileId });
      else void this.open({ kind: 'daily', date: this.today });
    });
    this.ref('resultSecondary').addEventListener('click', () => this.resultActions?.[0].run());
    this.ref('resultPrimary').addEventListener('click', () => this.resultActions?.[1].run());

    // 画面が隠れている間は時計を止め、途中経過を保存しておく
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.stopwatch.stop(performance.now());
        this.persist();
      } else {
        this.resumeClock();
      }
    });
    window.addEventListener('pagehide', () => this.persist());
    window.setInterval(() => this.updateClock(), 250);

    if (todayId >= 1) pruneProgress(todayId - 7);
    void this.open(this.source);
  }

  private ref<T extends HTMLElement>(name: string): T {
    return this.root.querySelector<T>(`[data-ref="${name}"]`)!;
  }

  // ---- 問題の切り替え ----

  private async open(source: Source): Promise<void> {
    const token = ++this.loadToken;
    this.source = source;
    if (source.kind === 'tutorial') {
      this.labelEl.textContent = ja.tutorialLabel(source.step + 1, TUTORIAL.length);
      this.start(TUTORIAL[source.step]);
      return;
    }
    if (source.kind === 'practice') {
      this.labelEl.textContent = ja.practiceLabel(source.profile, PROFILES[source.profile].n);
      this.showMessage(ja.generating);
      try {
        const puzzle = await this.generator.generate(source.profile, source.seed ?? randomSeed());
        if (token !== this.loadToken) return;
        this.start({ ...puzzle, profile: `practice-${source.profile}` });
      } catch (err) {
        if (token !== this.loadToken) return;
        console.error(err);
        this.showMessage(ja.generateFailed);
      }
      return;
    }

    const id = puzzleNumber(source.date);
    this.labelEl.textContent = id >= 1 ? ja.dailyLabel(id, dateText(source.date)) : dateText(source.date);
    if (source.date < EPOCH) {
      this.showMessage(ja.beforeEpoch, true);
      return;
    }
    this.showMessage(ja.loading);
    const puzzle = await loadDaily(source.date);
    if (token !== this.loadToken) return;
    if (!puzzle) this.showMessage(ja.noDaily, true);
    else this.start(puzzle);
  }

  private start(puzzle: Puzzle): void {
    this.board?.cancelDrag();
    let game = new Game(puzzle);
    let elapsed = 0;
    if (this.isTodayDailyPuzzle(puzzle)) {
      const saved = loadProgress(puzzle.id, puzzleKey(puzzle));
      const restored = saved && Game.restore(puzzle, saved.game);
      if (restored) {
        game = restored;
        elapsed = saved.elapsedMs;
      }
    }
    this.game = game;
    this.stopwatch = new Stopwatch(elapsed);
    this.resumeClock();
    this.board = new Board(game, {
      onChange: () => this.onChange(),
      onRelease: () => void this.onRelease(),
      onStep: (newlyLit) => (newlyLit ? this.sound.lit() : this.sound.tick()),
      onBump: () => this.sound.bump(),
    });
    const s = this.source;
    if (s.kind === 'tutorial') this.stageEl.replaceChildren(this.coach(s.step, false), this.board.el);
    else this.stageEl.replaceChildren(this.board.el);
    this.refresh();
    this.syncUrl(puzzle);
    if (game.finished) this.showResult();
  }

  /** 生成中・読み込み中・問題がないとき。盤面を消して文言(と練習への導線)を出す */
  private showMessage(text: string, practiceCta = false): void {
    this.board?.cancelDrag();
    this.game = null;
    this.board = null;
    this.stopwatch = new Stopwatch();
    const p = document.createElement('p');
    p.className = 'stage-msg';
    p.textContent = text;
    const nodes: HTMLElement[] = [p];
    if (practiceCta) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn primary';
      btn.textContent = ja.goPractice;
      btn.addEventListener('click', () => this.openMenu());
      nodes.push(btn);
    }
    this.stageEl.replaceChildren(...nodes);
    this.refreshHud();
  }

  private openMenu(): void {
    const s = this.source;
    for (const btn of this.menuDlg.querySelectorAll<HTMLButtonElement>('button[data-practice], button[data-daily]')) {
      const current = s.kind === 'practice' ? btn.dataset.practice === s.profile : btn.dataset.daily !== undefined;
      btn.classList.toggle('current', current);
      if (current) btn.setAttribute('aria-current', 'true');
      else btn.removeAttribute('aria-current');
    }
    this.menuDlg.showModal();
  }

  /** リロードしても同じ問題が開くように URL を合わせる(練習はシードを残す) */
  private syncUrl(puzzle: Puzzle): void {
    const params = new URLSearchParams(location.search);
    params.delete('practice');
    params.delete('seed');
    const s = this.source;
    if (s.kind !== 'daily') params.delete('date');
    if (s.kind === 'practice') {
      params.set('practice', s.profile);
      if (puzzle.seed !== undefined) params.set('seed', String(puzzle.seed));
    }
    const query = params.toString();
    history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}`);
  }

  /** 記録と途中経過の保存は「今日の」デイリーだけ(?date= で開いた別の日は残さない) */
  private isTodayDaily(): boolean {
    return this.source.kind === 'daily' && this.source.date === this.today;
  }

  private isTodayDailyPuzzle(puzzle: Puzzle): boolean {
    return this.isTodayDaily() && puzzle.date === this.today;
  }

  // ---- プレイ中 ----

  private onChange(): void {
    this.resumeClock();
    this.refreshHud();
  }

  private async onRelease(): Promise<void> {
    const game = this.game;
    const board = this.board;
    if (!game || !board || game.finished) return;
    if (!game.finish()) {
      this.persist();
      return;
    }
    this.endGame();
    this.sound.clear();
    await board.celebrate();
    if (game !== this.game) return;
    const s = this.source;
    if (s.kind === 'tutorial') this.stageEl.firstElementChild?.replaceWith(this.coach(s.step, true));
    else this.showResult();
  }

  /** チュートリアルの説明。done ならお祝いと「次へ」 */
  private coach(step: number, done: boolean): HTMLElement {
    const el = document.createElement('div');
    el.className = done ? 'coach done' : 'coach';
    const last = step === TUTORIAL.length - 1;
    const text = done ? `${ja.tutorialDone[step]}${last ? ja.tutorialFinal : ''}` : ja.tutorialSteps[step];
    const p = document.createElement('p');
    p.className = 'coach-text';
    p.textContent = text;
    el.append(p);
    const actions = document.createElement('div');
    actions.className = 'coach-actions';
    const button = (label: string, cls: string, run: () => void) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = cls;
      b.textContent = label;
      b.addEventListener('click', run);
      actions.append(b);
    };
    if (done && !last) button(ja.tutorialNext, 'btn primary', () => void this.open({ kind: 'tutorial', step: step + 1 }));
    else if (done) button(ja.tutorialStart, 'btn primary', () => this.finishTutorial());
    else button(ja.tutorialSkip, 'link', () => this.finishTutorial());
    el.append(actions);
    return el;
  }

  private finishTutorial(): void {
    this.settings.tutorialDone = true;
    saveSettings(this.settings);
    void this.open({ kind: 'daily', date: this.today });
  }

  private async giveUp(): Promise<void> {
    const game = this.game;
    const board = this.board;
    if (!game || !board || !game.giveUp()) return;
    board.cancelDrag();
    this.endGame();
    await board.playSolution();
    if (game === this.game) this.showResult();
  }

  /** クリア・ギブアップ共通: 時計を止め、保存し、デイリーの記録を付ける */
  private endGame(): void {
    const game = this.game!;
    this.stopwatch.stop(performance.now());
    this.persist();
    if (this.isTodayDailyPuzzle(game.puzzle)) {
      const { moves, puzzle, gaveUp } = game;
      const timeMs = this.stopwatch.elapsed(performance.now());
      saveStats(recordResult(loadStats(), puzzle.id, { moves, par: puzzle.par, timeMs, gaveUp }));
    }
    this.refresh();
  }

  private persist(): void {
    const game = this.game;
    if (!game || !this.isTodayDailyPuzzle(game.puzzle)) return;
    saveProgress(game.puzzle.id, {
      puzzleKey: puzzleKey(game.puzzle),
      game: game.snapshot(),
      elapsedMs: this.stopwatch.elapsed(performance.now()),
    });
  }

  /** 1手目を指してから、終わるまで(画面が見えている間だけ)時計を進める */
  private resumeClock(): void {
    const game = this.game;
    if (this.source.kind === 'tutorial') return;
    if (game && game.moves > 0 && !game.finished && !document.hidden) this.stopwatch.start(performance.now());
  }

  private updateClock(): void {
    const text = formatClock(this.stopwatch.elapsed(performance.now()));
    if (this.timeEl.textContent !== text) this.timeEl.textContent = text;
  }

  private refresh(): void {
    this.board?.render();
    this.refreshHud();
  }

  private refreshHud(): void {
    const game = this.game;
    this.movesEl.textContent = game ? String(game.moves) : '–';
    this.updateClock();
    this.undoBtn.disabled = !game?.canUndo;
    this.resetBtn.disabled = !game || game.finished;
    this.giveUpBtn.disabled = !game || this.source.kind === 'tutorial';
    const mode = game?.finished ? 'result' : 'giveUp';
    if (mode !== this.giveUpMode) {
      this.giveUpMode = mode;
      this.giveUpBtn.innerHTML =
        mode === 'result' ? `${icon('result')}<span>${ja.result}</span>` : `${icon('flag')}<span>${ja.giveUp}</span>`;
    }
    if (this.debugEl) this.debugEl.textContent = game ? debugText(game) : '';
  }

  // ---- 結果 ----

  private showResult(): void {
    const game = this.game;
    if (!game?.finished) return;
    const { puzzle, moves } = game;
    const time = formatClock(this.stopwatch.elapsed(performance.now()));
    this.ref('resultTitle').textContent = game.cleared ? ja.clearTitle : ja.gaveUpTitle;
    this.ref('score').textContent = game.cleared ? ja.resultScore(moves, time) : ja.shortest(puzzle.par);
    this.ref('note').textContent = !game.cleared ? '' : moves <= puzzle.par ? ja.bestMoves : ja.shortest(puzzle.par);

    const statsEl = this.ref('stats');
    if (this.isTodayDailyPuzzle(puzzle)) {
      const stats = loadStats();
      statsEl.innerHTML = statsHtml(summarize(stats, puzzle.id), game.cleared ? moves - puzzle.par : null);
      statsEl.hidden = false;
    } else {
      statsEl.hidden = true;
    }

    const s = this.source;
    if (s.kind === 'tutorial') return;
    const closeThen = (fn: () => void) => () => {
      this.resultDlg.close();
      fn();
    };
    this.resultActions =
      s.kind === 'daily'
        ? [
            { label: ja.goPractice, run: closeThen(() => this.openMenu()) },
            { label: ja.share, run: () => void this.share() },
          ]
        : [
            { label: ja.retry, run: closeThen(() => this.start(puzzle)) },
            { label: ja.next, run: closeThen(() => void this.open({ kind: 'practice', profile: s.profile })) },
          ];
    this.ref('resultSecondary').textContent = this.resultActions[0].label;
    this.ref('resultPrimary').textContent = this.resultActions[1].label;
    if (!this.resultDlg.open) this.resultDlg.showModal();
  }

  private async share(): Promise<void> {
    const game = this.game;
    if (!game?.finished) return;
    const text = shareText({
      id: game.puzzle.id,
      moves: game.moves,
      timeMs: this.stopwatch.elapsed(performance.now()),
      gaveUp: game.gaveUp,
      band: game.puzzle.band,
      final: game.state,
      url: SITE_URL || `${location.origin}${location.pathname}`,
    });
    // スマホは共有シート、それ以外はクリップボード
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ text });
        return;
      } catch (e) {
        if ((e as DOMException).name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      this.toast(ja.copied);
    } catch {
      this.toast(ja.copyFailed);
    }
  }

  private toast(text: string): void {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove('show'), 1800);
  }
}

/** 同じ問題番号でも、生成し直した問題とは区別する */
function puzzleKey(p: Puzzle): string {
  return `${p.generatorVersion}:${p.seed ?? ''}`;
}

/** 11月2日(月) */
function dateText(date: string): string {
  const p = parseDate(date);
  return p ? ja.dateText(p[1], p[2], weekdayOf(date)) : date;
}

function statsHtml(s: ReturnType<typeof summarize>, diff: number | null): string {
  const rate = s.plays > 0 ? Math.round((s.clears / s.plays) * 100) : 0;
  const boxes = [
    [s.plays, ja.statsPlays],
    [`${rate}%`, ja.statsClearRate],
    [s.currentStreak, ja.statsStreak],
    [s.maxStreak, ja.statsMaxStreak],
  ]
    .map(([v, label]) => `<div class="stat-box"><span class="stat-box-value">${v}</span><span>${label}</span></div>`)
    .join('');
  const top = Math.max(1, ...s.distribution);
  const highlight = diff === null ? -1 : Math.min(s.distribution.length - 1, Math.max(0, diff));
  const bars = s.distribution
    .map((count, i) => {
      const width = Math.max(8, Math.round((count / top) * 100));
      return `<div class="dist-row${i === highlight ? ' mine' : ''}">
          <span class="dist-label">${ja.distributionLabels[i]}</span>
          <span class="dist-track"><span class="dist-bar" style="width:${width}%">${count}</span></span>
        </div>`;
    })
    .join('');
  return `<div class="stat-boxes">${boxes}</div>
    <p class="dist-title">${ja.distributionTitle}</p>
    <div class="dist">${bars}</div>`;
}

/** ?debug=1 のときだけ出す。値・行列・可動区間 */
function debugText(game: Game): string {
  const { matrix, band, n, profile, seed, par, parNoWall } = game.puzzle;
  const ranges = Array.from({ length: n }, (_, j) => {
    const r = game.range(j);
    return `[${r.tmin}, ${r.tmax}]`;
  });
  return [
    `${profile}${seed !== undefined ? ` seed=${seed}` : ''} ${game.status}`,
    `par   = ${par} (no wall ${parNoWall})`,
    `x     = [${game.state.join(', ')}]`,
    `band  = ${band.lo}..${band.hi}`,
    `range = ${ranges.join(' ')}`,
    `last  = ${game.lastSlider ?? '-'}`,
    'M =',
    ...matrix.map((row) => '  ' + row.map((v) => String(v).padStart(2)).join(' ')),
  ].join('\n');
}

type IconName = 'undo' | 'reset' | 'flag' | 'result' | 'menu' | 'help' | 'close';

function icon(name: IconName): string {
  const paths: Record<IconName, string> = {
    undo: '<path d="M8 5 4 9l4 4"/><path d="M4 9h10a5 5 0 0 1 0 10h-4"/>',
    reset: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/>',
    flag: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
    result: '<path d="M5 20V11"/><path d="M12 20V5"/><path d="M19 20v-6"/>',
    menu: '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 1 1 3.4 2.4c-.6.3-1 .8-1 1.5v.6"/><circle cx="12" cy="17" r=".6" fill="currentColor"/>',
    close: '<path d="M6 6l12 12"/><path d="M18 6 6 18"/>',
  };
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
}
