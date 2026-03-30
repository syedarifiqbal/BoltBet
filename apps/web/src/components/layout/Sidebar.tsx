'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/markets',   label: 'Markets'   },
  { href: '/bets',      label: 'My Bets'   },
  { href: '/wallet',    label: 'Wallet'    },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 flex-col border-r bg-background">
      <div className="flex h-14 items-center border-b px-6">
        <span className="text-lg font-bold tracking-tight">BoltBet</span>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {NAV_ITEMS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname === href || pathname.startsWith(`${href}/`)
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
