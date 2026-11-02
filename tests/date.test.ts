import { afterEach, describe, expect, it } from 'vitest';
import { EPOCH } from '../src/config';
import {
  addDays,
  datesInMonth,
  localDateString,
  monthOf,
  parseDate,
  puzzleNumber,
  weekdayOf,
} from '../src/daily/date';

describe('puzzleNumber', () => {
  it('EPOCH 当日が #1、前日は 0', () => {
    expect(puzzleNumber(EPOCH)).toBe(1);
    expect(puzzleNumber(addDays(EPOCH, -1))).toBe(0);
    expect(puzzleNumber(addDays(EPOCH, 1))).toBe(2);
  });

  it('月またぎ・年またぎ・うるう年', () => {
    const epoch = '2026-11-02';
    expect(puzzleNumber('2026-11-30', epoch)).toBe(29);
    expect(puzzleNumber('2026-12-01', epoch)).toBe(30);
    expect(puzzleNumber('2027-01-01', epoch)).toBe(61);
    // 2028 はうるう年
    expect(puzzleNumber('2028-03-01', epoch) - puzzleNumber('2028-02-28', epoch)).toBe(2);
    expect(puzzleNumber('2027-03-01', epoch) - puzzleNumber('2027-02-28', epoch)).toBe(1);
  });

  it('DST の切り替わり日をまたいでも1日ずつ増える(UTC で計算している)', () => {
    // 米国 2027-03-14、欧州 2027-03-28 に夏時間開始
    for (const d of ['2027-03-13', '2027-03-27', '2027-10-30', '2027-11-06']) {
      expect(puzzleNumber(addDays(d, 1)) - puzzleNumber(d)).toBe(1);
    }
  });
});

describe('weekdayOf', () => {
  it('0 = 日曜', () => {
    expect(weekdayOf('2026-11-02')).toBe(1); // 月
    expect(weekdayOf('2026-11-08')).toBe(0); // 日
    expect(weekdayOf('2027-01-01')).toBe(5); // 金
  });
});

describe('parseDate / addDays / monthOf / datesInMonth', () => {
  it('不正な日付は null', () => {
    expect(parseDate('2026-11-02')).toEqual([2026, 11, 2]);
    expect(parseDate('2026-02-29')).toBeNull();
    expect(parseDate('2026-13-01')).toBeNull();
    expect(parseDate('2026-1-1')).toBeNull();
    expect(parseDate('')).toBeNull();
  });

  it('addDays は月・年をまたぐ', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28');
  });

  it('月の日付一覧', () => {
    expect(monthOf('2026-11-02')).toBe('2026-11');
    expect(datesInMonth('2026-11')).toHaveLength(30);
    expect(datesInMonth('2028-02')).toHaveLength(29);
    expect(datesInMonth('2026-12').at(-1)).toBe('2026-12-31');
  });
});

describe('localDateString', () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it('端末のローカル日付を使う(UTC ではない)', () => {
    process.env.TZ = 'Asia/Tokyo';
    // UTC では 11/1 15:30、東京では 11/2 0:30
    expect(localDateString(new Date(Date.UTC(2026, 10, 1, 15, 30)))).toBe('2026-11-02');
    process.env.TZ = 'America/Los_Angeles';
    expect(localDateString(new Date(Date.UTC(2026, 10, 1, 15, 30)))).toBe('2026-11-01');
  });

  it('DST の切り替わり当日も日付がずれない', () => {
    process.env.TZ = 'America/New_York';
    // 2027-03-14 2:00 に夏時間開始。その日の 3:30 と 23:30
    expect(localDateString(new Date(2027, 2, 14, 3, 30))).toBe('2027-03-14');
    expect(localDateString(new Date(2027, 2, 14, 23, 30))).toBe('2027-03-14');
  });
});
