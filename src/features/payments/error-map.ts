import type { AxiosError } from 'axios';
import type { UserFriendlyError } from './types';

/**
 * Maps known charge error codes to user-friendly messages in Portuguese.
 * No HTTP status codes, stack traces, or raw JSON are exposed to the user.
 */
const ERROR_MESSAGES: Record<string, string> = {
  INVALID_DOCUMENT: 'O CPF/CNPJ informado no contrato é inválido.',
  MISSING_DEBTOR_DATA: 'O contrato possui dados obrigatórios do pagador incompletos.',
  GATEWAY_INACTIVE: 'O meio de pagamento está desativado. Entre em contato com o administrador.',
  METHOD_NOT_SUPPORTED: 'A modalidade selecionada não é suportada pelo meio de pagamento.',
  DUPLICATE_CHARGE: 'Já existe uma cobrança pendente para este contrato.',
  RATE_LIMITED: 'O provedor está temporariamente indisponível. Tente novamente em alguns minutos.',
  PROVIDER_UNAVAILABLE: 'O provedor de pagamento está fora do ar. Tente novamente mais tarde.',
  PROVIDER_TIMEOUT: 'A comunicação com o provedor excedeu o tempo limite. Tente novamente.',
  PROVIDER_NOT_PROCESSED: 'O provedor não processou a cobrança. Tente emitir novamente.',
  CERTIFICATE_EXPIRED: 'O certificado do meio de pagamento expirou. Contacte o administrador.',
  INVALID_AMOUNT: 'O valor da cobrança é inválido.',
  INVALID_DUE_DATE: 'A data de vencimento é inválida ou já passou.',
  CONTRACT_INELIGIBLE: 'O contrato não está elegível para emissão de cobrança.',
  PIX_KEY_MISSING: 'A chave Pix não está configurada no meio de pagamento.',
  PIX_KEY_NOT_FOUND: 'A chave Pix não está cadastrada no ambiente de homologação do Banco do Brasil.',
  AUTHENTICATION_FAILED: 'Falha na autenticação com o provedor. Verifique as credenciais.',
};

/**
 * Default fallback message when error code is unknown or absent.
 */
const FALLBACK_MESSAGE =
  'Não foi possível emitir a cobrança. Tente novamente ou entre em contato com o suporte.';

/**
 * Extracts a user-friendly error from an Axios error response.
 *
 * The response is expected to have the shape:
 * ```json
 * {
 *   "failureCode": "RATE_LIMITED",
 *   "message": "...",
 *   "supportReference": "abc-123"
 * }
 * ```
 *
 * If `failureCode` matches a known code, the mapped message is used.
 * Otherwise the fallback message is returned.
 */
export function mapChargeError(error: AxiosError): UserFriendlyError {
  const data = error.response?.data as
    | { failureCode?: string; supportReference?: string }
    | undefined;

  const code = data?.failureCode;
  const message = (code && ERROR_MESSAGES[code]) || FALLBACK_MESSAGE;

  return {
    message,
    supportReference: data?.supportReference,
  };
}
