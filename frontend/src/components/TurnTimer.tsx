import { useEffect, useState, useRef } from 'react';
import './TurnTimer.css';

const TURN_DURATION = 30;

interface TurnTimerProps {
  isMyTurn: boolean;
  onTimeout?: () => void;
}

export function TurnTimer({ isMyTurn, onTimeout }: TurnTimerProps) {
  const [seconds, setSeconds] = useState(TURN_DURATION);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isMyTurn) {
      setSeconds(TURN_DURATION);
      setVisible(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    setVisible(true);

    // Browser notification
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('🎯 Rândul tău în MetaShipX!', {
          body: `Ai ${TURN_DURATION} secunde să ataci!`,
          icon: '/favicon.ico',
          tag: 'metashipx-turn',
          renotify: true,
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }

    intervalRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onTimeout?.();
          return TURN_DURATION;
        }
        return s - 1;
      });
    }, 1000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isMyTurn, onTimeout]);

  if (!visible) return null;

  const pct = (seconds / TURN_DURATION) * 100;
  const circumference = 2 * Math.PI * 20;
  const dashOffset = circumference - (pct / 100) * circumference;
  const color = seconds > 15 ? '#22c55e' : seconds > 7 ? '#f59e0b' : '#ef4444';
  const urgentClass = seconds <= 7 ? 'turn-timer--urgent' : '';

  return (
    <div className={`turn-timer ${urgentClass}`}>
      <span className="turn-timer__label">🎯 Rândul tău!</span>
      <div className="turn-timer__ring">
        <svg width="52" height="52" viewBox="0 0 52 52">
          <circle cx="26" cy="26" r="20" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4"/>
          <circle
            cx="26" cy="26" r="20" fill="none"
            stroke={color} strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
          />
        </svg>
        <span className="turn-timer__seconds" style={{ color, fontVariantNumeric: 'tabular-nums' }}>
          {seconds}
        </span>
      </div>
    </div>
  );
}
