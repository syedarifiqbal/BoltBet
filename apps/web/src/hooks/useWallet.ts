'use client';

import { useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '@/store';
import { setBalance } from '@/store/slices/WalletSlice';
import { walletApi, type DepositPayload } from '@/lib/api/wallet';
import { queryKeys, queryClient } from '@/lib/queryClient';
import { generateMutationId } from '@/lib/utils';

export function useWallet() {
  const dispatch = useAppDispatch();
  const wallet   = useAppSelector((s) => s.wallet);

  const balanceQuery = useQuery({
    queryKey: queryKeys.wallet.balance(),
    queryFn:  walletApi.getBalance,
  });

  // Sync TanStack Query result into Redux store so Navbar can display balance
  // without needing to be inside a QueryClientProvider boundary.
  useEffect(() => {
    if (balanceQuery.data) {
      dispatch(setBalance(balanceQuery.data));
    }
  }, [balanceQuery.data, dispatch]);

  const depositMutation = useMutation({
    mutationFn: (amountCents: number) =>
      walletApi.deposit({
        amountCents,
        clientMutationId: generateMutationId(),
      } satisfies DepositPayload),
    onSuccess: () => {
      // Invalidate balance and transaction list after deposit
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet.balance() });
      queryClient.invalidateQueries({ queryKey: ['wallet', 'transactions'] });
    },
  });

  return {
    balance:      wallet,
    isLoading:    balanceQuery.isLoading,
    deposit:      depositMutation.mutateAsync,
    isDepositing: depositMutation.isPending,
  };
}
