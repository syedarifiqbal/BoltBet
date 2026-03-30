import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { MarketResult } from '../types/MarketTypes';

export class SettleMarketDto {
  @ApiProperty({
    enum:        MarketResult,
    example:     MarketResult.WIN,
    description:
      'WIN — market outcome occurred; all accepted bets are paid out. ' +
      'LOSS — market outcome did not occur; all accepted bets are settled with no payout.',
  })
  @IsEnum(MarketResult)
  result: MarketResult;
}
