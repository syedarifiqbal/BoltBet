export enum MarketStatus {
  OPEN      = 'OPEN',
  SUSPENDED = 'SUSPENDED',
  SETTLED   = 'SETTLED',
}

/**
 * The result of a settled market.
 * WIN  — the market's outcome occurred (e.g. "Man City won"). All ACCEPTED bets
 *         on this market are paid out at their stored payoutCents.
 * LOSS — the market's outcome did not occur. All ACCEPTED bets are settled with
 *         no payout. The stake was already debited at placement time.
 */
export enum MarketResult {
  WIN  = 'WIN',
  LOSS = 'LOSS',
}
