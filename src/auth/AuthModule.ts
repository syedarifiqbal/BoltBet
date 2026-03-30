import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { jwtConfig } from '../config';
import { JwtAuthGuard } from './guards/jwtAuth.guard';
import { RolesGuard } from './guards/roles.guard';

/**
 * Global auth module — imported once in AppModule.
 *
 * Registers JwtAuthGuard and RolesGuard as global guards via APP_GUARD.
 * Guards execute in registration order: JWT validation first, roles second.
 *
 * Exports JwtModule so JwtService is available to IdentityService (and any
 * other service that needs to sign or verify tokens) without re-importing.
 *
 * JwtModule is registered with empty defaults — keys and algorithm are
 * always passed explicitly to jwtService.signAsync/verifyAsync to avoid
 * misconfiguration from default values being silently used.
 */
@Global()
@Module({
  imports: [
    JwtModule.register({}),
    ConfigModule.forFeature(jwtConfig),
  ],
  providers: [
    JwtAuthGuard,
    RolesGuard,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [JwtModule, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
