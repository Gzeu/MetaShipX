import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { GameBoard } from '../components/GameBoard/GameBoard';
import { useSounds } from '../audio/useSounds';
import { EMPTY_BOARD } from '../utils/board';

type AttackResult = 'miss' | 'hit' | 'sunk' | 'win';

interface AttackEvent {
  gameId: string;
  attacker: string;
  row: number;
  col: number;
  result: AttackResult;
  txHash: string;
}

interface Cell { state: 'empty' | 'miss' | 'hit' | 'sunk'; }

const initBoard = (): Cell[][] =>
  Array.from({ length: 10 }, () =>
    Array.from({ length: 10 }, () => ({ state: 'empty' as const }))
  );

export const SpectatorPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const sounds = useSounds();
  const socketRef = useRef<Socket | null>(null);

  const [player1, setPlayer1] = useState<string | null>(null);
  const [player2, setPlayer2] = useState<string | null>(null);
  const [board1, setBoard1] = useState<Cell[][]>(initBoard()); // player1 board (under attack)
  const [board2, setBoard2] = useState<Cell[][]>(initBoard()); // player2 board (under attack)
  const [log, setLog] = useState<string[]>([]);
  const [spectators, setSpectators] = useState(1);
  const [gameOver, setGameOver] = useState<{ winner: string; reward: number } | null>(null);
  const [connected, setConnected] = useState(false);

  const addLog = (msg: string) =>
    setLog(prev => [`${new Date().toLocaleTimeString()} — ${msg}`, ...prev].slice(0, 60));

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:4000';
    const socket = io(wsUrl, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join:spectate', gameId);
      addLog('Connected as spectator');
    });
    socket.on('disconnect', () => setConnected(false));

    socket.on('spectator:player_joined', ({ player2: p2 }: { player2: string }) => {
      setPlayer2(p2);
      addLog(`Player 2 joined: ${short(p2)}`);
    });

    socket.on('spectator:attack', (ev: AttackEvent) => {
      // Determine which board to update
      // Attacker hits the ENEMY board → the other player's board
      const isP1Attacking = ev.attacker === player1;
      const cellState = ev.result === 'miss' ? 'miss' : ev.result === 'hit' ? 'hit' : 'sunk';

      if (isP1Attacking) {
        setBoard2(prev => {
          const next = prev.map(r => r.map(c => ({ ...c })));
          next[ev.row][ev.col].state = cellState;
          return next;
        });
      } else {
        setBoard1(prev => {
          const next = prev.map(r => r.map(c => ({ ...c })));
          next[ev.row][ev.col].state = cellState;
          return next;
        });
      }

      const who = isP1Attacking ? short(player1 ?? '') : short(ev.attacker);
      addLog(`${who} fired at [${ev.row},${ev.col}] → ${ev.result.toUpperCase()}`);

      if (ev.result === 'hit' || ev.result === 'sunk') sounds.hit();
      else sounds.miss();
      if (ev.result === 'sunk') setTimeout(() => sounds.sunk(), 300);
    });

    socket.on('spectator:ship_sunk', ({ victim, shipType }: { victim: string; shipType: string }) => {
      addLog(`☠️  ${short(victim)}'s ${shipType} was sunk!`);
    });

    socket.on('spectator:game_ended', ({ winner, reward }: { winner: string; reward: number }) => {
      setGameOver({ winner, reward });
      sounds.win();
      addLog(`🏆 Game over — winner: ${short(winner)} (+${reward.toFixed(2)} EGLD)`);
    });

    socket.on('game:spectator_count', ({ count }: { count: number }) => {
      setSpectators(count);
    });

    return () => { socket.disconnect(); };
  }, [gameId]);

  const short = (addr: string) => addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '?';

  return (
    <div style={{
      minHeight: '100vh',
      background: '#050d18',
      color: '#e0f0ff',
      fontFamily: 'Courier New, monospace',
      padding: '16px',
    }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <Link to="/lobby" style={{ color:'#4f98a3', textDecoration:'none', fontSize:13 }}>← Lobby</Link>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:12, color:'rgba(224,240,255,0.4)', letterSpacing:2 }}>
            SPECTATING #{gameId?.slice(0,8)}
          </span>
          <span style={{
            fontSize:11, background: connected ? 'rgba(102,187,106,0.15)' : 'rgba(239,83,80,0.15)',
            color: connected ? '#66bb6a' : '#ef5350',
            border: `1px solid ${connected ? '#66bb6a' : '#ef5350'}`,
            borderRadius:12, padding:'2px 8px',
          }}>
            {connected ? '● LIVE' : '○ OFFLINE'}
          </span>
          <span style={{ fontSize:11, color:'rgba(224,240,255,0.4)' }}>👁 {spectators}</span>
        </div>
      </div>

      {/* Boards */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, marginBottom:20 }}>
        <div>
          <div style={{ textAlign:'center', fontSize:11, letterSpacing:3, color:'rgba(224,240,255,0.4)', marginBottom:8 }}>
            {short(player1 ?? 'PLAYER 1')}'s WATERS
          </div>
          <GameBoard board={board1 as any} interactive={false} showShips={false} />
        </div>
        <div>
          <div style={{ textAlign:'center', fontSize:11, letterSpacing:3, color:'rgba(224,240,255,0.4)', marginBottom:8 }}>
            {short(player2 ?? 'PLAYER 2')}'s WATERS
          </div>
          <GameBoard board={board2 as any} interactive={false} showShips={false} />
        </div>
      </div>

      {/* Game over overlay */}
      {gameOver && (
        <div style={{
          textAlign:'center', padding:'24px 16px',
          background:'rgba(10,30,10,0.8)', borderRadius:12,
          border:'1px solid #66bb6a', marginBottom:20,
        }}>
          <div style={{ fontSize:40 }}>🏆</div>
          <h2 style={{ margin:'8px 0', color:'#66bb6a' }}>Game Over</h2>
          <p style={{ color:'rgba(224,240,255,0.7)', margin:'4px 0' }}>Winner: {short(gameOver.winner)}</p>
          <p style={{ color:'#66bb6a', fontWeight:700, fontSize:18 }}>+{gameOver.reward.toFixed(3)} EGLD</p>
        </div>
      )}

      {/* Live log */}
      <div style={{
        background:'rgba(10,20,40,0.8)', border:'1px solid rgba(79,152,163,0.2)',
        borderRadius:8, padding:12, maxHeight:200, overflowY:'auto',
      }}>
        <div style={{ fontSize:11, letterSpacing:2, color:'rgba(224,240,255,0.3)', marginBottom:8 }}>BATTLE LOG</div>
        {log.map((l, i) => (
          <div key={i} style={{ fontSize:11, color:'rgba(224,240,255,0.6)', lineHeight:1.7,
            borderBottom: i < log.length-1 ? '1px solid rgba(79,152,163,0.08)' : 'none',
            paddingBottom:2 }}>
            {l}
          </div>
        ))}
        {log.length === 0 && (
          <div style={{ fontSize:11, color:'rgba(224,240,255,0.2)', textAlign:'center' }}>Waiting for action...</div>
        )}
      </div>
    </div>
  );
};
