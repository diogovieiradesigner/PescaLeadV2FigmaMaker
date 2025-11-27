import { useState } from 'react';
import { Theme } from '../../hooks/useTheme';
import { useAuth } from '../../contexts/AuthContext';
import { Target, Mail, Lock, AlertCircle } from 'lucide-react';
import IconografiaPescaLead from '../../imports/IconografiaPescaLead';

interface LoginViewProps {
  theme: Theme;
  onSwitchToSignup: () => void;
}

export function LoginView({ theme, onSwitchToSignup }: LoginViewProps) {
  const isDark = theme === 'dark';
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center transition-colors ${
      isDark ? 'bg-true-black' : 'bg-light-bg'
    }`}>
      <div className="w-full max-w-md px-6">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12">
              <IconografiaPescaLead />
            </div>
            <div>
              <h1 className={`text-2xl ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                Pesca Lead
              </h1>
              <p className={`text-sm ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                Gestão de Vendas
              </p>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className={`rounded-xl border p-8 ${
          isDark 
            ? 'bg-elevated border-white/[0.08]' 
            : 'bg-light-elevated border-border-light'
        }`}>
          <h2 className={`text-xl mb-6 text-center ${
            isDark ? 'text-white' : 'text-text-primary-light'
          }`}>
            Entrar na sua conta
          </h2>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className={`block text-sm mb-2 ${
                isDark ? 'text-white/70' : 'text-text-secondary-light'
              }`}>
                Email
              </label>
              <div className="relative">
                <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                  isDark ? 'text-white/30' : 'text-text-secondary-light'
                }`} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-lg border transition-colors ${
                    isDark
                      ? 'bg-true-black border-white/[0.08] text-white placeholder:text-white/30 focus:border-[#0169D9]'
                      : 'bg-white border-border-light text-text-primary-light placeholder:text-text-secondary-light focus:border-[#0169D9]'
                  } outline-none`}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className={`block text-sm mb-2 ${
                isDark ? 'text-white/70' : 'text-text-secondary-light'
              }`}>
                Senha
              </label>
              <div className="relative">
                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                  isDark ? 'text-white/30' : 'text-text-secondary-light'
                }`} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-lg border transition-colors ${
                    isDark
                      ? 'bg-true-black border-white/[0.08] text-white placeholder:text-white/30 focus:border-[#0169D9]'
                      : 'bg-white border-border-light text-text-primary-light placeholder:text-text-secondary-light focus:border-[#0169D9]'
                  } outline-none`}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg bg-[#0169D9] hover:bg-[#0169D9]/90 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          {/* Switch to Signup */}
          <div className="mt-6 text-center">
            <p className={`text-sm ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
              Não tem uma conta?{' '}
              <button
                onClick={onSwitchToSignup}
                className="text-[#0169D9] hover:underline"
                disabled={isLoading}
              >
                Criar conta
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
