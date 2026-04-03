import { IsUUID, IsString, IsInt, Min, MaxLength } from 'class-validator';

export class CreateMarketDto {
  @IsUUID('4')
  eventId: string;

  @IsString()
  @MaxLength(255)
  name: string;

  /**
   * Decimal odds × 100. Minimum 1.01 → 101 (no negative-EV bets below evens).
   */
  @IsInt()
  @Min(101, { message: 'Minimum odds are 1.01 (101)' })
  oddsInt: number;
}
