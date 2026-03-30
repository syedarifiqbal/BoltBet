'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { betsApi } from '@/lib/api/bets';
import { queryKeys } from '@/lib/queryClient';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatCents, formatOdds } from '@/lib/utils';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING:   'secondary',
  ACCEPTED:  'default',
  SETTLED:   'outline',
  VOID:      'destructive',
  CANCELLED: 'destructive',
};

export default function BetsPage() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.bets.list(1),
    queryFn:  () => betsApi.list({ page: 1 }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Bets</h1>
        <p className="text-muted-foreground">All your placed bets</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bet History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-muted-foreground">Loading…</p>}
          {!isLoading && !data?.bets.length && (
            <p className="text-muted-foreground">No bets yet.</p>
          )}
          {data?.bets.length ? (
            <div className="divide-y">
              {data.bets.map((bet) => (
                <Link
                  key={bet.id}
                  href={`/bets/${bet.id}`}
                  className="flex items-center justify-between py-3 hover:bg-muted/50 px-2 rounded transition-colors"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{bet.marketId}</p>
                    <p className="text-xs text-muted-foreground">
                      Stake: {formatCents(bet.stakeCents)} · Odds: {formatOdds(bet.oddsInt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold">{formatCents(bet.payoutCents)}</span>
                    <Badge variant={STATUS_VARIANT[bet.status] ?? 'outline'}>{bet.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
