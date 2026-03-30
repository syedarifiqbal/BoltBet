'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store';
import { setCredentials, clearCredentials } from '@/store/slices/AuthSlice';
import { clearBalance } from '@/store/slices/WalletSlice';
import { authApi } from '@/lib/api/auth';
import { decodeToken } from '@/lib/utils';
import { queryClient } from '@/lib/queryClient';

/**
 * useAuth — primary hook for auth actions throughout the app.
 *
 * login / logout / register are wrapped here so components never import
 * the API layer or Redux actions directly — they just call useAuth().
 */
export function useAuth() {
  const dispatch = useAppDispatch();
  const router   = useRouter();
  const auth     = useAppSelector((s) => s.auth);

  const login = useCallback(
    async (email: string, password: string) => {
      const { accessToken } = await authApi.login({ email, password });
      const user = decodeToken(accessToken);
      dispatch(setCredentials({ accessToken, user }));
      router.push('/dashboard');
    },
    [dispatch, router],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      await authApi.register({ email, password });
      // Registration only — user must log in explicitly
    },
    [],
  );

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {}); // best-effort — clear local state regardless
    dispatch(clearCredentials());
    dispatch(clearBalance());
    queryClient.clear(); // wipe all cached query data
    router.push('/login');
  }, [dispatch, router]);

  return {
    user:            auth.user,
    isAuthenticated: auth.isAuthenticated,
    isRefreshing:    auth.isRefreshing,
    login,
    register,
    logout,
  };
}
