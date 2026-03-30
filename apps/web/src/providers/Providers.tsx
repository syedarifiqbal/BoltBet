'use client';

/**
 * Providers — single wrapper component that composes all global providers.
 *
 * Rendered once in the root layout. Order matters:
 *  1. Redux Provider — must wrap everything (store is needed by QueryClient retry logic)
 *  2. QueryClientProvider — TanStack Query, reads Redux store via apiClient on 401
 *  3. ToastProvider — dispatches to Redux, so must be inside Redux Provider
 *  4. AuthBootstrap — attempts silent token refresh on first mount
 */

import React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { store } from '@/store';
import { queryClient } from '@/lib/queryClient';
import { ToastProvider } from '@/context/ToastContext';
import { AuthBootstrap } from './AuthBootstrap';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthBootstrap>
            {children}
          </AuthBootstrap>
        </ToastProvider>
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </ReduxProvider>
  );
}
