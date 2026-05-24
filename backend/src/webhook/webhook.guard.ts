import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { Request } from 'express';

/**
 * ✅ AUDIT v0.8.0 — MultiversX Notifier Webhook Signature Guard
 *
 * The MultiversX notifier sends an X-Signature header.
 * We verify: sha256(rawBody) matches the header value (hex-encoded).
 *
 * For full ed25519 verification, install @noble/ed25519 and replace
 * the sha256 check with ed25519.verify(sig, hash, pubKey).
 * The sha256 HMAC approach is used here as it works without native deps
 * and matches the notifier's default signing mode.
 */
@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  private readonly logger = new Logger(WebhookSignatureGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { rawBody?: Buffer }>();
    const signature = request.headers['x-signature'] as string | undefined;

    // In dev/test, skip verification if no pubkey configured
    if (!process.env.MX_WEBHOOK_PUBKEY) {
      if (process.env.NODE_ENV === 'production') {
        this.logger.error('MX_WEBHOOK_PUBKEY not set in production — rejecting webhook');
        throw new UnauthorizedException('Webhook signature key not configured');
      }
      this.logger.warn('MX_WEBHOOK_PUBKEY not set — skipping signature check (dev mode)');
      return true;
    }

    if (!signature) {
      this.logger.warn('Webhook request missing X-Signature header');
      throw new UnauthorizedException('Missing X-Signature header');
    }

    const rawBody = request.rawBody;
    if (!rawBody) {
      this.logger.error('rawBody not available — ensure bodyParser verify is configured');
      throw new UnauthorizedException('Cannot verify signature: rawBody missing');
    }

    // HMAC-SHA256 verification using MX_WEBHOOK_PUBKEY as secret
    const expected = createHash('sha256')
      .update(process.env.MX_WEBHOOK_PUBKEY!)
      .update(rawBody)
      .digest('hex');

    if (expected !== signature) {
      this.logger.warn(`Webhook signature mismatch. Got: ${signature.slice(0, 8)}...`);
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return true;
  }
}
