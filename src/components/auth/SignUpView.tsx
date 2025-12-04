import { useState } from 'react';
import { Theme } from '../../hooks/useTheme';
import { useAuth } from '../../contexts/AuthContext';
import { Target, User, Mail, Lock, Briefcase, AlertCircle, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import IconografiaPescaLead from '../../imports/IconografiaPescaLead';

interface SignUpViewProps {
  theme: Theme;
  onSwitchToLogin: () => void;
}

export function SignUpView({ theme, onSwitchToLogin }: SignUpViewProps) {
  const isDark = theme === 'dark';
  const { signup, isLoading } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({
    name: '',
    email: '',
    password: '',
    workspaceName: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailError('');
    setFieldErrors({ name: '', email: '', password: '', workspaceName: '' });

    if (!name || !email || !password || !workspaceName) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    if (password.length < 6) {
      setFieldErrors(prev => ({ ...prev, password: 'A senha deve ter no mínimo 6 caracteres' }));
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      setFieldErrors(prev => ({ ...prev, email: 'Email inválido. Verifique o formato (exemplo: seu@email.com)' }));
      return;
    }

    try {
      await signup(name.trim(), normalizedEmail, password, workspaceName.trim());
      toast.success('Conta criada com sucesso!');
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao criar conta';
      
      if (errorMessage.includes('already registered') || 
          errorMessage.includes('já está cadastrado') ||
          errorMessage.includes('is invalid')) {
        setFieldErrors(prev => ({ 
          ...prev, 
          email: 'Este email já está cadastrado.' 
        }));
        setEmailError('duplicate');
        toast.error('Este email já está cadastrado', {
          description: 'Faça login ou use um email diferente'
        });
      } else if (errorMessage.includes('Email not confirmed')) {
        setError('Por favor, desabilite a confirmação de email no Supabase Dashboard (Authentication > Settings > Email > desmarque "Enable email confirmations")');
        toast.error('Email não confirmado');
      } else {
        setError(errorMessage);
        toast.error('Erro ao criar conta');
      }
    }
  };

  return (
    <div className={`min-h-screen flex transition-colors ${
      isDark ? 'bg-gradient-to-br from-zinc-950 via-zinc-900 to-black' : 'bg-gradient-to-br from-blue-50 via-white to-blue-100'
    }`}>
      {/* Painel Esquerdo - Branding */}
      <div className={`hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 relative overflow-hidden ${
        isDark ? 'bg-black' : 'bg-gradient-to-br from-blue-600 to-blue-700'
      }`}>
        {/* Conteúdo */}
        <div className="relative z-10 max-w-lg text-center">
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 text-white/90">
              <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-center">
                <p className="font-semibold">Configuração em 2 minutos</p>
                <p className="text-sm text-white/70">Sem cartão de crédito necessário</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3 text-white/90">
              <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="text-center">
                <p className="font-semibold">IA Integrada</p>
                <p className="text-sm text-white/70">Agentes inteligentes desde o dia 1</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3 text-white/90">
              <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <div className="text-center">
                <p className="font-semibold">Suporte Dedicado</p>
                <p className="text-sm text-white/70">Equipe pronta para ajudar</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Painel Direito - Formulário */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Logo Mobile */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12">
                <IconografiaPescaLead />
              </div>
              <div>
                <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  Pesca Lead
                </h1>
                <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  Gestão de Vendas
                </p>
              </div>
            </div>
          </div>

          {/* Card de Cadastro */}
          <div className={`rounded-2xl border backdrop-blur-sm p-8 shadow-2xl ${
            isDark 
              ? 'bg-zinc-900/50 border-white/[0.08]' 
              : 'bg-white/80 border-zinc-200'
          }`}>
            <div className="mb-8">
              <h2 className={`text-2xl font-bold mb-2 ${
                isDark ? 'text-white' : 'text-zinc-900'
              }`}>
                Crie sua conta 🚀
              </h2>
              <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                Preencha os dados abaixo para começar
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-500 whitespace-pre-line">{error}</p>
                    {(error.includes('já está cadastrado') || error.includes('já está em uso')) && (
                      <button
                        onClick={onSwitchToLogin}
                        className="mt-3 text-sm text-blue-500 hover:underline font-medium"
                      >
                        → Ir para tela de login
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
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
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-zinc-300' : 'text-zinc-700'
                }`}>
                  Email
                </label>
                <div className="relative group">
                  <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                    fieldErrors.email 
                      ? 'text-red-500' 
                      : isDark ? 'text-zinc-500 group-focus-within:text-blue-400' : 'text-zinc-400 group-focus-within:text-blue-500'
                  }`} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) {
                        setFieldErrors(prev => ({ ...prev, email: '' }));
                        setEmailError('');
                      }
                    }}
                    placeholder="seu@email.com"
                    className={`w-full pl-12 pr-12 py-3.5 rounded-xl border transition-all ${
                      fieldErrors.email
                        ? 'border-red-500 focus:border-red-500 bg-red-500/5'
                        : isDark
                          ? 'bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:bg-zinc-800'
                          : 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:shadow-md'
                    } outline-none`}
                    disabled={isLoading}
                  />
                  {fieldErrors.email && (
                    <AlertCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
                  )}
                </div>
                
                {fieldErrors.email && (
                  <div className="mt-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-red-500">{fieldErrors.email}</p>
                        {emailError === 'duplicate' && (
                          <div className="mt-2 flex flex-col gap-1.5">
                            <button
                              type="button"
                              onClick={onSwitchToLogin}
                              className="text-xs text-blue-500 hover:underline font-medium text-left"
                            >
                              → Fazer login com este email
                            </button>
                            <p className="text-xs text-red-400">
                              ou use um email diferente para criar nova conta
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Password */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-zinc-300' : 'text-zinc-700'
                }`}>
                  Senha
                </label>
                <div className="relative group">
                  <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                    fieldErrors.password
                      ? 'text-red-500'
                      : isDark ? 'text-zinc-500 group-focus-within:text-blue-400' : 'text-zinc-400 group-focus-within:text-blue-500'
                  }`} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) {
                        setFieldErrors(prev => ({ ...prev, password: '' }));
                      }
                    }}
                    placeholder="Mínimo 6 caracteres"
                    className={`w-full pl-12 pr-4 py-3.5 rounded-xl border transition-all ${
                      fieldErrors.password
                        ? 'border-red-500 focus:border-red-500 bg-red-500/5'
                        : isDark
                          ? 'bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:bg-zinc-800'
                          : 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:shadow-md'
                    } outline-none`}
                    disabled={isLoading}
                  />
                </div>
                {fieldErrors.password && (
                  <p className="mt-2 text-xs text-red-500">{fieldErrors.password}</p>
                )}
              </div>

              {/* Workspace Name */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-zinc-300' : 'text-zinc-700'
                }`}>
                  Nome do workspace
                </label>
                <div className="relative group">
                  <Briefcase className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                    isDark ? 'text-zinc-500 group-focus-within:text-blue-400' : 'text-zinc-400 group-focus-within:text-blue-500'
                  }`} />
                  <input
                    type="text"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="Minha Empresa"
                    className={`w-full pl-12 pr-4 py-3.5 rounded-xl border transition-all ${
                      isDark
                        ? 'bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:bg-zinc-800'
                        : 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:shadow-md'
                    } outline-none`}
                    disabled={isLoading}
                  />
                </div>
                <p className={`text-xs mt-1.5 ${
                  isDark ? 'text-zinc-500' : 'text-zinc-500'
                }`}>
                  Você poderá criar mais workspaces depois
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg flex items-center justify-center gap-2 group mt-6"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  <>
                    Criar conta grátis
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Switch to Login */}
            <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800">
              <p className={`text-center text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                Já tem uma conta?{' '}
                <button
                  onClick={onSwitchToLogin}
                  className="font-semibold text-blue-600 hover:text-blue-700 transition-all"
                  disabled={isLoading}
                >
                  Fazer login →
                </button>
              </p>
            </div>
          </div>

          {/* Footer */}
          <p className={`text-center text-xs mt-6 ${isDark ? 'text-zinc-600' : 'text-zinc-500'}`}>
            © 2024 Pesca Lead. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}