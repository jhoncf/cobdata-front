import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import type { PaginatedResponse, ListWalletsParams } from '@/types/api';
import type { Wallet } from '@/types/models';

export function useWalletsQuery(params: ListWalletsParams = {}) {
  return useQuery<PaginatedResponse<Wallet>>({
    queryKey: ['wallets', 'list', params],
    queryFn: () => api.get('/wallets', { params }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
}

/** Fetches all wallets (limit=100) for use in selects/dropdowns */
export function useAllWalletsQuery() {
  return useQuery<PaginatedResponse<Wallet>>({
    queryKey: ['wallets', 'all'],
    queryFn: () => api.get('/wallets', { params: { limit: 100 } }).then((r) => r.data),
  });
}
