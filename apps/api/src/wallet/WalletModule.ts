import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './entities/WalletEntity';
import { WalletTransaction } from './entities/WalletTransactionEntity';
import { WalletService } from './WalletService';
import { WalletController } from './WalletController';

@Module({
  imports: [
    // Register entities on the primary connection (writes)
    TypeOrmModule.forFeature([Wallet, WalletTransaction]),
    // Register entities on the replica connection (reads)
    TypeOrmModule.forFeature([Wallet, WalletTransaction], 'replica'),
  ],
  providers:   [WalletService],
  controllers: [WalletController],
  exports:     [WalletService], // exported so BettingService can call debit/credit directly
})
export class WalletModule {}
