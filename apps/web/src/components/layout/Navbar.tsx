'use client';

import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { formatCents } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export function Navbar() {
  const { user, logout }        = useAuth();
  const { balance, isLoading }  = useWallet();

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-6">
      <div />
      <div className="flex items-center gap-6">
        <div className="text-sm">
          <span className="text-muted-foreground">Balance: </span>
          <span className="font-semibold">
            {isLoading ? '…' : formatCents(balance.balanceCents)}
          </span>
        </div>
        {user && (
          <span className="text-sm text-muted-foreground hidden md:block">{user.email}</span>
        )}
        <Button variant="outline" size="sm" onClick={logout}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
