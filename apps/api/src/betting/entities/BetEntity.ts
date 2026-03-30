import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { BetStatus } from '../types/BettingTypes';

/**
 * Immutable core of each bet. Status transitions are enforced by BettingService.
 *
 * oddsInt     — odds at the moment the bet was placed (× 100). Locked in so
 *               odds changes after placement don't affect payout.
 * payoutCents — pre-computed at placement: floor(stakeCents × oddsInt / 100).
 *               Stored here so Settlement Worker doesn't need to recalculate.
 * referenceId — clientMutationId from the request. Idempotency key — duplicate
 *               requests with the same referenceId return the original bet.
 *
 * Soft-deleted via deletedAt — bets are never hard-deleted.
 */
@Entity('bets')
export class Bet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @Index()
  @Column({ type: 'uuid' })
  marketId: string;

  // Snapshot of the market name at bet placement time.
  // Stored here so the bet history shows the correct name even if the market
  // is later renamed, and so no JOIN is needed when listing bets.
  @Column({ length: 255 })
  marketName: string;

  @Column({ type: 'integer' })
  oddsInt: number;

  @Column({ type: 'integer' })
  stakeCents: number;

  @Column({ type: 'integer' })
  payoutCents: number;

  @Column({ type: 'enum', enum: BetStatus, default: BetStatus.PENDING })
  status: BetStatus;

  @Index({ unique: true })
  @Column({ type: 'varchar' })
  referenceId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;
}
