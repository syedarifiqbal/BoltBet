import { TransactionType } from '../types/wallet.types';

export class TransactionResponseDto {
  id: string;
  type: TransactionType;
  amountCents: number;
  amountDisplay: string;
  balanceAfterCents: number;
  balanceAfterDisplay: string;
  referenceId: string | null;
  description: string | null;
  createdAt: Date;
}

export class TransactionListResponseDto {
  data: TransactionResponseDto[];
  total: number;
  page: number;
  limit: number;
}
