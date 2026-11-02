# FADER5 — 連動スライダーのデイリーパズル

ブラウザだけで遊べる1日1問のパズルゲーム。3〜5本の縦スライダーが線形に連動しており、
すべてのスライダーを共通の「帯」の中に収めたらクリア。Wordle のように全員が同じ日に同じ問題を解き、
手数を競い、値を伏せた絵文字グリッドで結果を共有する。

企画書(Claude Docs)にゲームデザインの背景がある。このファイルは実装の正(source of truth)とする。
仕様に迷ったらこのファイルを優先し、変える場合はこのファイルも更新すること。

---

## 1. ゲーム仕様(厳密)

### 定数
- `MAX = 12` … 各スライダーの値は整数 `0..12`(13段階)
- `BAND_WIDTH = 3` … 帯は `[lo, lo + 2]`(両端含む)。`lo` は `2..7`
- スライダー本数 `n` は `3..5`

### 状態と操作
- 状態 `x: number[]`(長さ n、各要素は `0..MAX` の整数)
- 連動行列 `M: number[][]`(n×n の整数行列)
  - `M[i][j]` = スライダー j を1段動かしたとき、スライダー i が動く段数
  - `M[j][j] = 1`(常に)。非対角は `-2..2`
- 1手の操作 `(j, t)`: スライダー j を t 段(t は 0 以外の整数)動かす
  - `x'[i] = x[i] + t * M[i][j]`(全 i)
- **壁**: 操作後に1本でも `0..MAX` を外れる操作はできない。
  - スライダー j を動かせる範囲は区間 `[tmin, tmax]`(必ず 0 を含む)。計算は `moveRange()` を参照。
  - ドラッグ中はこの区間で t をクランプする。はみ出し・押し戻し・飽和(clamp)はしない。
  - 区間が連続なので、同じスライダーを2回続けて動かすことは1回の操作と等価。
- **クリア**: 全 i で `lo <= x[i] <= lo + 2`

### 手数の数え方
- プレイヤーが「直前に操作したスライダーと違うスライダー」に触れて値が1段以上変わった時点で +1。
- 同じスライダーを続けて触っている間は増えない(ドラッグを離して掴み直しても同じ手)。
- Undo: 直前の1手(連続操作のまとまり)を取り消す。**手数は戻さない**。Undo 後は「直前のスライダー」をリセットする。
- リセット: 初期状態に戻す。手数は戻さない。「直前のスライダー」もリセット。
- ギブアップ: 最短解(`solution`)をアニメーションで再生する。記録は「未クリア」。

### 表示上の制約
- スライダーの数値・連動係数・行列は**画面に表示しない**(目盛りのみ)。
  例外: スクリーンリーダー用の `aria-valuenow` は付けてよい。
- **パーはプレイ中に表示しない**(2026-11-02 ユーザー判断)。代わりに経過時間を出す。パーは結果画面で「最短は N手」として見せるだけ。
- 経過時間: 最初の1手(手数が 1 になった時点)から測り、クリア・ギブアップで止める。画面が隠れている間(`visibilitychange`)は止める。
- デバッグ表示は `?debug=1` のときだけ。本番ビルドでは無効化してよい。

---

## 2. 用語

| 用語 | 意味 |
| --- | --- |
| パー (par) | BFS で求めた最短手数 |
| 壁なし下限 (parNoWall) | 壁を無視したときの最短手数。帯内の各目標点 y について `d = M⁻¹(y − x0)` が整数なら `d` の非ゼロ成分数、その最小値 |
| 遠回り (detour) | `par − parNoWall`。壁のせいで増えた手数。難易度の主要因 |
| プロファイル | 難易度設定の組(本数、係数、密度、パー範囲、遠回り下限など) |

---

## 3. 技術スタック

- TypeScript(strict)+ Vite。**UI フレームワークは使わない**(SVG + DOM を直接操作)
- テスト: Vitest
- 型チェック: `tsc --noEmit`
- ホスティング: **GitHub Pages**(公開リポジトリなら無料)。`.github/workflows/deploy.yml` が main への push で型チェック・テスト・ビルド(デイリー検証込み)→ 公開。バックエンドなし
  - 公開 URL は `.env` の `VITE_SITE_URL`(`https://masashi0630.github.io/fader5/`)。index.html の OGP と共有テキストに使う
  - Vite の `base: './'` なので、どのサブパスに置いても動く
- 依存は最小限にする。追加する場合は理由をコミットメッセージに書く
  - `tsx`(dev): `scripts/*.ts`(gen:daily / verify:daily)を Node で直接実行するため
  - `@types/node`(dev): scripts の型チェック用(`tsconfig.scripts.json`。src は DOM、scripts は Node と分けている)

## 4. ディレクトリ構成(目標)

```
.
├── CLAUDE.md
├── index.html                 # OGP・アイコンのメタタグ(URL は %VITE_SITE_URL%)
├── .env                       # VITE_SITE_URL(公開 URL)
├── .github/workflows/deploy.yml  # GitHub Pages への公開
├── public/
│   ├── daily/                 # 生成済みデイリー問題(月ごと) 2026-12.json など
│   ├── favicon.svg            # 手書き SVG
│   ├── og.png                 # OGP 画像 1200×630(scripts/art/og.html から書き出し)
│   └── apple-touch-icon.png   # 180×180(scripts/art/icon.html から書き出し)
├── reference/
│   └── sim.mjs                # 検証済みの生成器・ソルバーの試作(JS)。src/core へ移植する元
├── scripts/
│   ├── gen-daily.ts           # デイリー問題の一括生成
│   ├── verify-daily.ts        # 生成済み JSON の検証(パーと解を再計算)
│   └── art/                   # OGP 画像・アイコンの元 HTML と書き出し手順(README.md)
├── src/
│   ├── main.ts
│   ├── config.ts              # TITLE、EPOCH(公開日)、MAX、BAND_WIDTH(scripts からも読むので import.meta.env は使わない)
│   ├── site.ts                # SITE_URL(.env から。UI だけが使う)
│   ├── core/                  # 純粋ロジック。DOM・window・Math.random 禁止
│   │   ├── types.ts
│   │   ├── rng.ts             # mulberry32 + 文字列ハッシュ(シード)
│   │   ├── matrix.ts          # det, inverse
│   │   ├── moves.ts           # moveRange, applyMove, isSolved
│   │   ├── solver.ts          # bfsSolve(パーと最短解), parNoWall
│   │   ├── generator.ts       # generatePuzzle(profile, seed)
│   │   ├── profiles.ts        # 曜日別プロファイル
│   │   └── validate.ts        # validatePuzzle(テスト・verify:daily 共用)
│   ├── daily/                 # 日付→問題番号→問題データ(date.ts は純粋、daily.ts は生成・検証、load.ts は fetch)
│   ├── game/                  # ゲーム状態(手数、履歴、Undo、ギブアップ)、Stopwatch、統計の集計。DOM 非依存
│   ├── ui/                    # スライダー描画、入力、演出、画面、効果音(sound.ts)
│   ├── share/                 # 共有テキスト生成
│   ├── storage/               # localStorage ラッパー
│   ├── tutorial/              # 手作りチュートリアル問題(puzzles.ts)
│   ├── workers/               # 練習モードの生成用 Web Worker
│   └── i18n/ja.ts             # UI 文言(日本語。英語は将来)
└── tests/                     # Vitest(core と game を重点的に)。fixtures/samples.ts は M1 の手作り3本問題
```

---

## 5. コアロジック仕様

### 型
```ts
export type Move = { slider: number; delta: number };

export type Puzzle = {
  id: number;                 // デイリー問題番号。練習は 0
  date?: string;              // 'YYYY-MM-DD'(デイリーのみ)
  profile: ProfileId;         // 'mon' | 'tue' | ... | 'sun' | 'practice-*'
  n: number;
  max: number;                // 12
  matrix: number[][];
  band: { lo: number; hi: number }; // hi = lo + 2
  start: number[];
  par: number;
  parNoWall: number;
  solution: Move[];           // BFS の最短解の1つ
  generatorVersion: number;   // アルゴリズムを変えたら上げる
  seed?: number;              // generatePuzzle に渡したシード(練習の再現・デバッグ用)
};
```

### moveRange(M, x, j, max) → [tmin, tmax]
各 i について `c = M[i][j]` が 0 以外なら制約 `0 <= x[i] + c*t <= max` を課す。
- `c > 0`: `t >= ceil(-x[i]/c)`, `t <= floor((max - x[i])/c)`
- `c < 0`: `t >= ceil((max - x[i])/c)`, `t <= floor(-x[i]/c)`
全制約の共通部分を返す。どの制約が効いているか(=ぶつかるスライダー)も返せる版を UI 用に用意する。

### bfsSolve(puzzle 相当) → { par, solution }
- 状態を基数 `max+1` の整数にエンコード。全状態数は最大 `13^5 = 371,293`
- `Int8Array` の距離 + `Int32Array` の親ポインタ + 直前の手で幅優先探索
- 各状態から、各スライダー j について `[tmin, tmax]` の 0 以外の全 t へ遷移
- 最初にクリア状態へ到達した深さがパー。親ポインタで解を復元
- 目安: 5本で 1回 5〜150ms(Node)。ブラウザのメインスレッドでは回さず Worker で
- 実装メモ: 値の変化は線形なので、スライダー j を t 段動かした先の状態番号は `key + t * Σ_i M[i][j]·base^(n-1-i)` で直接求める
- 探索順(状態 → j 昇順 → t 昇順)は sim.mjs と同じ。同じ入力なら同じ最短解を返す
- 深さ上限 `maxDepth`(既定 30)を引数で渡せる。生成時は `profile.par[1]` で打ち切る

### parNoWall
帯の中の全目標点 y(`3^n` 通り)について `d = M⁻¹(y − x0)` を計算し、全成分が整数(誤差 1e-6)なら非ゼロ成分数を候補とし、その最小値。

### generatePuzzle(profile, seed) — 逆スクランブル + 棄却サンプリング
1. 行列: 対角 1、非対角は確率 `p` で `coefs` から一様に選ぶ(それ以外 0)。
   条件: 各列に非対角の非ゼロが1つ以上、`|det(M)| >= 0.5`。満たさなければ作り直し。
2. 帯: `lo = 2 + floor(rng() * 6)`(2..7)
3. 解けた状態: 各スライダーを帯内の一様乱数に置く
4. スクランブル: `profile.scramble` 回、直前と違うスライダー j を選び、`moveRange` 内で `|t| >= 2` の t を一様に選んで適用(候補がなければその回はスキップ)
5. 初期状態で帯内にあるスライダーが2本以上なら棄却
6. `bfsSolve` でパー、`parNoWall` を計算
7. `profile.par[0] <= par <= profile.par[1]` かつ `par - parNoWall >= profile.minDetour` なら採用。そうでなければ 1 へ(同じ RNG を進めて続ける)
- **決定的であること**: 同じ profile + seed → 常に同じ問題
- シード: `hashString(\`faders-v${generatorVersion}-${date}\`)` を mulberry32 に渡す。`hashString` は 32bit FNV-1a(UTF-16 コード単位ごと)。変えると過去問が変わる
- 高速化(結果は変わらない): `parNoWall > par[1]` なら BFS を回さず棄却(`parNoWall <= par` のため)、BFS は `par[1]` 手で打ち切る
- 移植版が sim.mjs と同じ問題(行列・帯・初期状態・パー・parNoWall)を返すことを、7プロファイル × シード 1..30 で確認済み(generatorVersion 1)

### 曜日別プロファイル(generatorVersion 2: 毎日5本)

2026-11-02 のプレイ後、ユーザー判断で「3本は簡単すぎ、5本がちょうどいい」→ 全曜日5本にした。
係数の種類と遠回りの下限で難しさを上げる。金曜は木曜と同じパー範囲で、連動の密度だけ上げている。

| id | 本数 | 係数 | p(密度) | scramble | パー範囲 | 遠回り下限 | 平均パー | 平均遠回り | 生成時間/問(中央・最大) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| mon | 5 | ±1 | 0.4 | 16 | 5–5 | 0 | 5.00 | 0.50 | 11 ms・53 ms |
| tue | 5 | ±1 | 0.45 | 16 | 5–6 | 1 | 5.30 | 1.13 | 16 ms・58 ms |
| wed | 5 | ±1, ±2 | 0.45 | 16 | 5–6 | 1 | 5.38 | 1.23 | 6 ms・35 ms |
| thu | 5 | ±1, ±2 | 0.45 | 16 | 5–7 | 2 | 5.90 | 2.08 | 20 ms・79 ms |
| fri | 5 | ±1, ±2 | 0.5 | 16 | 5–7 | 2 | 5.92 | 2.05 | 22 ms・54 ms |
| sat | 5 | ±1, ±2 | 0.45 | 16 | 5–8 | 2 | 6.03 | 2.15 | 16 ms・80 ms |
| sun | 5 | ±1, ±2 | 0.45 | 18 | 6–8 | 2 | 6.50 | 2.27 | 22 ms・107 ms |

(計測は Node.js 22、src/core、各40問)

#### 旧プロファイル(generatorVersion 1。3〜5本。履歴として残す)

| id | 本数 | 係数 | p(密度) | scramble | パー範囲 | 遠回り下限 | 採用率の実測 | 生成時間/問 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| mon | 3 | ±1 | 0.5 | 8 | 3–3 | 0 | 30/107 | 2 ms |
| tue | 3 | ±1 | 0.6 | 12 | 3–4 | 0 | 30/88 | 1 ms |
| wed | 4 | ±1 | 0.45 | 12 | 4–4 | 0 | 30/232 | 11 ms |
| thu | 4 | ±1 | 0.5 | 14 | 4–5 | 1 | 30/529 | 21 ms |
| fri | 4 | ±1, ±2 | 0.5 | 14 | 4–6 | 1 | 30/370 | 6 ms |
| sat | 5 | ±1, ±2 | 0.45 | 16 | 5–6 | 1 | 30/430 | 39 ms |
| sun | 5 | ±1, ±2 | 0.45 | 16 | 5–8 | 2 | 30/2110 | 184 ms |

(実測は Node.js 22、reference/sim.mjs 相当の実装。プレイテスト後に調整する前提)

移植版(src/core、generatorVersion 1)での再計測(Node.js 22、シード 1..30): 採用率 mon 30/118, tue 30/101, wed 30/273, thu 30/386, fri 30/230, sat 30/473, sun 30/1631。
生成時間/問は mon〜fri 2 ms 以下、sat 約 10 ms、sun 約 30 ms。

---

## 6. デイリー問題

- `EPOCH`(公開日, `src/config.ts`)= **2026-11-02**(月曜)を #1 とし、問題番号 = EPOCH からの日数 + 1
- 生成済み: 2026-11 〜 2028-10(generatorVersion 2)。公開前だったので v1 のファイルは消して作り直した
- 日付は**端末のローカル日付**(`getFullYear/getMonth/getDate`)。日数差は `Date.UTC(y, m, d)` 同士で計算し、DST やタイムゾーンのずれを避ける
- 曜日も日付文字列から `Date.UTC(...)` → `getUTCDay()` で求める
- 問題データはビルド前に `npm run gen:daily` で生成し、`public/daily/YYYY-MM.json`(その月の Puzzle 配列)として同梱する
- **一度公開した月のファイルは再生成・上書きしない**(過去問が変わるため)。アルゴリズムを変えたら `generatorVersion` を上げ、未公開の月だけ再生成する
- `npm run verify:daily` で全ファイルを検証: 行列の条件、初期状態の妥当性、`solution` を適用するとクリアになること、BFS で再計算したパーが一致すること
  - さらに generatorVersion が現行の問題は再生成して一致を確かめる(生成器を変えたのに version を上げ忘れると失敗する)
- 該当日のデータがない場合は、練習モードへ誘導するメッセージを出す
- `?debug=1&date=YYYY-MM-DD` で別の日のデイリーを開ける。統計・途中経過は「今日の」デイリーだけ記録する

## 7. 練習モード
- プロファイルを選んでランダム問題を遊ぶ。シードは `crypto.getRandomValues` で作る
- 生成は `src/workers/` の Web Worker で行い、UI を止めない
- 記録はデイリーの統計と分ける
- URL `?practice=<mon..sun>&seed=<N>` で同じ問題を再現できる(生成後に URL をこの形に書き換えるので、リロードしても同じ問題)

---

## 8. UI 仕様

- **モバイル縦画面が基準**(幅 375px で必ず確認)。デスクトップでは中央に最大幅を設けて表示
- モチーフ: ミキサー卓のフェーダー。ダークテーマ基本、`prefers-color-scheme` でライトにも対応
- 画面構成
  - 上: 問題番号と日付(練習ならレベル)、手数、経過時間
  - 中央: 縦スライダーが横一列。全スライダーを横切る半透明の帯
  - 下: 取り消し / リセット / ギブアップ(終わったら「結果」に変わる)/ メニュー
  - メニュー: 今日の問題、練習(月〜日レベル)、遊び方
- ギブアップは確認ダイアログを出してから解を再生する
- 描画は SVG。スライダー1本 = トラック + 目盛り13本 + ハンドル
- 入力
  - Pointer Events + `setPointerCapture`。ハンドルの当たり判定は見た目より大きく(最低 44px)
  - ドラッグ開始時に `moveRange` を計算し、ポインタ位置 → 目標値 → `t = 目標値 - 開始時の値` → `[tmin, tmax]` にクランプ
  - 1段ごとにスナップ。連動するスライダーはリアルタイムに追従(短いイージング)
  - クランプが効いたら、効いている制約のスライダーを赤く点滅。`navigator.vibrate?.(15)`
  - キーボード: ←→ でスライダー選択、↑↓ で1段。各スライダーは `role="slider"`
- 帯の中に入ったスライダーはハンドルを点灯(色 + 形の変化。色だけに頼らない)
- クリア: 全フェーダーを順に光らせ、結果モーダル(手数・時間、最短手数、統計、共有ボタン)
  - 統計: プレイ数、クリア率、連続日数、最長連続、最短手数との差の分布(デイリーのみ)
  - 終わったデイリーをリロードすると、結果モーダルを再表示する
- クリアの最後に帯を一度光らせる(`.board.cleared`)
- 初回チュートリアル(3ステップ、`src/tutorial/` の手作り問題)。初回はデイリーより先に出す。メニューからやり直せる。スキップ可
  1. 連動なしの1本を帯に入れる
  2. 連動する2本(左を動かすと右もつられる)
  3. 壁に当たって止まる体験(右が上端にいて、左を上げると止まる → 先に右を逃がす)
  - チュートリアル中は時間を測らず、ギブアップできず、記録も残さない
- 効果音: Web Audio で合成(音声ファイル不要)。1段ごとのクリック、帯に入ったときの高い音、壁に当たったときの低い音、クリアの4音。
  メニューでオン/オフ(`settings.muted`)。iOS 対策で最初の pointerdown / keydown で AudioContext を作る

## 9. 共有テキスト

```
FADERS #12  6手 2:41
⬛🟩⬛⬛🟩
🟩⬛⬛🟩⬛
⬛⬛🟩⬛⬛
```
- 1行目: タイトル、問題番号、手数、経過時間(`m:ss`、1時間以上は `h:mm:ss`)。ギブアップ時は `6手 2:41` の代わりに `ギブアップ`。パーは載せない
- 以降: **最終形の並び**(2026-11-02 ユーザー判断。各手ごとの 🟩🟨⬜ の行はわかりにくいのでやめた)。
  帯を上・中・下の3行で描き、1列 = 1本のフェーダー、🟩 = そのフェーダーを止めた高さ、⬛ = 空き。手順は伏せる
- ギブアップ時は盤面を出さない
- URL を最終行に付ける(`config.ts` の `SHARE_URL`。null ならページの URL からクエリを除いたもの)
- モバイルは `navigator.share`、それ以外はクリップボードにコピーしてトースト表示

## 10. 保存(localStorage)

すべて try/catch で囲み、使えなくても遊べるようにする。キーは `fader5:v1:` で始める。
- `fader5:v1:stats` … `{ results: { [問題番号]: { moves, par, timeMs, gaveUp } } }`。プレイ数・クリア数・連続日数・分布はここから集計する(同じ番号は最初の結果だけ残す)
- `fader5:v1:progress:<id>` … その日の途中経過(`Game.snapshot()`、経過時間、`puzzleKey` = `generatorVersion:seed`)。リロードで復元。`puzzleKey` が違えば捨てる(作り直した問題に古い経過を当てない)。7日より古いものは起動時に消す
- `fader5:v1:settings` … `{ muted, tutorialDone }`
- 仮タイトル時代は `faders:v1:` だった(公開前なので移行はしない)

---

## 11. コマンド(package.json に用意すること)

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバー |
| `npm run build` | 本番ビルド(`verify:daily` を先に走らせる) |
| `npm test` | Vitest |
| `npm run typecheck` | `tsc --noEmit`(src・tests)+ `tsc --noEmit -p tsconfig.scripts.json`(scripts) |
| `npm run gen:daily -- --from 2028-11 --months 12` | デイリー問題の生成(既存の月はスキップ) |
| `npm run verify:daily` | 生成済み問題の検証 |

## 12. 開発ルール

- `src/core` と `src/game` は純粋ロジックにする。DOM・`window`・`Math.random`・`Date.now` を使わない
- core を変えたら必ずテストを書く/直す。タスクの最後に `npm test` と `npm run typecheck` を通す
- 乱数はすべてシード付き(`rng.ts`)。生成結果が決定的であることをテストで保証する(同じシード → 同じ問題のスナップショット)
- テストで最低限押さえること
  - `moveRange`: 正負の係数、0 係数、端にいる場合、区間が 0 を含むこと
  - `applyMove`: 範囲内なら必ず `0..MAX` に収まる
  - `bfsSolve`: 手作り問題でパーが期待値、`solution` を適用するとクリア
  - `generatePuzzle`: 各プロファイルで条件(パー範囲、遠回り下限、行列条件)を満たす
  - 手数カウント: 同じスライダー連続は1手、Undo/リセットで手数が減らない
  - 日付: EPOCH 当日が #1、月またぎ・年またぎ・DST
- UI に数値や係数を出さない(デバッグモードを除く)
- 公開済みの `public/daily/*.json` を書き換えない
- 文言は `src/i18n/ja.ts` に集約する
- 1つのマイルストーンが終わったら、何ができて何が未着手かを短く報告して止まる(ユーザーが遊んで確認する)

## 13. マイルストーン(この順に進める)

1. **M1 コア操作** — 手作りの3本問題1つで、ドラッグ・連動・壁・クリア判定・手数が動く。スマホ実機で触れる状態にする。ここで「面白いか」をユーザーが確認する
2. **M2 生成とソルバー** — `reference/sim.mjs` を `src/core` に TypeScript で移植。テスト一式。練習モードでランダム問題が遊べる
3. **M3 デイリー化** — `gen:daily` / `verify:daily`、日付からの出題、経過時間の表示、Undo・リセット・ギブアップ(解の再生)、統計、共有テキスト、途中経過の復元
4. **M4 仕上げと公開** — チュートリアル、クリア演出、効果音、キーボード操作、ダーク/ライト、OGP、静的ホスティングへのデプロイ設定
5. **M5 プレイテスト対応** — 曜日別プロファイルの数値調整(`generatorVersion` を上げ、未公開分のみ再生成)

## 14. 参考実装

`reference/sim.mjs` は、このゲームの生成器・BFS ソルバー・parNoWall を JavaScript で書いた検証用の試作。
§5 の表の数値はこれで計測した。移植時はアルゴリズムを変えずに型を付け、関数を分割すること。
試作は乱数関数 `rnd`(mulberry32)を引数で受け取る。帯の判定は `lo <= v < lo + 3` で、§1 の `lo..lo+2` と同じ意味。
試作の `profiles` 配列とログ出力は計測用なので移植しない。

## 15. 未決事項(実装前にユーザーに確認)

- ~~正式タイトル~~ → **FADER5** に決定(2026-11-02。検索しやすさ重視。完全一致の既存ゲームなし)
  - デイリーのシード文字列 `faders-v${generatorVersion}-${date}` は仮タイトルの名残だが、変えると全問題が変わるのでそのまま
- ~~公開日 `EPOCH`~~ → 2026-11-02 に決定
- ~~ホスティング先~~ → GitHub Pages に決定(リポジトリ `fader5`、公開)
- ヒント機能(連動の向きを矢印で見せる)を入れるか。入れる場合は共有テキストに印を付ける
