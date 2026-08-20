import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Wallet, WalletSummary } from '@/types/models';

interface WalletDetail extends Wallet {
  summary: WalletSummary;
}

export function useWalletDetailQuery(id?: string) {
  return useQuery<WalletDetail>({
    queryKey: ['wallets', 'detail', id],
    queryFn: () => api.get(`/wallets/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}
