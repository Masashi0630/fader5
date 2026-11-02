/**
 * 効果音を Web Audio で合成する(音声ファイルは使わない)。
 * iOS などはユーザー操作の中でしか音を出し始められないので、最初の操作で unlock() を呼ぶ。
 */
export class Sound {
  muted: boolean;
  private ctx: AudioContext | null = null;

  constructor(muted: boolean) {
    this.muted = muted;
  }

  unlock(): void {
    if (this.muted) return;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  /** 1段動くごとの小さなクリック */
  tick(): void {
    this.blip(1900, 0.025, 0.05, 'triangle');
  }

  /** 壁に当たったとき */
  bump(): void {
    this.blip(140, 0.09, 0.12, 'sine');
  }

  /** 帯に入ったとき */
  lit(): void {
    this.blip(1320, 0.07, 0.04, 'sine');
  }

  /** クリア: 上がっていく4音 */
  clear(): void {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.blip(f, 0.25, 0.07, 'sine', i * 0.11));
  }

  private blip(freq: number, duration: number, volume: number, type: OscillatorType, delay = 0): void {
    const ctx = this.ctx;
    if (this.muted || !ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }
}
