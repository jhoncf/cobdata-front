import { useAuth } from './useAuth';

export function usePermission() {
  const { role } = useAuth();

  return {
    canCreate: role === 'ADMIN' || role === 'OPERATIONAL',
    canEdit: role === 'ADMIN' || role === 'OPERATIONAL',
    canDelete: role === 'ADMIN',
    canManageUsers: role === 'ADMIN',
    canManageProviders: role === 'ADMIN',
    canViewProviders: role === 'ADMIN' || role === 'OPERATIONAL',
    canManagePaymentGateways: role === 'ADMIN',
  };
}
