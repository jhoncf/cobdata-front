import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import type { PaginatedResponse, ListOperationsParams, OperationPreviewResponse } from '@/types/api';
import type { ProviderOperation, OperationItem } from '@/types/models';
import type { OperationAction } from '@/types/enums';

export function useOperationsQuery(params: ListOperationsParams) {
  return useQuery<PaginatedResponse<ProviderOperation>>({
    queryKey: ['operations', 'list', params],
    queryFn: () => api.get('/operations', { params }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
}

export function useOperationQuery(operationId: string) {
  return useQuery<ProviderOperation>({
    queryKey: ['operations', 'detail', operationId],
    queryFn: () => api.get(`/operations/${operationId}`).then((r) => r.data),
    enabled: !!operationId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'PENDING' || status === 'PROCESSING') return 10000;
      return false;
    },
  });
}

export function useOperationItemsQuery(
  operationId: string,
  params: { page?: number; limit?: number },
) {
  return useQuery<PaginatedResponse<OperationItem>>({
    queryKey: ['operations', 'items', operationId, params],
    queryFn: () =>
      api.get(`/operations/${operationId}/items`, { params }).then((r) => r.data),
    enabled: !!operationId,
    placeholderData: keepPreviousData,
  });
}

export function useOperationPreviewQuery(
  walletId: string | undefined,
  action: OperationAction | undefined,
) {
  return useQuery<OperationPreviewResponse>({
    queryKey: ['operations', 'preview', walletId, action],
    queryFn: () =>
      api.get('/operations/preview', { params: { walletId, action } }).then((r) => r.data),
    enabled: !!walletId && !!action,
  });
}
