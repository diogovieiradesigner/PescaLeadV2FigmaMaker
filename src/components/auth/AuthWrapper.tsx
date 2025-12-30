import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Theme } from '../../hooks/useTheme';
import { LoginView } from './LoginView';

interface AuthWrapperProps {
  theme: Theme;
  children: React.ReactNode;
}

export function AuthWrapper({ theme, children }: AuthWrapperProps) {
  const { isAuthenticated, isLoading, currentWorkspace, workspaces } = useAuth();

  // Show loading state while checking session
  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark' ? 'bg-true-black' : 'bg-light-bg'
      }`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#0169D9] flex items-center justify-center animate-pulse">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <p className={`text-sm ${
            theme === 'dark' ? 'text-white/50' : 'text-text-secondary-light'
          }`}>
            Carregando...
          </p>
        </div>
      </div>
    );
  }

  // If not authenticated, show login only
  if (!isAuthenticated) {
    return <LoginView theme={theme} />;
  }

  // Log para debug

  // If authenticated, show the app (mesmo sem workspace)
  // A aplicação vai lidar com o caso de não ter workspace
  return <>{children}</>;
}