import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from './utils/routes';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';
import './styles/globals.css';

// 🎯 DETECTAR CONVITE NA URL ANTES DE MONTAR O APP
// Isso garante que funcione mesmo para usuários não logados
(function detectInviteInUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const inviteCode = urlParams.get('invite');

  if (inviteCode) {
    console.log('🔍 [MAIN] Convite detectado na URL, redirecionando:', inviteCode);
    // Redirecionar para página de convite usando hash router
    window.location.href = window.location.pathname + '#/invite/' + inviteCode;
    return; // Evitar que o app monte até o redirecionamento ocorrer
  }
})();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster />
    </AuthProvider>
  </React.StrictMode>,
);