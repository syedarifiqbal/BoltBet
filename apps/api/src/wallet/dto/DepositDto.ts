import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min, Max } from 'class-validator';

export class DepositDto {
  @ApiProperty({
    example: 1000,
    description: 'Amount in cents. Minimum $1.00 (100), maximum $10,000.00 (1_000_000).',
  })
  @IsInt()
  @Min(100,       { message: 'Minimum deposit is $1.00 (100 cents)' })
  @Max(1_000_000, { message: 'Maximum deposit is $10,000.00 per transaction' })
  amountCents: number;

  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Client-generated UUID v4. Idempotency key.',
  })
  @IsUUID('4')
  clientMutationId: string;
}
