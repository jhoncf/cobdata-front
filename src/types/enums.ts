// ─── Roles ───────────────────────────────────────────────────────────────────
export enum Role {
  ADMIN = 'ADMIN',
  OPERATIONAL = 'OPERATIONAL',
  VIEWER = 'VIEWER',
}

// ─── Debt Types ──────────────────────────────────────────────────────────────
export enum DebtType {
  COMMERCIAL = 'COMMERCIAL',
  BANKING = 'BANKING',
  SERVICES = 'SERVICES',
  UTILITIES = 'UTILITIES',
  TELECOM = 'TELECOM',
  EDUCATION = 'EDUCATION',
  HEALTH = 'HEALTH',
  CONDOMINIAL = 'CONDOMINIAL',
  OTHER = 'OTHER',
}

// ─── Provider Status (contract at provider) ──────────────────────────────────
export enum ProviderStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  REGISTERED = 'REGISTERED',
  UPDATED = 'UPDATED',
  REMOVING = 'REMOVING',
  REMOVED = 'REMOVED',
  FAILED = 'FAILED',
  IN_AGREEMENT = 'IN_AGREEMENT',
  AGREEMENT_BREACHED = 'AGREEMENT_BREACHED',
  PAID = 'PAID',
}

// ─── Contract Status ─────────────────────────────────────────────────────────
export enum ContractStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
}

// ─── Import Batch Status ─────────────────────────────────────────────────────
export enum ImportBatchStatus {
  PENDING_VALIDATION = 'PENDING_VALIDATION',
  VALIDATING = 'VALIDATING',
  VALIDATED = 'VALIDATED',
  VALIDATED_WITH_ERRORS = 'VALIDATED_WITH_ERRORS',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  APPLYING = 'APPLYING',
  APPLIED = 'APPLIED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

// ─── Operation Action ────────────────────────────────────────────────────────
export enum OperationAction {
  CREATE_OR_UPDATE = 'CREATE_OR_UPDATE',
  REMOVE = 'REMOVE',
}

// ─── Operation Status ────────────────────────────────────────────────────────
export enum OperationStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  PARTIALLY_FAILED = 'PARTIALLY_FAILED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

// ─── Operation Item Status ───────────────────────────────────────────────────
export enum OperationItemStatus {
  PENDING = 'PENDING',
  WAITING_PROVIDER_EVENT = 'WAITING_PROVIDER_EVENT',
  REGISTERED = 'REGISTERED',
  UPDATED = 'UPDATED',
  REMOVED = 'REMOVED',
  FAILED = 'FAILED',
}

// ─── Wallet Status ───────────────────────────────────────────────────────────
export enum WalletStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

// ─── Provider Type ───────────────────────────────────────────────────────────
export enum ProviderType {
  SERASA_LNOP = 'SERASA_LNOP',
}

// ─── Provider Environment ────────────────────────────────────────────────────
export enum ProviderEnv {
  HOMOLOGATION = 'HOMOLOGATION',
  PRODUCTION = 'PRODUCTION',
}

// ─── Invite Status ───────────────────────────────────────────────────────────
export enum InviteStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

// ─── Webhook Status ──────────────────────────────────────────────────────────
export enum WebhookStatus {
  PENDING = 'PENDING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
}

// ─── Contact Type ────────────────────────────────────────────────────────────
export enum ContactType {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  WHATSAPP = 'WHATSAPP',
}

// ─── Offer Type ──────────────────────────────────────────────────────────────
export enum OfferType {
  DISCOUNT = 'DISCOUNT',
  INSTALLMENT = 'INSTALLMENT',
  FULL_PAYMENT = 'FULL_PAYMENT',
}
