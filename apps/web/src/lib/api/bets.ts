import { apiClient } from './client';

export type BetStatus = 'PENDING' | 'ACCEPTED' | 'SETTLED' | 'VOID' | 'CANCELLED';

export interface BetResponse {
  id:            string;
  marketId:      string;
  marketName:    string;
  oddsInt:       number;
  stakeCents:    number;
  payoutCents:   number;
  status:        BetStatus;
  referenceId:   string;
  createdAt:     string;
  updatedAt:     string;
}

export interface BetListResponse {
  bets:  BetResponse[];
  total: number;
  page:  number;
  limit: number;
}

export interface PlaceBetPayload {
  marketId:         string;
  stakeCents:       number;
  clientMutationId: string;
}

export const betsApi = {
  place: (payload: PlaceBetPayload) =>
    apiClient.post<BetResponse>('/v1/bets', payload),

  list: ({ page = 1, limit = 20 }: { page?: number; limit?: number } = {}) =>
    apiClient.get<BetListResponse>(`/v1/bets?page=${page}&limit=${limit}`),

  getById: (id: string) =>
    apiClient.get<BetResponse>(`/v1/bets/${id}`),
};
