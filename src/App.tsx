import { RouterProvider } from 'react-router-dom';
import { router } from '@/app/router';
import { AppErrorBoundary } from '@/app/ErrorBoundary';
import { AuthInitializer } from '@/app/AuthInitializer';

function App() {
  return (
    <AppErrorBoundary>
      <AuthInitializer>
        <RouterProvider router={router} />
      </AuthInitializer>
    </AppErrorBoundary>
  );
}

export default App;
