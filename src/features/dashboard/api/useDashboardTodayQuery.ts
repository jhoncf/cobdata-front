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

export function useDashboardTodayQuery() {
  return useQuery<DashboardToday>({
    queryKey: ['dashboard', 'today'],
    queryFn: () => api.get('/dashboard/today').then((response) => response.data),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useDashboardAgreementHistoryQuery() {
  return useQuery<DashboardAgreementHistory>({
    queryKey: ['dashboard', 'agreement-history'],
    queryFn: () => api.get('/dashboard/agreement-history').then((response) => response.data),
    staleTime: 5 * 60 * 1_000,
  });
}
