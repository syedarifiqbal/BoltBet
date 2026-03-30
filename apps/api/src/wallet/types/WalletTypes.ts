/**
 * DEPOSIT — external money coming in (simulated payment provider)
 * DEBIT   — money leaving to fund a bet (called by Betting Service)
 * CREDIT  — winnings arriving after settlement (called by Settlement Worker)
 */
export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  DEBIT   = 'DEBIT',
  CREDIT  = 'CREDIT',
}
