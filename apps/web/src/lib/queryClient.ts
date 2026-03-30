import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api/client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:          30_000,  // 30s — wallet balance, bet list stay fresh briefly
      retry: (failureCount, error) => {
        // Don't retry on auth errors — they require user action (re-login)
        if (error instanceof ApiError && error.status === 401) return false;
        if (error instanceof ApiError && error.status === 403) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

/**
 * Query key factory — centralised so refetches and invalidations
 * are always consistent. Import this instead of writing string arrays inline.
 */
export const queryKeys = {
  wallet: {
    balance:      () => ['wallet', 'balance'] as const,
    transactions: (page: number) => ['wallet', 'transactions', page] as const,
  },
  bets: {
    list: (page: number) => ['bets', 'list', page] as const,
    detail: (id: string) => ['bets', 'detail', id] as const,
  },
  markets: {
    list: () => ['markets', 'list'] as const,
    detail: (id: string) => ['markets', 'detail', id] as const,
  },
} as const;
