import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import type { PaginatedResponse } from '@/types/api';

export interface AuditLog {
  id: string;
  action: string;
  userId: string | null;
  user?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  resourceType: string;
  resourceId: string | null;
  requestId: string | null;
  operationId: string | null;
  jobId: string | null;
  ipAddress: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLogsParams {
  page?: number;
  limit?: number;
  action?: string;
  resourceType?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useAuditLogsQuery(params: AuditLogsParams = {}) {
  return useQuery<PaginatedResponse<AuditLog>>({
    queryKey: ['audit-logs', params],
    queryFn: () => api.get('/audit-logs', { params }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
}
