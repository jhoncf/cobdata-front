import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toaster } from '@/components/ui/toaster';
import { handleApiError } from '@/lib/error-handler';
import type {
  CreatePaymentChargeInput,
  CreatePaymentGatewayInput,
} from './types';
import {
  getPaymentGateways,
  createPaymentGateway,
  updatePaymentGateway,
  getChargesByContract,
  preflightCharge,
  createCharge,
  generatePix,
  syncCharge,
  resyncCharge,
} from './api';

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const paymentKeys = {
  gateways: ['payment-gateways'] as const,
  charges: (contractId: string) => ['payment-charges', contractId] as const,
};

// ─── Gateway Queries / Mutations ─────────────────────────────────────────────

export function usePaymentGateways() {
  return useQuery({
    queryKey: paymentKeys.gateways,
    queryFn: getPaymentGateways,
  });
}

export function useCreatePaymentGateway() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePaymentGatewayInput) => createPaymentGateway(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.gateways });
      toaster.create({ type: 'success', title: 'Meio de pagamento criado com sucesso' });
    },
    onError: (error) => handleApiError(error),
  });
}

export function useUpdatePaymentGateway() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CreatePaymentGatewayInput> }) =>
      updatePaymentGateway(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.gateways });
      toaster.create({ type: 'success', title: 'Meio de pagamento atualizado' });
    },
    onError: (error) => handleApiError(error),
  });
}

// ─── Charge Queries / Mutations ──────────────────────────────────────────────

export function useChargesByContract(contractId: string) {
  return useQuery({
    queryKey: paymentKeys.charges(contractId),
    queryFn: () => getChargesByContract(contractId),
    enabled: !!contractId,
  });
}

export function usePreflightCharge(contractId: string) {
  return useMutation({
    mutationFn: (input: Pick<CreatePaymentChargeInput, 'paymentGatewayId' | 'method'>) =>
      preflightCharge(contractId, input),
    onError: (error) => handleApiError(error),
  });
}

export function useCreateCharge(contractId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePaymentChargeInput) => createCharge(contractId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.charges(contractId) });
      toaster.create({ type: 'success', title: 'Cobrança emitida com sucesso' });
    },
    // Error is handled by the component via error-map for user-friendly messages
  });
}

export function useGeneratePix(contractId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => generatePix(contractId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.charges(contractId) });
    },
    // Error is handled by the component via error-map for user-friendly messages
  });
}

export function useSyncCharge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (chargeId: string) => syncCharge(chargeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-charges'] });
      toaster.create({ type: 'success', title: 'Status atualizado' });
    },
    onError: (error) => handleApiError(error),
  });
}

export function useResyncCharge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (chargeId: string) => resyncCharge(chargeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-charges'] });
      toaster.create({ type: 'success', title: 'Ressincronização concluída' });
    },
    onError: (error) => handleApiError(error),
  });
}
