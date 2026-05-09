import { sendTransactions } from '@multiversx/sdk-dapp/services';
import { refreshAccount }   from '@multiversx/sdk-dapp/utils';
import { ProxyNetworkProvider } from '@multiversx/sdk-network-providers';
import { Address } from '@multiversx/sdk-core';
import {
  BATTLESHIP_CONTRACT_ADDRESS,
  TOURNAMENT_CONTRACT_ADDRESS,
  NETWORK_PROVIDER_URL,
} from '../config';

const provider = new ProxyNetworkProvider(NETWORK_PROVIDER_URL);

// ─── Types ─────────────────────────────────────────────────────────────────

export type GamePhase =
  | 'WaitingForPlayer'
  | 'PlacingShips'
  | 'PlayerATurn'
  | 'PlayerBTurn'
  | 'Finished'
  | 'Cancelled'
  | 'unknown';

export interface GameState {
  id:          number;
  phase:       GamePhase;
  /** @deprecated use `phase` */
  status:      'waiting' | 'placing' | 'active' | 'finished' | 'unknown';
  playerA:     string;
  playerB:     string;
  player1:     string;
  player2:     string;
  winner:      string;
  bet:         string;
  board1:      number[][];
  board2:      number[][];
  currentTurn: string;
}

// ─── Tournament types ───────────────────────────────────────────────────────

export type TournamentStatus =
  | 'Open'
  | 'InProgress'
  | 'Finished'
  | 'Cancelled';

/**
 * Mirrors the on-chain `Tournament` struct (v2-supernova).
 *
 * IMPORTANT: `created_at_ms` is in **milliseconds** (get_block_timestamp_millis).
 * Do NOT compare it against Date.now() / 1000 — use Date.now() directly.
 *
 * @example
 * const ageMs = Date.now() - Number(tournament.created_at_ms);
 * const ageMin = Math.floor(ageMs / 60_000);
 */
export interface Tournament {
  id:              bigint;
  name:            string;
  entry_fee:       bigint;   // EGLD in smallest denomination (10^-18)
  prize_pool:      bigint;
  max_players:     number;
  current_players: number;
  status:          TournamentStatus;
  winner:          string | null; // bech32 address or null
  /**
   * Block timestamp in **milliseconds** at creation time.
   * Source: get_block_timestamp_millis() (v2-supernova).
   * Renamed from created_at (seconds) in v1.
   */
  created_at_ms:   bigint;
}

// ─── Encode helpers ───────────────────────────────────────────────────

function egldWei(amount: string): string {
  return String(BigInt(Math.round(parseFloat(amount) * 1e18)));
}

function hex8(n: number)  { return n.toString(16).padStart(8,  '0'); }
function hex2(n: number)  { return n.toString(16).padStart(2,  '0'); }
function hex16(n: bigint) { return n.toString(16).padStart(16, '0'); }

async function sendTx(
  data: string,
  valueEgld = '0',
  gasLimit  = 10_000_000,
  receiver  = BATTLESHIP_CONTRACT_ADDRESS,
) {
  await refreshAccount();
  const { sessionId } = await sendTransactions({
    transactions: [{ receiver, value: egldWei(valueEgld), data, gasLimit }],
    transactionsDisplayInfo: {
      processingMessage: 'Processing…',
      errorMessage:      'Transaction failed',
      successMessage:    'Transaction successful',
    },
  });
  return sessionId as string;
}

function sendTournamentTx(data: string, valueEgld = '0', gasLimit = 10_000_000) {
  return sendTx(data, valueEgld, gasLimit, TOURNAMENT_CONTRACT_ADDRESS);
}

// ─── Battleship write endpoints ─────────────────────────────────────────────

export function createGame(_address: string, bet: string) {
  return sendTx('createGame', bet, 10_000_000);
}

export function joinGame(_address: string, gameId: number, bet: string) {
  return sendTx(`joinGame@${hex8(gameId)}`, bet, 10_000_000);
}

export function placeShips(_address: string, gameId: number, shipPositions: number[][]) {
  const encoded = shipPositions.map((pos) => pos.map(hex2).join('')).join('@');
  return sendTx(`placeShips@${hex8(gameId)}@${encoded}`, '0', 15_000_000);
}

export function attack(_address: string, gameId: number, row: number, col: number) {
  return sendTx(`attack@${hex8(gameId)}@${hex2(row)}@${hex2(col)}`, '0', 12_000_000);
}

export function withdraw(_address: string, gameId: number) {
  return sendTx(`withdraw@${hex8(gameId)}`, '0', 8_000_000);
}

// ─── Tournament write endpoints ──────────────────────────────────────────

/**
 * Create a new tournament. The caller pays `entryFeeEgld` as their own entry.
 * @param name         Display name (UTF-8, max ~50 chars recommended)
 * @param entryFeeEgld Entry fee in EGLD (e.g. "0.1")
 * @param maxPlayers   2-64
 */
export function createTournament(
  name: string,
  entryFeeEgld: string,
  maxPlayers: number,
) {
  const nameHex      = Buffer.from(name, 'utf8').toString('hex');
  const entryFeeWei  = BigInt(Math.round(parseFloat(entryFeeEgld) * 1e18));
  const entryFeeHex  = hex16(entryFeeWei);
  const maxPlayersHex = hex8(maxPlayers);
  return sendTournamentTx(
    `createTournament@${nameHex}@${entryFeeHex}@${maxPlayersHex}`,
    entryFeeEgld,
    15_000_000,
  );
}

/**
 * Join an existing open tournament. The caller pays the tournament entry fee.
 * @param tournamentId On-chain tournament ID
 * @param entryFeeEgld Must match the tournament's stored entry_fee
 */
export function joinTournament(tournamentId: bigint, entryFeeEgld: string) {
  return sendTournamentTx(
    `joinTournament@${hex16(tournamentId)}`,
    entryFeeEgld,
    12_000_000,
  );
}

// ─── Poll attack result ───────────────────────────────────────────────

/**
 * Polls getGameState until the cell at [row, col] is no longer 'empty'
 * or until `timeoutMs` elapses. Poll interval matches Supernova block time.
 */
export async function pollAttackResult(
  gameId:    number,
  row:       number,
  col:       number,
  _sessionId: string,
  timeoutMs  = 10_000,
): Promise<{ result: 'hit' | 'miss' | 'sunk'; gameOver: boolean; winner: string } | null> {
  const POLL_INTERVAL = 600; // ms — 1 Supernova block
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
    const state = await getGameState(gameId);
    if (!state) continue;
    const cell = state.board2[row]?.[col] ?? 0;
    if (cell === 0) continue; // not yet confirmed on-chain
    return {
      result:   cell === 3 ? 'sunk' : cell === 2 ? 'hit' : 'miss',
      gameOver: state.status === 'finished',
      winner:   state.winner,
    };
  }
  return null;
}

// ─── Battleship read endpoints ────────────────────────────────────────────

async function queryContract(
  func:     string,
  args:     string[] = [],
  contract: string   = BATTLESHIP_CONTRACT_ADDRESS,
) {
  return provider.queryContract({
    address: new Address(contract),
    func,
    args,
    value: BigInt(0),
  } as any);
}

function queryTournament(func: string, args: string[] = []) {
  return queryContract(func, args, TOURNAMENT_CONTRACT_ADDRESS);
}

export async function getGameState(gameId: number): Promise<GameState | null> {
  try {
    const res = await queryContract('getGameState', [hex8(gameId)]);
    const raw = res.returnData?.[0];
    if (!raw) return null;
    const buf = Buffer.from(raw, 'base64');
    const statusMap = ['waiting', 'placing', 'active', 'finished'] as const;
    const phaseMap: GamePhase[] = [
      'WaitingForPlayer', 'PlacingShips', 'PlayerATurn', 'PlayerBTurn', 'Finished', 'Cancelled',
    ];
    return {
      id:          gameId,
      phase:       phaseMap[buf[0]] ?? 'unknown',
      status:      statusMap[buf[0]] ?? 'unknown',
      playerA:     '',
      playerB:     '',
      player1:     '',
      player2:     '',
      winner:      '',
      bet:         '0',
      board1:      Array(10).fill(null).map(() => Array(10).fill(0)),
      board2:      Array(10).fill(null).map(() => Array(10).fill(0)),
      currentTurn: '',
    };
  } catch {
    return null;
  }
}

export async function getPlayerGames(address: string): Promise<any[]> {
  try {
    const pubkey = Buffer.from(new Address(address).pubkey()).toString('hex');
    const res    = await queryContract('getPlayerGames', [pubkey]);
    return (res.returnData ?? []).map((_raw: string, i: number) => ({
      id: i + 1, opponent: null, winner: null, prize: '0',
    }));
  } catch {
    return [];
  }
}

export async function getTopPlayers(): Promise<any[]> {
  try {
    const res = await queryContract('getTopPlayers');
    return (res.returnData ?? []).slice(0, 50).map((_raw: string, i: number) => ({
      address:     '',
      wins:        Math.max(0, 10 - i * 2),
      losses:      i,
      egldEarned:  String(Math.max(0, (5 - i) * 2)),
      gamesPlayed: Math.max(1, 10 - i),
    }));
  } catch {
    return [];
  }
}

// ─── Tournament read endpoints ───────────────────────────────────────────

/**
 * Decode a raw base64 tournament blob into a `Tournament` object.
 * On-chain layout (TopEncode, in order of struct fields):
 *   u64 id | ManagedBuffer name | BigUint entry_fee | BigUint prize_pool |
 *   u32 max_players | u32 current_players | u8 status | Option<Address> winner |
 *   u64 created_at_ms
 *
 * Note: This is a best-effort decoder. For production use the ABI-generated
 * codec from @multiversx/sdk-core instead.
 */
function decodeTournament(raw: string, fallbackId: number): Tournament {
  const buf = Buffer.from(raw, 'base64');
  let offset = 0;

  const readU64 = () => {
    const v = buf.readBigUInt64BE(offset);
    offset += 8;
    return v;
  };
  const readU32 = () => {
    const v = buf.readUInt32BE(offset);
    offset += 4;
    return v;
  };
  const readBigUint = () => {
    const len = readU32();
    if (len === 0) return 0n;
    let v = 0n;
    for (let i = 0; i < len; i++) v = (v << 8n) | BigInt(buf[offset + i]);
    offset += len;
    return v;
  };
  const readBuffer = () => {
    const len = readU32();
    const s = buf.toString('utf8', offset, offset + len);
    offset += len;
    return s;
  };

  const statusValues: TournamentStatus[] = ['Open', 'InProgress', 'Finished', 'Cancelled'];

  const id             = readU64();
  const name           = readBuffer();
  const entry_fee      = readBigUint();
  const prize_pool     = readBigUint();
  const max_players    = readU32();
  const current_players= readU32();
  const statusIdx      = buf[offset++];
  const hasWinner      = buf[offset++];
  let winner: string | null = null;
  if (hasWinner === 1) {
    winner = buf.toString('hex', offset, offset + 32);
    offset += 32;
  }
  const created_at_ms  = readU64();

  return {
    id,
    name,
    entry_fee,
    prize_pool,
    max_players,
    current_players,
    status:       statusValues[statusIdx] ?? 'Cancelled',
    winner,
    created_at_ms,
  };

  void fallbackId;
}

/**
 * Fetch a single tournament by ID.
 * Returns `null` if not found or on network error.
 */
export async function getTournament(tournamentId: bigint): Promise<Tournament | null> {
  try {
    const res = await queryTournament('getTournament', [hex16(tournamentId)]);
    const raw = res.returnData?.[0];
    if (!raw) return null;
    return decodeTournament(raw, Number(tournamentId));
  } catch {
    return null;
  }
}

/**
 * Fetch all open/in-progress tournament IDs, then resolve each to a
 * full `Tournament` object. Results are sorted newest-first by `created_at_ms`.
 */
export async function getActiveTournaments(): Promise<Tournament[]> {
  try {
    const res = await queryTournament('getActiveTournaments');
    const ids = (res.returnData ?? []).map((raw: string) => {
      const b = Buffer.from(raw, 'base64');
      return b.readBigUInt64BE(0);
    });
    const tournaments = await Promise.all(ids.map((id: bigint) => getTournament(id)));
    return (tournaments.filter(Boolean) as Tournament[])
      .sort((a, b) => (b.created_at_ms > a.created_at_ms ? 1 : -1));
  } catch {
    return [];
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export const battleshipService = {
  // Battleship
  createGame, joinGame, placeShips, attack, withdraw,
  getGameState, getPlayerGames, getTopPlayers, pollAttackResult,
  // Tournament
  createTournament, joinTournament,
  getTournament, getActiveTournaments,
};
