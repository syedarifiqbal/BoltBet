import { Module } from '@nestjs/common';
import { SettlementWorker } from './SettlementWorker';
import { BettingModule } from '../betting/BettingModule';
import { WalletModule } from '../wallet/WalletModule';

/**
 * SettlementModule wires the worker into the NestJS DI graph.
 *
 * It imports BettingModule and WalletModule so the worker can call
 * BettingService.transitionStatus() and WalletService.credit() directly —
 * no HTTP round-trip, no network overhead, no extra auth hop.
 *
 * Why in-process rather than a separate microservice?
 *  At this scale, a separate process adds latency and deployment complexity
 *  with no benefit. When the Betting Service needs to scale independently
 *  of the Settlement Worker, split them — not before.
 */
@Module({
  imports:   [BettingModule, WalletModule],
  providers: [SettlementWorker],
})
export class SettlementModule {}
