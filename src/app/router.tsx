/* eslint-disable react-refresh/only-export-components -- This module exports the router configuration and its local Suspense wrapper. */
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicRoute, MustResetGuard, RoleGuard } from '@/app/guards';
import { Role } from '@/types/enums';

// NotFoundPage
const NotFoundPage = lazy(() => import('@/features/NotFoundPage'));

// ─── Lazy-loaded pages ───────────────────────────────────────────────────────
// Auth (public)
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const ActivatePage = lazy(() => import('@/features/auth/pages/ActivatePage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/features/auth/pages/ResetPasswordPage'));

// Auth (protected)
const ChangePasswordPage = lazy(() => import('@/features/auth/pages/ChangePasswordPage'));
const SessionsPage = lazy(() => import('@/features/auth/pages/SessionsPage'));

// Core features
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'));
const CreditorsListPage = lazy(() => import('@/features/creditors/pages/CreditorsListPage'));
const CreditorDetailPage = lazy(() => import('@/features/creditors/pages/CreditorDetailPage'));
const WalletsListPage = lazy(() => import('@/features/wallets/pages/WalletsListPage'));
const WalletDetailPage = lazy(() => import('@/features/wallets/pages/WalletDetailPage'));
const ContractsListPage = lazy(() => import('@/features/contracts/pages/ContractsListPage'));
const ImportsListPage = lazy(() => import('@/features/imports/pages/ImportsListPage'));
const ImportUploadPage = lazy(() => import('@/features/imports/pages/ImportUploadPage'));
const ImportDetailPage = lazy(() => import('@/features/imports/pages/ImportDetailPage'));
const OperationsListPage = lazy(() => import('@/features/operations/pages/OperationsListPage'));
const OperationDetailPage = lazy(() => import('@/features/operations/pages/OperationDetailPage'));

// Admin
const UsersListPage = lazy(() => import('@/features/users/pages/UsersListPage'));
const ProvidersPage = lazy(() => import('@/features/providers/pages/ProvidersPage'));
const AuditLogsPage = lazy(() => import('@/features/audit/pages/AuditLogsPage'));
const PaymentGatewaysPage = lazy(() => import('@/features/payments/pages/PaymentGatewaysPage'));

// ─── Suspense wrapper ────────────────────────────────────────────────────────
function SuspenseLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div />}>{children}</Suspense>;
}

// ─── Router definition ───────────────────────────────────────────────────────
export const router = createBrowserRouter([
  // Public routes (redirect to dashboard if authenticated)
  {
    element: <PublicRoute />,
    children: [
      {
        path: '/login',
        element: <SuspenseLayout><LoginPage /></SuspenseLayout>,
      },
      {
        path: '/activate/:token',
        element: <SuspenseLayout><ActivatePage /></SuspenseLayout>,
      },
      {
        path: '/forgot-password',
        element: <SuspenseLayout><ForgotPasswordPage /></SuspenseLayout>,
      },
      {
        path: '/reset-password/:token',
        element: <SuspenseLayout><ResetPasswordPage /></SuspenseLayout>,
      },
    ],
  },

  // Protected routes (require authentication)
  {
    element: <ProtectedRoute />,
    children: [
      // MustResetGuard: forces /change-password if mustResetPassword
      {
        element: <MustResetGuard />,
        children: [
          // Routes accessible by all authenticated users
          {
            path: '/dashboard',
            element: <SuspenseLayout><DashboardPage /></SuspenseLayout>,
          },
          {
            path: '/change-password',
            element: <SuspenseLayout><ChangePasswordPage /></SuspenseLayout>,
          },
          {
            path: '/sessions',
            element: <SuspenseLayout><SessionsPage /></SuspenseLayout>,
          },
          {
            path: '/creditors',
            element: <SuspenseLayout><CreditorsListPage /></SuspenseLayout>,
          },

          {
            path: '/creditors/:id',
            element: <SuspenseLayout><CreditorDetailPage /></SuspenseLayout>,
          },
          {
            path: '/wallets',
            element: <SuspenseLayout><WalletsListPage /></SuspenseLayout>,
          },

          {
            path: '/wallets/:id',
            element: <SuspenseLayout><WalletDetailPage /></SuspenseLayout>,
          },
          {
            path: '/contracts',
            element: <SuspenseLayout><ContractsListPage /></SuspenseLayout>,
          },
          {
            path: '/imports',
            element: <SuspenseLayout><ImportsListPage /></SuspenseLayout>,
          },
          {
            path: '/imports/new',
            element: <SuspenseLayout><ImportUploadPage /></SuspenseLayout>,
          },
          {
            path: '/imports/:batchId',
            element: <SuspenseLayout><ImportDetailPage /></SuspenseLayout>,
          },
          {
            path: '/operations',
            element: <SuspenseLayout><OperationsListPage /></SuspenseLayout>,
          },
          {
            path: '/operations/:id',
            element: <SuspenseLayout><OperationDetailPage /></SuspenseLayout>,
          },

          // ADMIN only routes
          {
            element: <RoleGuard allowedRoles={[Role.ADMIN]} />,
            children: [
              {
                path: '/users',
                element: <SuspenseLayout><UsersListPage /></SuspenseLayout>,
              },
              {
                path: '/audit',
                element: <SuspenseLayout><AuditLogsPage /></SuspenseLayout>,
              },
              {
                path: '/payment-gateways',
                element: <SuspenseLayout><PaymentGatewaysPage /></SuspenseLayout>,
              },
            ],
          },

          // ADMIN + OPERATIONAL routes
          {
            element: <RoleGuard allowedRoles={[Role.ADMIN, Role.OPERATIONAL]} />,
            children: [
              {
                path: '/providers',
                element: <SuspenseLayout><ProvidersPage /></SuspenseLayout>,
              },
            ],
          },
        ],
      },
    ],
  },

  // Default redirect
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },

  // Catch-all 404
  {
    path: '*',
    element: <SuspenseLayout><NotFoundPage /></SuspenseLayout>,
  },
]);
