import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
