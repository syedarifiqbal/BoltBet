import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Market } from './entities/MarketEntity';
import { MarketStatus, MarketResult } from './types/MarketTypes';
import { CreateMarketDto } from './dto/CreateMarketDto';
import { MarketResponseDto, MarketListResponseDto } from './dto/MarketResponseDto';
import { Bet } from '../betting/entities/BetEntity';
import { BetStatus } from '../betting/types/BettingTypes';
import { WalletService } from '../wallet/WalletService';
import { RabbitMQService } from '../rabbitmq/RabbitmqService';

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);

  constructor(
    @InjectRepository(Market)
    private readonly marketRepo: Repository<Market>,

    // Used during settlement to find and close all ACCEPTED bets on the market.
    // Imported directly (not via BettingService) to avoid a circular dependency:
    // BettingModule → MarketModule, so MarketModule cannot also import BettingModule.
    @InjectRepository(Bet)
    private readonly betRepo: Repository<Bet>,

    private readonly walletService: WalletService,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  async list(
    page: number,
    limit: number,
    status?: MarketStatus,
  ): Promise<MarketListResponseDto> {
    const where = status ? { status } : {};
    const [rows, total] = await this.marketRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip:  (page - 1) * limit,
      take:  limit,
    });
    return {
      markets: rows.map((m) => this.toDto(m)),
      total,
      page,
      limit,
    };
  }

  async getMarket(marketId: string): Promise<MarketResponseDto> {
    const market = await this.getMarketById(marketId);
    return this.toDto(market);
  }

  async createMarket(dto: CreateMarketDto): Promise<MarketResponseDto> {
    const market = this.marketRepo.create({
      eventId: dto.eventId,
      name:    dto.name,
      oddsInt: dto.oddsInt,
      status:  MarketStatus.OPEN,
    });
    const saved = await this.marketRepo.save(market);
    this.logger.log(`Market created: ${saved.id} (event ${saved.eventId})`);
    return this.toDto(saved);
  }

  async getMarketById(marketId: string): Promise<Market> {
    const market = await this.marketRepo.findOne({ where: { id: marketId } });
    if (!market) throw new NotFoundException(`Market ${marketId} not found`);
    return market;
  }

  async assertMarketOpen(marketId: string): Promise<Market> {
    const market = await this.getMarketById(marketId);
    if (market.status !== MarketStatus.OPEN) {
      throw new UnprocessableEntityException(
        `Market ${marketId} is ${market.status} — bets are not accepted`,
      );
    }
    return market;
  }

  /**
   * Suspend or reopen a market (OPEN ↔ SUSPENDED).
   * Cannot be called on a SETTLED market.
   */
  async updateStatus(marketId: string, status: MarketStatus): Promise<MarketResponseDto> {
    const market = await this.getMarketById(marketId);
    if (market.status === MarketStatus.SETTLED) {
      throw new UnprocessableEntityException('Cannot change status of a settled market');
    }
    market.status = status;
    const saved = await this.marketRepo.save(market);
    this.logger.log(`Market ${marketId} status → ${status}`);

    await this.rabbitMQService.publishNotification({
      type:     'MARKET_UPDATED',
      marketId: saved.id,
      name:     saved.name,
      status:   saved.status,
      oddsInt:  saved.oddsInt,
    });

    return this.toDto(saved);
  }

  /**
   * Settle a market with a WIN or LOSS result.
   *
   * WIN  — The market's outcome occurred (e.g. "Man City won").
   *        Every ACCEPTED bet is paid out at its stored payoutCents.
   *
   * LOSS — The outcome did not occur.
   *        Every ACCEPTED bet is settled with no payout.
   *        The stake was already debited from the wallet at bet placement time.
   *
   * In both cases the bet status moves to SETTLED via direct repo update
   * (bypassing BettingService to avoid a circular module dependency — the state
   * machine logic is trivially correct here: ACCEPTED → SETTLED is always valid).
   */
  async settle(marketId: string, result: MarketResult): Promise<MarketResponseDto> {
    const market = await this.getMarketById(marketId);
    if (market.status === MarketStatus.SETTLED) {
      throw new UnprocessableEntityException('Market is already SETTLED');
    }

    // Find every bet that is live (ACCEPTED) on this market.
    const acceptedBets = await this.betRepo.find({
      where: { marketId, status: BetStatus.ACCEPTED },
    });

    this.logger.log(
      `Settling market ${marketId} as ${result} — ${acceptedBets.length} accepted bet(s) to process`,
    );

    // Process each bet. Errors in individual bets are logged but don't abort
    // the others — each credit/settle is idempotent so a retry is safe.
    for (const bet of acceptedBets) {
      try {
        if (result === MarketResult.WIN) {
          // Credit the payout. referenceId = bet.id ensures idempotency —
          // if this crashes and is retried, WalletService.credit() will return
          // the existing transaction without double-crediting.
          await this.walletService.credit(
            bet.userId,
            bet.payoutCents,
            bet.id,
            `Payout for winning bet on market "${market.name}"`,
          );
        }

        // Transition ACCEPTED → SETTLED directly. We intentionally bypass
        // BettingService.transitionStatus() to avoid a circular dependency.
        // ACCEPTED → SETTLED is always valid per the state machine.
        await this.betRepo.update({ id: bet.id }, { status: BetStatus.SETTLED });

        // Publish notification — NotificationWorker will push this to the user's
        // WebSocket room in real time. Fire-and-forget: a notification failure
        // must not roll back the financial settlement.
        await this.rabbitMQService.publishNotification({
          type:        'BET_SETTLED',
          userId:      bet.userId,
          betId:       bet.id,
          marketName:  market.name,
          result,
          payoutCents: result === MarketResult.WIN ? bet.payoutCents : 0,
        });

        this.logger.log(
          `Bet ${bet.id} settled (${result}) — user ${bet.userId}` +
          (result === MarketResult.WIN ? `, payout ${bet.payoutCents}c` : ', no payout'),
        );
      } catch (err) {
        this.logger.error(
          `Failed to settle bet ${bet.id}: ${(err as Error).message}`,
          (err as Error).stack,
        );
        // Continue processing the remaining bets.
      }
    }

    // Mark the market as SETTLED — terminal, cannot be re-opened.
    market.status = MarketStatus.SETTLED;
    const saved = await this.marketRepo.save(market);
    this.logger.log(`Market ${marketId} marked SETTLED (result: ${result})`);

    await this.rabbitMQService.publishNotification({
      type:     'MARKET_UPDATED',
      marketId: saved.id,
      name:     saved.name,
      status:   saved.status,
      oddsInt:  saved.oddsInt,
    });

    return this.toDto(saved);
  }

  private toDto(market: Market): MarketResponseDto {
    return {
      id:          market.id,
      eventId:     market.eventId,
      name:        market.name,
      oddsInt:     market.oddsInt,
      oddsDisplay: this.formatOdds(market.oddsInt),
      status:      market.status,
      createdAt:   market.createdAt,
      updatedAt:   market.updatedAt,
    };
  }

  /** Formats oddsInt back to decimal display string. 240 → "2.40" */
  private formatOdds(oddsInt: number): string {
    return (oddsInt / 100).toFixed(2);
  }
}
