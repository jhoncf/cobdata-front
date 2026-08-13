import { useEffect } from 'react';
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

    async function tryRestore() {
      try {
        const newToken = await refreshToken();
        if (cancelled) return;
        setToken(newToken);

        const meRes = await api.get<MeResponse>('/auth/me');
        if (cancelled) return;
        setUser(meRes.data);
      } catch {
        // Refresh failed — user needs to login again
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
