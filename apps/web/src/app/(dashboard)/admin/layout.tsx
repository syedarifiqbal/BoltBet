'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const role   = useAppSelector((s) => s.auth.user?.role);

  useEffect(() => {
    if (role !== undefined && role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [role, router]);

  if (role !== 'ADMIN') return null;

  return <>{children}</>;
}
