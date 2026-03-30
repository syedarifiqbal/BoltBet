'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppSelector } from '@/store';
import { cn } from '@/lib/utils';

const USER_NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/markets',   label: 'Markets'   },
  { href: '/bets',      label: 'My Bets'   },
  { href: '/wallet',    label: 'Wallet'    },
];

const ADMIN_NAV = [
  { href: '/admin/markets',     label: 'Manage Markets' },
  { href: '/admin/markets/new', label: '+ New Market'   },
];

export function Sidebar() {
  const pathname = usePathname();
  const role     = useAppSelector((s) => s.auth.user?.role);
  const isAdmin  = role === 'ADMIN';

  return (
    <aside className="flex w-56 flex-col border-r bg-background">
      <div className="flex h-14 items-center border-b px-6">
        <span className="text-lg font-bold tracking-tight">BoltBet</span>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {USER_NAV.map(({ href, label }) => (
          <NavLink key={href} href={href} label={label} pathname={pathname} />
        ))}

        {isAdmin && (
          <>
            <p className="mt-4 mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Admin
            </p>
            {ADMIN_NAV.map(({ href, label }) => (
              <NavLink key={href} href={href} label={label} pathname={pathname} />
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}

function NavLink({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {label}
    </Link>
  );
}
