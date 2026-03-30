'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { betsApi } from '@/lib/api/bets';
import { queryKeys } from '@/lib/queryClient';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatCents, formatOdds } from '@/lib/utils';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING:   'secondary',
  ACCEPTED:  'default',
  SETTLED:   'outline',
  VOID:      'destructive',
  CANCELLED: 'destructive',
};

export default function BetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: bet, isLoading } = useQuery({
    queryKey: queryKeys.bets.detail(id),
    queryFn:  () => betsApi.getById(id),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!bet) {
    return <p className="text-muted-foreground">Bet not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/bets">← Back</Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bet Details</h1>
          <p className="text-sm text-muted-foreground">{bet.id}</p>
        </div>
      </div>

      <Card className="max-w-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Bet #{bet.id.slice(0, 8)}</CardTitle>
          <Badge variant={STATUS_VARIANT[bet.status] ?? 'outline'}>{bet.status}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row label="Market" value={bet.marketId} />
          <Row label="Odds" value={formatOdds(bet.oddsInt)} />
          <Row label="Stake" value={formatCents(bet.stakeCents)} />
          <Row label="Potential payout" value={formatCents(bet.payoutCents)} />
          <Row label="Placed" value={new Date(bet.createdAt).toLocaleString()} />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
