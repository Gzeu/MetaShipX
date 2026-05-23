import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { PracticeController } from './practice.controller';

@Module({
  controllers: [PracticeController],
  providers: [BotService],
  exports: [BotService],
})
export class GameModule {}
