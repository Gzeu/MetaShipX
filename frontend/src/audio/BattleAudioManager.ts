/**
 * BattleAudioManager — singleton for MetaShipX battle sounds.
 * All sounds are lazy-loaded on first play. Respects user mute preference.
 * Sounds live in /public/sounds/ as mp3 + ogg fallback.
 */

export type BattleSoundName = 'hit' | 'miss' | 'sunk' | 'gameover' | 'your_turn' | 'enemy_turn' | 'place_ship' | 'victory' | 'defeat';

const SOUND_SRCS: Record<BattleSoundName, string[]> = {
  hit:         ['/sounds/hit.mp3',         '/sounds/hit.ogg'],
  miss:        ['/sounds/miss.mp3',        '/sounds/miss.ogg'],
  sunk:        ['/sounds/sunk.mp3',        '/sounds/sunk.ogg'],
  gameover:    ['/sounds/gameover.mp3',    '/sounds/gameover.ogg'],
  your_turn:   ['/sounds/your_turn.mp3',   '/sounds/your_turn.ogg'],
  enemy_turn:  ['/sounds/enemy_turn.mp3',  '/sounds/enemy_turn.ogg'],
  place_ship:  ['/sounds/place_ship.mp3',  '/sounds/place_ship.ogg'],
  victory:     ['/sounds/victory.mp3',     '/sounds/victory.ogg'],
  defeat:      ['/sounds/defeat.mp3',      '/sounds/defeat.ogg'],
};

class BattleAudioManager {
  private cache: Partial<Record<BattleSoundName, HTMLAudioElement>> = {};
  private muted = false;
  private volume = 0.7;

  private load(name: BattleSoundName): HTMLAudioElement | null {
    if (typeof Audio === 'undefined') return null;
    if (this.cache[name]) return this.cache[name]!;
    const el = new Audio();
    el.volume = this.volume;
    for (const src of SOUND_SRCS[name]) {
      const source = document.createElement('source');
      source.src = src;
      source.type = src.endsWith('.ogg') ? 'audio/ogg' : 'audio/mpeg';
      el.appendChild(source);
    }
    this.cache[name] = el;
    return el;
  }

  play(name: BattleSoundName): void {
    if (this.muted) return;
    const el = this.load(name);
    if (!el) return;
    el.currentTime = 0;
    void el.play().catch(() => undefined);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    Object.values(this.cache).forEach((el) => {
      if (el) el.volume = this.volume;
    });
  }

  isMuted(): boolean {
    return this.muted;
  }
}

export const battleAudio = new BattleAudioManager();
