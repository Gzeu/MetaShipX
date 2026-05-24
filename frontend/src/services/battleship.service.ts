import { sendTransactions } from '@multiversx/sdk-dapp/services';
import { refreshAccount }   from '@multiversx/sdk-dapp/utils';
import { ProxyNetworkProvider } from '@multiversx/sdk-network-providers';
import { Address } from '@multiversx/sdk-core';
import {
  BATTLESHIP_CONTRACT_ADDRESS,
  TOURNAMENT_CONTRACT_ADDRESS,
  LEADERBOARD_CONTRACT_ADDRESS,
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

// ─── Leaderboard types ──────────────────────────────────────────────────────

/**
 * Mirrors the on-chain `LeaderEntry` struct from contracts/leaderboard/src/lib.rs
 *
 * Layout (TopEncode, in field order):
 *   Address player (32 bytes) | u32 wins | BigUint egld_won | u32 games_played
 */
export interface LeaderEntry {
  address:     string;  // bech32
  wins:        number;
  egldEarned:  string;  // EGLD as decimal string (e.g. "2.5")
  gamesPlayed: number;
  losses:      number;  // derived: gamesPlayed - wins
}

// ─── Tournament types ───────────────────────────────────────────────────────

export type TournamentStatus =
  | 'Open'
  | 'InProgress'
  | 'Finished'
  | 'Cancelled';

/**
 * Mirrors the on-chain `Tournament` struct (v2-supernova).
 * IMPORTANT: `created_at_ms` is in milliseconds (get_block_timestamp_millis).
 */
export interface Tournament {
  id:              bigint;
  name:            string;
  entry_fee:       bigint;
  prize_pool:      bigint;
  max_players:     number;
  current_players: number;
  status:          TournamentStatus;
  winner:          string | null;
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

export function createTournament(
  name: string,
  entryFeeEgld: string,
  maxPlayers: number,
) {
  const nameHex       = Buffer.from(name, 'utf8').toString('hex');
  const entryFeeWei   = BigInt(Math.round(parseFloat(entryFeeEgld) * 1e18));
  const entryFeeHex   = hex16(entryFeeWei);
  const maxPlayersHex = hex8(maxPlayers);
  return sendTournamentTx(
    `createTournament@${nameHex}@${entryFeeHex}@${maxPlayersHex}`,
    entryFeeEgld,
    15_000_000,
  );
}

export function joinTournament(tournamentId: bigint, entryFeeEgld: string) {
  return sendTournamentTx(
    `joinTournament@${hex16(tournamentId)}`,
    entryFeeEgld,
    12_000_000,
  );
}

// ─── Poll attack result ───────────────────────────────────────────────

export async function pollAttackResult(
  gameId:    number,
  row:       number,
  col:       number,
  _sessionId: string,
  timeoutMs  = 10_000,
): Promise<{ result: 'hit' | 'miss' | 'sunk'; gameOver: boolean; winner: string } | null> {
  const POLL_INTERVAL = 600;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
    const state = await getGameState(gameId);
    if (!state) continue;
    const cell = state.board2[row]?.[col] ?? 0;
    if (cell === 0) continue;
    return {
      result:   cell === 3 ? 'sunk' : cell === 2 ? 'hit' : 'miss',
      gameOver: state.status === 'finished',
      winner:   state.winner,
    };
  }
  return null;
}

// ─── Query helpers ────────────────────────────────────────────────────────

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

function queryLeaderboard(func: string, args: string[] = []) {
  return queryContract(func, args, LEADERBOARD_CONTRACT_ADDRESS);
}

// ─── Battleship read endpoints ────────────────────────────────────────────

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

// ─── Leaderboard read endpoints ───────────────────────────────────────────

/**
 * Decode a single `LeaderEntry` blob from base64.
 *
 * On-chain TopEncode layout (contracts/leaderboard/src/lib.rs):
 *   Address (32 bytes) | u32 wins (4 bytes) | BigUint egld_won (4-byte len prefix + N bytes) | u32 games_played (4 bytes)
 */
function decodeLeaderEntry(raw: string): LeaderEntry | null {
  try {
    const buf = Buffer.from(raw, 'base64');
    let offset = 0;

    // Address — 32 bytes, encode as bech32 via Address helper
    const pubkeyBytes = buf.slice(offset, offset + 32);
    offset += 32;
    const address = new Address(pubkeyBytes).toBech32();

    // wins — u32
    const wins = buf.readUInt32BE(offset);
    offset += 4;

    // egld_won — BigUint (4-byte length prefix + N bytes)
    const egldLen = buf.readUInt32BE(offset);
    offset += 4;
    let egldWeiRaw = 0n;
    for (let i = 0; i < egldLen; i++) {
      egldWeiRaw = (egldWeiRaw << 8n) | BigInt(buf[offset + i]);
    }
    offset += egldLen;
    // Convert from 10^18 denomination to decimal string with 4 dp
    const egldFloat = Number(egldWeiRaw) / 1e18;
    const egldEarned = egldFloat.toFixed(4);

    // games_played — u32
    const gamesPlayed = buf.readUInt32BE(offset);

    return {
      address,
      wins,
      egldEarned,
      gamesPlayed,
      losses: Math.max(0, gamesPlayed - wins),
    };
  } catch {
    return null;
  }
}

/**
 * Fetch on-chain top-50 leaderboard from the leaderboard contract.
 * Falls back to empty array on any network/decode error.
 *
 * @param limit max entries to request (1-50, default 50)
 */
export async function getTopPlayers(limit = 50): Promise<LeaderEntry[]> {
  try {
    const limitHex = hex8(Math.min(50, Math.max(1, limit)));
    const res = await queryLeaderboard('getTopPlayers', [limitHex]);
    const entries = (res.returnData ?? [])
      .map((raw: string) => decodeLeaderEntry(raw))
      .filter((e: LeaderEntry | null): e is LeaderEntry => e !== null);
    return entries;
  } catch {
    return [];
  }
}

/**
 * Fetch 1-based rank of a player. Returns 0 if not in top-50.
 */
export async function getPlayerRank(address: string): Promise<number> {
  try {
    const pubkey = Buffer.from(new Address(address).pubkey()).toString('hex');
    const res = await queryLeaderboard('getPlayerRank', [pubkey]);
    const raw = res.returnData?.[0];
    if (!raw) return 0;
    return Buffer.from(raw, 'base64').readUInt32BE(0);
  } catch {
    return 0;
  }
}

/**
 * Fetch stats for a single player. Returns null if not found.
 */
export async function getPlayerStats(address: string): Promise<{ wins: number; egldEarned: string } | null> {
  try {
    const pubkey = Buffer.from(new Address(address).pubkey()).toString('hex');
    const res = await queryLeaderboard('getPlayerStats', [pubkey]);
    const raw = res.returnData?.[0];
    if (!raw) return null;
    const buf = Buffer.from(raw, 'base64');
    let offset = 0;
    const wins = buf.readUInt32BE(offset); offset += 4;
    const egldLen = buf.readUInt32BE(offset); offset += 4;
    let egldWeiRaw = 0n;
    for (let i = 0; i < egldLen; i++) egldWeiRaw = (egldWeiRaw << 8n) | BigInt(buf[offset + i]);
    return { wins, egldEarned: (Number(egldWeiRaw) / 1e18).toFixed(4) };
  } catch {
    return null;
  }
}

// ─── Tournament read endpoints ───────────────────────────────────────────

function decodeTournament(raw: string, fallbackId: number): Tournament {
  const buf = Buffer.from(raw, 'base64');
  let offset = 0;

  const readU64 = () => { const v = buf.readBigUInt64BE(offset); offset += 8; return v; };
  const readU32 = () => { const v = buf.readUInt32BE(offset);    offset += 4; return v; };
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

  const id              = readU64();
  const name            = readBuffer();
  const entry_fee       = readBigUint();
  const prize_pool      = readBigUint();
  const max_players     = readU32();
  const current_players = readU32();
  const statusIdx       = buf[offset++];
  const hasWinner       = buf[offset++];
  let winner: string | null = null;
  if (hasWinner === 1) { winner = buf.toString('hex', offset, offset + 32); offset += 32; }
  const created_at_ms = readU64();

  void fallbackId;
  return { id, name, entry_fee, prize_pool, max_players, current_players,
    status: statusValues[statusIdx] ?? 'Cancelled', winner, created_at_ms };
}

export async function getTournament(tournamentId: bigint): Promise<Tournament | null> {
  try {
    const res = await queryTournament('getTournament', [hex16(tournamentId)]);
    const raw = res.returnData?.[0];
    if (!raw) return null;
    return decodeTournament(raw, Number(tournamentId));
  } catch { return null; }
}

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
  } catch { return []; }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export const battleshipService = {
  createGame, joinGame, placeShips, attack, withdraw,
  getGameState, getPlayerGames, pollAttackResult,
  getTopPlayers, getPlayerRank, getPlayerStats,
  createTournament, joinTournament,
  getTournament, getActiveTournaments,
};
