import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

/**
 * Forces user to /change-password if mustResetPassword is true.
 * Allows /change-password route through without redirect.
 */
export function MustResetGuard() {
  const mustResetPassword = useAuthStore((s) => s.mustResetPassword);
  const location = useLocation();

  if (mustResetPassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  return <Outlet />;
}
