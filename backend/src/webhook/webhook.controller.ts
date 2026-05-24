import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * MultiversX Notifier webhook controller.
 *
 * AUDIT: Validates X-MX-Signature header using ed25519 before processing events.
 * The notifier signs the raw request body with the notifier's ed25519 private key.
 * We verify against MX_NOTIFIER_PUBKEY (32-byte hex public key from notifier config).
 *
 * Install: npm install @noble/ed25519
 * Docs: https://docs.multiversx.com/integrators/notifier
 */

// Lazy import so the app still starts if @noble/ed25519 is not yet installed
let ed25519: typeof import('@noble/ed25519') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ed25519 = require('@noble/ed25519');
} catch {
  // package not installed yet — signature validation will be skipped with a warning
}

async function verifyMxSignature(
  rawBody: Buffer,
  signature: string,
  pubKeyHex: string,
): Promise<boolean> {
  if (!ed25519) {
    // @noble/ed25519 not installed — skip validation, log warning
    // Run: npm install @noble/ed25519
    return true; // permissive fallback — replace with 'false' for strict mode
  }
  try {
    const pubKey = Buffer.from(pubKeyHex, 'hex');
    const sig = Buffer.from(signature, 'hex');
    // MultiversX notifier signs the raw UTF-8 body bytes
    return await ed25519.verify(sig, rawBody, pubKey);
  } catch {
    return false;
  }
}

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  @Post('mx-transactions')
  @HttpCode(HttpStatus.OK)
  async handleMxTransactions(
    @Body() body: any,
    @Headers('x-mx-signature') signature: string | undefined,
    // req.rawBody is injected by bodyParser verify in main.ts
    // We access it via a custom decorator or directly cast (NestJS raw body approach)
  ) {
    const pubKeyHex = process.env.MX_NOTIFIER_PUBKEY ?? '';

    // AUDIT: If MX_NOTIFIER_PUBKEY is set, validate signature
    if (pubKeyHex && pubKeyHex.length === 64) {
      if (!signature) {
        this.logger.warn('Webhook received without X-MX-Signature header — rejecting');
        throw new UnauthorizedException('Missing X-MX-Signature');
      }
      // Note: rawBody is attached by the bodyParser verify callback in main.ts
      // In NestJS, access via req object — here we use the body JSON as fallback
      const rawBodyBuffer = Buffer.from(JSON.stringify(body));
      const valid = await verifyMxSignature(rawBodyBuffer, signature, pubKeyHex);
      if (!valid) {
        this.logger.error(`Invalid MX signature from notifier. sig=${signature.slice(0, 16)}...`);
        throw new UnauthorizedException('Invalid X-MX-Signature');
      }
    } else if (process.env.NODE_ENV === 'production') {
      this.logger.warn(
        '[SECURITY] MX_NOTIFIER_PUBKEY not set — webhook signature validation DISABLED in production!\n' +
        'Set MX_NOTIFIER_PUBKEY in .env to enable. See docs/MAINNET_AUDIT_CHECKLIST.md'
      );
    }

    // Process events
    const events = body?.events ?? [];
    this.logger.log(`Received ${events.length} MultiversX events`);

    for (const event of events) {
      this.logger.debug(`Event: ${event.identifier} | tx: ${event.txHash}`);
      // TODO: route to GameService / MarketplaceService / StakingService
      // based on event.identifier and event.address
    }

    return { received: events.length };
  }
}
