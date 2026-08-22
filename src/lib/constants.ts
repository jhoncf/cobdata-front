import type {
  DebtType,
  SerasaStatus,
  PaymentStatus,
  ContractStatus,
  ImportBatchStatus,
  OperationStatus,
  ContactType,
} from '@/types/enums';

export const DEBT_TYPE_LABELS: Record<DebtType, string> = {
  COMMERCIAL: 'Comercial',
  BANKING: 'Bancário',
  SERVICES: 'Serviços',
  UTILITIES: 'Utilidades',
  TELECOM: 'Telecomunicações',
  EDUCATION: 'Educação',
  HEALTH: 'Saúde',
  CONDOMINIAL: 'Condominial',
  OTHER: 'Outro',
};

export const PROVIDER_STATUS_LABELS: Record<SerasaStatus, string> = {
  NOT_ENABLED: 'Não habilitado',
  PENDING: 'Pendente',
  SENT: 'Enviado',
  REGISTERED: 'Registrado',
  UPDATED: 'Atualizado',
  REMOVING: 'Removendo',
  REMOVED: 'Removido',
  FAILED: 'Falhou',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  OPEN: 'Em aberto',
  IN_AGREEMENT: 'Em acordo',
  AGREEMENT_BREACHED: 'Acordo quebrado',
  PAID: 'Pago',
};

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  ACTIVE: 'Ativo',
  SUSPENDED: 'Suspenso',
  CANCELLED: 'Cancelado',
};

export const IMPORT_STATUS_LABELS: Record<ImportBatchStatus, string> = {
  PENDING_VALIDATION: 'Aguardando validação',
  VALIDATING: 'Validando',
  VALIDATED: 'Validado',
  VALIDATED_WITH_ERRORS: 'Validado com erros',
  VALIDATION_FAILED: 'Validação falhou',
  APPLYING: 'Aplicando',
  APPLIED: 'Aplicado',
  FAILED: 'Falhou',
  CANCELLED: 'Cancelado',
};

export const OPERATION_STATUS_LABELS: Record<OperationStatus, string> = {
  PENDING: 'Pendente',
  PROCESSING: 'Processando',
  COMPLETED: 'Concluído',
  PARTIALLY_FAILED: 'Parcialmente falhou',
  FAILED: 'Falhou',
  CANCELLED: 'Cancelado',
};

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  EMAIL: 'E-mail',
  PHONE: 'Telefone',
  WHATSAPP: 'WhatsApp',
};
