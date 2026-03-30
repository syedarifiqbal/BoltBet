import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import amqp, { ChannelWrapper } from 'amqp-connection-manager';
import { IAmqpConnectionManager } from 'amqp-connection-manager/dist/types/AmqpConnectionManager';
import { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { rabbitmqConfig } from '../config';

// Queue name constants — both publisher and consumer must use the same name.
export const TASK_QUEUE             = 'task_queue';
export const BET_PLACEMENT_QUEUE    = 'bet_placement';
export const BET_PLACEMENT_DLX      = 'bet_placement_dlx';
export const BET_PLACEMENT_DL_QUEUE = 'bet_placement_dead_letter';
export const NOTIFICATIONS_QUEUE    = 'notifications';
export const NOTIFICATIONS_DLX      = 'notifications_dlx';
export const NOTIFICATIONS_DL_QUEUE = 'notifications_dead_letter';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);

  private connection: IAmqpConnectionManager;
  private publisherChannel: ChannelWrapper;
  private consumerChannel: ChannelWrapper;

  constructor(
    @Inject(rabbitmqConfig.KEY)
    private readonly config: ConfigType<typeof rabbitmqConfig>,
  ) {}

  onModuleInit(): void {
    this.connection = amqp.connect([this.config.url]);

    this.connection.on('connect', () => this.logger.log('Connected to RabbitMQ'));
    this.connection.on('disconnect', ({ err }) =>
      this.logger.warn(`Disconnected from RabbitMQ: ${err?.message}`),
    );

    // ── PUBLISHER CHANNEL ─────────────────────────────────────────────────────
    this.publisherChannel = this.connection.createChannel({
      json: true,
      setup: async (ch: ConfirmChannel) => {
        await ch.assertQueue(TASK_QUEUE, { durable: true });

        // bet_placement queue + DLX
        await ch.assertExchange(BET_PLACEMENT_DLX, 'direct', { durable: true });
        await ch.assertQueue(BET_PLACEMENT_DL_QUEUE, { durable: true });
        await ch.bindQueue(BET_PLACEMENT_DL_QUEUE, BET_PLACEMENT_DLX, BET_PLACEMENT_QUEUE);
        await ch.assertQueue(BET_PLACEMENT_QUEUE, {
          durable: true,
          arguments: {
            'x-dead-letter-exchange':    BET_PLACEMENT_DLX,
            'x-dead-letter-routing-key': BET_PLACEMENT_QUEUE,
          },
        });

        // notifications queue + DLX
        await ch.assertExchange(NOTIFICATIONS_DLX, 'direct', { durable: true });
        await ch.assertQueue(NOTIFICATIONS_DL_QUEUE, { durable: true });
        await ch.bindQueue(NOTIFICATIONS_DL_QUEUE, NOTIFICATIONS_DLX, NOTIFICATIONS_QUEUE);
        await ch.assertQueue(NOTIFICATIONS_QUEUE, {
          durable: true,
          arguments: {
            'x-dead-letter-exchange':    NOTIFICATIONS_DLX,
            'x-dead-letter-routing-key': NOTIFICATIONS_QUEUE,
          },
        });
      },
    });

    // ── CONSUMER CHANNEL (task_queue demo) ────────────────────────────────────
    this.consumerChannel = this.connection.createChannel({
      json: true,
      setup: async (ch: ConfirmChannel) => {
        await ch.assertQueue(TASK_QUEUE, { durable: true });
        await ch.prefetch(1);
        await ch.consume(TASK_QUEUE, (msg: ConsumeMessage | null) => {
          if (!msg) return;
          const payload = JSON.parse(msg.content.toString()) as unknown;
          this.logger.log(`[Consumer] Received: ${JSON.stringify(payload)}`);
          ch.ack(msg);
        });
      },
    });
  }

  // ── Publish helpers ────────────────────────────────────────────────────────

  async publish(data: object): Promise<void> {
    await this.publisherChannel.sendToQueue(TASK_QUEUE, data, { persistent: true });
    this.logger.log(`[Publisher] Sent: ${JSON.stringify(data)}`);
  }

  async publishBetPlacement(data: object): Promise<void> {
    await this.publisherChannel.sendToQueue(BET_PLACEMENT_QUEUE, data, { persistent: true });
    this.logger.log(`[bet_placement] Published: ${JSON.stringify(data)}`);
  }

  async publishNotification(data: object): Promise<void> {
    await this.publisherChannel.sendToQueue(NOTIFICATIONS_QUEUE, data, { persistent: true });
    this.logger.log(`[notifications] Published: ${JSON.stringify(data)}`);
  }

  /**
   * Creates a dedicated consumer channel for the bet_placement queue.
   * Called by SettlementWorker during onModuleInit.
   *
   * A dedicated channel per logical consumer keeps head-of-line blocking isolated —
   * a slow settlement does not block the task_queue consumer.
   */
  createBetPlacementConsumer(
    handler: (payload: unknown, ack: () => void, nack: (requeue: boolean) => void) => Promise<void>,
  ): ChannelWrapper {
    return this.connection.createChannel({
      json: true,
      setup: async (ch: ConfirmChannel) => {
        // Mirror the same queue declaration so the consumer channel is ready
        // even if it reconnects before the publisher channel re-runs its setup.
        await ch.assertExchange(BET_PLACEMENT_DLX, 'direct', { durable: true });
        await ch.assertQueue(BET_PLACEMENT_DL_QUEUE, { durable: true });
        await ch.bindQueue(BET_PLACEMENT_DL_QUEUE, BET_PLACEMENT_DLX, BET_PLACEMENT_QUEUE);
        await ch.assertQueue(BET_PLACEMENT_QUEUE, {
          durable: true,
          arguments: {
            'x-dead-letter-exchange':    BET_PLACEMENT_DLX,
            'x-dead-letter-routing-key': BET_PLACEMENT_QUEUE,
          },
        });

        // prefetch(1): process one message at a time — critical for financial ops.
        // Settlement involves a DB write + wallet credit; we don't want to
        // buffer more than we can atomically process.
        await ch.prefetch(1);

        await ch.consume(BET_PLACEMENT_QUEUE, (msg: ConsumeMessage | null) => {
          if (!msg) return;
          const payload = JSON.parse(msg.content.toString()) as unknown;
          handler(
            payload,
            () => ch.ack(msg),
            (requeue: boolean) => ch.nack(msg, false, requeue),
          ).catch(() => {
            // Ensure nack always fires even if the handler throws synchronously.
            ch.nack(msg, false, false);
          });
        });
      },
    });
  }

  /**
   * Creates a dedicated consumer channel for the notifications queue.
   * Called by NotificationWorker during onModuleInit.
   */
  createNotificationsConsumer(
    handler: (payload: unknown, ack: () => void, nack: (requeue: boolean) => void) => Promise<void>,
  ): ChannelWrapper {
    return this.connection.createChannel({
      json: true,
      setup: async (ch: ConfirmChannel) => {
        await ch.assertExchange(NOTIFICATIONS_DLX, 'direct', { durable: true });
        await ch.assertQueue(NOTIFICATIONS_DL_QUEUE, { durable: true });
        await ch.bindQueue(NOTIFICATIONS_DL_QUEUE, NOTIFICATIONS_DLX, NOTIFICATIONS_QUEUE);
        await ch.assertQueue(NOTIFICATIONS_QUEUE, {
          durable: true,
          arguments: {
            'x-dead-letter-exchange':    NOTIFICATIONS_DLX,
            'x-dead-letter-routing-key': NOTIFICATIONS_QUEUE,
          },
        });

        // Notifications are lightweight (just a push) — prefetch(5) is safe.
        await ch.prefetch(5);

        await ch.consume(NOTIFICATIONS_QUEUE, (msg: ConsumeMessage | null) => {
          if (!msg) return;
          const payload = JSON.parse(msg.content.toString()) as unknown;
          handler(
            payload,
            () => ch.ack(msg),
            (requeue: boolean) => ch.nack(msg, false, requeue),
          ).catch(() => {
            ch.nack(msg, false, false);
          });
        });
      },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumerChannel.close();
    await this.publisherChannel.close();
    await this.connection.close();
  }
}
