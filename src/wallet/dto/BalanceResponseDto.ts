export class BalanceResponseDto {
  balanceCents: number;
  balanceDisplay: string; // "$1,050.00" — formatted at the API layer only
}
