import { useState } from 'react';
import { Theme } from '../../hooks/useTheme';
import { useAuth } from '../../contexts/AuthContext';
import { Target, Mail, Lock, AlertCircle, ArrowRight, Sparkles, BarChart3, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import IconografiaPescaLead from '../../imports/IconografiaPescaLead';

interface LoginViewProps {
  theme: Theme;
}

export function LoginView({ theme }: LoginViewProps) {
  const isDark = theme === 'dark';
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    try {
      await login(email, password);
      toast.success('Login realizado com sucesso!');
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao fazer login';
      setError(errorMessage);
      
      // ✅ Exibir toast de erro
      if (errorMessage.includes('Email ou senha incorretos')) {
        toast.error('Email ou senha incorretos', {
          description: 'Verifique suas credenciais e tente novamente'
        });
      } else {
        toast.error('Erro ao fazer login', {
          description: errorMessage
        });
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
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="text-center">
                <p className="font-semibold">Agentes de IA</p>
                <p className="text-sm text-white/70">Automatize atendimentos e qualificações</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3 text-white/90">
              <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <div className="text-center">
                <p className="font-semibold">Funis Personalizados</p>
                <p className="text-sm text-white/70">Gerencie pipelines com flexibilidade</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3 text-white/90">
              <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div className="text-center">
                <p className="font-semibold">Dashboards Inteligentes</p>
                <p className="text-sm text-white/70">Analytics em tempo real</p>
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

          {/* Card de Login */}
          <div className={`rounded-2xl border backdrop-blur-sm p-8 shadow-2xl ${
            isDark 
              ? 'bg-zinc-900/50 border-white/[0.08]' 
              : 'bg-white/80 border-zinc-200'
          }`}>
            <div className="mb-8">
              <h2 className={`text-2xl font-bold mb-2 ${
                isDark ? 'text-white' : 'text-zinc-900'
              }`}>
                Bem-vindo de volta! 👋 <span className="text-[#0169D9]">02</span>
              </h2>
              <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                Entre com suas credenciais para continuar
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
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
                    disabled={isLoading}
                  />
                </div>
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
                    isDark ? 'text-zinc-500 group-focus-within:text-blue-400' : 'text-zinc-400 group-focus-within:text-blue-500'
                  }`} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full pl-12 pr-4 py-3.5 rounded-xl border transition-all ${
                      isDark
                        ? 'bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:bg-zinc-800'
                        : 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:shadow-md'
                    } outline-none`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 text-zinc-500 group-focus-within:text-blue-400" />
                    ) : (
                      <Eye className="w-5 h-5 text-zinc-500 group-focus-within:text-blue-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg flex items-center justify-center gap-2 group"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    Entrar
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
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