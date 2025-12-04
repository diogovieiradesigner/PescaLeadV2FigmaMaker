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
  UserPlus,
  Mail,
  Lock,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

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
  const { user, accessToken, refreshWorkspaces, login, signupWithInvite } = useAuth();

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Estados para login/signup
  const [view, setView] = useState<'invite' | 'login' | 'signup'>('invite');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Simple navigation
  const navigate = (path: string) => {
    window.location.hash = path;
  };

  useEffect(() => {
    loadInvite();
  }, [code]);

  // Auto-aceitar convite quando usuário fizer login/cadastro
  useEffect(() => {
    if (user && accessToken && view !== 'invite' && !success) {
      handleAccept();
    }
  }, [user, accessToken]);

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
      toast.error('Você precisa fazer login primeiro');
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
      toast.success('Convite aceito com sucesso!');
      
      // Refresh workspaces
      await refreshWorkspaces();

      // Redirect to new workspace after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao aceitar convite', {
        description: err.message
      });
    } finally {
      setIsAccepting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!email || !password) {
      setAuthError('Por favor, preencha todos os campos');
      return;
    }

    try {
      setAuthLoading(true);
      await login(email, password);
      // O useEffect vai detectar que o usuário está logado e aceitar o convite automaticamente
    } catch (err: any) {
      setAuthError(err.message || 'Erro ao fazer login');
      toast.error('Erro ao fazer login', {
        description: err.message
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!name || !email || !password) {
      setAuthError('Por favor, preencha todos os campos');
      return;
    }

    if (password.length < 6) {
      setAuthError('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      setAuthError('Email inválido');
      return;
    }

    try {
      setAuthLoading(true);
      
      // Verificar se signupWithInvite existe, se não, usar signup normal
      if (signupWithInvite) {
        await signupWithInvite(name.trim(), normalizedEmail, password, code);
      } else {
        toast.error('Função de cadastro com convite não disponível');
        return;
      }
      
      // O useEffect vai detectar que o usuário está logado e aceitar o convite automaticamente
    } catch (err: any) {
      setAuthError(err.message || 'Erro ao criar conta');
      toast.error('Erro ao criar conta', {
        description: err.message
      });
    } finally {
      setAuthLoading(false);
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
        isDark ? 'bg-gradient-to-br from-zinc-950 via-zinc-900 to-black' : 'bg-gradient-to-br from-blue-50 via-white to-blue-100'
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
        isDark ? 'bg-gradient-to-br from-zinc-950 via-zinc-900 to-black' : 'bg-gradient-to-br from-blue-50 via-white to-blue-100'
      }`}>
        <div className={`max-w-md w-full rounded-xl p-8 text-center shadow-2xl ${
          isDark ? 'bg-zinc-900/50 border border-white/[0.08]' : 'bg-white/80 border border-zinc-200'
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
            Ir para Login
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${
        isDark ? 'bg-gradient-to-br from-zinc-950 via-zinc-900 to-black' : 'bg-gradient-to-br from-blue-50 via-white to-blue-100'
      }`}>
        <div className={`max-w-md w-full rounded-xl p-8 text-center shadow-2xl ${
          isDark ? 'bg-zinc-900/50 border border-white/[0.08]' : 'bg-white/80 border border-zinc-200'
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
  const isExpiringSoon = expiresAt.getTime() - Date.now() < 24 * 60 * 60 * 1000;

  // Tela de Login
  if (view === 'login') {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${
        isDark ? 'bg-gradient-to-br from-zinc-950 via-zinc-900 to-black' : 'bg-gradient-to-br from-blue-50 via-white to-blue-100'
      }`}>
        <div className={`max-w-md w-full rounded-xl shadow-2xl overflow-hidden ${
          isDark ? 'bg-zinc-900/50 border border-white/[0.08]' : 'bg-white/80 border border-zinc-200'
        }`}>
          <div className="p-8 border-b border-white/[0.08]">
            <button
              onClick={() => setView('invite')}
              className={`flex items-center gap-2 mb-4 text-sm ${
                isDark ? 'text-white/70 hover:text-white' : 'text-text-secondary-light hover:text-text-primary-light'
              } transition-colors`}
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <h2 className={`text-2xl font-semibold mb-2 ${
              isDark ? 'text-white' : 'text-text-primary-light'
            }`}>
              Fazer Login
            </h2>
            <p className={`text-sm ${
              isDark ? 'text-white/70' : 'text-text-secondary-light'
            }`}>
              Entre para aceitar o convite de <strong>{invite.workspace.name}</strong>
            </p>
          </div>

          <div className="p-8">
            {authError && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-500">{authError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-zinc-300' : 'text-zinc-700'
                }`}>
                  Email
                </label>
                <div className="relative group">
                  <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                    isDark ? 'text-zinc-500 group-focus-within:text-blue-400' : 'text-zinc-400 group-focus-within:text-blue-500'
                  }`} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className={`w-full pl-12 pr-4 py-3.5 rounded-xl border transition-all ${
                      isDark
                        ? 'bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:bg-zinc-800'
                        : 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:shadow-md'
                    } outline-none`}
                    disabled={authLoading}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-zinc-300' : 'text-zinc-700'
                }`}>
                  Senha
                </label>
                <div className="relative group">
                  <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                    isDark ? 'text-zinc-500 group-focus-within:text-blue-400' : 'text-zinc-400 group-focus-within:text-blue-500'
                  }`} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full pl-12 pr-4 py-3.5 rounded-xl border transition-all ${
                      isDark
                        ? 'bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:bg-zinc-800'
                        : 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:shadow-md'
                    } outline-none`}
                    disabled={authLoading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {authLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Entrar e Aceitar Convite
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
              <p className={`text-center text-sm ${
                isDark ? 'text-zinc-400' : 'text-zinc-600'
              }`}>
                Não tem uma conta?{' '}
                <button
                  onClick={() => setView('signup')}
                  className="font-semibold text-blue-600 hover:text-blue-700 transition-all"
                  disabled={authLoading}
                >
                  Criar conta →
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tela de Cadastro
  if (view === 'signup') {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${
        isDark ? 'bg-gradient-to-br from-zinc-950 via-zinc-900 to-black' : 'bg-gradient-to-br from-blue-50 via-white to-blue-100'
      }`}>
        <div className={`max-w-md w-full rounded-xl shadow-2xl overflow-hidden ${
          isDark ? 'bg-zinc-900/50 border border-white/[0.08]' : 'bg-white/80 border border-zinc-200'
        }`}>
          <div className="p-8 border-b border-white/[0.08]">
            <button
              onClick={() => setView('invite')}
              className={`flex items-center gap-2 mb-4 text-sm ${
                isDark ? 'text-white/70 hover:text-white' : 'text-text-secondary-light hover:text-text-primary-light'
              } transition-colors`}
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <h2 className={`text-2xl font-semibold mb-2 ${
              isDark ? 'text-white' : 'text-text-primary-light'
            }`}>
              Criar Conta
            </h2>
            <p className={`text-sm ${
              isDark ? 'text-white/70' : 'text-text-secondary-light'
            }`}>
              Crie sua conta para aceitar o convite de <strong>{invite.workspace.name}</strong>
            </p>
          </div>

          <div className="p-8">
            {authError && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-500">{authError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-zinc-300' : 'text-zinc-700'
                }`}>
                  Nome completo
                </label>
                <div className="relative group">
                  <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                    isDark ? 'text-zinc-500 group-focus-within:text-blue-400' : 'text-zinc-400 group-focus-within:text-blue-500'
                  }`} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className={`w-full pl-12 pr-4 py-3.5 rounded-xl border transition-all ${
                      isDark
                        ? 'bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:bg-zinc-800'
                        : 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:shadow-md'
                    } outline-none`}
                    disabled={authLoading}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-zinc-300' : 'text-zinc-700'
                }`}>
                  Email
                </label>
                <div className="relative group">
                  <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                    isDark ? 'text-zinc-500 group-focus-within:text-blue-400' : 'text-zinc-400 group-focus-within:text-blue-500'
                  }`} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className={`w-full pl-12 pr-4 py-3.5 rounded-xl border transition-all ${
                      isDark
                        ? 'bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:bg-zinc-800'
                        : 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:shadow-md'
                    } outline-none`}
                    disabled={authLoading}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-zinc-300' : 'text-zinc-700'
                }`}>
                  Senha
                </label>
                <div className="relative group">
                  <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                    isDark ? 'text-zinc-500 group-focus-within:text-blue-400' : 'text-zinc-400 group-focus-within:text-blue-500'
                  }`} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full pl-12 pr-4 py-3.5 rounded-xl border transition-all ${
                      isDark
                        ? 'bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:bg-zinc-800'
                        : 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:shadow-md'
                    } outline-none`}
                    disabled={authLoading}
                  />
                </div>
                <p className={`text-xs mt-1 ${
                  isDark ? 'text-zinc-500' : 'text-zinc-500'
                }`}>
                  Mínimo de 6 caracteres
                </p>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {authLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    Criar Conta e Aceitar Convite
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
              <p className={`text-center text-sm ${
                isDark ? 'text-zinc-400' : 'text-zinc-600'
              }`}>
                Já tem uma conta?{' '}
                <button
                  onClick={() => setView('login')}
                  className="font-semibold text-blue-600 hover:text-blue-700 transition-all"
                  disabled={authLoading}
                >
                  Fazer login →
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tela de Convite (default)
  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${
      isDark ? 'bg-gradient-to-br from-zinc-950 via-zinc-900 to-black' : 'bg-gradient-to-br from-blue-50 via-white to-blue-100'
    }`}>
      <div className={`max-w-md w-full rounded-xl shadow-2xl overflow-hidden ${
        isDark ? 'bg-zinc-900/50 border border-white/[0.08]' : 'bg-white/80 border border-zinc-200'
      }`}>
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

        <div className="p-8 space-y-6">
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

          {isExpiringSoon && (
            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-start gap-2">
              <Clock className="w-4 h-4 text-orange-500 mt-0.5" />
              <p className="text-sm text-orange-500">
                Este convite expira em breve ({expiresAt.toLocaleDateString()})
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

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
                  onClick={() => setView('login')}
                  className="w-full px-6 py-3 bg-[#0169D9] text-white rounded-lg hover:bg-[#0159C9] transition-colors flex items-center justify-center gap-2"
                >
                  <LogIn className="w-5 h-5" />
                  Fazer Login e Aceitar
                </button>
                <button
                  onClick={() => setView('signup')}
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
