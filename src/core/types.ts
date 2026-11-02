export type Move = { slider: number; delta: number };

export type WeekdayProfileId = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/** 'tutorial' はチュートリアルの手作り問題、'sample' はテスト用の手作り問題 */
export type ProfileId = WeekdayProfileId | `practice-${WeekdayProfileId}` | 'tutorial' | 'sample';

/** 帯。hi = lo + 2(両端含む) */
export type Band = { lo: number; hi: number };

export type Puzzle = {
  /** デイリー問題番号。練習は 0 */
  id: number;
  /** 'YYYY-MM-DD'(デイリーのみ) */
  date?: string;
  profile: ProfileId;
  n: number;
  max: number;
  /** matrix[i][j] = スライダー j を1段動かしたとき、スライダー i が動く段数 */
  matrix: number[][];
  band: Band;
  start: number[];
  par: number;
  parNoWall: number;
  /** BFS の最短解の1つ */
  solution: Move[];
  /** アルゴリズムを変えたら上げる */
  generatorVersion: number;
  /** generatePuzzle に渡したシード(練習の再現・デバッグ用) */
  seed?: number;
};
