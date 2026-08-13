import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toaster } from '@/components/ui/toaster';
import type { CreateProviderDto, UpdateProviderDto, CreateWalletMappingDto } from '@/types/api';

export function useCreateProviderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProviderDto) => api.post('/providers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      toaster.create({ type: 'success', title: 'Provedor criado com sucesso' });
    },
    onError: (error: unknown) => {
      const axiosErr = error as { response?: { status?: number; data?: { message?: string } } };
      if (axiosErr.response?.status === 409) {
        toaster.create({ type: 'error', title: axiosErr.response.data?.message || 'Provedor já configurado' });
      }
    },
  });
}

export function useUpdateProviderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ providerId, data }: { providerId: string; data: UpdateProviderDto }) =>
      api.patch(`/providers/${providerId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      toaster.create({ type: 'success', title: 'Provedor atualizado' });
    },
  });
}

export function useCreateMappingMutation(providerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWalletMappingDto) =>
      api.post(`/providers/${providerId}/wallet-mappings`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers', 'mappings', providerId] });
      toaster.create({ type: 'success', title: 'Mapeamento criado' });
    },
    onError: (error: unknown) => {
      const axiosErr = error as { response?: { status?: number; data?: { message?: string } } };
      if (axiosErr.response?.status === 409) {
        toaster.create({ type: 'error', title: axiosErr.response.data?.message || 'Mapeamento já existe' });
      }
    },
  });
}

export function useDeleteMappingMutation(providerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mappingId: string) =>
      api.delete(`/providers/${providerId}/wallet-mappings/${mappingId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers', 'mappings', providerId] });
      toaster.create({ type: 'success', title: 'Mapeamento removido' });
    },
  });
}
