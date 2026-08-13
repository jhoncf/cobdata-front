import { create } from 'zustand';
import { setAccessToken } from '@/lib/auth';
import { decodeJwtPayload } from '@/lib/jwt';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'OPERATIONAL' | 'VIEWER';
  scopes: string[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  mustResetPassword: boolean;
  /** Whether the initial auth check (refresh attempt) has completed */
  initialized: boolean;

  setToken: (token: string) => void;
  setUser: (user: User) => void;
  setInitialized: (value: boolean) => void;
  logout: () => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  mustResetPassword: false,
  initialized: false,

  setToken: (token) => {
    setAccessToken(token);
    const payload = decodeJwtPayload(token);
    set({
      isAuthenticated: true,
      mustResetPassword: payload?.mustResetPassword ?? false,
    });
  },

  setUser: (user) => set({ user }),

  setInitialized: (value) => set({ initialized: value }),

  logout: () => {
    setAccessToken(null);
    set({ user: null, isAuthenticated: false, mustResetPassword: false });
  },

  clear: () => {
    setAccessToken(null);
    set({ user: null, isAuthenticated: false, mustResetPassword: false });
  },
}));
