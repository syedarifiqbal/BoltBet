'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { marketsApi, type MarketResponse, type MarketResult } from '@/lib/api/markets';
import { queryKeys, queryClient } from '@/lib/queryClient';
import { useToast } from '@/context/ToastContext';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatOdds } from '@/lib/utils';

type NonSettleAction = 'suspend' | 'reopen';

// Which market is currently waiting for a WIN/LOSS confirmation
type SettleConfirmState = { marketId: string; marketName: string } | null;

const ACTION_LABELS: Record<NonSettleAction, string> = {
  suspend: 'Suspend',
  reopen:  'Reopen',
};

function nonSettleActions(status: MarketResponse['status']): NonSettleAction[] {
  if (status === 'OPEN')      return ['suspend'];
  if (status === 'SUSPENDED') return ['reopen'];
  return [];
}

export default function AdminMarketsPage() {
  const { toast } = useToast();
  const [settleConfirm, setSettleConfirm] = useState<SettleConfirmState>(null);

  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.markets.list(), 'admin'],
    queryFn:  () => marketsApi.list({ limit: 100 }),
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: NonSettleAction }) =>
      marketsApi[action](id),
    onSuccess: (_, { action }) => {
      toast.success(`Market ${ACTION_LABELS[action].toLowerCase()}d.`);
      queryClient.invalidateQueries({ queryKey: queryKeys.markets.list() });
    },
    onError: () => toast.error('Action failed. Please try again.'),
  });

  const settleMutation = useMutation({
    mutationFn: ({ id, result }: { id: string; result: MarketResult }) =>
      marketsApi.settle(id, result),
    onSuccess: (_, { result }) => {
      toast.success(`Market settled as ${result}.`);
      queryClient.invalidateQueries({ queryKey: queryKeys.markets.list() });
      setSettleConfirm(null);
    },
    onError: () => {
      toast.error('Settlement failed. Please try again.');
      setSettleConfirm(null);
    },
  });

  const isPending = actionMutation.isPending || settleMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Markets</h1>
          <p className="text-muted-foreground">Suspend, settle, or reopen markets</p>
        </div>
        <Link href="/admin/markets/new">
          <Button>+ New Market</Button>
        </Link>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {!isLoading && !data?.markets.length && (
        <p className="text-muted-foreground">No markets found.</p>
      )}

      {data?.markets.length ? (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Odds</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.markets.map((market) => {
                const actions   = nonSettleActions(market.status);
                const canSettle = market.status === 'OPEN' || market.status === 'SUSPENDED';
                const isConfirmingThisRow = settleConfirm?.marketId === market.id;

                return (
                  <tr key={market.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{market.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{market.id}</div>
                    </td>
                    <td className="px-4 py-3 font-mono">{formatOdds(market.oddsInt)}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          market.status === 'OPEN'
                            ? 'default'
                            : market.status === 'SUSPENDED'
                            ? 'outline'
                            : 'secondary'
                        }
                      >
                        {market.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {/* Suspend / Reopen */}
                        {actions.map((action) => (
                          <Button
                            key={action}
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => actionMutation.mutate({ id: market.id, action })}
                          >
                            {ACTION_LABELS[action]}
                          </Button>
                        ))}

                        {/* Settle — asks for WIN or LOSS */}
                        {canSettle && !isConfirmingThisRow && (
                          <Button
                            size="sm"
                            variant="default"
                            disabled={isPending}
                            onClick={() =>
                              setSettleConfirm({ marketId: market.id, marketName: market.name })
                            }
                          >
                            Settle
                          </Button>
                        )}

                        {/* WIN / LOSS confirmation inline */}
                        {isConfirmingThisRow && (
                          <>
                            <span className="self-center text-xs text-muted-foreground">
                              Result:
                            </span>
                            <Button
                              size="sm"
                              variant="default"
                              disabled={isPending}
                              onClick={() =>
                                settleMutation.mutate({ id: market.id, result: 'WIN' })
                              }
                            >
                              Win
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={isPending}
                              onClick={() =>
                                settleMutation.mutate({ id: market.id, result: 'LOSS' })
                              }
                            >
                              Loss
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={isPending}
                              onClick={() => setSettleConfirm(null)}
                            >
                              Cancel
                            </Button>
                          </>
                        )}

                        {market.status === 'SETTLED' && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
