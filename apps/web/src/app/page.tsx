'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store';

export default function RootPage() {
  const router       = useRouter();
  const isRefreshing = useAppSelector((s) => s.auth.isRefreshing);
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  useEffect(() => {
    if (isRefreshing) return; // wait for AuthBootstrap to resolve
    router.replace(isAuthenticated ? '/dashboard' : '/login');
  }, [isRefreshing, isAuthenticated, router]);

  return null;
}
