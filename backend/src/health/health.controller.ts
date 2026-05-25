import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  @Get()
  async check() {
    let dbOk = false;
    try {
      await this.db.query('SELECT 1');
      dbOk = true;
    } catch {}
    return {
      status: dbOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '1.0.0',
      db: dbOk ? 'connected' : 'unreachable',
      uptime: Math.floor(process.uptime()),
    };
  }
}
