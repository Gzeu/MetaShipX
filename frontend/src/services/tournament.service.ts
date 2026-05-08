import { sendTransactions } from '@multiversx/sdk-dapp/services';
import { refreshAccount } from '@multiversx/sdk-dapp/utils';
import { Address, ContractFunction, StringValue, BigUIntValue } from '@multiversx/sdk-core';
import BigNumber from 'bignumber.js';
import { TOURNAMENT_CONTRACT, CHAIN_ID } from '../config';
import type { Tournament } from '../types';

const CONTRACT_ADDRESS = TOURNAMENT_CONTRACT;
const EGLD_DENOM = new BigNumber('1e18');

async function sendTx(func: string, args: string[], value = '0', gas = 20_000_000) {
  await refreshAccount();
  const { error } = await sendTransactions({
    transactions: [{
      value,
      gasLimit: gas,
      data: btoa([func, ...args].join('@')),
      receiver: CONTRACT_ADDRESS,
      chainID: CHAIN_ID,
    }],
    transactionsDisplayInfo: { transactionDuration: 10_000, successfulToastLifetime: 5_000 },
  });
  if (error) throw new Error(error);
}

function toHex(value: string | number | BigNumber): string {
  return new BigNumber(value).toString(16).padStart(2, '0');
}

function encodeString(s: string): string {
  return Buffer.from(s).toString('hex');
}

export async function createTournament(
  name: string,
  entryFeeEgld: string,
  maxPlayers: number,
): Promise<void> {
  const fee = new BigNumber(entryFeeEgld).multipliedBy(EGLD_DENOM);
  const args = [
    encodeString(name),
    toHex(fee),
    toHex(maxPlayers),
  ];
  await sendTx('createTournament', args, fee.toFixed(0), 30_000_000);
}

export async function joinTournament(tournamentId: number, entryFeeWei: string): Promise<void> {
  await sendTx('joinTournament', [toHex(tournamentId)], entryFeeWei, 20_000_000);
}

export async function getActiveTournaments(apiUrl: string): Promise<number[]> {
  const res = await fetch(
    `${apiUrl}/vm-values/query`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scAddress: CONTRACT_ADDRESS,
        funcName: 'getActiveTournaments',
        args: [],
      }),
    },
  );
  const data = await res.json();
  if (!data?.data?.returnData) return [];
  return data.data.returnData.map((b64: string) =>
    parseInt(Buffer.from(b64, 'base64').toString('hex'), 16)
  );
}

export async function getTournamentDetail(apiUrl: string, id: number): Promise<Tournament | null> {
  const res = await fetch(`${apiUrl}/vm-values/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scAddress: CONTRACT_ADDRESS,
      funcName: 'getTournament',
      args: [toHex(id)],
    }),
  });
  const data = await res.json();
  if (!data?.data?.returnData?.length) return null;
  // Decode first field as id (u64 big-endian)
  const raw = data.data.returnData;
  const tid = parseInt(Buffer.from(raw[0], 'base64').toString('hex'), 16);
  const tname = Buffer.from(raw[1], 'base64').toString();
  const entry = new BigNumber(Buffer.from(raw[2], 'base64').toString('hex'), 16).toFixed(0);
  const prize = new BigNumber(Buffer.from(raw[3], 'base64').toString('hex'), 16).toFixed(0);
  const maxP = parseInt(Buffer.from(raw[4], 'base64').toString('hex'), 16);
  const curP = parseInt(Buffer.from(raw[5], 'base64').toString('hex'), 16);
  const statusByte = parseInt(Buffer.from(raw[6], 'base64').toString('hex'), 16);
  const statuses = ['Open', 'InProgress', 'Finished', 'Cancelled'] as const;

  return {
    id: tid,
    name: tname,
    entryFee: entry,
    prizePool: prize,
    maxPlayers: maxP,
    currentPlayers: curP,
    status: statuses[statusByte] ?? 'Open',
    winner: null,
  };
}
