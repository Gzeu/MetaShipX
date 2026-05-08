import { ProxyNetworkProvider } from '@multiversx/sdk-network-providers';
import { Address, ContractFunction, ResultsParser, SmartContract } from '@multiversx/sdk-core';
import { BATTLESHIP_ADDRESS, NETWORK_PROVIDER_URL } from '../config';

export interface BracketMatch {
  player1: string;
  player2: string | null;
  winner: string | null;
  status: 'pending' | 'active' | 'completed';
}

export interface TournamentRound {
  label: string;
  matches: BracketMatch[];
}

export interface Tournament {
  id: string;
  name: string;
  status: 'open' | 'in_progress' | 'completed';
  players: number;
  maxPlayers: number;
  entryFee: string;
  prizePool: string;
  startTime: number;
}

const provider = new ProxyNetworkProvider(NETWORK_PROVIDER_URL);

export async function getActiveTournaments(): Promise<Tournament[]> {
  try {
    const contract = new SmartContract({ address: new Address(BATTLESHIP_ADDRESS) });
    const query = contract.createQuery({ func: new ContractFunction('getActiveTournaments'), args: [] });
    const res = await provider.queryContract(query);
    const parser = new ResultsParser();
    const { firstValue } = parser.parseUntypedQueryResponse(res);
    if (!firstValue) return getMockTournaments();
    return firstValue.valueOf();
  } catch {
    return getMockTournaments();
  }
}

export async function joinTournament(tournamentId: string, entryFee: string): Promise<void> {
  // Implemented via TransactionManager in a hook
  console.log('joinTournament', tournamentId, entryFee);
}

export async function getTournamentBracket(tournamentId: string): Promise<TournamentRound[]> {
  // Mock bracket — replace with on-chain query
  await new Promise(r => setTimeout(r, 600));
  return getMockBracket();
}

function getMockTournaments(): Tournament[] {
  return [
    { id: 't001', name: 'Friday Frenzy', status: 'open', players: 6, maxPlayers: 8, entryFee: '0.5', prizePool: '4.0', startTime: Date.now() + 3600_000 },
    { id: 't002', name: 'Weekend Warship', status: 'in_progress', players: 8, maxPlayers: 8, entryFee: '1.0', prizePool: '8.0', startTime: Date.now() - 600_000 },
    { id: 't003', name: 'Flagship Cup', status: 'open', players: 2, maxPlayers: 16, entryFee: '2.0', prizePool: '32.0', startTime: Date.now() + 7200_000 },
  ];
}

function getMockBracket(): TournamentRound[] {
  const a = 'erd1abc...1234';
  const b = 'erd1def...5678';
  const c = 'erd1ghi...9012';
  const d = 'erd1jkl...3456';
  return [
    {
      label: 'Quarter-Finals',
      matches: [
        { player1: a, player2: b, winner: a, status: 'completed' },
        { player1: c, player2: d, winner: c, status: 'completed' },
        { player1: 'erd1mno...7890', player2: 'erd1pqr...2345', winner: null, status: 'active' },
        { player1: 'erd1stu...6789', player2: 'erd1vwx...0123', winner: null, status: 'pending' },
      ],
    },
    {
      label: 'Semi-Finals',
      matches: [
        { player1: a, player2: c, winner: null, status: 'pending' },
        { player1: 'TBD', player2: 'TBD', winner: null, status: 'pending' },
      ],
    },
    {
      label: 'Grand Final',
      matches: [
        { player1: 'TBD', player2: 'TBD', winner: null, status: 'pending' },
      ],
    },
  ];
}
