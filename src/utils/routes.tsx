import { createHashRouter, Outlet } from 'react-router';
import App from '../App';
import { InvitePage } from '../pages/InvitePage';
import { AuthProvider } from '../contexts/AuthContext';

// Layout wrapper que fornece o AuthProvider para todas as rotas
function AuthLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

export const router = createHashRouter([
  {
    element: <AuthLayout />,
    children: [
      {
        path: '/',
        element: <App />,
      },
      {
        path: '/invite/:code',
        element: <InvitePage />,
      },
    ],
  },
]);