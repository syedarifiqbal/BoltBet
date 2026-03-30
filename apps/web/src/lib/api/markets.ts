import { apiClient } from './client';

export type MarketStatus = 'OPEN' | 'SUSPENDED' | 'SETTLED';

export interface MarketResponse {
  id:        string;
  eventId:   string;
  name:      string;
  oddsInt:   number;
  status:    MarketStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MarketListResponse {
  markets: MarketResponse[];
  total:   number;
  page:    number;
  limit:   number;
}

export interface CreateMarketPayload {
  eventId: string;
  name:    string;
  oddsInt: number;
}

export const marketsApi = {
  list: ({ page = 1, limit = 20, status }: { page?: number; limit?: number; status?: string } = {}) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.set('status', status);
    return apiClient.get<MarketListResponse>(`/v1/markets?${params.toString()}`);
  },

  getById: (id: string) =>
    apiClient.get<MarketResponse>(`/v1/markets/${id}`),

  create: (payload: CreateMarketPayload) =>
    apiClient.post<MarketResponse>('/v1/markets', payload),

  suspend: (id: string) =>
    apiClient.patch<MarketResponse>(`/v1/markets/${id}/suspend`),

  settle: (id: string) =>
    apiClient.patch<MarketResponse>(`/v1/markets/${id}/settle`),

  reopen: (id: string) =>
    apiClient.patch<MarketResponse>(`/v1/markets/${id}/reopen`),
};
