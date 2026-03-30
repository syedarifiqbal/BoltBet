'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { marketsApi } from '@/lib/api/markets';
import { betsApi, type PlaceBetPayload } from '@/lib/api/bets';
import { queryKeys, queryClient } from '@/lib/queryClient';
import { useToast } from '@/context/ToastContext';
import { useWallet } from '@/hooks/useWallet';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatCents, formatOdds, generateMutationId } from '@/lib/utils';

export default function MarketsPage() {
  const { toast }   = useToast();
  const { balance } = useWallet();
  const [stakeInput, setStakeInput]   = useState<Record<string, string>>({});
  const [placingFor, setPlacingFor]   = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.markets.list(),
    queryFn:  () => marketsApi.list(),
  });

  const betMutation = useMutation({
    mutationFn: (payload: PlaceBetPayload) => betsApi.place(payload),
    onSuccess: (bet) => {
      toast.success(`Bet placed! Potential payout: ${formatCents(bet.payoutCents)}`);
      queryClient.invalidateQueries({ queryKey: queryKeys.bets.list(1) });
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet.balance() });
      setStakeInput((prev) => ({ ...prev, [bet.marketId]: '' }));
      setPlacingFor(null);
    },
    onError: () => {
      toast.error('Failed to place bet. Please try again.');
      setPlacingFor(null);
    },
  });

  async function handlePlace(marketId: string) {
    const dollars = parseFloat(stakeInput[marketId] ?? '');
    if (isNaN(dollars) || dollars <= 0) {
      toast.error('Enter a valid stake amount.');
      return;
    }
    const stakeCents = Math.round(dollars * 100);
    if (stakeCents > balance.balanceCents) {
      toast.error('Insufficient balance.');
      return;
    }
    setPlacingFor(marketId);
    await betMutation.mutateAsync({
      marketId,
      stakeCents,
      clientMutationId: generateMutationId(),
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Markets</h1>
        <p className="text-muted-foreground">Open markets available for betting</p>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading markets…</p>}
      {!isLoading && !data?.markets.length && (
        <p className="text-muted-foreground">No open markets right now.</p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {data?.markets.map((market) => (
          <Card key={market.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">{market.name}</CardTitle>
              <Badge variant={market.status === 'OPEN' ? 'default' : 'outline'}>
                {market.status}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Odds</span>
                <span className="font-bold">{formatOdds(market.oddsInt)}</span>
              </div>
              {market.status === 'OPEN' && (
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor={`stake-${market.id}`} className="text-xs">
                      Stake (USD)
                    </Label>
                    <Input
                      id={`stake-${market.id}`}
                      type="number"
                      placeholder="10.00"
                      min="1"
                      step="0.01"
                      value={stakeInput[market.id] ?? ''}
                      onChange={(e) =>
                        setStakeInput((prev) => ({ ...prev, [market.id]: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      size="sm"
                      disabled={placingFor === market.id}
                      onClick={() => handlePlace(market.id)}
                    >
                      {placingFor === market.id ? '…' : 'Bet'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
