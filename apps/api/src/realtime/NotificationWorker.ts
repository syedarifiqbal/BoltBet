import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ChannelWrapper } from 'amqp-connection-manager';
import { RabbitMQService } from '../rabbitmq/RabbitmqService';
import { RealtimeGateway } from './RealtimeGateway';

export type NotificationPayload =
  | {
      type:        'BET_SETTLED';
      userId:      string;
      betId:       string;
      marketName:  string;
      result:      'WIN' | 'LOSS';
      payoutCents: number;
    }
  | {
      type:     'MARKET_UPDATED';
      marketId: string;
      name:     string;
      status:   string;
      oddsInt:  number;
    }
  | {
      type:     'MARKET_CREATED';
      marketId: string;
      name:     string;
      oddsInt:  number;
    };

/**
 * NotificationWorker — consumes the `notifications` queue and pushes
 * real-time events to connected clients via the RealtimeGateway.
 *
 * Flow per message:
 *  1. Parse payload: { type, userId, betId, marketName, result, payoutCents }
 *  2. Call RealtimeGateway.pushBetSettled(userId, ...) — emits to `user:{userId}` room
 *  3. ack the message
 *
 * If the user has no active WebSocket connection, the emit is a no-op —
 * the event is simply lost. An email fallback can be added later.
 *
 * Error handling:
 *  nack(requeue=false) → notifications_dead_letter for manual inspection.
 */
@Injectable()
export class NotificationWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationWorker.name);
  private consumerChannel: ChannelWrapper;

  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  onModuleInit(): void {
    this.consumerChannel = this.rabbitMQService.createNotificationsConsumer(
      this.handleMessage.bind(this),
    );
    this.logger.log('Notification Worker started — listening on notifications queue');
  }

  private async handleMessage(
    raw: unknown,
    ack: () => void,
    nack: (requeue: boolean) => void,
  ): Promise<void> {
    const payload = raw as NotificationPayload;

    try {
      if (payload.type === 'BET_SETTLED') {
        this.realtimeGateway.pushBetSettled(payload.userId, {
          betId:       payload.betId,
          marketName:  payload.marketName,
          result:      payload.result,
          payoutCents: payload.payoutCents,
        });
      } else if (payload.type === 'MARKET_UPDATED') {
        this.realtimeGateway.pushMarketUpdated({
          marketId: payload.marketId,
          name:     payload.name,
          status:   payload.status,
          oddsInt:  payload.oddsInt,
        });
      } else if (payload.type === 'MARKET_CREATED') {
        this.realtimeGateway.pushMarketCreated({
          marketId: payload.marketId,
          name:     payload.name,
          oddsInt:  payload.oddsInt,
        });
      } else {
        this.logger.warn(`Unknown notification type: ${(payload as NotificationPayload).type}`);
      }

      ack();
    } catch (err) {
      this.logger.error(
        `Failed to process notification: ${(err as Error).message}`,
        (err as Error).stack,
      );
      nack(false);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumerChannel.close();
    this.logger.log('Notification Worker stopped');
  }
}
