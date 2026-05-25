# MetaShipX Discord Bot Setup

The Discord bot sends real-time notifications for game events using the NestJS WebSocket gateway.

## Features
- 🎮 New game created in lobby → `#game-alerts`
- 🏆 Tournament started → `#tournaments`  
- 👑 Tournament winner announced → `#tournaments`
- 📊 Weekly leaderboard snapshot → `#leaderboard`
- ⚠️ Reward pool low alert → `#admin-alerts`

## Setup (Discord Developer Portal)

1. Go to https://discord.com/developers/applications
2. New Application → MetaShipX Bot
3. Bot tab → Reset Token → copy token
4. OAuth2 → URL Generator → `bot` scope + `Send Messages`, `Embed Links`, `Read Message History`
5. Copy invite URL → add to your server

## Environment Variables

```bash
# backend/.env.local
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CHANNEL_GAME_ALERTS=channel_id
DISCORD_CHANNEL_TOURNAMENTS=channel_id  
DISCORD_CHANNEL_LEADERBOARD=channel_id
DISCORD_CHANNEL_ADMIN=channel_id
```

## Backend Integration

```typescript
// backend/src/notifications/discord.service.ts
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);
  private readonly webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  async sendGameAlert(gameId: string, wager: string, creator: string) {
    await this.sendEmbed(process.env.DISCORD_CHANNEL_GAME_ALERTS!, {
      title: '⚓ New Game in Lobby',
      description: `Game #${gameId} — Wager: **${wager} EGLD**`,
      color: 0x00d4ff,
      fields: [{ name: 'Creator', value: `\`${creator.slice(0,10)}...\`` }],
      timestamp: new Date().toISOString(),
    });
  }

  async sendTournamentAlert(name: string, entryFee: string, maxPlayers: number) {
    await this.sendEmbed(process.env.DISCORD_CHANNEL_TOURNAMENTS!, {
      title: '🏆 Tournament Starting!',
      description: `**${name}**\nEntry fee: ${entryFee} EGLD · Max players: ${maxPlayers}`,
      color: 0xffd700,
      timestamp: new Date().toISOString(),
    });
  }

  async sendWeeklyLeaderboard(entries: Array<{address: string, wins: number, rank: number}>) {
    const top5 = entries.slice(0, 5)
      .map(e => `${e.rank}. \`${e.address.slice(0,10)}...\` — **${e.wins} wins**`)
      .join('\n');
    await this.sendEmbed(process.env.DISCORD_CHANNEL_LEADERBOARD!, {
      title: '📊 Weekly Leaderboard',
      description: top5 || 'No entries yet.',
      color: 0x9b59b6,
      timestamp: new Date().toISOString(),
    });
  }

  async sendRewardPoolAlert(poolEgld: string) {
    await this.sendEmbed(process.env.DISCORD_CHANNEL_ADMIN!, {
      title: '⚠️ Reward Pool Low',
      description: `Current pool: **${poolEgld} EGLD**\nAction required: fund the staking contract.`,
      color: 0xff4444,
      timestamp: new Date().toISOString(),
    });
  }

  private async sendEmbed(channelId: string, embed: object) {
    if (!this.webhookUrl || !channelId) return;
    try {
      await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] }),
      });
    } catch (e) {
      this.logger.warn(`Discord notify failed: ${e}`);
    }
  }
}
```

## Crontab Integration

The `leaderboard-cron.sh` script can pipe data to Discord via webhook:

```bash
# Add to leaderboard-cron.sh after snapshot:
curl -X POST "$DISCORD_WEBHOOK_URL" \
  -H 'Content-Type: application/json' \
  -d "{\"content\": \"📊 Weekly leaderboard snapshot saved: $(date +%Y-%m-%d)\"}"
```

## Invite Link Template

```
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=2048&scope=bot
```
