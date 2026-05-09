/**
 * Analytics Service — in-memory event store.
 * For production, persist to your DB (Prisma/Postgres) or send to an
 * external service (QuikNode Streams, Mixpanel, PostHog).
 */

export type GameEvent =
  | 'game_created'
  | 'game_joined'
  | 'game_started'
  | 'attack_made'
  | 'game_won'
  | 'game_abandoned'
  | 'tx_failed'
  | 'wallet_connected'
  | 'commit_submitted'
  | 'reveal_submitted';

export interface AnalyticsEntry {
  id: string;
  event: GameEvent;
  userId?: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

class AnalyticsService {
  private events: AnalyticsEntry[] = [];
  private readonly MAX_EVENTS = 10_000;

  track(event: GameEvent, data: Record<string, unknown> = {}, userId?: string): void {
    const entry: AnalyticsEntry = {
      id: generateId(),
      event,
      userId,
      data,
      timestamp: new Date(),
    };
    this.events.push(entry);
    // Rotate buffer if too large
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS);
    }
    // Log to console in dev
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[analytics] ${event}`, userId ? `user=${userId}` : '', data);
    }
  }

  getEvents(options?: {
    event?: GameEvent;
    userId?: string;
    from?: Date;
    limit?: number;
  }): AnalyticsEntry[] {
    let result = [...this.events];
    if (options?.event)   result = result.filter(e => e.event === options.event);
    if (options?.userId)  result = result.filter(e => e.userId === options.userId);
    if (options?.from)    result = result.filter(e => e.timestamp >= options.from!);
    return result.slice(-(options?.limit ?? 100)).reverse();
  }

  getStats() {
    const now = Date.now();
    const last24h = new Date(now - 86_400_000);
    const last1h  = new Date(now - 3_600_000);

    const recent24h = this.events.filter(e => e.timestamp >= last24h);
    const recent1h  = this.events.filter(e => e.timestamp >= last1h);

    const count = (ev: GameEvent, arr = this.events) => arr.filter(e => e.event === ev).length;

    return {
      total: {
        gamesCreated:  count('game_created'),
        gamesStarted:  count('game_started'),
        gamesWon:      count('game_won'),
        attacksMade:   count('attack_made'),
        txFailed:      count('tx_failed'),
        walletsConnected: count('wallet_connected'),
      },
      last24h: {
        gamesCreated: count('game_created', recent24h),
        attacksMade:  count('attack_made',  recent24h),
        txFailed:     count('tx_failed',    recent24h),
      },
      last1h: {
        gamesCreated: count('game_created', recent1h),
        attacksMade:  count('attack_made',  recent1h),
      },
      uniquePlayers: new Set(this.events.filter(e => e.userId).map(e => e.userId)).size,
      errorRate: this.events.length > 0
        ? (count('tx_failed') / this.events.length * 100).toFixed(2) + '%'
        : '0%',
    };
  }

  getRecentErrors(limit = 20): AnalyticsEntry[] {
    return this.events
      .filter(e => e.event === 'tx_failed')
      .slice(-limit)
      .reverse();
  }
}

// Singleton
export const analyticsService = new AnalyticsService();
