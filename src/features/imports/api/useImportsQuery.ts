import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import type { PaginatedResponse, ListImportsParams } from '@/types/api';
import type { ImportBatch, ImportBatchError } from '@/types/models';

export function useImportsQuery(params: ListImportsParams) {
  return useQuery<PaginatedResponse<ImportBatch>>({
    queryKey: ['imports', 'list', params],
    queryFn: () => api.get('/imports', { params }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
}

export function useImportBatchQuery(batchId: string) {
  return useQuery<ImportBatch>({
    queryKey: ['imports', 'detail', batchId],
    queryFn: () => api.get(`/imports/${batchId}`).then((r) => r.data),
    enabled: !!batchId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      const terminalStates = [
        'APPLIED',
        'FAILED',
        'CANCELLED',
        'VALIDATED',
        'VALIDATED_WITH_ERRORS',
        'VALIDATION_FAILED',
      ];
      if (status && terminalStates.includes(status)) return false;
      return 5000;
    },
  });
}

export function useImportErrorsQuery(
  batchId: string,
  params: { page?: number; limit?: number },
) {
  return useQuery<PaginatedResponse<ImportBatchError>>({
    queryKey: ['imports', 'errors', batchId, params],
    queryFn: () =>
      api.get(`/imports/${batchId}/errors`, { params }).then((r) => r.data),
    enabled: !!batchId,
    placeholderData: keepPreviousData,
  });
}
