import { describe, expect, it } from 'vitest';
import { finalShape, shareText } from '../src/share/share';

const band = { lo: 4, hi: 6 };

describe('finalShape', () => {
  it('帯の上・中・下の3段で、各フェーダーを止めた高さに印を付ける', () => {
    expect(finalShape([5, 6, 4, 5, 6], band)).toEqual(['⬛🟩⬛⬛🟩', '🟩⬛⬛🟩⬛', '⬛⬛🟩⬛⬛']);
  });
});

describe('shareText', () => {
  it('タイトル・番号・手数・時間、最終形、URL', () => {
    const text = shareText({
      id: 12,
      moves: 6,
      timeMs: 161_000,
      gaveUp: false,
      band,
      final: [5, 6, 4, 5, 6],
      url: 'https://example.com/',
    });
    expect(text).toBe(
      ['FADER5 #12  6手 2:41', '⬛🟩⬛⬛🟩', '🟩⬛⬛🟩⬛', '⬛⬛🟩⬛⬛', 'https://example.com/'].join('\n'),
    );
  });

  it('ギブアップは「ギブアップ」だけで盤面を出さない', () => {
    const text = shareText({ id: 3, moves: 2, timeMs: 1000, gaveUp: true, band, final: [5, 5, 5], url: 'u' });
    expect(text).toBe(['FADER5 #3  ギブアップ', 'u'].join('\n'));
  });

  it('URL が空なら付けない', () => {
    const text = shareText({ id: 1, moves: 5, timeMs: 7_000, gaveUp: false, band, final: [4, 4, 4], url: '' });
    expect(text.split('\n')).toEqual(['FADER5 #1  5手 0:07', '⬛⬛⬛', '⬛⬛⬛', '🟩🟩🟩']);
  });
});
