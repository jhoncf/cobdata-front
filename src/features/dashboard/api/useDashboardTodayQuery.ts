import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface DashboardToday {
  date: string;
  timezone: string;
  agreements: {
    count: number;
    amount: number;
  };
  breachedAgreements: {
    count: number;
    amount: number;
  };
}

export interface DashboardAgreementHistory {
  data: Array<{
    date: string;
    count: number;
    amount: number;
    paidCount: number;
    breachCount: number;
  }>;
  cachedAt: string;
  cacheTtlSeconds: number;
}

export interface DashboardFilters {
  creditorId?: string;
  walletId?: string;
}

export function useDashboardTodayQuery(filters: DashboardFilters = {}) {
  return useQuery<DashboardToday>({
    queryKey: ['dashboard', 'today', filters],
    queryFn: () => api.get('/dashboard/today', { params: filters }).then((response) => response.data),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useDashboardAgreementHistoryQuery(filters: DashboardFilters = {}) {
  return useQuery<DashboardAgreementHistory>({
    queryKey: ['dashboard', 'agreement-history', filters],
    queryFn: () => api.get('/dashboard/agreement-history', { params: filters }).then((response) => response.data),
    staleTime: 5 * 60 * 1_000,
  });
}
