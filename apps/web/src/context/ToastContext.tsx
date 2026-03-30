'use client';

/**
 * ToastContext — lightweight in-component toast trigger via Context.
 *
 * Why Context here instead of Redux directly?
 *  Components that only need to fire toasts shouldn't import the full Redux store.
 *  This Context wraps the Redux dispatch into a simpler API:
 *    const { toast } = useToast();
 *    toast.success('Deposit successful!');
 *
 *  Under the hood it still dispatches to the Redux ui slice — ToastContainer
 *  reads from Redux and renders. Both patterns stay in sync.
 */

import React, { createContext, useContext, useCallback } from 'react';
import { useAppDispatch } from '@/store';
import { addToast, type ToastVariant } from '@/store/slices/UiSlice';

interface ToastActions {
  success: (message: string) => void;
  error:   (message: string) => void;
  info:    (message: string) => void;
  warning: (message: string) => void;
}

interface ToastContextValue {
  toast: ToastActions;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  const fire = useCallback(
    (variant: ToastVariant) => (message: string) => {
      dispatch(addToast({ message, variant }));
    },
    [dispatch],
  );

  const toast: ToastActions = {
    success: fire('success'),
    error:   fire('error'),
    info:    fire('info'),
    warning: fire('warning'),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
