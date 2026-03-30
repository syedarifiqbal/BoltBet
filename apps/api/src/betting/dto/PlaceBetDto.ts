import { IsUUID, IsInt, Min, Max } from 'class-validator';

export class PlaceBetDto {
  @IsUUID('4')
  marketId: string;

  /**
   * Stake in cents. Minimum $1.00 (100), maximum $10,000.00 (1_000_000).
   * All monetary values in this system are integers — no floats, ever.
   */
  @IsInt()
  @Min(100,       { message: 'Minimum stake is $1.00 (100 cents)' })
  @Max(1_000_000, { message: 'Maximum stake is $10,000.00 per bet' })
  stakeCents: number;

  /**
   * Client-generated UUID v4. Idempotency key — duplicate requests with the
   * same clientMutationId return the original bet record, not a new bet.
   */
  @IsUUID('4')
  clientMutationId: string;
}
