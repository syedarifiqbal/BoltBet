import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './entities/wallet.entity';
import { WalletTransaction } from './entities/walletTransaction.entity';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';

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
