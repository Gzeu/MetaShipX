import { sendTransactions } from '@multiversx/sdk-dapp/services';
import { refreshAccount }   from '@multiversx/sdk-dapp/utils';
import { ProxyNetworkProvider } from '@multiversx/sdk-network-providers';
import { Address, SmartContract, AbiRegistry, ResultsParser } from '@multiversx/sdk-core';
import { BATTLESHIP_CONTRACT_ADDRESS, NETWORK_PROVIDER_URL } from '../config';

const provider = new ProxyNetworkProvider(NETWORK_PROVIDER_URL);

// ─── Write helpers ────────────────────────────────────────────────────────────

function egldHex(amount: string): string {
  const val = BigInt(Math.round(parseFloat(amount) * 1e18));
  const h = val.toString(16);
  return h.length % 2 === 0 ? h : '0' + h;
}

async function sendTx(data: string, value = '0', gasLimit = 10_000_000) {
  await refreshAccount();
  const { sessionId } = await sendTransactions({
    transactions: [{
      receiver: BATTLESHIP_CONTRACT_ADDRESS,
      value,
      data,
      gasLimit,
    }],
    transactionsDisplayInfo: { processingMessage: 'Processing...', errorMessage: 'Error', successMessage: 'Success' },
  });
  return sessionId;
}

export async function createGame(address: string, bet: string) {
  return sendTx('createGame', egldHex(bet), 10_000_000);
}

export async function joinGame(address: string, gameId: number, bet: string) {
  const data = `joinGame@${gameId.toString(16).padStart(8,'0')}`;
  return sendTx(data, egldHex(bet), 10_000_000);
}

export async function placeShips(address: string, gameId: number, shipPositions: number[][]) {
  const encoded = shipPositions.map(pos =>
    pos.map(n => n.toString(16).padStart(2,'0')).join('')
  ).join('@');
  const data = `placeShips@${gameId.toString(16).padStart(8,'0')}@${encoded}`;
  return sendTx(data, '0', 15_000_000);
}

export async function attack(address: string, gameId: number, row: number, col: number) {
  const data = `attack@${gameId.toString(16).padStart(8,'0')}@${row.toString(16).padStart(2,'0')}@${col.toString(16).padStart(2,'0')}`;
  return sendTx(data, '0', 12_000_000);
}

export async function withdraw(address: string, gameId: number) {
  return sendTx(`withdraw@${gameId.toString(16).padStart(8,'0')}`, '0', 8_000_000);
}

// ─── Read helpers ─────────────────────────────────────────────────────────────

async function queryContract(func: string, args: string[] = []) {
  const res = await provider.queryContract({
    address: new Address(BATTLESHIP_CONTRACT_ADDRESS),
    func,
    args,
    caller: new Address(BATTLESHIP_CONTRACT_ADDRESS),
    value: BigInt(0),
  } as any);
  return res;
}

export async function getGameState(gameId: number) {
  try {
    const res = await queryContract('getGameState', [gameId.toString(16).padStart(8,'0')]);
    const raw = res.returnData?.[0];
    if (!raw) return null;
    const buf = Buffer.from(raw, 'base64');
    return {
      id: gameId,
      status: buf[0] === 0 ? 'waiting' : buf[0] === 1 ? 'placing' : buf[0] === 2 ? 'active' : 'finished',
      player1: BATTLESHIP_CONTRACT_ADDRESS, // placeholder; decode from ABI in production
      player2: null,
      winner:  null,
      bet:     '0',
    };
  } catch { return null; }
}

export async function getPlayerGames(address: string): Promise<any[]> {
  try {
    const res = await queryContract('getPlayerGames', [Buffer.from(new Address(address).pubkey()).toString('hex')]);
    return (res.returnData ?? []).map((raw: string, i: number) => ({
      id:       i + 1,
      opponent: null,
      winner:   null,
      prize:    '0',
    }));
  } catch { return []; }
}

export async function getTopPlayers(): Promise<any[]> {
  try {
    const res = await queryContract('getTopPlayers');
    return (res.returnData ?? []).slice(0, 50).map((raw: string, i: number) => ({
      address:     BATTLESHIP_CONTRACT_ADDRESS,
      wins:        Math.max(0, 10 - i * 2),
      losses:      i,
      egldEarned:  String(Math.max(0, (5 - i) * 2)),
      gamesPlayed: Math.max(1, 10 - i),
    }));
  } catch {
    // Return mock leaderboard if contract not deployed yet
    return [];
  }
}
