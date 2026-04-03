import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bet } from './entities/BetEntity';
import { BetStatus, BetPlacementPayload, ALLOWED_TRANSITIONS } from './types/BettingTypes';
import { PlaceBetDto } from './dto/PlaceBetDto';
import { BetResponseDto, BetListResponseDto } from './dto/BetResponseDto';
import { MarketService } from '../market/MarketService';
import { WalletService } from '../wallet/WalletService';
import { RabbitMQService } from '../rabbitmq/RabbitmqService';
import { RedisService } from '../redis/RedisService';
import { Role } from '../identity/types/IdentityTypes';

// Redis idempotency key TTL in seconds.
// If the same clientMutationId is seen within this window, return the cached betId.
const IDEMPOTENCY_TTL = 60;

@Injectable()
export class BettingService {
  private readonly logger = new Logger(BettingService.name);

  constructor(
    @InjectRepository(Bet)
    private readonly betRepo: Repository<Bet>,

    @InjectRepository(Bet, 'replica')
    private readonly betReplicaRepo: Repository<Bet>,

    private readonly marketService: MarketService,
    private readonly walletService: WalletService,
    private readonly rabbitMQService: RabbitMQService,
    private readonly redisService: RedisService,
  ) {}

  // ── Place bet ──────────────────────────────────────────────────────────────

  async placeBet(
    userId: string,
    userRole: Role,
    dto: PlaceBetDto,
  ): Promise<BetResponseDto> {
    // ADMIN accounts cannot place bets — enforced here in addition to the guard.
    // Defence in depth: the guard prevents the HTTP request, this prevents
    // any internal caller (e.g. a future admin-impersonation flow) from bypassing it.
    if (userRole === Role.ADMIN) {
      throw new ForbiddenException('Admin accounts cannot place bets');
    }

    // 1. Redis idempotency — fast path before any DB or wallet interaction.
    //    Key format: idempotency:bet:{userId}:{clientMutationId}
    //    If the key exists, a previous request already created this bet.
    const idempotencyKey = `idempotency:bet:${userId}:${dto.clientMutationId}`;
    const cachedBetId    = await this.redisService.ephemeral.get(idempotencyKey);

    if (cachedBetId) {
      this.logger.log(`Idempotent bet request — returning cached bet ${cachedBetId}`);
      const cached = await this.betRepo.findOne({ where: { id: cachedBetId } });
      if (cached) return this.toDto(cached);
    }

    // DB-level idempotency fallback (covers requests after the Redis TTL expires)
    const existingBet = await this.betRepo.findOne({
      where: { userId, referenceId: dto.clientMutationId },
    });
    if (existingBet) return this.toDto(existingBet);

    // 2. Validate market is OPEN — rejects bets on suspended or settled markets.
    const market = await this.marketService.assertMarketOpen(dto.marketId);

    // 3. Compute payout before touching the wallet.
    //    Formula: floor(stakeCents × oddsInt / 100) — integer arithmetic only.
    //    floor() prevents paying out a fraction of a cent.
    const payoutCents = Math.floor(dto.stakeCents * market.oddsInt / 100);

    // 4. Debit the stake from the user's wallet.
    //    WalletService.debit() is atomic (SELECT FOR UPDATE) and idempotent.
    //    If balance is insufficient it throws UnprocessableEntityException (422).
    await this.walletService.debit(
      userId,
      dto.stakeCents,
      dto.clientMutationId,
      `Bet on market ${market.name}`,
    );

    // 5. Persist the bet.
    const bet = await this.betRepo.save(
      this.betRepo.create({
        userId,
        marketId:    dto.marketId,
        oddsInt:     market.oddsInt,
        stakeCents:  dto.stakeCents,
        payoutCents,
        status:      BetStatus.PENDING,
        referenceId: dto.clientMutationId,
      }),
    );

    // 6. Cache the bet ID in Redis for fast idempotency on duplicate requests.
    await this.redisService.ephemeral.set(idempotencyKey, bet.id, 'EX', IDEMPOTENCY_TTL);

    // 7. Publish to RabbitMQ for the Settlement Worker to pick up.
    const payload: BetPlacementPayload = {
      betId:       bet.id,
      userId,
      marketId:    dto.marketId,
      oddsInt:     market.oddsInt,
      stakeCents:  dto.stakeCents,
      payoutCents,
    };
    await this.rabbitMQService.publishBetPlacement(payload);

    this.logger.log(
      `Bet placed: ${bet.id} — user ${userId}, market ${dto.marketId}, stake ${dto.stakeCents}c, payout ${payoutCents}c`,
    );

    return this.toDto(bet);
  }

  // ── Queries ────────────────────────────────────────────────────────────────

  async getBets(userId: string, page: number, limit: number): Promise<BetListResponseDto> {
    const [rows, total] = await this.betReplicaRepo.findAndCount({
      where:  { userId },
      order:  { createdAt: 'DESC' },
      skip:   (page - 1) * limit,
      take:   limit,
    });
    return {
      data:  rows.map((b) => this.toDto(b)),
      total,
      page,
      limit,
    };
  }

  async getBetById(requestingUserId: string, requestingUserRole: Role, betId: string): Promise<BetResponseDto> {
    const bet = await this.betReplicaRepo.findOne({ where: { id: betId } });
    if (!bet) throw new NotFoundException(`Bet ${betId} not found`);

    // Only the bet owner or an ADMIN can view a specific bet.
    if (bet.userId !== requestingUserId && requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException('You do not have access to this bet');
    }

    return this.toDto(bet);
  }

  // ── Internal — called by Settlement Worker ─────────────────────────────────

  /**
   * Transitions a bet to a new status.
   * Called by the Settlement Worker after it has processed the bet.
   * Enforces the state machine — invalid transitions throw.
   */
  async transitionStatus(betId: string, newStatus: BetStatus): Promise<void> {
    const bet = await this.betRepo.findOne({ where: { id: betId } });
    if (!bet) throw new NotFoundException(`Bet ${betId} not found`);

    const allowed = ALLOWED_TRANSITIONS[bet.status];
    if (!allowed.includes(newStatus)) {
      throw new UnprocessableEntityException(
        `Cannot transition bet from ${bet.status} to ${newStatus}`,
      );
    }

    await this.betRepo.update({ id: betId }, { status: newStatus });
    this.logger.log(`Bet ${betId} status: ${bet.status} → ${newStatus}`);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private toDto(bet: Bet): BetResponseDto {
    return {
      id:            bet.id,
      marketId:      bet.marketId,
      oddsInt:       bet.oddsInt,
      oddsDisplay:   this.formatOdds(bet.oddsInt),
      stakeCents:    bet.stakeCents,
      stakeDisplay:  this.formatCents(bet.stakeCents),
      payoutCents:   bet.payoutCents,
      payoutDisplay: this.formatCents(bet.payoutCents),
      status:        bet.status,
      referenceId:   bet.referenceId,
      createdAt:     bet.createdAt,
      updatedAt:     bet.updatedAt,
    };
  }

  /** 1050 → "$10.50" */
  private formatCents(cents: number): string {
    return `$${(cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  }

  /** 240 → "2.40" */
  private formatOdds(oddsInt: number): string {
    return (oddsInt / 100).toFixed(2);
  }
}
