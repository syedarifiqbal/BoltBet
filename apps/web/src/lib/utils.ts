import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { AuthUser } from '@/store/slices/AuthSlice';

/** Merge Tailwind classes safely — handles conflicts like `p-2 p-4` → `p-4` */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Decode a JWT payload without verifying the signature.
 * Used ONLY to extract display data (user id, role) from a token that was
 * already verified server-side. Never trust decoded data for security decisions.
 */
export function decodeToken(token: string): AuthUser {
  const [, payloadB64] = token.split('.');
  const json = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))) as {
    sub:   string;
    email: string;
    role:  AuthUser['role'];
  };
  return { id: json.sub, email: json.email ?? '', role: json.role };
}

/** Format cents to display string. 1050 → "$10.50" */
export function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style:    'currency',
    currency: 'USD',
  }).format(cents / 100);
}

/** Format odds integer to display string. 240 → "2.40" */
export function formatOdds(oddsInt: number): string {
  return (oddsInt / 100).toFixed(2);
}

/** Generate a UUID v4 for clientMutationId */
export function generateMutationId(): string {
  return crypto.randomUUID();
}
