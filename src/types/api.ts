import type {
  Role,
  DebtType,
  ContractStatus,
  ProviderType,
  ProviderEnv,
  OperationAction,
  OfferType,
  ContactType,
  WalletStatus,
  PaymentStatus,
  SerasaStatus,
} from './enums';
import type { Address, Contact, OfferDto } from './models';

// ─── Generic API Types ───────────────────────────────────────────────────────
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
  requestId?: string;
  timestamp?: string;
}

// ─── Auth Responses ──────────────────────────────────────────────────────────
export interface LoginResponse {
  accessToken: string;
}

export interface MeResponse {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  scopes: string[];
}

// ─── Auth Request DTOs ───────────────────────────────────────────────────────
export interface LoginDto {
  email: string;
  password: string;
}

export interface ActivateDto {
  token: string;
  password: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

// ─── User DTOs ───────────────────────────────────────────────────────────────
export interface InviteUserDto {
  email: string;
  role: Role;
  scopes?: string[];
}

export interface UpdateUserDto {
  role?: Role;
  isActive?: boolean;
  scopes?: string[];
}

// ─── Creditor DTOs ───────────────────────────────────────────────────────────
export interface CreateCreditorDto {
  name: string;
  cnpj?: string;
  contacts?: Contact[];
  address?: Address;
  webhookUrl?: string;
  webhookAuthKey?: string;
}

export interface UpdateCreditorDto {
  name?: string;
  cnpj?: string;
  contacts?: Contact[];
  address?: Address;
  webhookUrl?: string;
  webhookAuthKey?: string;
}

// ─── Wallet DTOs ─────────────────────────────────────────────────────────────
export interface CreateWalletDto {
  name: string;
  serasaWalletId?: string;
  cobcomDiscountPercent?: number;
}

export interface UpdateWalletDto {
  name?: string;
  status?: WalletStatus;
  serasaWalletId?: string | null;
  cobcomDiscountPercent?: number;
}

// ─── Contract DTOs ───────────────────────────────────────────────────────────
export interface CreateContractDto {
  walletId: string;
  debtorDocument: string;
  debtorName?: string;
  contractNumber: string;
  debtType: DebtType;
  occurrenceDate: string;
  dueDate: string;
  originalValue: number;
  updatedValue: number;
  debtOrigin?: string;
  productName?: string;
  debtorStreet?: string;
  debtorCity?: string;
  debtorPhone?: string;
  debtorEmail?: string;
  isNegativated?: boolean;
  cancelledAt?: string;
  offer?: OfferDto;
}

export interface UpdateContractDto {
  walletId?: string;
  debtorName?: string;
  originalValue?: number;
  updatedValue?: number;
  occurrenceDate?: string;
  dueDate?: string;
  debtType?: DebtType;
  status?: ContractStatus;
  debtOrigin?: string;
  productName?: string;
  debtorStreet?: string;
  debtorCity?: string;
  debtorPhone?: string;
  debtorEmail?: string;
  isNegativated?: boolean;
  cancelledAt?: string;
  offer?: OfferDto;
}

export interface ManageTagsDto {
  tags: string[];
}

// ─── Provider DTOs ───────────────────────────────────────────────────────────
export interface CreateProviderDto {
  type: ProviderType;
  environment: ProviderEnv;
  credentials: Record<string, string>;
}

export interface UpdateProviderDto {
  environment?: ProviderEnv;
  credentials?: Record<string, string>;
}

// ─── Wallet Mapping DTOs ─────────────────────────────────────────────────────
export interface CreateWalletMappingDto {
  walletId: string;
  externalWalletId: string;
}

// ─── Operation DTOs ──────────────────────────────────────────────────────────
export interface CreateOperationDto {
  walletId: string;
  action: OperationAction;
  filters?: OperationContractFilters;
}

export interface OperationContractFilters {
  paymentStatus?: PaymentStatus;
  serasaStatus?: SerasaStatus;
  installmentOnly?: boolean;
  minOriginalValue?: number;
  maxOriginalValue?: number;
  minUpdatedValue?: number;
  maxUpdatedValue?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface OperationPreviewResponse {
  walletId: string;
  action: OperationAction;
  eligibleCount: number;
  batchCount: number;
}

export interface BulkTransferContractsDto {
  sourceWalletId: string;
  destinationWalletId: string;
  filters?: OperationContractFilters;
}

export interface BulkTransferContractsResult {
  matchedCount: number;
  transferredCount: number;
}

// ─── Import DTOs ─────────────────────────────────────────────────────────────
export interface UploadImportDto {
  file: File;
  walletId: string;
  columnMapping: Record<string, string>;
}

// ─── Offer DTO (re-export for convenience) ───────────────────────────────────
export type { OfferDto } from './models';

// ─── Offer Request DTO ───────────────────────────────────────────────────────
export interface CreateOfferDto {
  type: OfferType;
  discountPercentage?: number;
  installments?: number;
  installmentValue?: number;
  totalValue?: number;
  expiresAt?: string;
  notes?: string;
}

// ─── Pagination Params ───────────────────────────────────────────────────────
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface ListCreditorsParams extends PaginationParams {
  search?: string;
}

export interface ListWalletsParams extends PaginationParams {
  search?: string;
  creditorId?: string;
}

export interface ListContractsParams extends PaginationParams {
  walletId?: string;
  creditorId?: string;
  status?: ContractStatus;
  serasaStatus?: string;
  paymentStatus?: PaymentStatus;
  installmentOnly?: boolean;
  minOriginalValue?: number;
  maxOriginalValue?: number;
  minUpdatedValue?: number;
  maxUpdatedValue?: number;
  dateFrom?: string;
  dateTo?: string;
  debtorDocument?: string;
  tags?: string[];
}

export interface ListImportsParams extends PaginationParams {
  status?: string;
  walletId?: string;
}

export interface ListOperationsParams extends PaginationParams {
  walletId?: string;
  status?: string;
}

export interface ListUsersParams extends PaginationParams {
  status?: string;
}

export interface ContactTypeOption {
  type: ContactType;
  value: string;
}
