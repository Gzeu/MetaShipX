import {
  Address,
  ContractFunction,
  SmartContract,
  U64Value,
  AddressValue,
  BigUIntValue,
} from '@multiversx/sdk-core';
import { sendTransactions } from '@multiversx/sdk-dapp/services';
import { getNetworkProvider } from '../utils/network';
import { TOURNAMENT_ADDRESS } from '../config';

const tournamentContract = new SmartContract({ address: new Address(TOURNAMENT_ADDRESS) });

export interface TournamentInfo {
  id: number;
  name: string;
  entryFee: string;
  prizePool: string;
  maxPlayers: number;
  registeredCount: number;
  status: 'Registration' | 'InProgress' | 'Finished';
  winner?: string;
}

export interface MatchInfo {
  matchId: number;
  player1: string;
  player2: string;
  winner?: string;
  gameId?: number;
  status: 'Pending' | 'InProgress' | 'Finished';
}

// ── Write endpoints ──────────────────────────────────────────────────────────

export const tournamentService = {
  /** Register for an upcoming tournament */
  async registerForTournament(tournamentId: number, entryFee: string): Promise<void> {
    const tx = tournamentContract.call({
      func: new ContractFunction('registerPlayer'),
      args: [new U64Value(tournamentId)],
      value: BigInt(entryFee),
      gasLimit: 10_000_000,
    });
    await sendTransactions({ transactions: [tx] });
  },

  /** Owner: create a new tournament */
  async createTournament(
    name: string,
    entryFee: string,
    maxPlayers: number,
    startTime: number
  ): Promise<void> {
    const { StringValue } = await import('@multiversx/sdk-core');
    const tx = tournamentContract.call({
      func: new ContractFunction('createTournament'),
      args: [
        new StringValue(name),
        new BigUIntValue(BigInt(entryFee)),
        new U64Value(maxPlayers),
        new U64Value(startTime),
      ],
      gasLimit: 15_000_000,
    });
    await sendTransactions({ transactions: [tx] });
  },

  /** Owner: start bracket generation */
  async startTournament(tournamentId: number): Promise<void> {
    const tx = tournamentContract.call({
      func: new ContractFunction('startTournament'),
      args: [new U64Value(tournamentId)],
      gasLimit: 15_000_000,
    });
    await sendTransactions({ transactions: [tx] });
  },

  /** Claim prize after winning */
  async claimPrize(tournamentId: number): Promise<void> {
    const tx = tournamentContract.call({
      func: new ContractFunction('claimPrize'),
      args: [new U64Value(tournamentId)],
      gasLimit: 10_000_000,
    });
    await sendTransactions({ transactions: [tx] });
  },

  // ── Views ──────────────────────────────────────────────────────────────────

  async getTournament(tournamentId: number): Promise<TournamentInfo | null> {
    const provider = getNetworkProvider();
    try {
      const res = await provider.queryContract({
        address: TOURNAMENT_ADDRESS,
        func: 'getTournament',
        args: [tournamentId.toString(16).padStart(16, '0')],
      });
      if (!res.returnData?.[0]) return null;
      // Parse response — simplified; production uses ABI decoder
      return JSON.parse(Buffer.from(res.returnData[0], 'base64').toString()) as TournamentInfo;
    } catch {
      return null;
    }
  },

  async listActiveTournaments(): Promise<TournamentInfo[]> {
    const provider = getNetworkProvider();
    try {
      const res = await provider.queryContract({
        address: TOURNAMENT_ADDRESS,
        func: 'getActiveTournaments',
        args: [],
      });
      return (res.returnData ?? []).map((d: string) =>
        JSON.parse(Buffer.from(d, 'base64').toString())
      ) as TournamentInfo[];
    } catch {
      return [];
    }
  },

  async getPlayerTournaments(playerAddress: string): Promise<number[]> {
    const provider = getNetworkProvider();
    try {
      const res = await provider.queryContract({
        address: TOURNAMENT_ADDRESS,
        func: 'getPlayerTournaments',
        args: [new Address(playerAddress).hex()],
      });
      return (res.returnData ?? []).map((d: string) =>
        parseInt(Buffer.from(d, 'base64').toString('hex'), 16)
      );
    } catch {
      return [];
    }
  },

  async getMatchInfo(tournamentId: number, matchId: number): Promise<MatchInfo | null> {
    const provider = getNetworkProvider();
    try {
      const res = await provider.queryContract({
        address: TOURNAMENT_ADDRESS,
        func: 'getMatch',
        args: [
          tournamentId.toString(16).padStart(16, '0'),
          matchId.toString(16).padStart(16, '0'),
        ],
      });
      if (!res.returnData?.[0]) return null;
      return JSON.parse(Buffer.from(res.returnData[0], 'base64').toString()) as MatchInfo;
    } catch {
      return null;
    }
  },

  async getTournamentBracket(tournamentId: number): Promise<MatchInfo[]> {
    const provider = getNetworkProvider();
    try {
      const res = await provider.queryContract({
        address: TOURNAMENT_ADDRESS,
        func: 'getBracket',
        args: [tournamentId.toString(16).padStart(16, '0')],
      });
      return (res.returnData ?? []).map((d: string) =>
        JSON.parse(Buffer.from(d, 'base64').toString())
      ) as MatchInfo[];
    } catch {
      return [];
    }
  },
};
