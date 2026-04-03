import { MarketStatus } from '../types/MarketTypes';

export class MarketResponseDto {
  id: string;
  eventId: string;
  name: string;
  oddsInt: number;
  oddsDisplay: string; // "2.40" — formatted at API layer only
  status: MarketStatus;
  createdAt: Date;
  updatedAt: Date;
}
