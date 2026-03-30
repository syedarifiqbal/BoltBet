import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType } from '../types/WalletTypes';

export class TransactionResponseDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  id: string;

  @ApiProperty({ enum: TransactionType, example: TransactionType.DEPOSIT })
  type: TransactionType;

  @ApiProperty({ example: 1000, description: 'Amount in cents. $10.00 → 1000' })
  amountCents: number;

  @ApiProperty({ example: '$10.00' })
  amountDisplay: string;

  @ApiProperty({ example: 5000 })
  balanceAfterCents: number;

  @ApiProperty({ example: '$50.00' })
  balanceAfterDisplay: string;

  @ApiPropertyOptional({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6', nullable: true })
  referenceId: string | null;

  @ApiPropertyOptional({ example: 'Deposit via card', nullable: true })
  description: string | null;

  @ApiProperty()
  createdAt: Date;
}

export class TransactionListResponseDto {
  @ApiProperty({ type: [TransactionResponseDto] })
  transactions: TransactionResponseDto[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;
}
