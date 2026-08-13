import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ContractTag } from '@/types/models';

export function useTagsQuery() {
  return useQuery<ContractTag[]>({
    queryKey: ['tags'],
    queryFn: () => api.get('/contracts/tags').then((r) => r.data),
  });
}
