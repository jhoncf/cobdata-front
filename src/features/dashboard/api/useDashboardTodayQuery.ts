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

export function useDashboardTodayQuery() {
  return useQuery<DashboardToday>({
    queryKey: ['dashboard', 'today'],
    queryFn: () => api.get('/dashboard/today').then((response) => response.data),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
