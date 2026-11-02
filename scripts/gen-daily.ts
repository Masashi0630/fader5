// デイリー問題を月ごとに生成して public/daily/YYYY-MM.json に書く。既にある月はスキップ(公開済みの月を変えないため)。
// 使い方: npm run gen:daily -- --from 2026-12 --months 24
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { EPOCH } from '../src/config';
import { GENERATOR_VERSION } from '../src/core/generator';
import { dailyDatesInMonth, generateDaily, serializeMonth } from '../src/daily/daily';

const OUT_DIR = 'public/daily';

const { values } = parseArgs({
  options: {
    from: { type: 'string', default: EPOCH },
    months: { type: 'string', default: '12' },
  },
});

const fromMatch = /^(\d{4})-(\d{2})/.exec(values.from);
const months = Number(values.months);
if (!fromMatch || !Number.isInteger(months) || months < 1) {
  console.error('usage: npm run gen:daily -- --from YYYY-MM[-DD] --months N');
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
let y = Number(fromMatch[1]);
let m = Number(fromMatch[2]);
for (let k = 0; k < months; k++) {
  const month = `${y}-${String(m).padStart(2, '0')}`;
  const file = join(OUT_DIR, `${month}.json`);
  const dates = dailyDatesInMonth(month);
  if (existsSync(file)) {
    console.log(`${month}: 既にあるのでスキップ`);
  } else if (dates.length === 0) {
    console.log(`${month}: EPOCH(${EPOCH})より前なのでスキップ`);
  } else {
    const t0 = performance.now();
    const puzzles = dates.map(generateDaily);
    writeFileSync(file, serializeMonth(puzzles));
    const pars = puzzles.map((p) => p.par).join('');
    console.log(`${month}: ${puzzles.length} 問 (${(performance.now() - t0).toFixed(0)} ms) パー ${pars}`);
  }
  if (++m > 12) {
    m = 1;
    y++;
  }
}
console.log(`generatorVersion ${GENERATOR_VERSION}`);
