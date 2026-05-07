import { Address, ContractFunction, ResultsParser, SmartContract, Transaction } from '@multiversx/sdk-core';
import { sendTransactions } from '@multiversx/sdk-dapp/services';
import { TOURNAMENT_CONTRACT_ADDRESS, GATEWAY_URL } from '../config';
import { ProxyNetworkProvider } from '@multiversx/sdk-network-providers';

const provider = new ProxyNetworkProvider(GATEWAY_URL);
const resultsParser = new ResultsParser();

// ── Types ──────────────────────────────────────────────────────────────────

export type TournamentStatus = 'registration' | 'active' | 'completed';
export type MatchStatus = 'pending' | 'active' | 'completed' | 'bye';

export interface TournamentPlayer {
  address: string;
  seed: number;
  wins: number;
  eliminated: boolean;
}

export interface BracketMatch {
  id: string;
  matchId: number;
  round: number;
  matchIndex: number;
  player1: TournamentPlayer | null;
  player2: TournamentPlayer | null;
  winner: TournamentPlayer | null;
  gameId: number;
  status: MatchStatus;
}

export interface Tournament {
  id: string;
  name: string;
  description: string;
  entryFee: string;
  prizePool: string;
  maxPlayers: number;
  registeredPlayers: TournamentPlayer[];
  bracket: BracketMatch[];
  rounds: number;
  status: TournamentStatus;
  startTime: number;
  winner: string | null;
}

// ── Status mapping ─────────────────────────────────────────────────────────

function mapStatus(raw: number): TournamentStatus {
  if (raw === 0) return 'registration';
  if (raw === 1) return 'active';
  return 'completed';
}

function mapMatchStatus(raw: number): MatchStatus {
  if (raw === 0) return 'pending';
  if (raw === 1) return 'active';
  if (raw === 2) return 'completed';
  return 'bye';
}

// ── Smart contract instance ────────────────────────────────────────────────

function getTournamentContract() {
  return new SmartContract({ address: new Address(TOURNAMENT_CONTRACT_ADDRESS) });
}

// ── Bracket Generation (client-side preview) ───────────────────────────────

/**
 * Build a full single-elimination bracket from a player list.
 * Uses seeded matchups: 1 vs N, 2 vs N-1, etc.
 * Returns BracketMatch[] with all rounds, including Pending future rounds.
 */
export function generateBracket(players: TournamentPlayer[]): BracketMatch[] {
  const n = players.length;
  if (n < 2) return [];

  // Pad to next power of 2
  const size = nextPow2(n);
  const rounds = Math.log2(size);
  const matches: BracketMatch[] = [];
  let matchIdCounter = 1;

  // Round 1: seeded matchups
  for (let i = 0; i < size / 2; i++) {
    const s1 = i;            // index in seeded array (0-based)
    const s2 = size - 1 - i;
    const p1 = players[s1] ?? null;
    const p2 = players[s2] ?? null;
    const isBye = !p2;

    matches.push({
      id: `m-${matchIdCounter}`,
      matchId: matchIdCounter++,
      round: 1,
      matchIndex: i,
      player1: p1,
      player2: isBye ? null : p2,
      winner: isBye ? p1 : null,
      gameId: 0,
      status: isBye ? 'bye' : 'pending',
    });
  }

  // Rounds 2..rounds: empty Pending slots
  for (let r = 2; r <= rounds; r++) {
    const matchesInRound = size / Math.pow(2, r);
    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        id: `m-${matchIdCounter}`,
        matchId: matchIdCounter++,
        round: r,
        matchIndex: i,
        player1: null,
        player2: null,
        winner: null,
        gameId: 0,
        status: 'pending',
      });
    }
  }

  return matches;
}

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

// ── Read: fetch tournament list ────────────────────────────────────────────

export async function fetchTournamentCount(): Promise<number> {
  const contract = getTournamentContract();
  const query = contract.createQuery({ func: new ContractFunction('getTournamentCount') });
  const response = await provider.queryContract(query);
  const [count] = resultsParser.parseUntypedQueryResponse(response).values;
  return count ? parseInt(count.toString(), 10) : 0;
}

export async function fetchTournament(id: number): Promise<Tournament | null> {
  try {
    const contract = getTournamentContract();

    // Fetch info
    const infoQuery = contract.createQuery({
      func: new ContractFunction('getTournamentInfo'),
      args: [{ type: 'u64', value: id }],
    });
    const infoRes = await provider.queryContract(infoQuery);
    const [raw] = resultsParser.parseUntypedQueryResponse(infoRes).values;
    if (!raw) return null;

    // Fetch players
    const playersQuery = contract.createQuery({
      func: new ContractFunction('getPlayers'),
      args: [{ type: 'u64', value: id }],
    });
    const playersRes = await provider.queryContract(playersQuery);
    const playerValues = resultsParser.parseUntypedQueryResponse(playersRes).values;

    const players: TournamentPlayer[] = playerValues.map((v: any) => ({
      address: v.address?.toString() ?? '',
      seed: Number(v.seed ?? 0),
      wins: Number(v.wins ?? 0),
      eliminated: Boolean(v.eliminated),
    }));

    // Fetch bracket
    const bracketQuery = contract.createQuery({
      func: new ContractFunction('getFullBracket'),
      args: [{ type: 'u64', value: id }],
    });
    const bracketRes = await provider.queryContract(bracketQuery);
    const bracketValues = resultsParser.parseUntypedQueryResponse(bracketRes).values;

    const playerBySeed = Object.fromEntries(players.map(p => [p.seed, p]));

    const bracket: BracketMatch[] = bracketValues.map((v: any) => {
      const s1 = Number(v.player1_seed ?? 0);
      const s2 = Number(v.player2_seed ?? 0);
      const ws = Number(v.winner_seed ?? 0);
      return {
        id: `m-${v.match_id}`,
        matchId: Number(v.match_id),
        round: Number(v.round),
        matchIndex: Number(v.match_index),
        player1: s1 > 0 ? (playerBySeed[s1] ?? null) : null,
        player2: s2 > 0 ? (playerBySeed[s2] ?? null) : null,
        winner: ws > 0 ? (playerBySeed[ws] ?? null) : null,
        gameId: Number(v.game_id ?? 0),
        status: mapMatchStatus(Number(v.status ?? 0)),
      };
    });

    const info: any = raw;
    const maxPlayers = Number(info.max_players ?? 0);
    const rounds = Math.log2(nextPow2(maxPlayers));

    return {
      id: String(id),
      name: info.name?.toString() ?? `Tournament #${id}`,
      description: `Single-elimination · ${maxPlayers} jucători · ${(Number(info.entry_fee ?? 0) / 1e18).toFixed(3)} EGLD intrare`,
      entryFee: (Number(info.entry_fee ?? 0) / 1e18).toFixed(3),
      prizePool: (Number(info.prize_pool ?? 0) / 1e18).toFixed(3),
      maxPlayers,
      registeredPlayers: players,
      bracket,
      rounds,
      status: mapStatus(Number(info.status ?? 0)),
      startTime: Number(info.start_time ?? 0) * 1000,
      winner: info.winner?.toString() || null,
    };
  } catch {
    return null;
  }
}

export async function fetchAllTournaments(): Promise<Tournament[]> {
  const count = await fetchTournamentCount();
  const results = await Promise.all(
    Array.from({ length: count }, (_, i) => fetchTournament(i + 1))
  );
  return results.filter(Boolean) as Tournament[];
}

// ── Write: register ────────────────────────────────────────────────────────

export async function registerForTournament(
  tournamentId: string,
  callerAddress: string,
  entryFeeEgld: string,
): Promise<void> {
  const contract = getTournamentContract();
  const tx = contract.methods
    .register([parseInt(tournamentId)])
    .withValue(entryFeeEgld)
    .withGasLimit(10_000_000)
    .withChainID('D') // devnet; change to '1' for mainnet
    .buildTransaction();

  await sendTransactions({
    transactions: [tx],
    transactionsDisplayInfo: { processingMessage: 'Înregistrare turneu…', errorMessage: 'Eroare', successMessage: 'Înregistrat!' },
  });
}
