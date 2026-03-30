import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsInt, Min, Max } from 'class-validator';

export class PlaceBetDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  @IsUUID('4')
  marketId: string;

  @ApiProperty({
    example: 1000,
    description: 'Stake in cents. Minimum $1.00 (100), maximum $10,000.00 (1_000_000).',
  })
  @IsInt()
  @Min(100,       { message: 'Minimum stake is $1.00 (100 cents)' })
  @Max(1_000_000, { message: 'Maximum stake is $10,000.00 per bet' })
  stakeCents: number;

  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Client-generated UUID v4. Idempotency key.',
  })
  @IsUUID('4')
  clientMutationId: string;
}
