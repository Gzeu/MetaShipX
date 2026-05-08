import { useMemo } from 'react';

export type BattleSoundName = 'hit' | 'miss' | 'sunk' | 'gameover';

const SOUND_LIBRARY: Record<BattleSoundName, string> = {
  hit: '/sounds/hit.mp3',
  miss: '/sounds/miss.mp3',
  sunk: '/sounds/sunk.mp3',
  gameover: '/sounds/gameover.mp3',
};

export function useBattleAudio() {
  const audioMap = useMemo(() => {
    if (typeof Audio === 'undefined') return null;
    return Object.fromEntries(
      Object.entries(SOUND_LIBRARY).map(([name, src]) => [name, new Audio(src)])
    ) as Record<BattleSoundName, HTMLAudioElement>;
  }, []);

  const play = (name: BattleSoundName) => {
    const audio = audioMap?.[name];
    if (!audio) return;
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  };

  return { play, sounds: SOUND_LIBRARY };
}
