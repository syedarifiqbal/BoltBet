import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Wallet } from './entities/WalletEntity';
import { WalletTransaction } from './entities/WalletTransactionEntity';
import { TransactionType } from './types/WalletTypes';
import { DepositDto } from './dto/DepositDto';
import { BalanceResponseDto } from './dto/BalanceResponseDto';
import {
  TransactionResponseDto,
  TransactionListResponseDto,
} from './dto/TransactionResponseDto';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    // Primary — all writes go here
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,

    @InjectRepository(WalletTransaction)
    private readonly txRepo: Repository<WalletTransaction>,

    // Replica — balance reads and transaction history
    @InjectRepository(Wallet, 'replica')
    private readonly walletReplicaRepo: Repository<Wallet>,

    @InjectRepository(WalletTransaction, 'replica')
    private readonly txReplicaRepo: Repository<WalletTransaction>,

    // Default DataSource — for QueryRunner (atomic balance operations)
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // ── Public endpoints ───────────────────────────────────────────────────────

  async getBalance(userId: string): Promise<BalanceResponseDto> {
    const wallet = await this.getOrCreateWallet(userId);
    return {
      balanceCents:   wallet.balanceCents,
      balanceDisplay: this.formatCents(wallet.balanceCents),
    };
  }

  async deposit(userId: string, dto: DepositDto): Promise<TransactionResponseDto> {
    // Idempotency check — return existing transaction if reference_id already used
    const existing = await this.txRepo.findOne({
      where: { userId, referenceId: dto.clientMutationId },
    });
    if (existing) {
      this.logger.log(`Duplicate deposit request for user ${userId}, ref ${dto.clientMutationId}`);
      return this.toTransactionDto(existing);
    }

    return this.applyTransaction(
      userId,
      TransactionType.DEPOSIT,
      dto.amountCents,
      dto.clientMutationId,
      'Deposit',
    );
  }

  async getTransactions(
    userId: string,
    page: number,
    limit: number,
  ): Promise<TransactionListResponseDto> {
    const [rows, total] = await this.txReplicaRepo.findAndCount({
      where:  { userId },
      order:  { createdAt: 'DESC' },
      skip:   (page - 1) * limit,
      take:   limit,
    });

    return {
      data:  rows.map((r) => this.toTransactionDto(r)),
      total,
      page,
      limit,
    };
  }

  // ── Internal methods — called by Betting Service and Settlement Worker ─────
  // These are not exposed through Nginx. They are invoked via direct NestJS
  // service injection within the same process.

  async debit(
    userId: string,
    amountCents: number,
    referenceId: string, // bet_id
    description?: string,
  ): Promise<TransactionResponseDto> {
    // Idempotency — if this bet has already been debited, return the existing record
    const existing = await this.txRepo.findOne({
      where: { userId, referenceId, type: TransactionType.DEBIT },
    });
    if (existing) return this.toTransactionDto(existing);

    return this.applyTransaction(
      userId,
      TransactionType.DEBIT,
      amountCents,
      referenceId,
      description ?? 'Bet placement',
    );
  }

  async credit(
    userId: string,
    amountCents: number,
    referenceId: string, // settlement_id
    description?: string,
  ): Promise<TransactionResponseDto> {
    // Idempotency — if this settlement has already been credited, return the existing record
    const existing = await this.txRepo.findOne({
      where: { userId, referenceId, type: TransactionType.CREDIT },
    });
    if (existing) return this.toTransactionDto(existing);

    return this.applyTransaction(
      userId,
      TransactionType.CREDIT,
      amountCents,
      referenceId,
      description ?? 'Bet settlement payout',
    );
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Atomically updates the wallet balance and creates the transaction record.
   *
   * Uses a QueryRunner with a pessimistic write lock (SELECT ... FOR UPDATE)
   * to prevent race conditions when multiple bets are placed concurrently.
   *
   * Without the lock: two concurrent debit operations could both read
   * balance=500, both pass the balance check, and both proceed — resulting
   * in a negative balance. The FOR UPDATE lock serialises them.
   */
  private async applyTransaction(
    userId: string,
    type: TransactionType,
    amountCents: number,
    referenceId: string | null,
    description: string,
  ): Promise<TransactionResponseDto> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Lock the wallet row for this transaction — prevents concurrent balance updates
      const wallet = await qr.manager.findOne(Wallet, {
        where: { userId },
        lock:  { mode: 'pessimistic_write' },
      });

      const walletRow = wallet ?? qr.manager.create(Wallet, { userId, balanceCents: 0 });
      if (!wallet) await qr.manager.save(Wallet, walletRow);

      if (type === TransactionType.DEBIT) {
        if (walletRow.balanceCents < amountCents) {
          throw new UnprocessableEntityException(
            `Insufficient balance: have ${walletRow.balanceCents} cents, need ${amountCents} cents`,
          );
        }
        walletRow.balanceCents -= amountCents;
      } else {
        // DEPOSIT or CREDIT — add to balance
        walletRow.balanceCents += amountCents;
      }

      await qr.manager.save(Wallet, walletRow);

      const tx = qr.manager.create(WalletTransaction, {
        walletId:          walletRow.id,
        userId,
        type,
        amountCents,
        balanceAfterCents: walletRow.balanceCents,
        referenceId:       referenceId ?? null,
        description,
      });
      const savedTx = await qr.manager.save(WalletTransaction, tx);

      await qr.commitTransaction();
      this.logger.log(
        `${type} ${amountCents}c for user ${userId} — balance now ${walletRow.balanceCents}c`,
      );
      return this.toTransactionDto(savedTx);
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  /**
   * Returns the wallet for a user, creating it with zero balance if it doesn't exist.
   * Reads from the replica — eventual consistency is acceptable for balance display.
   */
  private async getOrCreateWallet(userId: string): Promise<Wallet> {
    const wallet = await this.walletReplicaRepo.findOne({ where: { userId } });
    if (wallet) return wallet;

    // Wallet doesn't exist yet — create it via primary
    // (a deposit or debit would also create it, but GET /balance shouldn't 404)
    const created = this.walletRepo.create({ userId, balanceCents: 0 });
    return this.walletRepo.save(created);
  }

  private toTransactionDto(tx: WalletTransaction): TransactionResponseDto {
    return {
      id:                  tx.id,
      type:                tx.type,
      amountCents:         tx.amountCents,
      amountDisplay:       this.formatCents(tx.amountCents),
      balanceAfterCents:   tx.balanceAfterCents,
      balanceAfterDisplay: this.formatCents(tx.balanceAfterCents),
      referenceId:         tx.referenceId,
      description:         tx.description,
      createdAt:           tx.createdAt,
    };
  }

  /**
   * Formats cents as a display string at the API response layer.
   * This is the ONLY place formatting happens — never in service logic.
   * 1050 → "$10.50"
   */
  private formatCents(cents: number): string {
    return `$${(cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  }
}
