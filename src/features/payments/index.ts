// ─── Payments Module Barrel Export ────────────────────────────────────────────

export type {
  PaymentMethod,
  PaymentChargeStatus,
  PaymentGatewaySummary,
  PaymentCharge,
  PaymentPreflightResult,
  CreatePaymentChargeInput,
  CreatePaymentGatewayInput,
  GeneratePixResponse,
  UserFriendlyError,
} from './types';

export {
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

export {
  paymentKeys,
  usePaymentGateways,
  useCreatePaymentGateway,
  useUpdatePaymentGateway,
  useChargesByContract,
  usePreflightCharge,
  useCreateCharge,
  useGeneratePix,
  useSyncCharge,
  useResyncCharge,
} from './hooks';

export { mapChargeError } from './error-map';

export { generateIdempotencyKey } from './utils/idempotency';
export { CreateChargeDialog } from './components/CreateChargeDialog';
export { PreflightErrors } from './components/PreflightErrors';
export { PaymentChargeResult } from './components/PaymentChargeResult';
export { ChargeErrorFeedback } from './components/ChargeErrorFeedback';
export { PaymentChargesList } from './components/PaymentChargesList';
export { SettlementInfo } from './components/SettlementInfo';
export { GeneratePixAction } from './components/GeneratePixAction';
