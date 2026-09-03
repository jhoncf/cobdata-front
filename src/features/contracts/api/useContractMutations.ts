import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toaster } from '@/components/ui/toaster';
import { handleApiError } from '@/lib/error-handler';
import type { BulkTransferContractsDto, BulkTransferContractsResult, CreateContractDto, UpdateContractDto, ManageTagsDto } from '@/types/api';

export function useCreateContractMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateContractDto) => api.post('/contracts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toaster.create({ type: 'success', title: 'Contrato criado com sucesso' });
    },
    onError: (error) => handleApiError(error),
  });
}

export function useUpdateContractMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateContractDto }) =>
      api.patch(`/contracts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toaster.create({ type: 'success', title: 'Contrato atualizado com sucesso' });
    },
    onError: (error) => handleApiError(error),
  });
}

export function useBulkTransferContractsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkTransferContractsDto) =>
      api.post<BulkTransferContractsResult>('/contracts/bulk-transfer', data).then((response) => response.data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      toaster.create({
        type: result.transferredCount ? 'success' : 'warning',
        title: result.transferredCount
          ? `${result.transferredCount} contrato(s) transferido(s)`
          : 'Nenhum contrato elegível para transferência',
      });
    },
    onError: (error) => handleApiError(error),
  });
}

export function useDeleteContractMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/contracts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toaster.create({ type: 'success', title: 'Contrato excluído com sucesso' });
    },
    onError: (error) => handleApiError(error),
  });
}

export function useSyncContractWithSerasaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/operations/contracts/${id}/sync`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['operations'] });
      toaster.create({ type: 'success', title: 'Contrato enviado para sincronização com a Serasa' });
    },
    onError: (error) => handleApiError(error),
  });
}

export function useRemoveContractFromSerasaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/operations/contracts/${id}/remove`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['operations'] });
      toaster.create({ type: 'success', title: 'Remoção da Serasa enviada para processamento' });
    },
    onError: (error) => handleApiError(error),
  });
}

/** Cancels a creditor-owned contract and queues its removal from Serasa. */
export function useCancelContractByCreditorMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/operations/contracts/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['operations'] });
      toaster.create({ type: 'success', title: 'Contrato cancelado e retirado dos canais de cobrança' });
    },
    onError: (error) => handleApiError(error),
  });
}

export function useAddTagsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ManageTagsDto }) =>
      api.post(`/contracts/${id}/tags`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toaster.create({ type: 'success', title: 'Tags adicionadas' });
    },
    onError: (error) => handleApiError(error),
  });
}

export function useRemoveTagsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ManageTagsDto }) =>
      api.delete(`/contracts/${id}/tags`, { data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toaster.create({ type: 'success', title: 'Tags removidas' });
    },
    onError: (error) => handleApiError(error),
  });
}
