import { useCallback, useRef, useEffect } from 'react';

export type SoundName = 'hit' | 'miss' | 'explosion' | 'victory' | 'defeat' | 'splash' | 'click' | 'alert';

interface SoundOptions {
  volume?: number;  // 0-1
  pitch?: number;   // playbackRate multiplier
}

// Synthesise all game sounds via Web Audio API — zero asset files needed
function synthesizeSound(ctx: AudioContext, name: SoundName, opts: SoundOptions = {}): void {
  const vol = opts.volume ?? 0.5;
  const master = ctx.createGain();
  master.gain.setValueAtTime(vol, ctx.currentTime);
  master.connect(ctx.destination);

  const t = ctx.currentTime;

  switch (name) {
    case 'click': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, t);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.connect(gain); gain.connect(master);
      osc.start(t); osc.stop(t + 0.08);
      break;
    }
    case 'miss': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.3);
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(gain); gain.connect(master);
      osc.start(t); osc.stop(t + 0.3);
      break;
    }
    case 'hit': {
      // Noise burst + pitched ping
      const bufLen = ctx.sampleRate * 0.15;
      const buffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.3));
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 800;
      source.connect(filter); filter.connect(master);
      source.start(t);
      break;
    }
    case 'explosion': {
      const bufLen = ctx.sampleRate * 0.8;
      const buffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.4));
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 300;
      const dist = ctx.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) { const x = (i * 2) / 256 - 1; curve[i] = (3 + 100) * x / (Math.PI + 100 * Math.abs(x)); }
      dist.curve = curve;
      source.connect(filter); filter.connect(dist); dist.connect(master);
      source.start(t);
      break;
    }
    case 'splash': {
      const bufLen = ctx.sampleRate * 0.4;
      const buffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.5));
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 2000;
      source.connect(filter); filter.connect(master);
      source.start(t);
      break;
    }
    case 'victory': {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        const start = t + i * 0.12;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.35, start + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
        osc.connect(gain); gain.connect(master);
        osc.start(start); osc.stop(start + 0.4);
      });
      break;
    }
    case 'defeat': {
      const notes = [392, 349.23, 293.66, 261.63];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        const start = t + i * 0.18;
        gain.gain.setValueAtTime(0.3, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
        osc.connect(gain); gain.connect(master);
        osc.start(start); osc.stop(start + 0.5);
      });
      break;
    }
    case 'alert': {
      [880, 0, 880].forEach((freq, i) => {
        if (freq === 0) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        const start = t + i * 0.15;
        gain.gain.setValueAtTime(0.2, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.1);
        osc.connect(gain); gain.connect(master);
        osc.start(start); osc.stop(start + 0.1);
      });
      break;
    }
  }
}

interface UseSoundReturn {
  play: (name: SoundName, opts?: SoundOptions) => void;
  enabled: boolean;
  toggle: () => void;
}

let globalEnabled = true;

export function useSound(): UseSoundReturn {
  const ctxRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(globalEnabled);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const play = useCallback((name: SoundName, opts?: SoundOptions) => {
    if (!enabledRef.current) return;
    try {
      const ctx = getCtx();
      synthesizeSound(ctx, name, opts);
    } catch (e) {
      // Silently fail — audio is non-critical
    }
  }, [getCtx]);

  const toggle = useCallback(() => {
    globalEnabled = !globalEnabled;
    enabledRef.current = globalEnabled;
  }, []);

  useEffect(() => {
    return () => {
      ctxRef.current?.close();
    };
  }, []);

  return { play, enabled: enabledRef.current, toggle };
}
