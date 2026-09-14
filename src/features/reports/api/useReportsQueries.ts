import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export type ReportPeriod = { startDate: string; endDate: string; page?: number; limit?: number };

export function useReportQuery<T>(name: string, period: ReportPeriod) {
  return useQuery<T>({
    queryKey: ['reports', name, period.startDate, period.endDate],
    queryFn: () => api.get(`/reports/${name}`, { params: period }).then((response) => response.data),
  });
}
