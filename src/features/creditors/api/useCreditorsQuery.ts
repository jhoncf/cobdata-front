import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import type { PaginatedResponse, ListCreditorsParams } from '@/types/api';
import type { Creditor, CreditorCommercialRules } from '@/types/models';

export function useCreditorsQuery(params: ListCreditorsParams = {}, enabled = true) {
  return useQuery<PaginatedResponse<Creditor>>({
    queryKey: ['creditors', 'list', params],
    queryFn: () => api.get('/creditors', { params }).then((r) => r.data),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useCreditorQuery(id: string) {
  return useQuery<Creditor>({
    queryKey: ['creditors', 'detail', id],
    queryFn: () => api.get(`/creditors/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreditorCommercialRulesQuery(id: string) {
  return useQuery<CreditorCommercialRules>({
    queryKey: ['creditors', 'commercial-rules', id],
    queryFn: () => api.get(`/creditors/${id}/commercial-rules`).then((r) => r.data),
    enabled: !!id,
  });
}

/** Fetches all creditors for use in selects/dropdowns */
export function useAllCreditorsQuery() {
  return useQuery<PaginatedResponse<Creditor>>({
    queryKey: ['creditors', 'all'],
    queryFn: () => api.get('/creditors', { params: { limit: 100 } }).then((r) => r.data),
  });
}
