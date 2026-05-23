import { Controller, Post, Body, Session, HttpCode } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { BotService, Difficulty, BotState } from './bot.service';

interface PracticeSession {
  botState?: BotState;
  playerBoard?: number[][];
  botBoard?: number[][];
  phase?: 'placement' | 'battle' | 'finished';
  winner?: 'player' | 'bot' | null;
}

type CellValue = 0 | 1 | 2 | -1; // empty | ship | hit | miss

@Controller('practice')
export class PracticeController {
  constructor(private readonly botService: BotService) {}

  @Post('start')
  @HttpCode(200)
  start(
    @Body() body: { difficulty?: Difficulty },
    @Session() session: PracticeSession,
  ) {
    session.botState  = this.botService.createBot(body.difficulty ?? 'medium');
    session.phase     = 'placement';
    session.winner    = null;
    session.playerBoard = undefined;
    session.botBoard    = undefined;
    return { ok: true, phase: 'placement' };
  }

  @Post('place')
  @HttpCode(200)
  placeShips(
    @Body() body: { positions: number[][] },
    @Session() session: PracticeSession,
  ) {
    if (session.phase !== 'placement') return { error: 'Not in placement phase' };
    if (!body.positions || body.positions.length < 17)
      return { error: 'Invalid ship placement — need all 5 ships (17 cells total)' };

    // Build player board from positions array [[r,c], ...]
    const pBoard: CellValue[][] = Array.from({ length: 10 }, () => new Array(10).fill(0));
    for (const [r, c] of body.positions) {
      if (r >= 0 && r < 10 && c >= 0 && c < 10) pBoard[r][c] = 1;
    }
    session.playerBoard = pBoard;
    session.botBoard    = this.generateRandomBoard();
    session.phase       = 'battle';
    return { ok: true, phase: 'battle' };
  }

  @Post('attack')
  @HttpCode(200)
  @Throttle({ default: { limit: 2, ttl: 1000 } }) // max 2 attacks/s per session
  attack(
    @Body() body: { row: number; col: number },
    @Session() session: PracticeSession,
  ) {
    if (session.phase !== 'battle') return { error: 'Game not in battle phase' };
    const { row, col } = body;
    if (row < 0 || row > 9 || col < 0 || col > 9) return { error: 'Invalid cell' };
    if ((session.botBoard![row][col] as CellValue) === 2 ||
        (session.botBoard![row][col] as CellValue) === -1)
      return { error: 'Cell already attacked' };

    // Player attacks bot
    const hit = session.botBoard![row][col] === 1;
    session.botBoard![row][col] = hit ? 2 : -1;

    const playerWon = !session.botBoard!.flat().includes(1);
    if (playerWon) {
      session.phase  = 'finished';
      session.winner = 'player';
      return { hit, winner: 'player', botMove: null };
    }

    // Bot attacks player
    const [br, bc] = this.botService.getNextMove(session.botState!);
    const botHit   = session.playerBoard![br][bc] === 1;
    this.botService.recordResult(session.botState!, br, bc, botHit);
    session.playerBoard![br][bc] = botHit ? 2 : -1;

    const botWon = !session.playerBoard!.flat().includes(1);
    if (botWon) {
      session.phase  = 'finished';
      session.winner = 'bot';
      return { hit, winner: 'bot', botMove: { row: br, col: bc, hit: botHit } };
    }

    return { hit, winner: null, botMove: { row: br, col: bc, hit: botHit } };
  }

  private generateRandomBoard(): CellValue[][] {
    const board: CellValue[][] = Array.from({ length: 10 }, () => new Array(10).fill(0));
    const ships = [5, 4, 3, 3, 2];
    for (const size of ships) {
      let placed = false;
      let attempts = 0;
      while (!placed && attempts < 1000) {
        attempts++;
        const horizontal = Math.random() > 0.5;
        const row = Math.floor(Math.random() * (horizontal ? 10 : 11 - size));
        const col = Math.floor(Math.random() * (horizontal ? 11 - size : 10));
        let ok = true;
        for (let i = 0; i < size && ok; i++) {
          const r = horizontal ? row     : row + i;
          const c = horizontal ? col + i : col;
          if (board[r][c] !== 0) ok = false;
        }
        if (ok) {
          for (let i = 0; i < size; i++) {
            const r = horizontal ? row     : row + i;
            const c = horizontal ? col + i : col;
            board[r][c] = 1;
          }
          placed = true;
        }
      }
    }
    return board;
  }
}
