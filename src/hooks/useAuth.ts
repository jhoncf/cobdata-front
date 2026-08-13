import { useAuthStore } from '@/stores/authStore';

export function useAuth() {
  const store = useAuthStore();

  return {
    ...store,
    role: store.user?.role ?? null,
    scopes: store.user?.scopes ?? [],
    isAdmin: store.user?.role === 'ADMIN',
    isOperational: store.user?.role === 'OPERATIONAL',
    isViewer: store.user?.role === 'VIEWER',
    canWrite: store.user?.role !== 'VIEWER',
    canDelete: store.user?.role === 'ADMIN',
    userName: store.user?.name ?? store.user?.email ?? '',
  };
}
