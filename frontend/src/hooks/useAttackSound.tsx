import { useEffect, useRef, useState } from 'react';
import React from 'react';
import { BattleAudioManager } from '../audio/BattleAudioManager';
import type { AttackResult } from '../components/GameBoard/GameBoard';

const audio = BattleAudioManager.getInstance();

/**
 * Plays the correct sound for each attack result and exposes a MuteButton.
 * Pass `lastAttack` from useGame — re-fires whenever the object reference changes.
 */
export function useAttackSound(lastAttack: AttackResult | null) {
  const prevRef = useRef<AttackResult | null>(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (!lastAttack) return;
    // Guard against same object reference being passed twice
    if (
      prevRef.current &&
      prevRef.current.row === lastAttack.row &&
      prevRef.current.col === lastAttack.col &&
      prevRef.current.result === lastAttack.result
    ) return;
    prevRef.current = lastAttack;

    if (muted) return;

    if (lastAttack.gameOver) {
      audio.play(lastAttack.iWon ? 'victory' : 'defeat');
      return;
    }

    switch (lastAttack.result) {
      case 'sunk': audio.play('sunk'); break;
      case 'hit':  audio.play('hit');  break;
      case 'miss': audio.play('miss'); break;
    }

    if (lastAttack.isMyAttack) {
      // small delay so hit sfx plays first
      setTimeout(() => audio.play('enemy_turn'), 400);
    } else {
      setTimeout(() => audio.play('your_turn'), 400);
    }
  }, [lastAttack, muted]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    audio.setMuted(next);
  };

  function MuteButton() {
    return (
      <button
        className="gb-mute-btn"
        onClick={toggleMute}
        aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
        title={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? '🔇' : '🔊'}
      </button>
    );
  }

  return { muted, toggleMute, MuteButton };
}
