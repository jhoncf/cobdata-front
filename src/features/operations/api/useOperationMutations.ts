import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toaster } from '@/components/ui/toaster';
import { handleApiError } from '@/lib/error-handler';
import type { CreateOperationDto } from '@/types/api';

export function useCreateOperationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateOperationDto) => api.post('/operations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations'] });
      toaster.create({ type: 'success', title: 'Operação criada com sucesso' });
    },
    onError: handleApiError,
  });
}

export function useCancelOperationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (operationId: string) => api.post(`/operations/${operationId}/cancel`),
    onSuccess: (_data, operationId) => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'detail', operationId] });
      queryClient.invalidateQueries({ queryKey: ['operations', 'list'] });
      toaster.create({ type: 'success', title: 'Operação cancelada' });
    },
    onError: (error: unknown) => {
      const axiosErr = error as { response?: { status?: number } };
      if (axiosErr.response?.status === 409) {
        toaster.create({ type: 'error', title: 'Operação não pode ser cancelada neste estado' });
      }
    },
  });
}
