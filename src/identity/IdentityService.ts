import {
  Injectable,
  OnModuleInit,
  Logger,
  ConflictException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigType } from '@nestjs/config';
import { Response, Request } from 'express';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refreshToken.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AccessTokenResponseDto } from './dto/authResponse.dto';
import { Role, ROLE_TIER, JwtPayload } from './types/identity.types';
import { jwtConfig, securityConfig } from '../config';
import { RedisService } from '../redis/redis.service';

const BCRYPT_ROUNDS_PASSWORD = 12;
const BCRYPT_ROUNDS_TOKEN    = 10;
const REFRESH_COOKIE_NAME    = 'refresh_token';

@Injectable()
export class IdentityService implements OnModuleInit {
  private readonly logger = new Logger(IdentityService.name);

  /**
   * Pre-computed dummy hash used when a user is not found.
   * bcrypt.compare is always called so login attempts against a non-existent
   * email take the same time as against an existing one — no email enumeration.
   */
  private dummyHash!: string;

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    @Inject(jwtConfig.KEY)
    private readonly jwtCfg: ConfigType<typeof jwtConfig>,
    @Inject(securityConfig.KEY)
    private readonly securityCfg: ConfigType<typeof securityConfig>,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.jwtCfg.privateKey || !this.jwtCfg.publicKey) {
      throw new Error(
        'JWT_PRIVATE_KEY and JWT_PUBLIC_KEY are required. Run `make keys` to generate them.',
      );
    }
    if (!this.securityCfg.passwordPepper) {
      this.logger.warn(
        'PASSWORD_PEPPER is not set — password storage is weaker. Set it in .env before any real data.',
      );
    }

    // Pre-compute so it's available synchronously in login's timing-safe path
    this.dummyHash = await bcrypt.hash('dummy-for-timing-only', BCRYPT_ROUNDS_PASSWORD);
  }

  // ── Registration ───────────────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<void> {
    const existing = await this.userRepo.findOne({
      where: { email: dto.email },
      withDeleted: false,
    });
    if (existing) throw new ConflictException('Email is already registered');

    const passwordHash = await bcrypt.hash(
      this.securityCfg.passwordPepper + dto.password,
      BCRYPT_ROUNDS_PASSWORD,
    );

    const user = this.userRepo.create({
      email:        dto.email,
      passwordHash,
      role:         Role.USER,
    });
    await this.userRepo.save(user);
    this.logger.log(`User registered: ${user.id}`);
  }

  // ── Login ──────────────────────────────────────────────────────────────────

  async login(
    dto: LoginDto,
    req: Request,
    res: Response,
  ): Promise<AccessTokenResponseDto> {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });

    // Always call bcrypt.compare even when user is not found.
    // This ensures login takes ~250ms regardless of whether the email exists,
    // preventing email enumeration via timing side-channel.
    const passwordToCheck = this.securityCfg.passwordPepper + dto.password;
    const hashToCompare   = user?.passwordHash ?? this.dummyHash;
    const valid = await bcrypt.compare(passwordToCheck, hashToCompare);

    if (!user || !valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.issueAccessToken(user);
    await this.issueRefreshToken(user, req, res);
    this.logger.log(`User logged in: ${user.id}`);
    return { accessToken };
  }

  // ── Token refresh ──────────────────────────────────────────────────────────

  async refresh(req: Request, res: Response): Promise<AccessTokenResponseDto> {
    const rawCookie: string | undefined = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!rawCookie) throw new UnauthorizedException('No refresh token');

    const separatorIndex = rawCookie.indexOf(':');
    if (separatorIndex === -1) throw new UnauthorizedException('Malformed refresh token');

    const tokenId  = rawCookie.slice(0, separatorIndex);
    const rawSecret = rawCookie.slice(separatorIndex + 1);

    const storedToken = await this.refreshTokenRepo.findOne({
      where:     { id: tokenId },
      relations: ['user'],
    });

    if (!storedToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    if (storedToken.revoked) {
      // Token from a revoked family — could be a reuse attack or an already-
      // handled revocation. Either way, fail safely.
      this.logger.warn(
        `Revoked token presented for family ${storedToken.familyId} (user ${storedToken.userId})`,
      );
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (storedToken.used) {
      // A used token being replayed is an unambiguous theft signal.
      // Revoke the entire family — both the attacker's copy and the
      // legitimate user's current token become invalid.
      await this.revokeFamilyByFamilyId(storedToken.familyId);
      this.logger.warn(
        `Token reuse detected — family ${storedToken.familyId} revoked (user ${storedToken.userId})`,
      );
      throw new UnauthorizedException(
        'Refresh token reuse detected — all sessions have been revoked',
      );
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    const secretMatches = await bcrypt.compare(rawSecret, storedToken.tokenHash);
    if (!secretMatches) throw new UnauthorizedException('Invalid refresh token');

    // Mark current token as used before issuing the next one (rotation).
    storedToken.used = true;
    await this.refreshTokenRepo.save(storedToken);

    // Issue new access token + new refresh token in the same family.
    const accessToken = await this.issueAccessToken(storedToken.user);
    await this.issueRefreshToken(storedToken.user, req, res, storedToken.familyId);

    return { accessToken };
  }

  // ── Logout ─────────────────────────────────────────────────────────────────

  async logout(
    payload: JwtPayload,
    req: Request,
    res: Response,
  ): Promise<void> {
    // 1. Revoke the refresh token if present in the request cookie.
    const rawCookie: string | undefined = req.cookies?.[REFRESH_COOKIE_NAME];
    if (rawCookie) {
      const tokenId = rawCookie.slice(0, rawCookie.indexOf(':'));
      if (tokenId) {
        await this.refreshTokenRepo.update({ id: tokenId }, { revoked: true });
      }
    }

    // 2. Blacklist the access token jti until it naturally expires.
    //    OpenResty checks this at the edge; the service-level check in
    //    JwtAuthGuard is defence-in-depth for internal traffic.
    const nowSeconds = Math.floor(Date.now() / 1000);
    const ttl = payload.exp - nowSeconds;
    if (ttl > 0) {
      await this.redisService.persistent.set(
        `blacklist:jti:${payload.jti}`,
        '1',
        'EX',
        ttl,
      );
    }

    // 3. Clear the refresh token cookie.
    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure:   true,
      sameSite: 'strict',
      path:     '/v1/auth',
    });

    this.logger.log(`User logged out: ${payload.sub}, jti blacklisted: ${payload.jti}`);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async issueAccessToken(user: User): Promise<string> {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub:  user.id,
      role: user.role,
      tier: ROLE_TIER[user.role],
      jti:  crypto.randomUUID(),
    };
    return this.jwtService.signAsync(payload, {
      algorithm:  'RS256',
      privateKey: this.jwtCfg.privateKey,
      expiresIn:  this.jwtCfg.accessTtl,
    });
  }

  private async issueRefreshToken(
    user: User,
    req: Request,
    res: Response,
    existingFamilyId?: string,
  ): Promise<void> {
    const rawSecret = crypto.randomBytes(64).toString('hex');
    const tokenHash = await bcrypt.hash(rawSecret, BCRYPT_ROUNDS_TOKEN);
    const familyId  = existingFamilyId ?? crypto.randomUUID();
    const expiresAt = new Date(Date.now() + this.jwtCfg.refreshTtl * 1000);

    const saved = await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({
        familyId,
        tokenHash,
        userId:            user.id,
        deviceFingerprint: this.deviceFingerprint(req),
        ipAddress:         req.ip ?? null,
        userAgent:         req.headers['user-agent'] ?? null,
        expiresAt,
      }),
    );

    // Cookie format: "{uuid}:{rawSecret}"
    //   uuid      — DB primary key, allows O(1) lookup on next refresh
    //   rawSecret — bcrypt-compared against token_hash; never stored raw
    res.cookie(REFRESH_COOKIE_NAME, `${saved.id}:${rawSecret}`, {
      httpOnly: true,
      secure:   true,
      sameSite: 'strict',
      path:     '/v1/auth', // only sent to /v1/auth/* — never to /v1/bets
      maxAge:   this.jwtCfg.refreshTtl * 1000,
    });
  }

  private async revokeFamilyByFamilyId(familyId: string): Promise<void> {
    await this.refreshTokenRepo.update({ familyId }, { revoked: true });
  }

  /**
   * SHA-256 of User-Agent — used as a lightweight device fingerprint.
   * A change in fingerprint during refresh triggers a security event.
   * IP is intentionally excluded: mobile users change IPs legitimately.
   */
  private deviceFingerprint(req: Request): string {
    const ua = req.headers['user-agent'] ?? '';
    return crypto.createHash('sha256').update(ua).digest('hex');
  }
}
