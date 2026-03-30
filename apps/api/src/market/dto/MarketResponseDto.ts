import { ApiProperty } from '@nestjs/swagger';
import { MarketStatus } from '../types/MarketTypes';

export class MarketResponseDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  id: string;

  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  eventId: string;

  @ApiProperty({ example: 'Man City to win' })
  name: string;

  @ApiProperty({ example: 240, description: 'Decimal odds × 100. 2.40 → 240' })
  oddsInt: number;

  @ApiProperty({ example: '2.40' })
  oddsDisplay: string;

  @ApiProperty({ enum: MarketStatus, example: MarketStatus.OPEN })
  status: MarketStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class MarketListResponseDto {
  @ApiProperty({ type: [MarketResponseDto] })
  markets: MarketResponseDto[];

  @ApiProperty({ example: 10 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;
}
