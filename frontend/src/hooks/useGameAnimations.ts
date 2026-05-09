import { useCallback, useRef } from 'react';

export type CellResult = 'hit' | 'miss' | 'sunk';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

const COLORS: Record<CellResult, string[]> = {
  hit: ['#ef4444', '#f97316', '#fbbf24'],
  miss: ['#3b82f6', '#60a5fa', '#93c5fd'],
  sunk: ['#f97316', '#ef4444', '#fbbf24', '#ffffff'],
};

const CELL_KEYFRAMES: Record<CellResult, Keyframe[]> = {
  hit: [
    { transform: 'scale(1)', backgroundColor: '' },
    { transform: 'scale(1.45)', backgroundColor: '#ef4444', boxShadow: '0 0 24px #ef4444' },
    { transform: 'scale(1)', backgroundColor: '#ef4444', boxShadow: '0 0 8px #ef4444' },
  ],
  miss: [
    { transform: 'scale(1) rotate(0deg)', backgroundColor: '' },
    { transform: 'scale(1.2) rotate(-8deg)', backgroundColor: '#3b82f6' },
    { transform: 'scale(1) rotate(4deg)', backgroundColor: '#3b82f6' },
    { transform: 'scale(1) rotate(0deg)', backgroundColor: '#3b82f6' },
  ],
  sunk: [
    { transform: 'scale(1)', backgroundColor: '' },
    { transform: 'scale(1.6)', backgroundColor: '#f97316', boxShadow: '0 0 40px #f97316' },
    { transform: 'scale(0.85)', backgroundColor: '#1e293b', boxShadow: '0 0 0px #f97316' },
    { transform: 'scale(1.1)', backgroundColor: '#1e293b' },
    { transform: 'scale(1)', backgroundColor: '#1e293b' },
  ],
};

const TIMING: Record<CellResult, EffectTiming> = {
  hit:  { duration: 500, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' },
  miss: { duration: 400, easing: 'ease-out', fill: 'forwards' },
  sunk: { duration: 800, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'forwards' },
};

export function useGameAnimations() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  const getCanvas = useCallback((): HTMLCanvasElement | null => {
    if (!canvasRef.current) {
      const existing = document.getElementById('particle-canvas') as HTMLCanvasElement;
      if (existing) { canvasRef.current = existing; return existing; }
      const canvas = document.createElement('canvas');
      canvas.id = 'particle-canvas';
      canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;width:100%;height:100%';
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      document.body.appendChild(canvas);
      canvasRef.current = canvas;
    }
    return canvasRef.current;
  }, []);

  const spawnParticles = useCallback((x: number, y: number, result: CellResult) => {
    const canvas = getCanvas();
    if (!canvas) return;
    const count = result === 'sunk' ? 40 : result === 'hit' ? 20 : 10;
    const colors = COLORS[result];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = result === 'sunk' ? 4 + Math.random() * 6 : 2 + Math.random() * 4;
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (result === 'sunk' ? 3 : 1),
        life: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: result === 'sunk' ? 3 + Math.random() * 4 : 2 + Math.random() * 3,
      });
    }

    const tick = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life -= 0.025;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (particlesRef.current.length > 0) rafRef.current = requestAnimationFrame(tick);
    };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, [getCanvas]);

  const animateCell = useCallback((element: HTMLElement, result: CellResult, rect?: DOMRect) => {
    element.animate(CELL_KEYFRAMES[result], TIMING[result]);
    const r = rect ?? element.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    spawnParticles(cx, cy, result);
  }, [spawnParticles]);

  return { animateCell, spawnParticles };
}
