import { Controller, Get, Query } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get('top')
  async getTop(@Query('limit') limit?: string) {
    const entries = await this.leaderboardService.getTop50();
    const n = Math.min(Number(limit ?? 50), 50);
    return { data: entries.slice(0, n), total: entries.length };
  }

  @Get('rank/:address')
  async getRank(@Query('address') address: string) {
    const entries = await this.leaderboardService.getTop50();
    const entry = entries.find(e => e.address === address);
    return entry ?? { address, rank: 0, wins: 0, egldWon: '0' };
  }
}
