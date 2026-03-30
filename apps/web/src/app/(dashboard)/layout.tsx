'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { useSocket } from '@/hooks/useSocket';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router          = useRouter();
  const isRefreshing    = useAppSelector((s) => s.auth.isRefreshing);
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  // Opens a WebSocket connection and listens for bet:settled events.
  // Automatically reconnects if the token changes, disconnects on logout.
  useSocket();

  useEffect(() => {
    if (!isRefreshing && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isRefreshing, isAuthenticated, router]);

  // AuthBootstrap already shows a spinner while isRefreshing — this just
  // prevents the dashboard from rendering before auth is resolved.
  if (isRefreshing || !isAuthenticated) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
