import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useGetNetworkConfig } from '@multiversx/sdk-dapp/hooks';
import { ProxyNetworkProvider } from '@multiversx/sdk-network-providers';
import { SmartContract, ContractFunction, Address } from '@multiversx/sdk-core';
import { GameBoard } from '../components/GameBoard';
import { BATTLESHIP_CONTRACT_ADDRESS } from '../config';
import { useSound } from '../hooks/useSound';

const POLL_MS = 4000;

interface SpectatorState {
  player1:       string;
  player2:       string;
  status:        number; // 0=waiting,1=placement,2=active,3=finished
  currentTurn:   string;
  board1:        number[][];
  board2:        number[][];
  lastAttackRow: number;
  lastAttackCol: number;
  lastHit:       boolean;
  winner:        string;
}

export default function SpectatorPage() {
  const { id }           = useParams<{ id: string }>();
  const { network }      = useGetNetworkConfig();
  const { play }         = useSound();
  const [state, setState] = useState<SpectatorState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const prevStatusRef         = useRef<number>(-1);
  const prevTurnRef           = useRef<string>('');

  const fetchState = useCallback(async () => {
    if (!id) return;
    try {
      const provider = new ProxyNetworkProvider(network.apiAddress, { timeout: 8_000 });
      const contract = new SmartContract({ address: new Address(BATTLESHIP_CONTRACT_ADDRESS) });
      const query    = contract.createQuery({
        func: new ContractFunction('getGameState'),
        args: [],
      });
      const res = await provider.queryContract(query);

      // Minimal parse — real ABI decoding done via ABI json in production
      const raw = res.returnData[0];
      if (!raw) { setError('Game not found'); return; }

      // Placeholder parse — replace with real ABI codec when ABI is deployed
      const parsed: SpectatorState = {
        player1: 'erd1...', player2: 'erd1...', status: 2,
        currentTurn: 'erd1...', board1: [], board2: [],
        lastAttackRow: -1, lastAttackCol: -1, lastHit: false, winner: '',
      };

      // Sound events on state transitions
      if (prevStatusRef.current !== parsed.status) {
        if (parsed.status === 3) {
          play(parsed.winner ? 'victory' : 'defeat');
        }
        prevStatusRef.current = parsed.status;
      }
      if (prevTurnRef.current !== parsed.currentTurn && prevTurnRef.current !== '') {
        play(parsed.lastHit ? 'explosion' : 'splash');
        prevTurnRef.current = parsed.currentTurn;
      }
      if (prevTurnRef.current === '') prevTurnRef.current = parsed.currentTurn;

      setState(parsed);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to fetch game state');
    } finally {
      setLoading(false);
    }
  }, [id, network.apiAddress, play]);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, POLL_MS);
    return () => clearInterval(interval);
  }, [fetchState]);

  const statusLabel = (s: number) =>
    ['Waiting', 'Ship Placement', 'Active ⚔', 'Finished 🏆'][s] ?? 'Unknown';

  return (
    <main className="spectator-page">
      <header className="spectator-header">
        <h1>👁 Spectating Game #{id}</h1>
        {state && <span className={`spectator-status spectator-status--${state.status}`}>{statusLabel(state.status)}</span>}
      </header>

      {loading && !state && <p className="spectator-loading">Connecting to game feed…</p>}
      {error   && <p className="spectator-error" role="alert">⚠ {error}</p>}

      {state && (
        <div className="spectator-boards">
          <section className="spectator-player">
            <h2 title={state.player1}>Player 1 {state.currentTurn === state.player1 && '🎯'}</h2>
            <GameBoard
              board={state.board1}
              isOwnBoard
              disabled
              onCellClick={() => {}}
            />
          </section>
          <section className="spectator-player">
            <h2 title={state.player2}>Player 2 {state.currentTurn === state.player2 && '🎯'}</h2>
            <GameBoard
              board={state.board2}
              isOwnBoard={false}
              disabled
              onCellClick={() => {}}
            />
          </section>
        </div>
      )}

      {state?.status === 3 && state.winner && (
        <div className="spectator-winner">
          <h2>🏆 Winner: <span title={state.winner}>{state.winner.slice(0, 8)}…</span></h2>
        </div>
      )}

      <p className="spectator-poll">Auto-refresh every {POLL_MS / 1000}s</p>
    </main>
  );
}
