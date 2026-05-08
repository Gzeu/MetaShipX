import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { WebhookService } from './webhook.service';

interface MxNotifierPayload {
  transactions: Array<{
    hash: string;
    receiver: string;
    sender: string;
    function?: string;
    events?: Array<{ identifier: string; topics: string[]; data?: string }>;
  }>;
}

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  @Post('mx-transactions')
  @HttpCode(200)
  async handleMxTransactions(
    @Body() payload: MxNotifierPayload,
    @Headers('x-signature') signature: string,
    @Req() req: Request & { rawBody?: Buffer },
  ): Promise<{ received: number }> {
    // ── Signature verification ─────────────────────────────────────────────
    if (req.rawBody && signature) {
      this.webhookService.verifySignature(req.rawBody, signature);
    } else {
      this.logger.warn('Webhook received without signature — skipping HMAC check');
    }

    const txs = payload?.transactions ?? [];
    this.logger.log(`Received ${txs.length} transaction(s) from mx-notifier`);

    await this.webhookService.handleTransactions(txs);
    return { received: txs.length };
  }

  // Health probe for Railway / Docker
  @Post('health')
  @HttpCode(200)
  health(): { ok: boolean } {
    return { ok: true };
  }
}
