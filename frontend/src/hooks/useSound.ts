import { useCallback, useRef } from 'react';

type SoundType = 'hit' | 'miss' | 'sunk' | 'victory' | 'defeat' | 'click' | 'join';

const SOUND_ENABLED_KEY = 'metashipx_sound';

function getSoundEnabled(): boolean {
  try { return localStorage.getItem(SOUND_ENABLED_KEY) !== 'false'; }
  catch { return true; }
}

export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  function getCtx(): AudioContext {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }

  const play = useCallback((type: SoundType) => {
    if (!getSoundEnabled()) return;
    try {
      const ctx = getCtx();
      const now = ctx.currentTime;

      switch (type) {
        case 'hit': {
          // Low explosion thud
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(180, now);
          osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
          gain.gain.setValueAtTime(0.5, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.start(now); osc.stop(now + 0.35);
          // Noise burst
          const bufLen = ctx.sampleRate * 0.2;
          const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
          const data = buf.getChannelData(0);
          for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
          const src = ctx.createBufferSource();
          const ng = ctx.createGain();
          src.buffer = buf; src.connect(ng); ng.connect(ctx.destination);
          ng.gain.setValueAtTime(0.4, now);
          ng.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          src.start(now);
          break;
        }
        case 'miss': {
          // Soft splash
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.exponentialRampToValueAtTime(200, now + 0.25);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          osc.start(now); osc.stop(now + 0.25);
          break;
        }
        case 'sunk': {
          // Descending chord
          [200, 160, 120].forEach((freq, i) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.connect(g); g.connect(ctx.destination);
            o.type = 'triangle';
            o.frequency.setValueAtTime(freq, now + i * 0.08);
            o.frequency.exponentialRampToValueAtTime(freq * 0.5, now + i * 0.08 + 0.4);
            g.gain.setValueAtTime(0.3, now + i * 0.08);
            g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.4);
            o.start(now + i * 0.08); o.stop(now + i * 0.08 + 0.4);
          });
          break;
        }
        case 'victory': {
          // Ascending fanfare
          [523, 659, 784, 1047].forEach((freq, i) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.connect(g); g.connect(ctx.destination);
            o.type = 'square';
            o.frequency.value = freq;
            g.gain.setValueAtTime(0, now + i * 0.12);
            g.gain.linearRampToValueAtTime(0.2, now + i * 0.12 + 0.05);
            g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4);
            o.start(now + i * 0.12); o.stop(now + i * 0.12 + 0.4);
          });
          break;
        }
        case 'defeat': {
          // Descending sad tones
          [400, 320, 240, 180].forEach((freq, i) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.connect(g); g.connect(ctx.destination);
            o.type = 'triangle';
            o.frequency.value = freq;
            g.gain.setValueAtTime(0.15, now + i * 0.15);
            g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.4);
            o.start(now + i * 0.15); o.stop(now + i * 0.15 + 0.4);
          });
          break;
        }
        case 'click': {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = 'sine'; o.frequency.value = 800;
          g.gain.setValueAtTime(0.1, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          o.start(now); o.stop(now + 0.08);
          break;
        }
        case 'join': {
          [440, 550].forEach((freq, i) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.connect(g); g.connect(ctx.destination);
            o.type = 'sine'; o.frequency.value = freq;
            g.gain.setValueAtTime(0.15, now + i * 0.1);
            g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.2);
            o.start(now + i * 0.1); o.stop(now + i * 0.1 + 0.2);
          });
          break;
        }
      }
    } catch (e) {
      // AudioContext blocked or unavailable — silent fail
    }
  }, []);

  const toggle = useCallback(() => {
    try {
      const next = !getSoundEnabled();
      localStorage.setItem(SOUND_ENABLED_KEY, String(next));
      return next;
    } catch { return true; }
  }, []);

  return { play, isSoundEnabled: getSoundEnabled, toggle };
}
