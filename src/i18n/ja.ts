import type { WeekdayProfileId } from '../core/types';

const WEEKDAY: Record<WeekdayProfileId, string> = {
  mon: '月曜',
  tue: '火曜',
  wed: '水曜',
  thu: '木曜',
  fri: '金曜',
  sat: '土曜',
  sun: '日曜',
};

/** getUTCDay() の値(0 = 日曜)→ 曜日の1文字 */
const WEEKDAY_SHORT = ['日', '月', '火', '水', '木', '金', '土'];

export const ja = {
  dateText: (month: number, day: number, weekday: number) => `${month}月${day}日(${WEEKDAY_SHORT[weekday]})`,
  dailyLabel: (id: number, date: string) => `#${id} · ${date}`,
  practiceLabel: (id: WeekdayProfileId, n: number) => `練習・${WEEKDAY[id]}レベル(${n}本)`,
  moves: '手数',
  time: '時間',
  undo: '取り消し',
  reset: 'リセット',
  giveUp: 'ギブアップ',
  result: '結果',
  menu: 'メニュー',
  close: '閉じる',
  cancel: 'やめる',
  sliderLabel: (i: number) => `フェーダー ${i}`,
  boardLabel: 'フェーダー卓。左右キーで選択、上下キーで動かす',

  menuTitle: 'メニュー',
  dailyHeading: '今日の問題',
  dailyItem: (id: number) => `#${id}`,
  practiceHeading: '練習(ランダムな新しい問題)',
  weekday: WEEKDAY,
  profileMeta: (n: number, parMin: number, parMax: number) =>
    parMin === parMax ? `${n}本・最短${parMin}手` : `${n}本・最短${parMin}〜${parMax}手`,
  help: '遊び方',
  menuTutorial: 'チュートリアル',
  soundOn: '効果音 オン',
  soundOff: '効果音 オフ',

  tutorialLabel: (i: number, total: number) => `チュートリアル ${i}/${total}`,
  tutorialSteps: [
    'フェーダーを上にドラッグして、光る帯の中に入れよう。',
    '左のフェーダーを動かすと、右もつられて動きます。2本とも帯に入れよう。',
    '右が上の端にいるので、左を上げようとすると止まります。どうすれば2本とも帯に入るかな?',
  ],
  tutorialDone: ['できた!', 'その調子!', '端にいるフェーダーは、先に逃がしておくのがコツ。'],
  tutorialFinal: '本番は5本がつながっています。どれがどう動くか探りながら、少ない手数でそろえよう。',
  tutorialNext: '次へ',
  tutorialStart: '今日の問題へ',
  tutorialSkip: 'スキップ',

  loading: '読み込んでいます…',
  generating: '問題を作っています…',
  generateFailed: '問題を作れませんでした。メニューからもう一度選んでください。',
  noDaily: '今日の問題はまだありません。練習で遊んでください。',
  beforeEpoch: 'デイリー問題はまだ始まっていません。練習で遊んでください。',
  goPractice: '練習で遊ぶ',

  giveUpTitle: 'ギブアップしますか?',
  giveUpBody: '最短手順を再生します。',
  giveUpBodyDaily: '最短手順を再生します。今日の記録は「未クリア」になります。',

  clearTitle: 'クリア!',
  gaveUpTitle: 'ギブアップ',
  resultScore: (moves: number, time: string) => `${moves}手 · ${time}`,
  bestMoves: '最短手数でクリア!',
  shortest: (par: number) => `最短は${par}手`,
  retry: 'もう一度',
  next: '次の問題',
  share: '共有',
  copied: '結果をコピーしました',
  copyFailed: 'コピーできませんでした',

  statsPlays: 'プレイ',
  statsClearRate: 'クリア率',
  statsStreak: '連続',
  statsMaxStreak: '最長連続',
  distributionTitle: '最短手数との差',
  distributionLabels: ['最短', '+1', '+2', '+3', '+4〜'],

  shareScore: (moves: number, time: string) => `${moves}手 ${time}`,
  shareGaveUp: 'ギブアップ',

  helpTitle: '遊び方',
  helpItems: [
    'フェーダーを上下にドラッグして動かします。',
    '1本動かすと、つながっている他のフェーダーも一緒に動きます。どれが、どの向きに動くかは触って確かめてください。',
    'どれか1本でも端にぶつかると、そこで止まります。ぶつかったフェーダーが赤く光ります。',
    'すべてのフェーダーを光る帯の中に入れたらクリアです。',
    '違うフェーダーに触れるたびに1手。同じフェーダーを続けて動かしている間は同じ手です。取り消し・リセットしても手数は戻りません。',
    '時間は最初にフェーダーを動かしたときから測ります。',
    'デイリー問題は1日1問、全員同じ問題です。5本のフェーダーを、曜日ごとに少しずつ難しくなる問題でそろえます。',
  ],
} as const;
