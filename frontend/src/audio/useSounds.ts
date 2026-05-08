import { useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Web Audio API — all sounds generated procedurally, zero external files
// ---------------------------------------------------------------------------

type AudioCtxRef = AudioContext | null;

function getCtx(ref: React.MutableRefObject<AudioCtxRef>): AudioContext {
  if (!ref.current) {
    ref.current = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return ref.current;
}

// Utility: play a simple oscillator burst
function burst(
  ctx: AudioContext,
  type: OscillatorType,
  freq: number,
  duration: number,
  gainPeak: number = 0.4,
  freqEnd?: number
) {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  if (freqEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + duration);
  }
  gain.gain.setValueAtTime(gainPeak, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration + 0.05);
}

// White noise buffer (for explosion)
function noiseBuffer(ctx: AudioContext): AudioBuffer {
  const frames = ctx.sampleRate * 0.5;
  const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

export function useSounds() {
  const ctxRef = useRef<AudioCtxRef>(null);

  /** Missile launch → high-pitched sweep down */
  const launch = useCallback(() => {
    const ctx = getCtx(ctxRef);
    burst(ctx, 'sine', 1200, 0.25, 0.3, 400);
    burst(ctx, 'sawtooth', 800, 0.2, 0.15, 200);
  }, []);

  /** Water splash — miss */
  const miss = useCallback(() => {
    const ctx = getCtx(ctxRef);
    // Low thud + noise burst
    burst(ctx, 'sine', 120, 0.4, 0.35, 60);
    const src  = ctx.createBufferSource();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;
    src.buffer = noiseBuffer(ctx);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(ctx.currentTime);
    src.stop(ctx.currentTime + 0.5);
  }, []);

  /** Explosion — hit */
  const hit = useCallback(() => {
    const ctx = getCtx(ctxRef);
    // Low boom
    burst(ctx, 'sawtooth', 80, 0.6, 0.5, 40);
    // Crackling noise
    const src    = ctx.createBufferSource();
    const gain   = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 400;
    src.buffer = noiseBuffer(ctx);
    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(ctx.currentTime);
    src.stop(ctx.currentTime + 0.7);
  }, []);

  /** Ship sunk — longer explosion + descending chord */
  const sunk = useCallback(() => {
    const ctx = getCtx(ctxRef);
    [200, 150, 100, 70].forEach((f, i) => {
      setTimeout(() => burst(ctx, 'sawtooth', f, 0.8, 0.4, f * 0.4), i * 80);
    });
  }, []);

  /** Your turn — sonar ping */
  const yourTurn = useCallback(() => {
    const ctx = getCtx(ctxRef);
    burst(ctx, 'sine', 880, 0.15, 0.2);
    setTimeout(() => burst(ctx, 'sine', 1100, 0.12, 0.15), 180);
  }, []);

  /** Victory fanfare */
  const win = useCallback(() => {
    const ctx = getCtx(ctxRef);
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => setTimeout(() => burst(ctx, 'sine', f, 0.4, 0.5), i * 150));
  }, []);

  return { launch, miss, hit, sunk, yourTurn, win };
}
