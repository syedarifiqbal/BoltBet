import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { ServerOptions } from 'socket.io';
import { INestApplication, Logger } from '@nestjs/common';

/**
 * RedisIoAdapter — replaces the default IoAdapter with one backed by Redis Pub/Sub.
 *
 * Why this is needed:
 *   In production, multiple server instances run behind a load balancer. Each
 *   instance has its own Socket.io server with its own set of connected clients.
 *   When instance A calls server.emit('market:created'), only clients connected
 *   to instance A receive it — clients on B, C, etc. are missed.
 *
 *   The Redis adapter solves this by routing all emit() calls through a Redis
 *   Pub/Sub channel. Every instance subscribes to the channel. When instance A
 *   publishes, instances B and C receive the message and emit it to their own
 *   connected clients. All users are covered regardless of which instance
 *   their WebSocket landed on.
 *
 * Two dedicated Redis connections (pubClient + subClient):
 *   Redis Pub/Sub requires a connection to be in "subscriber mode" once it
 *   calls SUBSCRIBE. A connection in subscriber mode cannot run regular Redis
 *   commands (GET, SET, etc.). So we need TWO connections — one for publishing
 *   (normal mode) and one dedicated to subscribing.
 *   These are separate from the RedisService clients for the same reason.
 *
 * Uses the ephemeral Redis instance (port 6380, allkeys-lru):
 *   Socket.io adapter state (channel subscriptions, room memberships broadcast)
 *   is ephemeral by nature — losing it on Redis restart just means sockets
 *   need to reconnect, which they do automatically. Using the persistent
 *   instance (AOF) for this would waste durability guarantees on throwaway data.
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor!: ReturnType<typeof createAdapter>;

  constructor(app: INestApplication) {
    super(app);
  }

  async connectToRedis(ephemeralUrl: string): Promise<void> {
    // Two separate ioredis clients — ioredis connects automatically on creation.
    // duplicate() copies the connection options so both point at the same Redis instance.
    const pubClient = new Redis(ephemeralUrl);
    const subClient = pubClient.duplicate();

    pubClient.on('error', (err) =>
      this.logger.error('Redis adapter pub client error', err),
    );
    subClient.on('error', (err) =>
      this.logger.error('Redis adapter sub client error', err),
    );

    this.adapterConstructor = createAdapter(pubClient, subClient);
    this.logger.log('Redis adapter connected');
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}
