import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import type { PaginatedResponse, ListUsersParams } from '@/types/api';
import type { User } from '@/types/models';

export function useUsersQuery(params: ListUsersParams) {
  return useQuery<PaginatedResponse<User>>({
    queryKey: ['users', 'list', params],
    queryFn: () => api.get('/users', { params }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
}
