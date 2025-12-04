import { createHashRouter } from 'react-router';
import { lazy, Suspense } from 'react';

// Lazy load para garantir que componentes sejam criados DEPOIS do AuthProvider
const App = lazy(() => import('../App'));
const InvitePage = lazy(() => import('../pages/InvitePage').then(m => ({ default: m.InvitePage })));

// Loading fallback
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-black">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
      <p className="text-zinc-400">Carregando...</p>
    </div>
  </div>
);

export const router = createHashRouter([
  {
    path: '/',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <App />
      </Suspense>
    ),
  },
  {
    path: '/invite/:code',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <InvitePage />
      </Suspense>
    ),
  },
]);