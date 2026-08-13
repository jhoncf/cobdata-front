import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import type { PaginatedResponse, ListContractsParams } from '@/types/api';
import type { Contract } from '@/types/models';

export function useContractsQuery(params: ListContractsParams = {}) {
  return useQuery<PaginatedResponse<Contract>>({
    queryKey: ['contracts', 'list', params],
    queryFn: () => api.get('/contracts', { params }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
}

export function useContractQuery(id: string) {
  return useQuery<Contract>({
    queryKey: ['contracts', 'detail', id],
    queryFn: () => api.get(`/contracts/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}
