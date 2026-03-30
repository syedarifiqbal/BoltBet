import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MarketStatus } from '../types/MarketTypes';

/**
 * A market represents one betting option within an event.
 * e.g. "Man City to win" in "Man City vs Arsenal"
 *
 * oddsInt — decimal odds × 100, stored as integer.
 *   2.40 → 240. Never stored as float.
 *
 * Only OPEN markets accept bets. SUSPENDED pauses new bets mid-event.
 * SETTLED is terminal — market cannot be re-opened.
 */
@Entity('markets')
export class Market {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  eventId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'integer' })
  oddsInt: number;

  @Column({ type: 'enum', enum: MarketStatus, default: MarketStatus.OPEN })
  status: MarketStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
