import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export type ReportPeriod = { startDate: string; endDate: string; page?: number; limit?: number; creditorId?: string; walletId?: string };
export type ReportFilters = { creditors: Array<{ id: string; name: string }>; wallets: Array<{ id: string; name: string; creditorId: string }> };

export function useReportQuery<T>(name: string, period: ReportPeriod) {
  return useQuery<T>({
    queryKey: ['reports', name, period],
    queryFn: () => api.get(`/reports/${name}`, { params: period }).then((response) => response.data),
  });
}

export function useReportFilters() {
  return useQuery<ReportFilters>({
    queryKey: ['reports', 'filters'],
    queryFn: () => api.get('/reports/filters').then((response) => response.data),
  });
}

export async function downloadSerasaAgreements(period: ReportPeriod) {
  const response = await api.get('/reports/serasa-agreements/export', { params: period, responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'acordos-pagos-serasa.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export async function downloadPixPayments(period: ReportPeriod) {
  const response = await api.get('/reports/pix-payments/export', { params: period, responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'pagamentos-pix-cobcom.csv';
  link.click();
  URL.revokeObjectURL(url);
}
