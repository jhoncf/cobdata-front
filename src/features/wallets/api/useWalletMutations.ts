import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toaster } from '@/components/ui/toaster';
import { handleApiError } from '@/lib/error-handler';
import type { CreateWalletDto, UpdateWalletDto } from '@/types/api';

export function useCreateWalletMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      creditorId,
      data,
      providerId,
    }: {
      creditorId: string;
      data: CreateWalletDto;
      providerId?: string;
    }) => {
      const res = await api.post(`/creditors/${creditorId}/wallets`, data);
      // If a provider/channel was selected, create wallet mapping
      if (providerId && res.data?.id) {
        await api.post(`/providers/${providerId}/wallet-mappings`, {
          walletId: res.data.id,
          externalWalletId: res.data.id,
        });
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      toaster.create({ type: 'success', title: 'Carteira criada com sucesso' });
    },
    onError: (error) => handleApiError(error),
  });
}

export function useUpdateWalletMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWalletDto }) =>
      api.patch(`/wallets/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      toaster.create({
        type: 'success',
        title: 'Carteira atualizada com sucesso',
      });
    },
    onError: (error) => handleApiError(error),
  });
}

export function useDeleteWalletMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/wallets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      toaster.create({
        type: 'success',
        title: 'Carteira excluída com sucesso',
      });
    },
    onError: (error) => handleApiError(error),
  });
}
