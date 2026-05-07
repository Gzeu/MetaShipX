import { NETWORK_CONFIG, BATTLESHIP_CONTRACT_ADDRESS } from '../config';

export type TournamentStatus = 'registration' | 'active' | 'completed';
export type MatchStatus = 'pending' | 'active' | 'completed' | 'bye';

export interface TournamentPlayer {
  address: string;
  wins: number;
  seed: number;
}

export interface BracketMatch {
  id: string;
  round: number;           // 1 = Quarter, 2 = Semi, 3 = Final
  matchIndex: number;      // position in round
  player1: TournamentPlayer | null;
  player2: TournamentPlayer | null;
  winner: TournamentPlayer | null;
  status: MatchStatus;
  gameId?: string;
  scheduledAt?: number;
}

export interface Tournament {
  id: string;
  name: string;
  status: TournamentStatus;
  prizePool: string;        // EGLD formatted
  entryFee: string;         // EGLD formatted
  maxPlayers: number;
  registeredPlayers: TournamentPlayer[];
  bracket: BracketMatch[];
  startTime: number;
  endTime?: number;
  createdBy: string;
  description: string;
  rounds: number;           // log2(maxPlayers)
}

// —— helpers ——
function makeAddr(suffix: string) {
  return `erd1${suffix.padStart(58, '0')}`;
}
function randomSeed() { return Math.floor(Math.random() * 1000); }

const PLAYERS_8: TournamentPlayer[] = [
  { address: makeAddr('aaa1'), wins: 142, seed: 1 },
  { address: makeAddr('bbb2'), wins: 98,  seed: 2 },
  { address: makeAddr('ccc3'), wins: 87,  seed: 3 },
  { address: makeAddr('ddd4'), wins: 75,  seed: 4 },
  { address: makeAddr('eee5'), wins: 61,  seed: 5 },
  { address: makeAddr('fff6'), wins: 55,  seed: 6 },
  { address: makeAddr('ggg7'), wins: 44,  seed: 7 },
  { address: makeAddr('hhh8'), wins: 38,  seed: 8 },
];

const PLAYERS_16: TournamentPlayer[] = Array.from({ length: 16 }, (_, i) => ({
  address: makeAddr(`p${i + 1}`),
  wins: 100 - i * 5,
  seed: i + 1,
}));

function buildBracket(players: TournamentPlayer[], completedRounds = 0): BracketMatch[] {
  const n = players.length; // must be power of 2
  const totalRounds = Math.log2(n);
  const matches: BracketMatch[] = [];

  // Round 1 matchups: 1v8, 2v7, 3v6, 4v5 (seeded)
  const pairs: [TournamentPlayer, TournamentPlayer][] = [];
  for (let i = 0; i < n / 2; i++) {
    pairs.push([players[i], players[n - 1 - i]]);
  }

  let prevRoundMatches: BracketMatch[] = [];
  for (let round = 1; round <= totalRounds; round++) {
    const roundMatches: BracketMatch[] = [];
    const matchCount = n / Math.pow(2, round);

    for (let mi = 0; mi < matchCount; mi++) {
      const isCompleted = round <= completedRounds;
      const isActive = round === completedRounds + 1;

      let p1: TournamentPlayer | null = null;
      let p2: TournamentPlayer | null = null;

      if (round === 1) {
        p1 = pairs[mi][0];
        p2 = pairs[mi][1];
      } else {
        // Winners from previous round
        const prev1 = prevRoundMatches[mi * 2];
        const prev2 = prevRoundMatches[mi * 2 + 1];
        p1 = prev1?.winner ?? null;
        p2 = prev2?.winner ?? null;
      }

      // Simulate winners for completed rounds (higher seed wins)
      const winner: TournamentPlayer | null = isCompleted && p1 && p2
        ? (p1.seed < p2.seed ? p1 : p2)
        : null;

      roundMatches.push({
        id: `r${round}m${mi}`,
        round,
        matchIndex: mi,
        player1: p1,
        player2: p2,
        winner,
        status: isCompleted ? 'completed' : isActive ? 'active' : 'pending',
        gameId: isCompleted || isActive ? `game_r${round}_${mi}` : undefined,
        scheduledAt: Date.now() + round * 3_600_000,
      });
    }

    matches.push(...roundMatches);
    prevRoundMatches = roundMatches;
  }

  return matches;
}

const MOCK_TOURNAMENTS: Tournament[] = [
  {
    id: 'trn_001',
    name: 'Campionatul de Primăvară',
    status: 'active',
    prizePool: '4.0',
    entryFee: '0.5',
    maxPlayers: 8,
    registeredPlayers: PLAYERS_8,
    bracket: buildBracket(PLAYERS_8, 1),   // R1 done, R2 active
    startTime: Date.now() - 3_600_000,
    createdBy: makeAddr('owner'),
    description: 'Primul turneu oficial MetaShipX. 8 jucători, bracket single elimination. Premiu: 4 EGLD.',
    rounds: 3,
  },
  {
    id: 'trn_002',
    name: 'Liga Amiralilor — Ediția I',
    status: 'registration',
    prizePool: '8.0',
    entryFee: '0.5',
    maxPlayers: 16,
    registeredPlayers: PLAYERS_16.slice(0, 9),  // 9/16 înregistrați
    bracket: buildBracket(PLAYERS_16, 0),
    startTime: Date.now() + 24 * 3_600_000,
    createdBy: makeAddr('owner'),
    description: 'Turneu de 16 jucători. Bracket generat automat după completarea locurilor. Premiu top 3.',
    rounds: 4,
  },
  {
    id: 'trn_003',
    name: 'Bătălia Devnet',
    status: 'completed',
    prizePool: '2.0',
    entryFee: '0.25',
    maxPlayers: 8,
    registeredPlayers: PLAYERS_8,
    bracket: buildBracket(PLAYERS_8, 3),  // all rounds completed
    startTime: Date.now() - 86_400_000 * 3,
    endTime: Date.now() - 86_400_000,
    createdBy: makeAddr('owner'),
    description: 'Turneul de test pe devnet. Toate meciurile finalizate.',
    rounds: 3,
  },
];

export async function fetchTournaments(): Promise<Tournament[]> {
  // Real implementation: query BATTLESHIP_CONTRACT_ADDRESS for tournament list
  await new Promise(r => setTimeout(r, 300));
  return MOCK_TOURNAMENTS;
}

export async function fetchTournament(id: string): Promise<Tournament | null> {
  await new Promise(r => setTimeout(r, 200));
  return MOCK_TOURNAMENTS.find(t => t.id === id) ?? null;
}

export async function registerForTournament(_tournamentId: string, _playerAddress: string): Promise<void> {
  // Real: sendTransaction to contract registerForTournament endpoint
  await new Promise(r => setTimeout(r, 500));
}
