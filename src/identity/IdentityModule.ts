import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { jwtConfig, securityConfig } from '../config';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refreshToken.entity';
import { IdentityService } from './identity.service';
import { IdentityController } from './identity.controller';

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
