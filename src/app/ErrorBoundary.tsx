import { ErrorBoundary } from '@/components/common';

/**
 * Global error boundary that wraps the entire application.
 * Catches unhandled React rendering errors and displays a user-friendly fallback.
 */
export function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
