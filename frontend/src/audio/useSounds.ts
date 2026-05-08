import { useCallback } from 'react';

type OscType = OscillatorType;

function playTone(freq: number, dur: number, type: OscType = 'sine', volume = 0.3) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = type;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur);
  } catch {
    // AudioContext not available (SSR / test env)
  }
}

export function useSounds() {
  const hit = useCallback(() => {
    playTone(440, 0.12, 'square', 0.25);
  }, []);

  const miss = useCallback(() => {
    playTone(180, 0.35, 'sine', 0.2);
  }, []);

  const sunk = useCallback(() => {
    playTone(220, 0.15, 'sawtooth', 0.3);
    setTimeout(() => playTone(180, 0.15, 'sawtooth', 0.3), 150);
    setTimeout(() => playTone(140, 0.5, 'sawtooth', 0.25), 300);
  }, []);

  const win = useCallback(() => {
    playTone(523, 0.18, 'sine', 0.3); // C5
    setTimeout(() => playTone(659, 0.18, 'sine', 0.3), 200); // E5
    setTimeout(() => playTone(784, 0.18, 'sine', 0.3), 400); // G5
    setTimeout(() => playTone(1047, 0.4, 'sine', 0.35), 600); // C6
  }, []);

  const yourTurn = useCallback(() => {
    playTone(880, 0.08, 'sine', 0.15);
    setTimeout(() => playTone(1100, 0.12, 'sine', 0.2), 100);
  }, []);

  return { hit, miss, sunk, win, yourTurn };
}
