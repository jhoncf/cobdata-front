import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { searchGlobal } from '../api';
import type { SearchResult, SearchError } from '../types';

// ─── Constants ───────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 400;
const TIMEOUT_MS = 10_000;
const RATE_LIMIT_RETRY_MS = 5_000;
const MIN_QUERY_LENGTH = 3;

// ─── Hook Return Type ────────────────────────────────────────────────────────

export interface UseGlobalSearchReturn {
  query: string;
  setQuery: (value: string) => void;
  results: SearchResult | null;
  isLoading: boolean;
  error: SearchError | null;
  retry: () => void;
}

// ─── Error Classification ────────────────────────────────────────────────────

function classifyError(error: unknown, navigate: ReturnType<typeof useNavigate>): SearchError | null {
  if (!(error instanceof AxiosError)) {
    return { type: 'network', message: 'Erro ao buscar. Tente novamente.' };
  }

  // Timeout — ECONNABORTED or AbortError due to timeout signal
  if (error.code === 'ECONNABORTED') {
    return { type: 'timeout', message: 'Erro ao buscar. Tente novamente.' };
  }

  // No response received — network error
  if (!error.response) {
    // Intentional cancellation — not an error to display
    if (error.code === 'ERR_CANCELED') {
      return null;
    }
    return { type: 'network', message: 'Erro ao buscar. Tente novamente.' };
  }

  const status = error.response.status;

  // 401 — redirect to login (interceptor usually handles, but as fallback)
  if (status === 401) {
    navigate('/login');
    return null;
  }

  // 429 — rate limited
  if (status === 429) {
    return { type: 'rate_limit', message: 'Muitas requisições. Aguarde um momento.' };
  }

  // 500 — server error
  if (status === 500) {
    return { type: 'server', message: 'Erro interno do servidor. Tente novamente.' };
  }

  // Any other error
  return { type: 'network', message: 'Erro ao buscar. Tente novamente.' };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useGlobalSearch(): UseGlobalSearchReturn {
  const navigate = useNavigate();

  const [query, setQueryState] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<SearchError | null>(null);

  // Refs for managing async operations
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rateLimitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTermRef = useRef<string>('');

  // ─── Execute Search (core function, bypasses debounce) ─────────────────────

  const executeSearch = useCallback(
    async (term: string) => {
      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new AbortController with timeout
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Set up timeout to abort after TIMEOUT_MS
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, TIMEOUT_MS);

      setIsLoading(true);
      setError(null);
      lastTermRef.current = term;

      try {
        const data = await searchGlobal(term, controller.signal);

        // Only update state if this request wasn't cancelled
        if (!controller.signal.aborted) {
          setResults(data);
          setError(null);
        }
      } catch (err: unknown) {
        // Don't set error if request was intentionally cancelled (new search started)
        if (controller.signal.aborted && err instanceof AxiosError && err.code === 'ERR_CANCELED') {
          // Check if abort was due to timeout (not user cancellation)
          // If the timeout fired AND this is the current controller, it's a timeout
          const isTimeout = abortControllerRef.current === controller;
          if (isTimeout) {
            setError({ type: 'timeout', message: 'Erro ao buscar. Tente novamente.' });
            setIsLoading(false);
          }
          return;
        }

        const classifiedError = classifyError(err, navigate);

        if (classifiedError) {
          setError(classifiedError);

          // Auto-retry for rate limit after 5 seconds
          if (classifiedError.type === 'rate_limit') {
            rateLimitTimerRef.current = setTimeout(() => {
              executeSearch(term);
            }, RATE_LIMIT_RETRY_MS);
          }
        }
      } finally {
        clearTimeout(timeoutId);
        if (abortControllerRef.current === controller) {
          setIsLoading(false);
        }
      }
    },
    [navigate],
  );

  // ─── Set Query (with debounce) ─────────────────────────────────────────────

  const setQuery = useCallback(
    (value: string) => {
      setQueryState(value);

      // Clear any pending debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      // Clear rate limit timer if user types again
      if (rateLimitTimerRef.current) {
        clearTimeout(rateLimitTimerRef.current);
        rateLimitTimerRef.current = null;
      }

      // If cleared or too short, cancel in-flight and reset
      if (value.trim().length < MIN_QUERY_LENGTH) {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }
        setResults(null);
        setIsLoading(false);
        setError(null);
        return;
      }

      // Debounce the search
      debounceTimerRef.current = setTimeout(() => {
        executeSearch(value.trim());
      }, DEBOUNCE_MS);
    },
    [executeSearch],
  );

  // ─── Retry Function ────────────────────────────────────────────────────────

  const retry = useCallback(() => {
    const term = lastTermRef.current;
    if (term && term.length >= MIN_QUERY_LENGTH) {
      setError(null);
      executeSearch(term);
    }
  }, [executeSearch]);

  // ─── Cleanup on Unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (rateLimitTimerRef.current) {
        clearTimeout(rateLimitTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    retry,
  };
}
