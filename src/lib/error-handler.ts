import axios, { AxiosError } from 'axios';
import { toaster } from '@/components/ui/toaster';

/**
 * Generic API error handler.
 * Maps HTTP status codes to user-friendly toast notifications.
 * Follows requirement R15 for error feedback.
 */
export function handleApiError(error: unknown): void {
  if (!axios.isAxiosError(error)) {
    toaster.create({ type: 'error', title: 'Erro inesperado' });
    return;
  }

  const axiosError = error as AxiosError<{ message?: string | string[] }>;
  const status = axiosError.response?.status;
  const rawMessage = axiosError.response?.data?.message;
  const message = Array.isArray(rawMessage) ? rawMessage[0] : rawMessage;

  switch (status) {
    case 400:
      toaster.create({ type: 'error', title: message || 'Dados inválidos' });
      break;

    case 401:
      // Handled by the response interceptor (refresh queue)
      break;

    case 403:
      if (message?.includes('Password reset required')) {
        // Handled by response interceptor — redirect to /change-password
        return;
      }
      toaster.create({ type: 'error', title: 'Permissão insuficiente' });
      break;

    case 404:
      toaster.create({ type: 'error', title: 'Recurso não encontrado' });
      break;

    case 409:
      toaster.create({ type: 'error', title: message || 'Conflito' });
      break;

    case 413:
      toaster.create({ type: 'error', title: 'Arquivo muito grande' });
      break;

    case 422:
      // Validation errors — handled by forms (mapped to field errors)
      break;

    case 429:
      toaster.create({
        type: 'warning',
        title: message || 'Muitas requisições. Aguarde.',
      });
      break;

    default:
      if (!axiosError.response) {
        // Network error (timeout, offline, etc.)
        toaster.create({
          type: 'error',
          title: 'Falha na conexão. Verifique sua internet.',
        });
      } else {
        // 5xx or any other unexpected status
        toaster.create({
          type: 'error',
          title: 'Erro interno. Tente novamente em instantes.',
        });
      }
  }
}
