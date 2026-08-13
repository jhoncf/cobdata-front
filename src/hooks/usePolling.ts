import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

interface UsePollingOptions<T>
  extends Omit<UseQueryOptions<T>, 'refetchInterval'> {
  /** Polling interval in milliseconds (default: 5000) */
  interval?: number;
  /** Function that determines whether polling should stop */
  shouldStop?: (data: T | undefined) => boolean;
}

/**
 * Generic polling hook built on top of TanStack Query's refetchInterval.
 * Polling stops when `shouldStop` returns true.
 */
export function usePolling<T>({
  interval = 5000,
  shouldStop,
  ...queryOptions
}: UsePollingOptions<T>) {
  return useQuery<T>({
    ...queryOptions,
    refetchInterval: (query) => {
      if (shouldStop?.(query.state.data)) return false;
      return interval;
    },
  } as UseQueryOptions<T>);
}
