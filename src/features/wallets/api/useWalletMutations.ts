import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toaster } from '@/components/ui/toaster';
import { handleApiError } from '@/lib/error-handler';
import type { CreateWalletDto, UpdateWalletDto } from '@/types/api';

export function useCreateWalletMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      creditorId,
      data,
    }: {
      creditorId: string;
      data: CreateWalletDto;
    }) => api.post(`/creditors/${creditorId}/wallets`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
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
