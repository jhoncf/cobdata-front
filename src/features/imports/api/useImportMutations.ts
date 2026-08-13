import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toaster } from '@/components/ui/toaster';

export function useUploadImportMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { file: File; walletId: string; columnMapping: Record<string, string> }) => {
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('walletId', data.walletId);
      formData.append('columnMapping', JSON.stringify(data.columnMapping));
      return api.post('/imports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imports'] });
      toaster.create({ type: 'success', title: 'Importação enviada com sucesso' });
    },
  });
}

export function useConfirmImportMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) => api.post(`/imports/${batchId}/confirm`),
    onSuccess: (_data, batchId) => {
      queryClient.invalidateQueries({ queryKey: ['imports', 'detail', batchId] });
      queryClient.invalidateQueries({ queryKey: ['imports', 'list'] });
      toaster.create({ type: 'success', title: 'Importação confirmada' });
    },
  });
}

export function useCancelImportMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) => api.post(`/imports/${batchId}/cancel`),
    onSuccess: (_data, batchId) => {
      queryClient.invalidateQueries({ queryKey: ['imports', 'detail', batchId] });
      queryClient.invalidateQueries({ queryKey: ['imports', 'list'] });
      toaster.create({ type: 'success', title: 'Importação cancelada' });
    },
  });
}
