import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface WalletSummary {
  totalContracts: number;
  contractsByStatus: Record<string, number>;
  totalValue: number;
}

interface WalletDetail {
  id: string;
  name: string;
  creditorId: string;
  status: string;
  createdAt: string;
  creditor?: { id: string; name: string };
  summary: WalletSummary;
}

export function useWalletDetailQuery(id?: string) {
  return useQuery<WalletDetail>({
    queryKey: ['wallets', 'detail', id],
    queryFn: () => api.get(`/wallets/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}
