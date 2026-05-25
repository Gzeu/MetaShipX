import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export interface LeaderEntry {
  address: string;
  wins: number;
  egldWon: string; // in wei as string
  rank: number;
}

// Cache entity — store weekly snapshots for analytics
export interface LeaderSnapshot {
  id: number;
  capturedAt: Date;
  entries: LeaderEntry[];
}

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);
  private cachedTop50: LeaderEntry[] = [];
  private lastFetched: Date | null = null;
  private readonly CACHE_TTL_MS = 60_000; // 1 min cache

  private readonly proxy =
    process.env.MX_API_URL ?? 'https://devnet-api.multiversx.com';
  private readonly leaderboardAddress =
    process.env.VITE_LEADERBOARD_ADDRESS ?? '';

  async getTop50(forceRefresh = false): Promise<LeaderEntry[]> {
    const stale =
      !this.lastFetched ||
      Date.now() - this.lastFetched.getTime() > this.CACHE_TTL_MS;

    if (!stale && !forceRefresh) return this.cachedTop50;

    try {
      const resp = await fetch(`${this.proxy}/vm-query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scAddress: this.leaderboardAddress,
          funcName: 'getTopPlayers',
          args: [this.toHex(50)],
        }),
      });
      const json = await resp.json();
      const returnData: string[] = json?.data?.data?.returnData ?? [];
      this.cachedTop50 = this.decodeEntries(returnData);
      this.lastFetched = new Date();
      this.logger.log(`Leaderboard refreshed: ${this.cachedTop50.length} entries`);
    } catch (e) {
      this.logger.warn(`Leaderboard fetch failed: ${e}`);
    }
    return this.cachedTop50;
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async scheduledRefresh() {
    if (!this.leaderboardAddress) return;
    await this.getTop50(true);
  }

  private decodeEntries(returnData: string[]): LeaderEntry[] {
    // returnData is array of base64-encoded TopEncode structs
    // Each entry: 32 bytes address + 8 bytes wins (u64) + 8..32 bytes egld_won (BigUint)
    return returnData.map((b64, i) => {
      try {
        const buf = Buffer.from(b64, 'base64');
        const address = this.encodeAddress(buf.subarray(0, 32));
        const wins = Number(buf.readBigUInt64BE(32));
        const egldWon = BigInt(`0x${buf.subarray(40).toString('hex')}`).toString();
        return { address, wins, egldWon, rank: i + 1 };
      } catch {
        return { address: 'unknown', wins: 0, egldWon: '0', rank: i + 1 };
      }
    });
  }

  private encodeAddress(bytes: Buffer): string {
    // bech32 encoding of erd1... — simplified, use @multiversx/sdk-core in production
    return `erd1${bytes.toString('hex').slice(0, 58)}`;
  }

  private toHex(n: number): string {
    return n.toString(16).padStart(8, '0');
  }
}
