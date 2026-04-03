import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bet } from './entities/BetEntity';
import { BettingService } from './BettingService';
import { BettingController } from './BettingController';
import { MarketModule } from '../market/MarketModule';
import { WalletModule } from '../wallet/WalletModule';

@Module({
  imports: [
    // Register Bet entity on both primary (writes) and replica (reads)
    TypeOrmModule.forFeature([Bet]),
    TypeOrmModule.forFeature([Bet], 'replica'),
    MarketModule,  // provides MarketService (assertMarketOpen)
    WalletModule,  // provides WalletService (debit)
  ],
  providers:   [BettingService],
  controllers: [BettingController],
  exports:     [BettingService], // Settlement Worker needs transitionStatus()
})
export class BettingModule {}
