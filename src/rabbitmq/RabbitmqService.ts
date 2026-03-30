import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import amqp, { ChannelWrapper } from 'amqp-connection-manager';
import { IAmqpConnectionManager } from 'amqp-connection-manager/dist/types/AmqpConnectionManager';
import { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { rabbitmqConfig } from '../config';

// Queue name is a constant — both publisher and consumer must use the same name.
export const TASK_QUEUE = 'task_queue';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);

  private connection: IAmqpConnectionManager;
  private publisherChannel: ChannelWrapper;
  private consumerChannel: ChannelWrapper;

  constructor(
    /**
     * @Inject(rabbitmqConfig.KEY) injects the typed config namespace registered
     * with registerAs('rabbitmq', ...) in src/config/rabbitmq.config.ts.
     *
     * ConfigType<typeof rabbitmqConfig> gives full TypeScript inference —
     * this.config.url is typed as string, with no magic string key lookups.
     *
     * Never use process.env directly here. Config values belong in src/config/.
     */
    @Inject(rabbitmqConfig.KEY)
    private readonly config: ConfigType<typeof rabbitmqConfig>,
  ) {}

  /**
   * onModuleInit runs automatically when the NestJS app finishes bootstrapping.
   * This is the right lifecycle hook to open long-lived connections.
   */
  onModuleInit(): void {
    // amqp-connection-manager wraps amqplib and handles reconnections for you.
    // If RabbitMQ restarts, it will reconnect and re-setup your channels automatically.
    this.connection = amqp.connect([this.config.url]);

    this.connection.on('connect', () => this.logger.log('Connected to RabbitMQ'));
    this.connection.on('disconnect', ({ err }) =>
      this.logger.warn(`Disconnected from RabbitMQ: ${err?.message}`),
    );

    // ── PUBLISHER CHANNEL ─────────────────────────────────────────────────────
    // setup() runs once on connect (and again on every reconnect).
    // assertQueue is idempotent — safe to call multiple times.
    // durable: true → queue survives a broker restart.
    this.publisherChannel = this.connection.createChannel({
      json: true, // automatically JSON.stringify outgoing / JSON.parse incoming
      setup: (ch: ConfirmChannel) => ch.assertQueue(TASK_QUEUE, { durable: true }),
    });

    // ── CONSUMER CHANNEL ──────────────────────────────────────────────────────
    // A separate channel for consuming is best practice.
    // Channels are lightweight; mixing publish/consume on one channel can cause
    // head-of-line blocking.
    this.consumerChannel = this.connection.createChannel({
      json: true,
      setup: async (ch: ConfirmChannel) => {
        await ch.assertQueue(TASK_QUEUE, { durable: true });

        // prefetch(1): "give me one unacked message at a time"
        // Without this, RabbitMQ floods the consumer with all pending messages
        // at once (round-robin), ignoring how busy it is.
        await ch.prefetch(1);

        await ch.consume(TASK_QUEUE, (msg: ConsumeMessage | null) => {
          if (!msg) return; // null = consumer was cancelled by the broker

          // msg.content is a raw Buffer — parse it yourself (or let json:true handle it)
          const payload = JSON.parse(msg.content.toString()) as unknown;
          this.logger.log(`[Consumer] Received: ${JSON.stringify(payload)}`);

          // ── Acknowledgement ──────────────────────────────────────────────
          // ack(msg)   → "I processed this, remove it from the queue"
          // nack(msg)  → "I failed, requeue it" (or dead-letter it)
          // If you never ack, the message is redelivered when your app reconnects.
          ch.ack(msg);
        });
      },
    });
  }

  /**
   * Publish a JSON payload to the task queue.
   * sendToQueue returns a Promise that resolves when the broker confirms receipt
   * (because we're on a ConfirmChannel — publisher confirms are enabled).
   */
  async publish(data: object): Promise<void> {
    await this.publisherChannel.sendToQueue(TASK_QUEUE, data, {
      persistent: true, // messages survive a broker restart (requires durable queue)
    });
    this.logger.log(`[Publisher] Sent: ${JSON.stringify(data)}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumerChannel.close();
    await this.publisherChannel.close();
    await this.connection.close();
  }
}
