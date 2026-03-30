import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Market } from './entities/MarketEntity';
import { MarketService } from './MarketService';
import { MarketController } from './MarketController';
import { WalletModule } from '../wallet/WalletModule';
import { Bet } from '../betting/entities/BetEntity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Market]),
    // Bet entity — MarketService queries ACCEPTED bets when settling a market.
    // We import the entity directly here to avoid a circular dependency with BettingModule
    // (BettingModule already imports MarketModule for assertMarketOpen).
    TypeOrmModule.forFeature([Bet]),
    WalletModule,  // provides WalletService (credit on WIN)
  ],
  providers:   [MarketService],
  controllers: [MarketController],
  exports:     [MarketService], // BettingService needs assertMarketOpen()
})
export class MarketModule {}
