import {
  Role,
  DebtType,
  SerasaStatus,
  PaymentStatus,
  ContractStatus,
  ImportBatchStatus,
  OperationAction,
  OperationStatus,
  OperationItemStatus,
  WalletStatus,
  ProviderType,
  ProviderEnv,
  InviteStatus,
  ContactType,
  OfferType,
} from './enums';

// ─── User ────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  scopes: string[];
  isActive: boolean;
  status: InviteStatus;
  createdAt: string;
  updatedAt: string;
}

// ─── Creditor ────────────────────────────────────────────────────────────────
export interface Contact {
  type: ContactType;
  value: string;
}

export interface Address {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface Creditor {
  id: string;
  name: string;
  cnpj: string | null;
  contacts: Contact[];
  address: Address | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Wallet ──────────────────────────────────────────────────────────────────
export interface Wallet {
  id: string;
  name: string;
  creditorId: string;
  creditor?: Creditor;
  status: WalletStatus;
  createdAt: string;
  updatedAt: string;
  _count?: {
    contracts: number;
  };
}

export interface WalletSummary {
  totalContracts: number;
  contractsByPaymentStatus: Record<string, number>;
  totalValue: number;
}

// ─── Contract ────────────────────────────────────────────────────────────────
export interface OfferDto {
  type: OfferType;
  discountPercentage?: number;
  installments?: number;
  installmentValue?: number;
  totalValue?: number;
  expiresAt?: string;
  notes?: string;
}

export interface ContractTag {
  id: string;
  name: string;
  count?: number;
}

export interface Contract {
  id: string;
  walletId: string;
  wallet?: Wallet;
  debtorDocument: string;
  debtorName: string | null;
  contractNumber: string;
  debtType: DebtType;
  occurrenceDate: string;
  dueDate: string | null;
  originalValue: number;
  updatedValue: number | null;
  debtOrigin: string | null;
  productName: string | null;
  debtorStreet: string | null;
  debtorCity: string | null;
  debtorPhone: string | null;
  debtorEmail: string | null;
  isNegativated: boolean;
  cancelledAt: string | null;
  status: ContractStatus;
  serasaStatus: SerasaStatus;
  paymentStatus: PaymentStatus;
  offer: OfferDto | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── Import Batch ────────────────────────────────────────────────────────────
export interface ImportBatch {
  id: string;
  walletId: string;
  wallet?: Wallet;
  fileName: string;
  status: ImportBatchStatus;
  totalLines: number;
  validLines: number;
  invalidLines: number;
  createdCount: number;
  updatedCount: number;
  ignoredCount: number;
  columnMapping: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface ImportBatchError {
  lineNumber: number;
  fieldName: string;
  errorCode: string;
  message: string;
  fieldValue: string | null;
}

// ─── Provider Operation ──────────────────────────────────────────────────────
export interface ProviderOperation {
  id: string;
  walletId: string;
  wallet?: Wallet;
  action: OperationAction;
  status: OperationStatus;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  createdAt: string;
  updatedAt: string;
}

export interface OperationItem {
  id: string;
  operationId: string;
  contractId: string;
  contract?: Contract;
  status: OperationItemStatus;
  errorCode: string | null;
  errorMessage: string | null;
}

// ─── Provider ────────────────────────────────────────────────────────────────
export interface Provider {
  id: string;
  type: ProviderType;
  environment: ProviderEnv;
  createdAt: string;
  updatedAt: string;
}

export interface WalletMapping {
  id: string;
  providerId: string;
  walletId: string;
  wallet?: Wallet;
  externalWalletId: string;
  createdAt: string;
}

// ─── Session ─────────────────────────────────────────────────────────────────
export interface Session {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  isCurrent: boolean;
}
