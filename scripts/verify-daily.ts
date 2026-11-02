// public/daily/*.json をすべて検証する。問題があれば終了コード 1。
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { EPOCH } from '../src/config';
import { monthOf } from '../src/daily/date';
import { verifyMonth } from '../src/daily/daily';

const DIR = 'public/daily';

const files = readdirSync(DIR)
  .filter((f) => /^\d{4}-\d{2}\.json$/.test(f))
  .sort();
if (files.length === 0) {
  console.error(`${DIR} に問題ファイルがない(npm run gen:daily で作る)`);
  process.exit(1);
}

const errors: string[] = [];
const t0 = performance.now();
let count = 0;
let prev: string | null = null;
for (const f of files) {
  const month = f.slice(0, 7);
  if (month < monthOf(EPOCH)) errors.push(`${f}: EPOCH(${EPOCH})より前の月`);
  if (prev && nextMonth(prev) !== month) errors.push(`${prev} と ${month} の間の月が抜けている`);
  prev = month;
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
  } catch (e) {
    errors.push(`${f}: JSON として読めない: ${String(e)}`);
    continue;
  }
  errors.push(...verifyMonth(month, data));
  if (Array.isArray(data)) count += data.length;
}

const ms = (performance.now() - t0).toFixed(0);
if (errors.length > 0) {
  for (const e of errors) console.error(`✗ ${e}`);
  console.error(`${errors.length} 件の問題(${files.length} ファイル、${count} 問、${ms} ms)`);
  process.exit(1);
}
console.log(`✓ ${files.length} ファイル、${count} 問を検証(${files[0]} 〜 ${files[files.length - 1]}、${ms} ms)`);

function nextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}
