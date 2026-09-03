import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toaster } from '@/components/ui/toaster';
import { handleApiError } from '@/lib/error-handler';
import type { CreateCreditorDto, InviteCreditorUserDto, UpdateCreditorDto } from '@/types/api';
import type { CreditorCommercialRules } from '@/types/models';

export function useCreateCreditorMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCreditorDto) => api.post('/creditors', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditors'] });
      toaster.create({ type: 'success', title: 'Credor criado com sucesso' });
    },
    onError: (error) => handleApiError(error),
  });
}

export function useUpdateCreditorMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCreditorDto }) =>
      api.patch(`/creditors/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditors'] });
      toaster.create({ type: 'success', title: 'Credor atualizado com sucesso' });
    },
    onError: (error) => handleApiError(error),
  });
}

export function useDeleteCreditorMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/creditors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditors'] });
      toaster.create({ type: 'success', title: 'Credor excluído com sucesso' });
    },
    onError: (error) => handleApiError(error),
  });
}

export function useUpdateCreditorCommercialRulesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreditorCommercialRules }) =>
      api.put(`/creditors/${id}/commercial-rules`, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['creditors', 'commercial-rules', variables.id] });
      toaster.create({ type: 'success', title: 'Regras comerciais salvas' });
    },
    onError: (error) => handleApiError(error),
  });
}

export function useInviteCreditorUserMutation() {
  return useMutation({
    mutationFn: ({ creditorId, data }: { creditorId: string; data: InviteCreditorUserDto }) =>
      api.post(`/creditors/${creditorId}/users/invite`, data),
    onSuccess: () => toaster.create({ type: 'success', title: 'Convite enviado por e-mail' }),
    onError: (error) => handleApiError(error),
  });
}
