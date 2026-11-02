import type { GameSnapshot } from '../game/game';
import { parseStats, type Stats } from '../game/stats';

/**
 * localStorage のラッパー。使えない環境(プライベートモード等)でも例外を出さず、
 * 読めなければ null / 初期値を返す。キーはすべて fader5:v1: で始める。
 */
const PREFIX = 'fader5:v1:';
const PROGRESS = 'progress:';

function read(key: string): unknown {
  try {
    const s = localStorage.getItem(PREFIX + key);
    return s === null ? null : JSON.parse(s);
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // 保存できなくても遊べるようにする
  }
}

export function loadStats(): Stats {
  return parseStats(read('stats'));
}

export function saveStats(stats: Stats): void {
  write('stats', stats);
}

export type Settings = { muted: boolean; tutorialDone: boolean };

export function loadSettings(): Settings {
  const raw = read('settings') as Partial<Settings> | null;
  return { muted: raw?.muted === true, tutorialDone: raw?.tutorialDone === true };
}

export function saveSettings(settings: Settings): void {
  write('settings', settings);
}

/**
 * その日の途中経過(デイリーのみ)。puzzleKey は問題の取り違え防止
 * (公開前に作り直した問題に、古い途中経過を当てはめないため)
 */
export type Progress = { puzzleKey: string; game: GameSnapshot; elapsedMs: number };

export function loadProgress(id: number, puzzleKey: string): { game: unknown; elapsedMs: number } | null {
  const raw = read(PROGRESS + id) as Partial<Progress> | null;
  if (typeof raw !== 'object' || raw === null || raw.puzzleKey !== puzzleKey) return null;
  return { game: raw.game, elapsedMs: typeof raw.elapsedMs === 'number' ? raw.elapsedMs : 0 };
}

export function saveProgress(id: number, progress: Progress): void {
  write(PROGRESS + id, progress);
}

/** 古い日の途中経過を消す(minId より前) */
export function pruneProgress(minId: number): void {
  try {
    const stale: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(PREFIX + PROGRESS)) continue;
      if (Number(key.slice((PREFIX + PROGRESS).length)) < minId) stale.push(key);
    }
    for (const key of stale) localStorage.removeItem(key);
  } catch {
    // 無視
  }
}
