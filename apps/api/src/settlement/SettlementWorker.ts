import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ChannelWrapper } from 'amqp-connection-manager';
import { RabbitMQService } from '../rabbitmq/RabbitmqService';
import { BettingService } from '../betting/BettingService';
import { BetStatus, BetPlacementPayload } from '../betting/types/BettingTypes';

/**
 * SettlementWorker — consumes bet_placement messages and accepts each bet.
 *
 * Responsibility: PENDING → ACCEPTED only.
 *
 * The bet is now "live" — it sits at ACCEPTED until the admin settles the market.
 * At that point, MarketService.settle() handles the WIN/LOSS decision:
 *  - WIN  → WalletService.credit(payoutCents) + bet → SETTLED
 *  - LOSS → bet → SETTLED (no payout; stake was already debited at placement)
 *
 * Flow per message:
 *  1. Parse payload: { betId, userId, marketId, oddsInt, stakeCents, payoutCents }
 *  2. PENDING → ACCEPTED
 *  3. ack the message
 *
 * Error handling:
 *  - Any failure → nack(requeue=false) → message goes to bet_placement_dead_letter
 *  - Bets already in a terminal state are silently acked (idempotency)
 *
 * Why not requeue on failure (requeue=true)?
 *  Requeue causes an infinite retry loop on poison messages.
 *  The DLX is the correct place for manual inspection and replay.
 */
@Injectable()
export class SettlementWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SettlementWorker.name);
  private consumerChannel: ChannelWrapper;

  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly bettingService: BettingService,
  ) {}

  onModuleInit(): void {
    this.consumerChannel = this.rabbitMQService.createBetPlacementConsumer(
      this.handleMessage.bind(this),
    );
    this.logger.log('Settlement Worker started — listening on bet_placement queue');
  }

  private async handleMessage(
    raw: unknown,
    ack: () => void,
    nack: (requeue: boolean) => void,
  ): Promise<void> {
    const payload = raw as BetPlacementPayload;
    const { betId, userId } = payload;

    this.logger.log(`Accepting bet ${betId} for user ${userId}`);

    try {
      // PENDING → ACCEPTED
      // If the bet is already past PENDING (e.g. duplicate delivery after a crash),
      // check for terminal state and ack silently — don't error.
      try {
        await this.bettingService.transitionStatus(betId, BetStatus.ACCEPTED);
      } catch {
        const alreadyTerminal = await this.bettingService.isTerminalState(betId);
        if (alreadyTerminal) {
          this.logger.warn(`Bet ${betId} already in terminal state — acking (idempotent)`);
          ack();
          return;
        }
        throw new Error(`Failed to transition bet ${betId} to ACCEPTED`);
      }

      this.logger.log(`Bet ${betId} accepted — waiting for market settlement`);
      ack();
    } catch (err) {
      this.logger.error(
        `Failed to accept bet ${betId}: ${(err as Error).message}`,
        (err as Error).stack,
      );
      nack(false);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumerChannel.close();
    this.logger.log('Settlement Worker stopped');
  }
}
