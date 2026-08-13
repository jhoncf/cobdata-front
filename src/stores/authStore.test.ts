import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';

// Helper to create a valid JWT with a payload
function createMockJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  const signature = 'mock-signature';
  return `${header}.${body}.${signature}`;
}

describe('authStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.getState().clear();
  });

  describe('setToken', () => {
    it('should set isAuthenticated to true', () => {
      const token = createMockJwt({
        sub: 'user-1',
        accountId: 'acc-1',
        role: 'ADMIN',
        sessionId: 'sess-1',
        iat: Date.now(),
        exp: Date.now() + 3600,
      });

      useAuthStore.getState().setToken(token);

      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('should extract mustResetPassword from JWT payload', () => {
      const token = createMockJwt({
        sub: 'user-1',
        accountId: 'acc-1',
        role: 'OPERATIONAL',
        sessionId: 'sess-1',
        mustResetPassword: true,
        iat: Date.now(),
        exp: Date.now() + 3600,
      });

      useAuthStore.getState().setToken(token);

      expect(useAuthStore.getState().mustResetPassword).toBe(true);
    });

    it('should default mustResetPassword to false when not in payload', () => {
      const token = createMockJwt({
        sub: 'user-1',
        accountId: 'acc-1',
        role: 'VIEWER',
        sessionId: 'sess-1',
        iat: Date.now(),
        exp: Date.now() + 3600,
      });

      useAuthStore.getState().setToken(token);

      expect(useAuthStore.getState().mustResetPassword).toBe(false);
    });
  });

  describe('logout', () => {
    it('should clear all auth state', () => {
      const token = createMockJwt({
        sub: 'user-1',
        accountId: 'acc-1',
        role: 'ADMIN',
        sessionId: 'sess-1',
        iat: Date.now(),
        exp: Date.now() + 3600,
      });

      useAuthStore.getState().setToken(token);
      useAuthStore.getState().setUser({
        id: 'user-1',
        email: 'admin@test.com',
        name: 'Admin',
        role: 'ADMIN',
        scopes: [],
      });

      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.mustResetPassword).toBe(false);
    });
  });

  describe('setUser', () => {
    it('should store user data', () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'OPERATIONAL' as const,
        scopes: ['wallet-1', 'wallet-2'],
      };

      useAuthStore.getState().setUser(user);

      expect(useAuthStore.getState().user).toEqual(user);
    });
  });
});
