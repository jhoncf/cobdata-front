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
    }: {
      creditorId: string;
      data: CreateWalletDto;
    }) => {
      const res = await api.post(`/creditors/${creditorId}/wallets`, data);
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

export function useRecalculateWalletOffersMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/wallets/${id}/recalculate-offers`),
    onSuccess: (_response, id) => {
      queryClient.invalidateQueries({ queryKey: ['wallets', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toaster.create({ type: 'success', title: 'Ofertas recalculadas com sucesso' });
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
