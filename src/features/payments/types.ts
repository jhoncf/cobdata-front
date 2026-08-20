// ─── Payment Module Types ────────────────────────────────────────────────────

/**
 * Supported payment methods for charge issuance.
 */
export type PaymentMethod = 'BOLETO' | 'PIX' | 'BOLEPIX';

/**
 * Lifecycle statuses of a payment charge.
 */
export type PaymentChargeStatus =
  | 'PENDING'
  | 'ISSUED'
  | 'PAID'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'FAILED';

/**
 * Summary view of a configured payment gateway.
 * Credentials are never included in this representation.
 */
export interface PaymentGatewaySummary {
  id: string;
  name: string;
  providerType: string;
  environment: string;
  enabled: boolean;
  supportedMethods: PaymentMethod[];
  hasCredentials: boolean;
  hasPixKey: boolean;
  hasCertificate: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Charge record with conditional artifacts from the provider.
 */
export interface PaymentCharge {
  id: string;
  contractId: string;
  method: PaymentMethod;
  amount: number;
  dueDate: string;
  status: PaymentChargeStatus;
  createdAt: string;
  externalRef?: string;
  // Conditional artifacts
  digitableLine?: string;
  barcode?: string;
  pixCopyPaste?: string;
  qrCode?: string;
  pdfUrl?: string;
  // Settlement info (Req 4 AC6)
  paidAmount?: number;
  settlementDate?: string;
  // Failure info
  failureCode?: string;
  failureMessage?: string;
}

/**
 * Result of a preflight validation before charge issuance.
 */
export interface PaymentPreflightResult {
  valid: boolean;
  missingFields: { field: string; reason: string }[];
}

/**
 * Input for creating a payment charge.
 */
export interface CreatePaymentChargeInput {
  paymentGatewayId: string;
  method: PaymentMethod;
  amount: number;
  dueDate: string;
  idempotencyKey: string;
}

/**
 * Input for creating/updating a payment gateway.
 */
export interface CreatePaymentGatewayInput {
  name: string;
  providerType: string;
  environment: string;
  enabled: boolean;
  supportedMethods: PaymentMethod[];
  credentials: {
    clientId?: string;
    clientSecret?: string;
    developerKey?: string;
    certificateBase64?: string;
    certificatePassword?: string;
    pixKey?: string;
  };
}

/**
 * Response from the "Generate Pix" action.
 */
export interface GeneratePixResponse {
  chargeId: string;
  contractId: string;
  txid: string;
  amount: number;
  expiresAt: string;
  pixCopyPaste: string;
  qrCodeUrl?: string;
  status: PaymentChargeStatus;
}

/**
 * User-friendly error representation for charge failures.
 * Never exposes technical details (HTTP codes, stack traces, raw JSON).
 */
export interface UserFriendlyError {
  message: string;
  supportReference?: string;
}
