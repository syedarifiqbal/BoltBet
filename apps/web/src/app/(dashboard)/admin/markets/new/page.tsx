'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { marketsApi, type CreateMarketPayload } from '@/lib/api/markets';
import { queryClient, queryKeys } from '@/lib/queryClient';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { generateMutationId } from '@/lib/utils';

export default function NewMarketPage() {
  const router     = useRouter();
  const { toast }  = useToast();

  const [eventId, setEventId]   = useState('');
  const [name, setName]         = useState('');
  const [oddsInput, setOddsInput] = useState('');

  const createMutation = useMutation({
    mutationFn: (payload: CreateMarketPayload) => marketsApi.create(payload),
    onSuccess: (market) => {
      toast.success(`Market "${market.name}" created.`);
      queryClient.invalidateQueries({ queryKey: queryKeys.markets.list() });
      router.push('/admin/markets');
    },
    onError: () => {
      toast.error('Failed to create market. Check the values and try again.');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const oddsFloat = parseFloat(oddsInput);
    if (isNaN(oddsFloat) || oddsFloat < 1.01) {
      toast.error('Odds must be a number ≥ 1.01 (e.g. 2.40).');
      return;
    }

    const oddsInt = Math.round(oddsFloat * 100);

    createMutation.mutate({
      eventId: eventId.trim(),
      name:    name.trim(),
      oddsInt,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Market</h1>
        <p className="text-muted-foreground">Create a new betting market</p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Market Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="eventId">Event ID (UUID)</Label>
              <Input
                id="eventId"
                placeholder={generateMutationId()}
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                required
                pattern="[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}"
                title="Must be a valid UUID v4"
              />
              <p className="text-xs text-muted-foreground">UUID v4 identifying the sports event.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Market Name</Label>
              <Input
                id="name"
                placeholder="Man City vs Arsenal — Match Winner"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={3}
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="odds">Decimal Odds</Label>
              <Input
                id="odds"
                type="number"
                placeholder="2.40"
                min="1.01"
                step="0.01"
                value={oddsInput}
                onChange={(e) => setOddsInput(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Decimal odds (e.g. 2.40). Stored as integer × 100 internally.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create Market'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin/markets')}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
