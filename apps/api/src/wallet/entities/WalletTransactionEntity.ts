import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { TransactionType } from '../types/WalletTypes';

/**
 * Immutable audit trail — rows are never updated or deleted.
 *
 * balanceAfterCents is a snapshot of the wallet balance immediately after
 * this transaction was applied. Lets you reconstruct any point-in-time
 * balance without replaying the entire history.
 *
 * referenceId carries the idempotency key:
 *   DEPOSIT → clientMutationId
 *   DEBIT   → betId
 *   CREDIT  → settlementId
 */
@Entity('walletTransactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  walletId: string;

  @Index()
  @Column()
  userId: string;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ type: 'integer' })
  amountCents: number;

  @Column({ type: 'integer' })
  balanceAfterCents: number;

  @Index()
  @Column({ nullable: true, type: 'varchar' })
  referenceId: string | null;

  @Column({ nullable: true, type: 'text' })
  description: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
