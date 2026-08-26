import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toaster } from '@/components/ui/toaster';
import { handleApiError } from '@/lib/error-handler';
import type { SerasaWallet } from '@/types/models';

export type SerasaWalletInput = { externalWalletId: string; name: string; criteria?: string };

export function useSerasaWalletsQuery() {
  return useQuery({ queryKey: ['serasa-wallets'], queryFn: () => api.get<SerasaWallet[]>('/serasa-wallets').then((r) => r.data) });
}

export function useCreateSerasaWalletMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SerasaWalletInput) => api.post('/serasa-wallets', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['serasa-wallets'] }); toaster.create({ type: 'success', title: 'Carteira Serasa cadastrada' }); },
    onError: handleApiError,
  });
}

export function useDeleteSerasaWalletMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/serasa-wallets/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['serasa-wallets'] }); toaster.create({ type: 'success', title: 'Carteira Serasa excluída' }); },
    onError: handleApiError,
  });
}
