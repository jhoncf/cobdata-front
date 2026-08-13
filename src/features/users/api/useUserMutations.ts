import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toaster } from '@/components/ui/toaster';
import type { InviteUserDto, UpdateUserDto } from '@/types/api';

export function useInviteUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InviteUserDto) => api.post('/users/invite', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toaster.create({ type: 'success', title: 'Convite enviado com sucesso' });
    },
    onError: (error: unknown) => {
      const axiosErr = error as { response?: { status?: number; data?: { message?: string } } };
      if (axiosErr.response?.status === 409) {
        toaster.create({ type: 'error', title: axiosErr.response.data?.message || 'Usuário já existe' });
      }
    },
  });
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateUserDto }) =>
      api.patch(`/users/${userId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toaster.create({ type: 'success', title: 'Usuário atualizado' });
    },
    onError: (error: unknown) => {
      const axiosErr = error as { response?: { status?: number; data?: { message?: string } } };
      if (axiosErr.response?.status === 409) {
        toaster.create({ type: 'error', title: axiosErr.response.data?.message || 'Não é possível alterar o último administrador' });
      }
    },
  });
}

export function useResendInviteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.post(`/users/${userId}/resend-invite`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toaster.create({ type: 'success', title: 'Convite reenviado' });
    },
  });
}

export function useForceResetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.post(`/users/${userId}/force-reset`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toaster.create({ type: 'success', title: 'Reset de senha forçado com sucesso' });
    },
  });
}
