/**
 * Sound effects using the Web Audio API — no external assets needed.
 * All sounds are synthesized procedurally.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function playTone(
  frequency: number,
  type: OscillatorType,
  duration: number,
  gainStart: number,
  gainEnd: number,
  delay = 0,
) {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, c.currentTime + delay);
  gain.gain.setValueAtTime(gainStart, c.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(Math.max(gainEnd, 0.001), c.currentTime + delay + duration);
  osc.start(c.currentTime + delay);
  osc.stop(c.currentTime + delay + duration);
}

export function playHit() {
  // Explosion: noise burst + low thud
  playTone(180, 'sawtooth', 0.05, 0.6, 0.001);
  playTone(80,  'sine',     0.25, 0.5, 0.001, 0.02);
  playTone(220, 'square',   0.08, 0.3, 0.001, 0.01);
}

export function playMiss() {
  // Subtle splash: descending sine
  playTone(600, 'sine', 0.12, 0.25, 0.001);
  playTone(400, 'sine', 0.15, 0.15, 0.001, 0.08);
}

export function playSunk() {
  // Dramatic sinking: falling pitch + rumble
  const c = getCtx();
  const osc  = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(300, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(40, c.currentTime + 0.8);
  gain.gain.setValueAtTime(0.5, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.8);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + 0.8);
  playTone(60, 'sine', 0.5, 0.3, 0.001, 0.1);
}

export function playVictory() {
  // Ascending fanfare
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => playTone(freq, 'square', 0.18, 0.3, 0.001, i * 0.15));
  playTone(1047, 'sine', 0.4, 0.4, 0.001, notes.length * 0.15);
}

export function playDefeat() {
  // Descending minor
  const notes = [392, 349, 330, 294];
  notes.forEach((freq, i) => playTone(freq, 'sine', 0.22, 0.25, 0.001, i * 0.18));
}

export function playButtonClick() {
  playTone(800, 'sine', 0.06, 0.15, 0.001);
}

export function playPlacement() {
  // Soft thunk when placing a ship
  playTone(220, 'triangle', 0.1, 0.2, 0.001);
  playTone(330, 'sine',     0.08, 0.1, 0.001, 0.04);
}
