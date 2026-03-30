import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ChannelWrapper } from 'amqp-connection-manager';
import { RabbitMQService } from '../rabbitmq/RabbitmqService';
import { BettingService } from '../betting/BettingService';
import { WalletService } from '../wallet/WalletService';
import { BetStatus, BetPlacementPayload } from '../betting/types/BettingTypes';

/**
 * SettlementWorker — consumes bet_placement messages and settles each bet.
 *
 * Flow per message:
 *  1. Parse payload: { betId, userId, marketId, oddsInt, stakeCents, payoutCents }
 *  2. PENDING → ACCEPTED  (bet has been received and is being processed)
 *  3. Credit wallet with payoutCents
 *  4. ACCEPTED → SETTLED
 *  5. Publish settlement notification to the notifications queue
 *  6. ack the message
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
    private readonly walletService: WalletService,
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
    const { betId, userId, payoutCents } = payload;

    this.logger.log(`Processing bet ${betId} for user ${userId}`);

    try {
      // ── Step 1: PENDING → ACCEPTED ─────────────────────────────────────────
      // This transition failing means the bet is already in a terminal state
      // (SETTLED, VOID, CANCELLED) or was already accepted by a prior delivery.
      // We catch that specific case below for idempotency.
      try {
        await this.bettingService.transitionStatus(betId, BetStatus.ACCEPTED);
      } catch {
        // If the bet is already past PENDING the transition throws.
        // Check if it's already in a terminal state — if so, ack and move on.
        const alreadyTerminal = await this.bettingService.isTerminalState(betId);
        if (alreadyTerminal) {
          this.logger.warn(`Bet ${betId} already in terminal state — acking (idempotent)`);
          ack();
          return;
        }
        // Not terminal but transition failed for another reason — send to DLX.
        throw new Error(`Failed to transition bet ${betId} to ACCEPTED`);
      }

      // ── Step 2: Credit wallet ───────────────────────────────────────────────
      // referenceId is the betId — ensures this credit is only applied once
      // even if the message is redelivered after a crash between steps 2 and 3.
      await this.walletService.credit(
        userId,
        payoutCents,
        betId,
        `Settlement payout for bet ${betId}`,
      );

      // ── Step 3: ACCEPTED → SETTLED ─────────────────────────────────────────
      await this.bettingService.transitionStatus(betId, BetStatus.SETTLED);

      // ── Step 4: Notify ─────────────────────────────────────────────────────
      await this.rabbitMQService.publishNotification({
        type:        'BET_SETTLED',
        userId,
        betId,
        payoutCents,
      });

      this.logger.log(`Bet ${betId} settled — payout ${payoutCents}c credited to user ${userId}`);
      ack();
    } catch (err) {
      this.logger.error(
        `Failed to settle bet ${betId}: ${(err as Error).message}`,
        (err as Error).stack,
      );
      // nack(requeue=false) → dead-letter queue for manual inspection
      nack(false);
    }
  }

  async onModuleDestroy(): Promise<void> {
    // Close the consumer channel on SIGTERM. amqp-connection-manager will
    // wait for the current in-flight message handler to finish before closing
    // because we're using manual ack — the broker holds the message open until
    // ack/nack is called, so graceful shutdown is implicit.
    await this.consumerChannel.close();
    this.logger.log('Settlement Worker stopped');
  }
}
