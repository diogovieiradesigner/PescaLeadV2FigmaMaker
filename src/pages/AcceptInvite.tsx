import { useState, useEffect } from 'react';
import { Theme } from '../hooks/useTheme';
import { useAuth } from '../contexts/AuthContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { 
  Building2, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Clock,
  Shield,
  User,
  LogIn,
  UserPlus
} from 'lucide-react';

interface AcceptInviteProps {
  theme: Theme;
  code: string;
}

interface InviteDetails {
  code: string;
  role: string;
  workspace: {
    id: string;
    name: string;
  };
  inviter: {
    name: string;
  };
  expires_at: string;
}

export default function AcceptInvite({ theme, code }: AcceptInviteProps) {
  const isDark = theme === 'dark';
  const { user, accessToken, refreshWorkspaces } = useAuth();

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Simple navigation
  const navigate = (path: string) => {
    window.location.hash = path;
  };

  useEffect(() => {
    loadInvite();
  }, [code]);

  const loadInvite = async () => {
    try {
      setIsLoading(true);
      setError('');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e4f9d774/invites/${code}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Convite inválido');
      }

      setInvite(data.invite);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!user || !accessToken) {
      // Redirect to login with invite code
      navigate(`/login?invite=${code}`);
      return;
    }

    try {
      setIsAccepting(true);
      setError('');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e4f9d774/invites/${code}/accept`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao aceitar convite');
      }

      setSuccess(true);
      
      // Refresh workspaces
      await refreshWorkspaces();

      // Redirect to new workspace after 2 seconds
      setTimeout(() => {
        if (data.workspace?.slug) {
          navigate(`/${data.workspace.slug}`);
        } else {
          navigate('/');
        }
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAccepting(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'member':
        return 'Membro';
      case 'viewer':
        return 'Visualizador';
      default:
        return role;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return Shield;
      case 'member':
        return User;
      case 'viewer':
        return User;
      default:
        return User;
    }
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDark ? 'bg-app-dark' : 'bg-background-light'
      }`}>
        <div className="text-center">
          <Loader2 className={`w-8 h-8 animate-spin mx-auto mb-4 ${
            isDark ? 'text-white/70' : 'text-text-secondary-light'
          }`} />
          <p className={isDark ? 'text-white/70' : 'text-text-secondary-light'}>
            Carregando convite...
          </p>
        </div>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${
        isDark ? 'bg-app-dark' : 'bg-background-light'
      }`}>
        <div className={`max-w-md w-full rounded-xl p-8 text-center ${
          isDark ? 'bg-elevated' : 'bg-white'
        }`}>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className={`text-xl font-semibold mb-2 ${
            isDark ? 'text-white' : 'text-text-primary-light'
          }`}>
            Convite Inválido
          </h2>
          <p className={`mb-6 ${
            isDark ? 'text-white/70' : 'text-text-secondary-light'
          }`}>
            {error}
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2.5 bg-[#0169D9] text-white rounded-lg hover:bg-[#0159C9] transition-colors"
          >
            Ir para Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${
        isDark ? 'bg-app-dark' : 'bg-background-light'
      }`}>
        <div className={`max-w-md w-full rounded-xl p-8 text-center ${
          isDark ? 'bg-elevated' : 'bg-white'
        }`}>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h2 className={`text-xl font-semibold mb-2 ${
            isDark ? 'text-white' : 'text-text-primary-light'
          }`}>
            Convite Aceito!
          </h2>
          <p className={`mb-2 ${
            isDark ? 'text-white/70' : 'text-text-secondary-light'
          }`}>
            Você foi adicionado ao workspace <strong>{invite?.workspace.name}</strong>
          </p>
          <p className={`text-sm ${
            isDark ? 'text-white/50' : 'text-text-secondary-light'
          }`}>
            Redirecionando...
          </p>
        </div>
      </div>
    );
  }

  if (!invite) return null;

  const RoleIcon = getRoleIcon(invite.role);
  const expiresAt = new Date(invite.expires_at);
  const isExpiringSoon = expiresAt.getTime() - Date.now() < 24 * 60 * 60 * 1000; // Less than 24h

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${
      isDark ? 'bg-app-dark' : 'bg-background-light'
    }`}>
      <div className={`max-w-md w-full rounded-xl shadow-xl overflow-hidden ${
        isDark ? 'bg-elevated' : 'bg-white'
      }`}>
        {/* Header */}
        <div className="p-8 text-center border-b border-white/[0.08]">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#0169D9]/10 flex items-center justify-center">
            <Building2 className="w-8 h-8 text-[#0169D9]" />
          </div>
          <h1 className={`text-2xl font-semibold mb-2 ${
            isDark ? 'text-white' : 'text-text-primary-light'
          }`}>
            Convite para Workspace
          </h1>
          <p className={isDark ? 'text-white/70' : 'text-text-secondary-light'}>
            Você foi convidado para participar de um workspace
          </p>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Workspace Info */}
          <div className={`p-4 rounded-lg border ${
            isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-gray-50 border-border-light'
          }`}>
            <div className="flex items-start gap-3">
              <Building2 className={`w-5 h-5 mt-0.5 ${
                isDark ? 'text-white/50' : 'text-text-secondary-light'
              }`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium mb-1 ${
                  isDark ? 'text-white/50' : 'text-text-secondary-light'
                }`}>
                  Workspace
                </p>
                <p className={`font-semibold ${
                  isDark ? 'text-white' : 'text-text-primary-light'
                }`}>
                  {invite.workspace.name}
                </p>
              </div>
            </div>
          </div>

          {/* Role Info */}
          <div className={`p-4 rounded-lg border ${
            isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-gray-50 border-border-light'
          }`}>
            <div className="flex items-start gap-3">
              <RoleIcon className={`w-5 h-5 mt-0.5 ${
                isDark ? 'text-white/50' : 'text-text-secondary-light'
              }`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium mb-1 ${
                  isDark ? 'text-white/50' : 'text-text-secondary-light'
                }`}>
                  Sua função
                </p>
                <p className={`font-semibold ${
                  isDark ? 'text-white' : 'text-text-primary-light'
                }`}>
                  {getRoleLabel(invite.role)}
                </p>
              </div>
            </div>
          </div>

          {/* Inviter Info */}
          <div className={`p-4 rounded-lg border ${
            isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-gray-50 border-border-light'
          }`}>
            <div className="flex items-start gap-3">
              <User className={`w-5 h-5 mt-0.5 ${
                isDark ? 'text-white/50' : 'text-text-secondary-light'
              }`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium mb-1 ${
                  isDark ? 'text-white/50' : 'text-text-secondary-light'
                }`}>
                  Convidado por
                </p>
                <p className={`font-semibold ${
                  isDark ? 'text-white' : 'text-text-primary-light'
                }`}>
                  {invite.inviter.name}
                </p>
              </div>
            </div>
          </div>

          {/* Expiration Warning */}
          {isExpiringSoon && (
            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-start gap-2">
              <Clock className="w-4 h-4 text-orange-500 mt-0.5" />
              <p className="text-sm text-orange-500">
                Este convite expira em breve ({expiresAt.toLocaleDateString()})
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {user ? (
              <button
                onClick={handleAccept}
                disabled={isAccepting}
                className="w-full px-6 py-3 bg-[#0169D9] text-white rounded-lg hover:bg-[#0159C9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isAccepting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Aceitando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Aceitar Convite
                  </>
                )}
              </button>
            ) : (
              <>
                <button
                  onClick={handleAccept}
                  className="w-full px-6 py-3 bg-[#0169D9] text-white rounded-lg hover:bg-[#0159C9] transition-colors flex items-center justify-center gap-2"
                >
                  <LogIn className="w-5 h-5" />
                  Fazer Login e Aceitar
                </button>
                <button
                  onClick={() => navigate(`/signup?invite=${code}`)}
                  className={`w-full px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                    isDark
                      ? 'bg-white/[0.05] hover:bg-white/[0.08] text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-text-primary-light'
                  }`}
                >
                  <UserPlus className="w-5 h-5" />
                  Criar Conta e Aceitar
                </button>
              </>
            )}
            
            <button
              onClick={() => navigate('/')}
              className={`w-full px-6 py-3 rounded-lg transition-colors ${
                isDark
                  ? 'hover:bg-white/[0.05] text-white/70'
                  : 'hover:bg-black/[0.05] text-text-secondary-light'
              }`}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}