import api from '@/lib/api';
import type { AxiosResponse } from 'axios';
import type {
  PaymentGatewaySummary,
  PaymentCharge,
  PaymentPreflightResult,
  CreatePaymentChargeInput,
  CreatePaymentGatewayInput,
  GeneratePixResponse,
} from './types';

// ─── Payment Gateways ────────────────────────────────────────────────────────

export function getPaymentGateways(): Promise<PaymentGatewaySummary[]> {
  return api
    .get<PaymentGatewaySummary[]>('/payment-gateways')
    .then((r: AxiosResponse<PaymentGatewaySummary[]>) => r.data);
}

export function createPaymentGateway(
  input: CreatePaymentGatewayInput,
): Promise<PaymentGatewaySummary> {
  return api
    .post<PaymentGatewaySummary>('/payment-gateways', input)
    .then((r: AxiosResponse<PaymentGatewaySummary>) => r.data);
}

export function updatePaymentGateway(
  id: string,
  input: Partial<CreatePaymentGatewayInput>,
): Promise<PaymentGatewaySummary> {
  return api
    .patch<PaymentGatewaySummary>(`/payment-gateways/${id}`, input)
    .then((r: AxiosResponse<PaymentGatewaySummary>) => r.data);
}

// ─── Payment Charges ─────────────────────────────────────────────────────────

export function getChargesByContract(contractId: string): Promise<PaymentCharge[]> {
  return api
    .get<PaymentCharge[]>(`/contracts/${contractId}/payment-charges`)
    .then((r: AxiosResponse<PaymentCharge[]>) => r.data);
}

export function preflightCharge(
  contractId: string,
  input: Pick<CreatePaymentChargeInput, 'paymentGatewayId' | 'method'>,
): Promise<PaymentPreflightResult> {
  return api
    .post<PaymentPreflightResult>(
      `/contracts/${contractId}/payment-charges/preflight`,
      input,
    )
    .then((r: AxiosResponse<PaymentPreflightResult>) => r.data);
}

export function createCharge(
  contractId: string,
  input: CreatePaymentChargeInput,
): Promise<PaymentCharge> {
  return api
    .post<PaymentCharge>(`/contracts/${contractId}/payment-charges`, input)
    .then((r: AxiosResponse<PaymentCharge>) => r.data);
}

export function generatePix(contractId: string): Promise<GeneratePixResponse> {
  return api
    .post<GeneratePixResponse>(`/contracts/${contractId}/payment-charges/pix`)
    .then((r: AxiosResponse<GeneratePixResponse>) => r.data);
}

// ─── Charge Sync ─────────────────────────────────────────────────────────────

export function syncCharge(chargeId: string): Promise<PaymentCharge> {
  return api
    .post<PaymentCharge>(`/payment-charges/${chargeId}/sync`)
    .then((r: AxiosResponse<PaymentCharge>) => r.data);
}

export function resyncCharge(chargeId: string): Promise<PaymentCharge> {
  return api
    .post<PaymentCharge>(`/payment-charges/${chargeId}/resync`)
    .then((r: AxiosResponse<PaymentCharge>) => r.data);
}
