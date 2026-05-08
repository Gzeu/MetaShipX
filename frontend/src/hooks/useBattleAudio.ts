import { useCallback, useEffect, useRef, useState } from 'react';
import { battleAudio, BattleSoundName } from '../audio/BattleAudioManager';

/**
 * Hook for battle audio + mute toggle.
 * Usage:
 *   const { play, muted, toggleMute } = useBattleAudio();
 *   play('hit'); // on attack result
 */
export function useBattleAudio() {
  const [muted, setMuted] = useState(false);

  const play = useCallback((name: BattleSoundName) => {
    battleAudio.play(name);
  }, []);

  const toggleMute = useCallback(() => {
    const next = !battleAudio.isMuted();
    battleAudio.setMuted(next);
    setMuted(next);
  }, []);

  return { play, muted, toggleMute };
}

/**
 * Hook to play the correct sound automatically from an AttackResult.
 */
export function useAttackSound() {
  const lastResult = useRef<string | null>(null);

  const playForResult = useCallback((result: 'Hit' | 'Miss' | 'Sunk' | 'GameOver' | null | undefined, youAreAttacker: boolean) => {
    if (!result || result === lastResult.current) return;
    lastResult.current = result;
    switch (result) {
      case 'Hit':     battleAudio.play('hit');      break;
      case 'Miss':    battleAudio.play('miss');     break;
      case 'Sunk':    battleAudio.play('sunk');     break;
      case 'GameOver': battleAudio.play(youAreAttacker ? 'victory' : 'defeat'); break;
    }
  }, []);

  return { playForResult };
}
