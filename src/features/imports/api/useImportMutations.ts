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
        // Arquivos grandes podem levar mais de 30 segundos para chegar ao servidor.
        // Não alteramos o timeout padrão das demais chamadas da aplicação.
        timeout: 5 * 60 * 1000,
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
