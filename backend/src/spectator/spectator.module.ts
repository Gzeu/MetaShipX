import { Module } from '@nestjs/common';
import { SpectatorGateway } from './spectator.gateway';

@Module({
  providers: [SpectatorGateway],
  exports: [SpectatorGateway],
})
export class SpectatorModule {}
