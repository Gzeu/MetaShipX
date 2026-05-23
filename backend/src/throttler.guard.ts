import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerRequest } from '@nestjs/throttler';

/**
 * Custom throttler guard that uses player wallet address (from body/params)
 * as the throttle key for attack endpoints, falling back to IP for others.
 */
@Injectable()
export class PlayerAddressThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    // Use wallet address from body if present (attack endpoint)
    const body = req['body'] as Record<string, unknown> | undefined;
    const playerAddress = body?.['playerAddress'] as string | undefined;
    if (playerAddress && playerAddress.startsWith('erd1')) {
      return `player:${playerAddress}`;
    }
    // Fall back to IP
    return (req['ip'] as string) ?? 'unknown';
  }

  protected async shouldSkip(_context: ExecutionContext): Promise<boolean> {
    return false;
  }
}
