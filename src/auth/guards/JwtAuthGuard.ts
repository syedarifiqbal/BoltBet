import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { ConfigType } from '@nestjs/config';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { jwtConfig } from '../../config';
import { RedisService } from '../../redis/redis.service';
import type { JwtPayload } from '../../identity/types/identity.types';

/**
 * Applied globally via APP_GUARD in AuthModule.
 *
 * What it does on every non-@Public() request:
 *  1. Extract Bearer token from Authorization header
 *  2. Verify RS256 signature against the public key
 *  3. Check Redis blacklist — revoked jtis are stored on logout
 *  4. Attach the decoded payload to request.user
 *
 * Why not passport-jwt?
 *  Direct implementation gives full control over error messages, the
 *  blacklist check, and how we integrate with the @Public() decorator.
 *  Passport adds abstraction without benefit here.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly reflector: Reflector,
    @Inject(jwtConfig.KEY)
    private readonly config: ConfigType<typeof jwtConfig>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException('No token provided');

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        algorithms: ['RS256'],
        publicKey:  this.config.publicKey,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Check Redis blacklist before trusting the token.
    // A revoked jti is written here on logout with TTL = remaining token lifetime.
    // OpenResty performs the same check at the edge, but the service-level check
    // is defence-in-depth — OpenResty can be bypassed in internal traffic.
    const blacklisted = await this.redisService.persistent.get(
      `blacklist:jti:${payload.jti}`,
    );
    if (blacklisted) throw new UnauthorizedException('Token has been revoked');

    request['user'] = payload;
    return true;
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
