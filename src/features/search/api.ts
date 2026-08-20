import api from '@/lib/api';
import type { AxiosResponse } from 'axios';
import type { SearchResult } from './types';

// ─── Global Search ───────────────────────────────────────────────────────────

export function searchGlobal(
  term: string,
  signal?: AbortSignal,
): Promise<SearchResult> {
  return api
    .get<SearchResult>('/search', {
      params: { q: term },
      signal,
    })
    .then((r: AxiosResponse<SearchResult>) => r.data);
}
