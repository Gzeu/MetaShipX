/**
 * TournamentService — frontend bindings for the tournament smart contract.
 * Uses @multiversx/sdk-dapp for transaction signing + sdk-core for queries.
 */
import {
  Address,
  SmartContract,
  ContractCallPayloadBuilder,
  ContractFunction,
  BigUIntValue,
  U64Value,
  StringValue,
  AddressValue,
} from '@multiversx/sdk-core';
import { sendTransactions } from '@multiversx/sdk-dapp/services';
import { ProxyNetworkProvider } from '@multiversx/sdk-network-providers';
import { TOURNAMENT_CONTRACT_ADDRESS, NETWORK_CONFIG } from '../config';

export type TournamentStatus = 'Registration' | 'Active' | 'Finished' | 'Cancelled';

export interface Tournament {
  id: number;
  name: string;
  entryFee: string;     // EGLD denominated
  maxPlayers: number;
  startTime: number;    // unix
  status: TournamentStatus;
  playerCount: number;
  currentRound: number;
  winner: string | null;
  prizePool: string;
  prizeClaimed: boolean;
}

export interface TournamentMatch {
  matchId: number;
  tournamentId: number;
  round: number;
  playerA: string;
  playerB: string;
  gameId: number | null;
  winner: string | null;
}

class TournamentService {
  private contract: SmartContract;
  private provider: ProxyNetworkProvider;

  constructor() {
    this.contract = new SmartContract({ address: new Address(TOURNAMENT_CONTRACT_ADDRESS) });
    this.provider = new ProxyNetworkProvider(NETWORK_CONFIG.apiUrl);
  }

  // ── Transactions ─────────────────────────────────────────────────────

  async register(tournamentId: number, entryFeeWei: string): Promise<void> {
    const data = new ContractCallPayloadBuilder()
      .setFunction(new ContractFunction('register'))
      .addArg(new U64Value(BigInt(tournamentId)))
      .build();

    await sendTransactions({
      transactions: [{
        value: entryFeeWei,
        data,
        receiver: TOURNAMENT_CONTRACT_ADDRESS,
        gasLimit: 10_000_000,
      }],
      transactionsDisplayInfo: {
        processingMessage: 'Registering for tournament…',
        errorMessage:      'Registration failed',
        successMessage:    'Registered! Good luck!',
      },
    });
  }

  async claimPrize(tournamentId: number): Promise<void> {
    const data = new ContractCallPayloadBuilder()
      .setFunction(new ContractFunction('claimPrize'))
      .addArg(new U64Value(BigInt(tournamentId)))
      .build();

    await sendTransactions({
      transactions: [{
        value: '0',
        data,
        receiver: TOURNAMENT_CONTRACT_ADDRESS,
        gasLimit: 10_000_000,
      }],
      transactionsDisplayInfo: {
        processingMessage: 'Claiming prize…',
        errorMessage:      'Claim failed',
        successMessage:    '🏆 Prize claimed!',
      },
    });
  }

  async claimRefund(tournamentId: number): Promise<void> {
    const data = new ContractCallPayloadBuilder()
      .setFunction(new ContractFunction('claimRefund'))
      .addArg(new U64Value(BigInt(tournamentId)))
      .build();

    await sendTransactions({
      transactions: [{
        value: '0',
        data,
        receiver: TOURNAMENT_CONTRACT_ADDRESS,
        gasLimit: 5_000_000,
      }],
      transactionsDisplayInfo: {
        processingMessage: 'Claiming refund…',
        errorMessage:      'Refund failed',
        successMessage:    'Refund received',
      },
    });
  }

  // ── Views ───────────────────────────────────────────────────────────

  async getTournament(tournamentId: number): Promise<Tournament> {
    const interaction = this.contract.methods.getTournament([new U64Value(BigInt(tournamentId))]);
    const res = await this.provider.queryContract(interaction.buildQuery());
    const { firstValue } = interaction.getEndpoint().output;
    // Decode raw bytes (simplified — in production use AbiRegistry)
    const raw = res.returnData[0];
    return this._decodeTournament(raw, tournamentId);
  }

  async getTournamentCount(): Promise<number> {
    const interaction = this.contract.methods.getTournamentCount([]);
    const res = await this.provider.queryContract(interaction.buildQuery());
    return Number(BigInt('0x' + Buffer.from(res.returnData[0], 'base64').toString('hex') || '0'));
  }

  async getRoundMatches(tournamentId: number, round: number): Promise<number[]> {
    const interaction = this.contract.methods.getRoundMatches([
      new U64Value(BigInt(tournamentId)),
      new U64Value(BigInt(round)),
    ]);
    const res = await this.provider.queryContract(interaction.buildQuery());
    return res.returnData.map(d =>
      Number(BigInt('0x' + Buffer.from(d, 'base64').toString('hex') || '0'))
    );
  }

  async isRegistered(tournamentId: number, player: string): Promise<boolean> {
    const interaction = this.contract.methods.isRegistered([
      new U64Value(BigInt(tournamentId)),
      new AddressValue(new Address(player)),
    ]);
    const res = await this.provider.queryContract(interaction.buildQuery());
    const val = res.returnData[0];
    return val === 'AQ==';
  }

  // ── Helpers ────────────────────────────────────────────────────────

  private _decodeTournament(raw: string, id: number): Tournament {
    // Placeholder decoder — replace with AbiRegistry.loadAbi() in production
    return {
      id,
      name: `Tournament #${id}`,
      entryFee: '0',
      maxPlayers: 8,
      startTime: 0,
      status: 'Registration',
      playerCount: 0,
      currentRound: 0,
      winner: null,
      prizePool: '0',
      prizeClaimed: false,
    };
  }
}

export const tournamentService = new TournamentService();
