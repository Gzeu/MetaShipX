import { Controller, Post, Body, Headers, UnauthorizedException, Logger } from '@nestjs/common';
import { WebhookService, MxTxWebhookPayload } from './webhook.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly webhookService: WebhookService,
    private readonly config: ConfigService,
  ) {}

  /**
   * POST /webhook/mx-transactions
   * MultiversX notifier calls this endpoint after every transaction
   * involving our monitored contract addresses.
   *
   * Signature verification uses HMAC-SHA256 with WEBHOOK_SECRET.
   */
  @Post('mx-transactions')
  async handleMxTransaction(
    @Body() payload: MxTxWebhookPayload | MxTxWebhookPayload[],
    @Headers('x-mxnotifier-signature') sig: string,
  ): Promise<{ ok: boolean }> {
    // ── Signature check ───────────────────────────────────────────────────────
    const secret = this.config.get<string>('WEBHOOK_SECRET');
    if (secret) {
      const body = JSON.stringify(payload);
      const expected = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');
      if (sig !== expected) {
        this.logger.warn('Invalid webhook signature');
        throw new UnauthorizedException('Invalid signature');
      }
    }

    // ── Process (array or single) ─────────────────────────────────────────────
    const txs = Array.isArray(payload) ? payload : [payload];
    await Promise.all(txs.map(tx => this.webhookService.handleTransaction(tx)));

    return { ok: true };
  }
}
