/// <reference lib="webworker" />
import { generatePuzzle } from '../core/generator';
import { PROFILES } from '../core/profiles';
import type { Puzzle, WeekdayProfileId } from '../core/types';

export type GenerateRequest = { id: number; profile: WeekdayProfileId; seed: number };
export type GenerateResponse = { id: number; puzzle: Puzzle } | { id: number; error: string };

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (e: MessageEvent<GenerateRequest>) => {
  const { id, profile, seed } = e.data;
  let res: GenerateResponse;
  try {
    res = { id, puzzle: generatePuzzle(PROFILES[profile], seed) };
  } catch (err) {
    res = { id, error: String(err) };
  }
  ctx.postMessage(res);
};
