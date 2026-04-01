import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { jwtConfig, securityConfig } from '../config';
import { User } from './entities/UserEntity';
import { RefreshToken } from './entities/RefreshTokenEntity';
import { IdentityService } from './IdentityService';
import { IdentityController } from './IdentityController';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken]),
    ConfigModule.forFeature(jwtConfig),
    ConfigModule.forFeature(securityConfig),
  ],
  providers: [IdentityService],
  controllers: [IdentityController],
  exports: [IdentityService],
})
export class IdentityModule {}
