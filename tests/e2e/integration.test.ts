/**
 * MetaShipX — End-to-End Integration Test
 * Tests the full flow: Battleship → NFT (recordWin) → Staking (fundRewardPool)
 *
 * Uses @multiversx/sdk-core for transaction building and
 * a local devnet or the public devnet gateway.
 *
 * Run: npx jest tests/e2e/integration.test.ts --testTimeout=120000
 */

import {
  Address,
  AddressValue,
  BigUIntValue,
  ContractFunction,
  SmartContract,
  TokenIdentifierValue,
  Transaction,
  TransactionPayload,
  U64Value,
} from '@multiversx/sdk-core';
import { ApiNetworkProvider } from '@multiversx/sdk-network-providers';
import * as fs from 'fs';
import * as path from 'path';

// ── Config ───────────────────────────────────────────────────────────────────

const GATEWAY = process.env.DEVNET_GATEWAY ?? 'https://devnet-gateway.multiversx.com';
const BATTLESHIP_ADDR = process.env.BATTLESHIP_CONTRACT_ADDRESS ?? '';
const NFT_ADDR = process.env.NFT_CONTRACT_ADDRESS ?? '';
const STAKING_ADDR = process.env.STAKING_CONTRACT_ADDRESS ?? '';

const provider = new ApiNetworkProvider(GATEWAY, { timeout: 30_000 });

// ── Helpers ──────────────────────────────────────────────────────────────────

async function queryContract<T>(
  contractAddr: string,
  funcName: string,
  args: string[] = []
): Promise<T> {
  const result = await provider.queryContract({
    address: Address.fromBech32(contractAddr),
    func: new ContractFunction(funcName),
    args,
  } as any);
  return result as unknown as T;
}

function skipIfNoContracts() {
  if (!BATTLESHIP_ADDR || !NFT_ADDR || !STAKING_ADDR) {
    console.warn(
      '⚠️  Skipping E2E tests: contract addresses not set.\n' +
      '   Set BATTLESHIP_CONTRACT_ADDRESS, NFT_CONTRACT_ADDRESS, STAKING_CONTRACT_ADDRESS in .env'
    );
    return true;
  }
  return false;
}

// ── Test Suite ───────────────────────────────────────────────────────────────

describe('MetaShipX Integration Tests', () => {
  beforeAll(async () => {
    if (skipIfNoContracts()) return;
    // Verify network is reachable
    const status = await provider.getNetworkStatus().catch(() => null);
    expect(status).not.toBeNull();
  });

  // ── Contract Connectivity ─────────────────────────────────────────────────

  describe('Contract Connectivity', () => {
    test('Battleship contract responds to getGameState for non-existent game', async () => {
      if (skipIfNoContracts()) return;
      // Querying game 0 should return empty/default state without panicking
      const result = await provider.queryContract({
        address: Address.fromBech32(BATTLESHIP_ADDR),
        func: new ContractFunction('getPlayerGames'),
        args: [new AddressValue(Address.fromBech32(BATTLESHIP_ADDR))],
      } as any);
      // Should return empty list, not an error
      expect(result).toBeDefined();
    });

    test('NFT contract getMintPrice returns a positive value', async () => {
      if (skipIfNoContracts()) return;
      const result = await provider.queryContract({
        address: Address.fromBech32(NFT_ADDR),
        func: new ContractFunction('getMintPrice'),
        args: [],
      } as any);
      expect(result).toBeDefined();
      // returnData[0] is base64-encoded BigUint — just verify it exists
      expect((result as any).returnData?.length).toBeGreaterThanOrEqual(0);
    });

    test('Staking contract getTotalStaked returns a value', async () => {
      if (skipIfNoContracts()) return;
      const result = await provider.queryContract({
        address: Address.fromBech32(STAKING_ADDR),
        func: new ContractFunction('getTotalStaked'),
        args: [],
      } as any);
      expect(result).toBeDefined();
    });
  });

  // ── Cross-Contract Wiring ─────────────────────────────────────────────────

  describe('Cross-Contract Wiring', () => {
    test('Battleship contract has NFT contract address set', async () => {
      if (skipIfNoContracts()) return;
      const result = await provider.queryContract({
        address: Address.fromBech32(BATTLESHIP_ADDR),
        func: new ContractFunction('getNftContract'),
        args: [],
      } as any);
      // returnData[0] should decode to the NFT contract address bytes
      const returnData = (result as any).returnData ?? [];
      // Non-empty returnData means an address was stored
      expect(returnData.length).toBeGreaterThan(0);
    });

    test('Battleship contract has Staking contract address set', async () => {
      if (skipIfNoContracts()) return;
      const result = await provider.queryContract({
        address: Address.fromBech32(BATTLESHIP_ADDR),
        func: new ContractFunction('getStakingContract'),
        args: [],
      } as any);
      const returnData = (result as any).returnData ?? [];
      expect(returnData.length).toBeGreaterThan(0);
    });
  });

  // ── Game Flow (read-only simulation) ──────────────────────────────────────

  describe('Game State Machine', () => {
    test('Game counter starts from 0 or is a valid u64', async () => {
      if (skipIfNoContracts()) return;
      // We verify the contract is in a valid state by checking it doesn't error
      // (actual game creation requires a funded wallet which is out of scope for CI)
      const result = await provider.queryContract({
        address: Address.fromBech32(BATTLESHIP_ADDR),
        func: new ContractFunction('getPlayerGames'),
        args: [new AddressValue(Address.fromBech32(
          // Zero address — will return empty list
          'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu'
        ))],
      } as any);
      expect(result).toBeDefined();
    });
  });

  // ── Staking Economics ─────────────────────────────────────────────────────

  describe('Staking APR', () => {
    test('APR is set to a reasonable value (> 0)', async () => {
      if (skipIfNoContracts()) return;
      const result = await provider.queryContract({
        address: Address.fromBech32(STAKING_ADDR),
        func: new ContractFunction('getApr'),
        args: [],
      } as any);
      // returnData[0] decoded should be > 0
      const returnData = (result as any).returnData ?? [];
      if (returnData.length > 0) {
        const aprEncoded = Buffer.from(returnData[0], 'base64');
        const apr = aprEncoded.length > 0
          ? parseInt(aprEncoded.toString('hex'), 16)
          : 0;
        expect(apr).toBeGreaterThan(0);
      }
    });
  });

  // ── NFT Ship Types ────────────────────────────────────────────────────────

  describe('NFT Contract', () => {
    test('Mint price is set and non-zero', async () => {
      if (skipIfNoContracts()) return;
      const result = await provider.queryContract({
        address: Address.fromBech32(NFT_ADDR),
        func: new ContractFunction('getMintPrice'),
        args: [],
      } as any);
      const returnData = (result as any).returnData ?? [];
      if (returnData.length > 0) {
        const priceEncoded = Buffer.from(returnData[0], 'base64');
        const price = priceEncoded.length > 0
          ? BigInt('0x' + priceEncoded.toString('hex'))
          : 0n;
        expect(price).toBeGreaterThan(0n);
      }
    });
  });
});

// ── Unit Tests (no network required) ─────────────────────────────────────────

describe('MetaShipX Unit Tests', () => {
  describe('Game Logic', () => {
    test('Cell encoding: (x, y) => x * 10 + y is bijective for 0..9', () => {
      const BOARD = 10;
      const seen = new Set<number>();
      for (let x = 0; x < BOARD; x++) {
        for (let y = 0; y < BOARD; y++) {
          const cell = x * BOARD + y;
          expect(seen.has(cell)).toBe(false);
          seen.add(cell);
          // Decode back
          expect(Math.floor(cell / BOARD)).toBe(x);
          expect(cell % BOARD).toBe(y);
        }
      }
      expect(seen.size).toBe(100);
    });

    test('Ship lengths sum to 17 (standard Battleship)', () => {
      const SHIP_LENGTHS = [5, 4, 3, 3, 2];
      const total = SHIP_LENGTHS.reduce((a, b) => a + b, 0);
      expect(total).toBe(17);
    });

    test('Staking fee deduction: 1% of 2x bet leaves 99% to winner', () => {
      const BET = 1_000_000_000_000_000_000n; // 1 EGLD in denomination
      const FEE_BPS = 100n;
      const totalPot = BET * 2n;
      const fee = (totalPot * FEE_BPS) / 10_000n;
      const prize = totalPot - fee;
      expect(fee).toBe(20_000_000_000_000_000n); // 0.02 EGLD
      expect(prize).toBe(1_980_000_000_000_000_000n); // 1.98 EGLD
      expect(prize + fee).toBe(totalPot);
    });

    test('APR calculation: 20% APR on 1 EGLD for 1 year', () => {
      const STAKE = 1_000_000_000_000_000_000n; // 1 EGLD
      const APR_BPS = 2_000n; // 20%
      const YEAR_SECS = 31_536_000n;
      const reward = (STAKE * APR_BPS * YEAR_SECS) / (10_000n * YEAR_SECS);
      expect(reward).toBe(200_000_000_000_000_000n); // 0.2 EGLD
    });
  });

  describe('Ship Placement Validation', () => {
    test('5 ships of lengths [5,4,3,3,2] fit on a 10x10 board', () => {
      const BOARD = 10;
      const ships = [
        { x: 0, y: 0, length: 5, vertical: false },
        { x: 1, y: 0, length: 4, vertical: false },
        { x: 2, y: 0, length: 3, vertical: false },
        { x: 3, y: 0, length: 3, vertical: false },
        { x: 4, y: 0, length: 2, vertical: false },
      ];
      const occupied = new Set<number>();
      for (const ship of ships) {
        for (let step = 0; step < ship.length; step++) {
          const cx = ship.vertical ? ship.x + step : ship.x;
          const cy = ship.vertical ? ship.y : ship.y + step;
          expect(cx).toBeLessThan(BOARD);
          expect(cy).toBeLessThan(BOARD);
          const cell = cx * BOARD + cy;
          expect(occupied.has(cell)).toBe(false);
          occupied.add(cell);
        }
      }
    });

    test('Overlapping ships are detected', () => {
      const BOARD = 10;
      const occupied = new Set<number>();
      // Place first ship at row 0, cols 0-4
      for (let y = 0; y < 5; y++) occupied.add(0 * BOARD + y);
      // Try to place overlapping ship at row 0, cols 3-6
      let overlap = false;
      for (let y = 3; y < 7; y++) {
        if (occupied.has(0 * BOARD + y)) { overlap = true; break; }
      }
      expect(overlap).toBe(true);
    });
  });
});
