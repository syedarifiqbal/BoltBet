import { ApiProperty } from '@nestjs/swagger';

export class BalanceResponseDto {
  @ApiProperty({ example: 105000, description: 'Balance in cents. $1,050.00 → 105000' })
  balanceCents: number;

  @ApiProperty({ example: '$1,050.00' })
  balanceDisplay: string;
}
