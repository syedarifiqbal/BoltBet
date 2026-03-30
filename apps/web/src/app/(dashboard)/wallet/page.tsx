'use client';

import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatCents } from '@/lib/utils';

export default function WalletPage() {
  const { balance, isLoading, deposit, isDepositing } = useWallet();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');

  async function handleDeposit(e: React.FormEvent) {
    e.preventDefault();
    const dollars = parseFloat(amount);
    if (isNaN(dollars) || dollars <= 0) {
      toast.error('Enter a valid amount.');
      return;
    }
    const cents = Math.round(dollars * 100);
    try {
      await deposit(cents);
      toast.success(`Deposited ${formatCents(cents)} successfully.`);
      setAmount('');
    } catch {
      toast.error('Deposit failed. Please try again.');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Wallet</h1>
        <p className="text-muted-foreground">Manage your balance</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">
              {isLoading ? '…' : formatCents(balance.balanceCents)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deposit Funds</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDeposit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (USD)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="10.00"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={isDepositing} className="w-full">
                {isDepositing ? 'Processing…' : 'Deposit'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
