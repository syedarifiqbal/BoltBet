import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { jwtConfig } from '../config';
import { RealtimeGateway } from './RealtimeGateway';
import { NotificationWorker } from './NotificationWorker';

@Module({
  imports: [
    // jwtConfig needed for RS256 public key used in token verification on connect
    ConfigModule.forFeature(jwtConfig),
  ],
  providers: [RealtimeGateway, NotificationWorker],
})
export class RealtimeModule {}
