/**
 * BattleAudioManager — Web Audio API synthesized sounds.
 * Zero external files needed. All sounds generated procedurally.
 */

type SoundName = 'hit' | 'miss' | 'sunk' | 'victory' | 'defeat' | 'your_turn' | 'enemy_turn' | 'place_ship' | 'click';

export class BattleAudioManager {
  private static instance: BattleAudioManager;
  private ctx: AudioContext | null = null;
  private muted = false;

  static getInstance(): BattleAudioManager {
    if (!BattleAudioManager.instance) {
      BattleAudioManager.instance = new BattleAudioManager();
    }
    return BattleAudioManager.instance;
  }

  private getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  setMuted(muted: boolean): void { this.muted = muted; }
  isMuted(): boolean { return this.muted; }

  play(name: SoundName): void {
    if (this.muted) return;
    try {
      switch (name) {
        case 'hit':         this.playHit(); break;
        case 'miss':        this.playMiss(); break;
        case 'sunk':        this.playSunk(); break;
        case 'victory':     this.playVictory(); break;
        case 'defeat':      this.playDefeat(); break;
        case 'your_turn':   this.playTurnPing(880); break;
        case 'enemy_turn':  this.playTurnPing(440); break;
        case 'place_ship':  this.playClick(600, 0.08); break;
        case 'click':       this.playClick(800, 0.05); break;
      }
    } catch { /* AudioContext blocked in some browsers before interaction */ }
  }

  private playHit(): void {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    // Low boom + crackle
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.4);
  }

  private playMiss(): void {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    // Water splash: filtered noise
    const bufSize = ctx.sampleRate * 0.3;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.15;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 0.5;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    src.start(now); src.stop(now + 0.3);
  }

  private playSunk(): void {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    // Deep explosion + descending tone
    this.playHit();
    setTimeout(() => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.8);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.8);
    }, 150);
  }

  private playVictory(): void {
    const ctx = this.getCtx();
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.15;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.4);
    });
  }

  private playDefeat(): void {
    const ctx = this.getCtx();
    const notes = [440, 349, 294, 220]; // descending
    notes.forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.2;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.5);
    });
  }

  private playTurnPing(freq: number): void {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.3);
  }

  private playClick(freq: number, vol: number): void {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.06);
  }
}
