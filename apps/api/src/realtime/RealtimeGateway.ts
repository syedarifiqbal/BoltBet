import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigType } from '@nestjs/config';
import { jwtConfig } from '../config';
import { RedisService } from '../redis/RedisService';
import type { JwtPayload } from '../identity/types/IdentityTypes';

export interface BetSettledPayload {
  betId:       string;
  marketName:  string;
  result:      'WIN' | 'LOSS';
  payoutCents: number;
}

/**
 * RealtimeGateway — Socket.io WebSocket server.
 *
 * Connection flow:
 *  1. Client sends JWT in handshake.auth.token (from memory — never a cookie)
 *  2. handleConnection() validates token: RS256 verify + Redis blacklist check
 *  3. On success: socket joins room `user:{userId}` and is considered connected
 *  4. On failure: socket is disconnected immediately (no error reason exposed)
 *
 * Event emitted to clients:
 *  bet:settled — { betId, marketName, result, payoutCents }
 *    Pushed when a market settles and this user had an ACCEPTED bet on it.
 *
 * Room naming: `user:{userId}` — one room per user, multiple sockets allowed
 * (same user open in two browser tabs both receive the event).
 */
@WebSocketGateway({
  cors: {
    origin:      ['http://localhost:3001', 'https://localhost:3001'],
    credentials: true,
  },
  namespace: '/',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    @Inject(jwtConfig.KEY)
    private readonly config: ConfigType<typeof jwtConfig>,
  ) {}

  async handleConnection(socket: Socket): Promise<void> {
    const token = socket.handshake.auth?.token as string | undefined;

    if (!token) {
      this.logger.warn(`Socket ${socket.id} rejected — no token`);
      socket.disconnect(true);
      return;
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        algorithms: ['RS256'],
        publicKey:  this.config.publicKey,
      });
    } catch {
      // Never expose why the token was rejected — just disconnect silently.
      this.logger.warn(`Socket ${socket.id} rejected — invalid token`);
      socket.disconnect(true);
      return;
    }

    // Blacklist check — same as JwtAuthGuard (defence in depth).
    const blacklisted = await this.redisService.persistent.get(
      `blacklist:jti:${payload.jti}`,
    );
    if (blacklisted) {
      this.logger.warn(`Socket ${socket.id} rejected — token revoked`);
      socket.disconnect(true);
      return;
    }

    // Attach userId to socket data so we can reference it on disconnect.
    socket.data.userId = payload.sub;

    // Join user's personal room. Multiple sockets (tabs) can be in the same room.
    await socket.join(`user:${payload.sub}`);
    this.logger.log(`Socket ${socket.id} connected — user ${payload.sub}`);
  }

  handleDisconnect(socket: Socket): void {
    this.logger.log(
      `Socket ${socket.id} disconnected — user ${socket.data.userId ?? 'unknown'}`,
    );
  }

  /**
   * Push a bet settlement event to all sockets belonging to a user.
   * Called by NotificationWorker after a market is settled.
   */
  pushBetSettled(userId: string, payload: BetSettledPayload): void {
    this.server.to(`user:${userId}`).emit('bet:settled', payload);
    this.logger.log(
      `Pushed bet:settled to user ${userId} — bet ${payload.betId} (${payload.result})`,
    );
  }
}
