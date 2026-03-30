import { apiClient } from './client';

export interface BalanceResponse {
  balanceCents:   number;
  balanceDisplay: string;
}

export interface DepositPayload {
  amountCents:      number;
  clientMutationId: string;
}

export interface TransactionResponse {
  id:                  string;
  type:                'DEPOSIT' | 'DEBIT' | 'CREDIT';
  amountCents:         number;
  amountDisplay:       string;
  balanceAfterCents:   number;
  balanceAfterDisplay: string;
  referenceId:         string | null;
  description:         string | null;
  createdAt:           string;
}

export interface TransactionListResponse {
  data:  TransactionResponse[];
  total: number;
  page:  number;
  limit: number;
}

export const walletApi = {
  getBalance: () =>
    apiClient.get<BalanceResponse>('/v1/wallet/balance'),

  deposit: (payload: DepositPayload) =>
    apiClient.post<TransactionResponse>('/v1/wallet/deposit', payload),

  getTransactions: (page = 1, limit = 20) =>
    apiClient.get<TransactionListResponse>(
      `/v1/wallet/transactions?page=${page}&limit=${limit}`,
    ),
};
