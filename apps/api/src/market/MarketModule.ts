import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Market } from './entities/MarketEntity';
import { MarketService } from './MarketService';
import { MarketController } from './MarketController';

@Module({
  imports: [TypeOrmModule.forFeature([Market])],
  providers:   [MarketService],
  controllers: [MarketController],
  exports:     [MarketService], // BettingService needs assertMarketOpen()
})
export class MarketModule {}
