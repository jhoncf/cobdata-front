import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Provider, WalletMapping } from '@/types/models';

export function useProvidersQuery() {
  return useQuery<Provider[]>({
    queryKey: ['providers', 'list'],
    queryFn: () => api.get('/providers').then((r) => r.data),
  });
}

export function useWalletMappingsQuery(providerId: string) {
  return useQuery<WalletMapping[]>({
    queryKey: ['providers', 'mappings', providerId],
    queryFn: () =>
      api.get(`/providers/${providerId}/wallet-mappings`).then((r) => r.data),
    enabled: !!providerId,
    placeholderData: keepPreviousData,
  });
}
