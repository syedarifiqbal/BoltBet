export enum BetStatus {
  PENDING   = 'PENDING',
  ACCEPTED  = 'ACCEPTED',
  SETTLED   = 'SETTLED',
  VOID      = 'VOID',
  CANCELLED = 'CANCELLED',
}

/**
 * Valid status transitions enforced at the service layer.
 * PENDING   → ACCEPTED | VOID | CANCELLED
 * ACCEPTED  → SETTLED  | VOID | CANCELLED
 * Terminal states (SETTLED, VOID, CANCELLED) → no further transitions
 */
export const ALLOWED_TRANSITIONS: Record<BetStatus, BetStatus[]> = {
  [BetStatus.PENDING]:   [BetStatus.ACCEPTED, BetStatus.VOID, BetStatus.CANCELLED],
  [BetStatus.ACCEPTED]:  [BetStatus.SETTLED,  BetStatus.VOID, BetStatus.CANCELLED],
  [BetStatus.SETTLED]:   [],
  [BetStatus.VOID]:      [],
  [BetStatus.CANCELLED]: [],
};

/** States from which no further transitions are possible */
export const TERMINAL_STATES = new Set<BetStatus>([
  BetStatus.SETTLED,
  BetStatus.VOID,
  BetStatus.CANCELLED,
]);

/** Payload published to the bet_placement RabbitMQ queue */
export interface BetPlacementPayload {
  betId:       string;
  userId:      string;
  marketId:    string;
  oddsInt:     number;
  stakeCents:  number;
  payoutCents: number;
}
