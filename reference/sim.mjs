// 連動スライダーパズルの生成・検証シミュレーション
// - 行列 M(対角1、非対角 -2..2)をランダム生成
// - 帯の中の「解けた状態」から、壁を守った逆操作でスクランブル(→必ず解ける)
// - BFS で最短手数(パー)を求める
// - 壁がない場合の最短手数(線形代数だけで決まる下限)と比較し、壁による遠回りの頻度を測る

const N = 12; // 値の範囲 0..N
const BAND = 3; // 帯の幅(段数)

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function det(m) {
  const n = m.length;
  const a = m.map((r) => r.slice());
  let d = 1;
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    if (Math.abs(a[p][c]) < 1e-9) return 0;
    if (p !== c) { [a[p], a[c]] = [a[c], a[p]]; d = -d; }
    d *= a[c][c];
    for (let r = c + 1; r < n; r++) {
      const f = a[r][c] / a[c][c];
      for (let k = c; k < n; k++) a[r][k] -= f * a[c][k];
    }
  }
  return d;
}

function inverse(m) {
  const n = m.length;
  const a = m.map((r, i) => [...r, ...Array.from({ length: n }, (_, k) => (k === i ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    [a[p], a[c]] = [a[c], a[p]];
    const v = a[c][c];
    for (let k = 0; k < 2 * n; k++) a[c][k] /= v;
    for (let r = 0; r < n; r++) if (r !== c) {
      const f = a[r][c];
      for (let k = 0; k < 2 * n; k++) a[r][k] -= f * a[c][k];
    }
  }
  return a.map((r) => r.slice(n));
}

// 列 j を t 段動かせる範囲 [tmin, tmax]
function range(M, x, j) {
  let lo = -Infinity, hi = Infinity;
  for (let i = 0; i < x.length; i++) {
    const c = M[i][j];
    if (c === 0) continue;
    if (c > 0) { lo = Math.max(lo, Math.ceil(-x[i] / c)); hi = Math.min(hi, Math.floor((N - x[i]) / c)); }
    else { lo = Math.max(lo, Math.ceil((N - x[i]) / c)); hi = Math.min(hi, Math.floor(-x[i] / c)); }
  }
  return [lo, hi];
}

function genMatrix(n, rnd, p, coefs) {
  for (let tries = 0; tries < 1000; tries++) {
    const M = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => {
      if (i === j) return 1;
      return rnd() < p ? coefs[Math.floor(rnd() * coefs.length)] : 0;
    }));
    // どの列も最低1本は他を動かす
    let ok = true;
    for (let j = 0; j < n; j++) if (!M.some((r, i) => i !== j && r[j] !== 0)) ok = false;
    if (!ok) continue;
    const d = det(M);
    if (Math.abs(d) < 0.5) continue;
    return M;
  }
  return null;
}

function inBand(v, lo) { return v >= lo && v < lo + BAND; }

function bfs(M, start, lo) {
  const n = start.length, B = N + 1;
  const total = B ** n;
  const dist = new Int8Array(total).fill(-1);
  const enc = (x) => x.reduce((s, v) => s * B + v, 0);
  const dec = (k) => { const x = new Array(n); for (let i = n - 1; i >= 0; i--) { x[i] = k % B; k = Math.floor(k / B); } return x; };
  const goal = (x) => x.every((v) => inBand(v, lo));
  let frontier = [enc(start)];
  dist[frontier[0]] = 0;
  if (goal(start)) return 0;
  for (let depth = 1; depth <= 30; depth++) {
    const next = [];
    for (const k of frontier) {
      const x = dec(k);
      for (let j = 0; j < n; j++) {
        const [tmin, tmax] = range(M, x, j);
        for (let t = tmin; t <= tmax; t++) {
          if (t === 0) continue;
          const y = x.map((v, i) => v + t * M[i][j]);
          const ky = enc(y);
          if (dist[ky] !== -1) continue;
          dist[ky] = depth;
          if (goal(y)) return depth;
          next.push(ky);
        }
      }
    }
    if (!next.length) return -1;
    frontier = next;
  }
  return -1;
}

// 壁がない場合の最短手数: 帯内の各目標点 y について d = M^-1 (y - x0) が整数なら nnz(d)
function parNoWall(M, x0, lo) {
  const n = x0.length, inv = inverse(M);
  let best = Infinity;
  const idx = new Array(n).fill(0);
  const total = BAND ** n;
  for (let c = 0; c < total; c++) {
    let k = c;
    for (let i = 0; i < n; i++) { idx[i] = k % BAND; k = Math.floor(k / BAND); }
    const r = x0.map((v, i) => lo + idx[i] - v);
    const d = inv.map((row) => row.reduce((s, a, i) => s + a * r[i], 0));
    if (d.every((v) => Math.abs(v - Math.round(v)) < 1e-6)) {
      best = Math.min(best, d.filter((v) => Math.abs(v) > 1e-6).length);
    }
  }
  return best;
}

function generate(n, rnd, profile) {
  const M = genMatrix(n, rnd, profile.p, profile.coefs);
  if (!M) return null;
  const lo = 2 + Math.floor(rnd() * (N - BAND - 3));
  let x = Array.from({ length: n }, () => lo + Math.floor(rnd() * BAND));
  let prev = -1;
  for (let s = 0; s < profile.scramble; s++) {
    let j;
    do { j = Math.floor(rnd() * n); } while (j === prev);
    const [tmin, tmax] = range(M, x, j);
    const opts = [];
    for (let t = tmin; t <= tmax; t++) if (Math.abs(t) >= 2) opts.push(t);
    if (!opts.length) continue;
    const t = opts[Math.floor(rnd() * opts.length)];
    x = x.map((v, i) => v + t * M[i][j]);
    prev = j;
  }
  const inBandCount = x.filter((v) => inBand(v, lo)).length;
  if (inBandCount > 1) return null; // 帯に入っているのは最大1本
  return { M, lo, x };
}

const profiles = [
  { name: "n=3 易 (±1, p=.5)", n: 3, p: 0.5, coefs: [-1, 1], scramble: 5 },
  { name: "n=4 中 (±1, p=.45)", n: 4, p: 0.45, coefs: [-1, 1], scramble: 7 },
  { name: "n=4 中+ (±1,±2)", n: 4, p: 0.45, coefs: [-2, -1, 1, 2], scramble: 7 },
  { name: "n=5 難 (±1, p=.4)", n: 5, p: 0.4, coefs: [-1, 1], scramble: 9 },
  { name: "n=5 難+ (±1,±2)", n: 5, p: 0.4, coefs: [-2, -1, 1, 2], scramble: 9 },
];

const SAMPLES = Number(process.argv[2] || 60);
const results = [];
for (const prof of profiles) {
  const rnd = mulberry32(12345 + prof.n * 7 + prof.coefs.length);
  const pars = [], detours = [], times = [];
  let rejected = 0;
  while (pars.length < SAMPLES) {
    const g = generate(prof.n, rnd, prof);
    if (!g) { rejected++; continue; }
    const t0 = performance.now();
    const par = bfs(g.M, g.x, g.lo);
    times.push(performance.now() - t0);
    if (par < 0) { rejected++; continue; }
    const nw = parNoWall(g.M, g.x, g.lo);
    pars.push(par);
    detours.push(par - nw);
  }
  const hist = {};
  for (const p of pars) hist[p] = (hist[p] || 0) + 1;
  const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  const detourRate = detours.filter((d) => d > 0).length / detours.length;
  results.push({
    profile: prof.name,
    n: prof.n,
    parMean: +mean(pars).toFixed(2),
    parMin: Math.min(...pars),
    parMax: Math.max(...pars),
    hist,
    detourRate: +(detourRate * 100).toFixed(0),
    bfsMsMean: +mean(times).toFixed(0),
    bfsMsMax: +Math.max(...times).toFixed(0),
    rejected,
  });
  console.error(`done ${prof.name}`);
}
console.log(JSON.stringify(results, null, 2));
