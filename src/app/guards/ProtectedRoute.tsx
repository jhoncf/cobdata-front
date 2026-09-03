import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { AppShell } from '@/components/layout';

/**
 * Redirects to /login if user is not authenticated.
 * Renders child routes wrapped in AppShell layout otherwise.
 */
export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.creditorId && !['/contracts', '/change-password', '/sessions'].some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`))) {
    return <Navigate to="/contracts" replace />;
  }

  return <AppShell />;
}
