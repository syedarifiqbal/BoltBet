import { ApiProperty } from '@nestjs/swagger';
import { BetStatus } from '../types/BettingTypes';

export class BetResponseDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  id: string;

  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  marketId: string;

  @ApiProperty({ example: 'Man City vs Arsenal — Match Winner' })
  marketName: string;

  @ApiProperty({ example: 240, description: 'Decimal odds × 100. 2.40 → 240' })
  oddsInt: number;

  @ApiProperty({ example: '2.40' })
  oddsDisplay: string;

  @ApiProperty({ example: 1000, description: 'Stake in cents. $10.00 → 1000' })
  stakeCents: number;

  @ApiProperty({ example: '$10.00' })
  stakeDisplay: string;

  @ApiProperty({ example: 2400, description: 'Potential payout in cents' })
  payoutCents: number;

  @ApiProperty({ example: '$24.00' })
  payoutDisplay: string;

  @ApiProperty({ enum: BetStatus, example: BetStatus.PENDING })
  status: BetStatus;

  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  referenceId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class BetListResponseDto {
  @ApiProperty({ type: [BetResponseDto] })
  bets: BetResponseDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;
}
