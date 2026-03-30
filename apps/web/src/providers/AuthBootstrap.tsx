'use client';

/**
 * AuthBootstrap — attempts a silent token refresh on every page load.
 *
 * On hard refresh the Redux store is wiped (in-memory). This component
 * calls POST /v1/auth/refresh using the HttpOnly cookie to restore the
 * session without forcing the user to log in again.
 *
 * Renders a loading state while the refresh is in-flight so protected
 * routes don't flash before we know if the user is authenticated.
 */

import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { setCredentials, setRefreshDone } from '@/store/slices/AuthSlice';
import { authApi } from '@/lib/api/auth';
import { decodeToken } from '@/lib/utils';

export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const dispatch    = useAppDispatch();
  const isRefreshing = useAppSelector((s) => s.auth.isRefreshing);

  useEffect(() => {
    authApi
      .refresh()
      .then(({ accessToken }) => {
        const user = decodeToken(accessToken);
        dispatch(setCredentials({ accessToken, user }));
      })
      .catch(() => {
        // No valid refresh cookie — user needs to log in
        dispatch(setRefreshDone());
      });
  }, [dispatch]);

  // Show nothing while we figure out auth state — prevents layout flash
  if (isRefreshing) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
