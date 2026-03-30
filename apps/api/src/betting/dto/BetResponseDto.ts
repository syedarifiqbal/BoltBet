import { BetStatus } from '../types/BettingTypes';

export class BetResponseDto {
  id: string;
  marketId: string;
  oddsInt: number;
  oddsDisplay: string;     // "2.40"
  stakeCents: number;
  stakeDisplay: string;    // "$10.00"
  payoutCents: number;
  payoutDisplay: string;   // "$24.00"
  status: BetStatus;
  referenceId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class BetListResponseDto {
  data: BetResponseDto[];
  total: number;
  page: number;
  limit: number;
}
