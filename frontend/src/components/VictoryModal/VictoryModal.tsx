import React, { useEffect, useRef } from 'react';
import './VictoryModal.css';

interface Props {
  isOpen: boolean;
  didWin: boolean;
  prize: string;
  opponentAddress: string;
  onClose: () => void;
  onBackToLobby: () => void;
}

function shortAddr(a: string) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '—';
}

export const VictoryModal: React.FC<Props> = ({
  isOpen, didWin, prize, opponentAddress, onClose, onBackToLobby
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Confetti on win
  useEffect(() => {
    if (!isOpen || !didWin) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const particles = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 4 + 2,
      color: ['#6366f1','#8b5cf6','#22c55e','#eab308','#3b82f6','#ec4899'][Math.floor(Math.random()*6)],
      size: Math.random() * 8 + 4,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 5,
    }));

    let raf: number;
    function draw() {
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      for (const p of particles) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5);
        ctx.restore();
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        if (p.y > canvas!.height) {
          p.y = -20;
          p.x = Math.random() * canvas!.width;
        }
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
    const timer = setTimeout(() => cancelAnimationFrame(raf), 5000);
    return () => { cancelAnimationFrame(raf); clearTimeout(timer); };
  }, [isOpen, didWin]);

  if (!isOpen) return null;

  return (
    <div className="vm__overlay" onClick={onClose}>
      <div className="vm__modal" onClick={e => e.stopPropagation()}>
        {didWin && (
          <canvas ref={canvasRef} className="vm__canvas" />
        )}

        <div className="vm__icon">{didWin ? '🏆' : '💀'}</div>
        <h2 className={`vm__title ${didWin ? 'vm__title--win' : 'vm__title--loss'}`}>
          {didWin ? 'Victory!' : 'Defeat'}
        </h2>

        <p className="vm__subtitle">
          {didWin
            ? 'You sank the entire enemy fleet!'
            : `${shortAddr(opponentAddress)} destroyed your fleet.`
          }
        </p>

        {didWin && prize && (
          <div className="vm__prize">
            <span className="vm__prize-label">Prize earned</span>
            <span className="vm__prize-amount">💰 {prize} EGLD</span>
          </div>
        )}

        <div className="vm__stats">
          <div className="vm__stat">
            <span className="vm__stat-label">Result</span>
            <span className={`vm__stat-value ${didWin ? 'vm__stat-value--win' : 'vm__stat-value--loss'}`}>
              {didWin ? 'WIN' : 'LOSS'}
            </span>
          </div>
          <div className="vm__stat">
            <span className="vm__stat-label">Opponent</span>
            <span className="vm__stat-value">{shortAddr(opponentAddress)}</span>
          </div>
        </div>

        <div className="vm__actions">
          <button className="vm__btn-primary" onClick={onBackToLobby}>🎮 Play Again</button>
          <button className="vm__btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default VictoryModal;
