import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('game_events')
export class GameEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  type: string;

  @Index()
  @Column()
  gameId: string;

  @Column({ type: 'jsonb' })
  data: object;

  @Index({ unique: true })
  @Column()
  txHash: string;

  @CreateDateColumn()
  createdAt: Date;
}
