/** 行列式(部分ピボット付きガウス消去) */
export function det(m: number[][]): number {
  const n = m.length;
  const a = m.map((r) => r.slice());
  let d = 1;
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    if (Math.abs(a[p][c]) < 1e-9) return 0;
    if (p !== c) {
      [a[p], a[c]] = [a[c], a[p]];
      d = -d;
    }
    d *= a[c][c];
    for (let r = c + 1; r < n; r++) {
      const f = a[r][c] / a[c][c];
      for (let k = c; k < n; k++) a[r][k] -= f * a[c][k];
    }
  }
  return d;
}

/** 逆行列(ガウス・ジョルダン)。正則であること(|det| >= 0.5 を生成時に保証している) */
export function inverse(m: number[][]): number[][] {
  const n = m.length;
  const a = m.map((r, i) => [...r, ...Array.from({ length: n }, (_, k) => (k === i ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    [a[p], a[c]] = [a[c], a[p]];
    const v = a[c][c];
    for (let k = 0; k < 2 * n; k++) a[c][k] /= v;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = a[r][c];
      for (let k = 0; k < 2 * n; k++) a[r][k] -= f * a[c][k];
    }
  }
  return a.map((r) => r.slice(n));
}
