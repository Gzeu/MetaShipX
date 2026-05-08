import { useBattleAudio } from '../../hooks/useBattleAudio';
import './MuteButton.css';

export function MuteButton() {
  const { muted, toggleMute } = useBattleAudio();
  return (
    <button
      className="mute-btn"
      onClick={toggleMute}
      aria-label={muted ? 'Unmute battle sounds' : 'Mute battle sounds'}
      title={muted ? 'Unmute' : 'Mute'}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
