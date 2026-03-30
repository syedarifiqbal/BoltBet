import { IsInt, IsUUID, Min, Max } from 'class-validator';

export class DepositDto {
  /**
   * Amount in cents. Minimum $1.00 (100), maximum $10,000.00 (1_000_000).
   * All monetary values in this system are integers — no floats, ever.
   */
  @IsInt()
  @Min(100,       { message: 'Minimum deposit is $1.00 (100 cents)' })
  @Max(1_000_000, { message: 'Maximum deposit is $10,000.00 per transaction' })
  amountCents: number;

  /**
   * Client-generated UUID v4. Used for idempotency — submitting the same
   * clientMutationId twice returns the original transaction, not a duplicate.
   */
  @IsUUID('4')
  clientMutationId: string;
}
