'use client';

import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/store';
import { removeToast } from '@/store/slices/UiSlice';
import { cn } from '@/lib/utils';

const VARIANT_CLASSES = {
  success: 'bg-green-600 text-white',
  error:   'bg-destructive text-destructive-foreground',
  info:    'bg-primary text-primary-foreground',
  warning: 'bg-warning text-warning-foreground',
} as const;

const AUTO_DISMISS_MS = 4000;

export function ToastContainer() {
  const dispatch = useAppDispatch();
  const toasts   = useAppSelector((s) => s.ui.toasts);

  useEffect(() => {
    if (!toasts.length) return;
    const latest = toasts[toasts.length - 1];
    const timer  = setTimeout(() => dispatch(removeToast(latest.id)), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toasts, dispatch]);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'flex items-start justify-between rounded-md px-4 py-3 shadow-lg text-sm',
            VARIANT_CLASSES[toast.variant],
          )}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => dispatch(removeToast(toast.id))}
            className="ml-4 shrink-0 opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
