import axios from 'axios';

// --- Token storage (in-memory only, never localStorage/sessionStorage) ---
let accessToken: string | null = null;
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

/**
 * Get the current access token from memory.
 */
export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * Set the access token in memory.
 * Pass null to clear.
 */
export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/**
 * Whether a token refresh is currently in progress.
 */
export function getIsRefreshing(): boolean {
  return isRefreshing;
}

export function setIsRefreshing(value: boolean): void {
  isRefreshing = value;
}

/**
 * Enqueue a failed request to be retried after refresh completes.
 */
export function enqueueFailedRequest(promise: {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}): void {
  failedQueue.push(promise);
}

/**
 * Process all queued requests after a refresh attempt.
 * If error is provided, all are rejected. Otherwise resolved with new token.
 */
export function processQueue(error: unknown, token: string | null): void {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else if (token) {
      resolve(token);
    }
  });
  failedQueue = [];
}

/**
 * Call the refresh endpoint. The browser sends the HttpOnly refresh cookie automatically.
 * Returns the new access token.
 */
export async function refreshToken(): Promise<string> {
  const response = await axios.post<{ accessToken: string }>(
    `${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/refresh`,
    null,
    { withCredentials: true },
  );
  return response.data.accessToken;
}
