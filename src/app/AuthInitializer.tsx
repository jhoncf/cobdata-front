import { useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';
import { refreshToken } from '@/lib/auth';
import api from '@/lib/api';
import type { MeResponse } from '@/types/api';

/**
 * Attempts to restore the session on app boot by calling /auth/refresh
 * using the HttpOnly cookie. If successful, sets the access token and
 * fetches the user profile. If it fails, marks initialized=true so the
 * app can redirect to login.
 */
export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { setToken, setUser, setInitialized, initialized } = useAuthStore();

  useEffect(() => {
    if (initialized) return;

    let cancelled = false;

    const wait = (ms: number) =>
      new Promise<void>((resolve) => window.setTimeout(resolve, ms));

    const isTransientFailure = (error: unknown) => {
      if (!axios.isAxiosError(error)) return false;
      return !error.response || error.response.status >= 500;
    };

    async function tryRestore() {
      // A backend container can be briefly unavailable while a deployment is
      // replacing it. Retry only network/5xx failures; an actual 401 remains a
      // definitive expired session and immediately follows the login flow.
      try {
        for (let attempt = 0; attempt < 5; attempt += 1) {
          try {
            const newToken = await refreshToken();
            if (cancelled) return;
            setToken(newToken);

            const meRes = await api.get<MeResponse>('/auth/me');
            if (cancelled) return;
            setUser(meRes.data);
            return;
          } catch (error) {
            if (!isTransientFailure(error) || attempt === 4) {
              return;
            }

            await wait(1_000 * (attempt + 1));
            if (cancelled) return;
          }
        }
      } finally {
        if (!cancelled) {
          setInitialized(true);
        }
      }
    }

    tryRestore();

    return () => {
      cancelled = true;
    };
  }, [initialized, setToken, setUser, setInitialized]);

  if (!initialized) {
    return null; // Or a loading spinner
  }

  return <>{children}</>;
}
