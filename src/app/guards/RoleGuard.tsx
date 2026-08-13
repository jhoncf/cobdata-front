import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { toaster } from '@/components/ui/toaster';
import type { Role } from '@/types/enums';

interface RoleGuardProps {
  /** Allowed roles for this route group */
  allowedRoles: Role[];
}

/**
 * Checks user role against allowedRoles.
 * Redirects to /dashboard with toast if insufficient permissions.
 */
export function RoleGuard({ allowedRoles }: RoleGuardProps) {
  const user = useAuthStore((s) => s.user);

  if (!user || !allowedRoles.includes(user.role as Role)) {
    toaster.create({
      type: 'error',
      title: 'Acesso negado',
      description: 'Você não tem permissão para acessar esta página.',
    });
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
