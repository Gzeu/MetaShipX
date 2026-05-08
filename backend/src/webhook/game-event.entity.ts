import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type GameEventType =
  | 'gameCreated'
  | 'gameJoined'
  | 'shipsPlaced'
  | 'attacked'
  | 'gameWon'
  | 'withdrawn'
  | 'shipMinted'
  | 'shipUpgraded'
  | 'staked'
  | 'unstaked'
  | 'rewardsClaimed'
  | 'unknown';

@Entity('game_events')
export class GameEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ── Chain data ─────────────────────────────────────────────────────────────
  @Index()
  @Column({ length: 64 })
  txHash: string;

  @Index()
  @Column({ length: 62 })
  contractAddress: string;

  @Index()
  @Column({ length: 62, nullable: true })
  callerAddress: string;

  @Column({ length: 64 })
  eventType: GameEventType;

  // ── Game context ───────────────────────────────────────────────────────────
  @Index()
  @Column({ nullable: true })
  gameId: number;

  @Column({ nullable: true })
  row: number;

  @Column({ nullable: true })
  col: number;

  @Column({ nullable: true })
  result: string; // 'hit' | 'miss' | 'sunk' | 'win'

  // ── Raw payload ────────────────────────────────────────────────────────────
  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}
