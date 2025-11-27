import { useState } from 'react';
import { Theme } from '../../hooks/useTheme';
import { useAuth } from '../../contexts/AuthContext';
import { Target, User, Mail, Lock, Briefcase, AlertCircle } from 'lucide-react';
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
  const [emailError, setEmailError] = useState(''); // Erro específico do campo email
  const [fieldErrors, setFieldErrors] = useState({
    name: '',
    email: '',
    password: '',
    workspaceName: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailError(''); // Limpar erro de email
    setFieldErrors({ name: '', email: '', password: '', workspaceName: '' });

    if (!name || !email || !password || !workspaceName) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    // Normalize email (trim e lowercase)
    const normalizedEmail = email.trim().toLowerCase();

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      setFieldErrors(prev => ({ ...prev, email: 'Email inválido. Verifique o formato (exemplo: seu@email.com)' }));
      return;
    }

    console.log('[SIGNUP] Tentando cadastrar:', {
      name: name.trim(),
      email: normalizedEmail,
      workspaceName: workspaceName.trim(),
    });

    try {
      await signup(name.trim(), normalizedEmail, password, workspaceName.trim());
      toast.success('Conta criada com sucesso!');
    } catch (err: any) {
      console.error('[SIGNUP] Erro capturado:', err);
      console.error('[SIGNUP] Erro.message:', err.message);
      
      // Detectar erros específicos de email
      const errorMessage = err.message || 'Erro ao criar conta';
      
      console.log('[SIGNUP-DEBUG] Verificando tipo de erro...');
      console.log('[SIGNUP-DEBUG] errorMessage:', errorMessage);
      console.log('[SIGNUP-DEBUG] Contém "is invalid"?', errorMessage.includes('is invalid'));
      console.log('[SIGNUP-DEBUG] Contém "já está cadastrado"?', errorMessage.includes('já está cadastrado'));
      
      if (errorMessage.includes('already registered') || 
          errorMessage.includes('já está cadastrado') ||
          errorMessage.includes('is invalid')) {
        
        console.log('[SIGNUP-DEBUG] ✅ DETECTADO: Email duplicado/inválido');
        console.log('[SIGNUP-DEBUG] Setando fieldErrors.email');
        
        // Mostrar erro específico abaixo do campo de email
        setFieldErrors(prev => ({ 
          ...prev, 
          email: 'Este email já está cadastrado.' 
        }));
        setEmailError('duplicate');
        
        console.log('[SIGNUP-DEBUG] Estado atualizado. Verifique o campo de email na interface!');
        
        // Toast notification também
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
    <div className={`min-h-screen flex items-center justify-center transition-colors ${
      isDark ? 'bg-true-black' : 'bg-light-bg'
    }`}>
      <div className="w-full max-w-md px-6 py-8">
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
            Criar sua conta
          </h2>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-500 whitespace-pre-line">{error}</p>
                  
                  {/* Botão para trocar para login se email já existe */}
                  {(error.includes('já está cadastrado') || error.includes('já está em uso')) && (
                    <button
                      onClick={onSwitchToLogin}
                      className="mt-3 text-sm text-[#0169D9] hover:underline font-medium"
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
              <label className={`block text-sm mb-2 ${
                isDark ? 'text-white/70' : 'text-text-secondary-light'
              }`}>
                Nome completo
              </label>
              <div className="relative">
                <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                  isDark ? 'text-white/30' : 'text-text-secondary-light'
                }`} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-lg border transition-colors ${
                    isDark
                      ? 'bg-true-black border-white/[0.08] text-white placeholder:text-white/30 focus:border-[#0169D9]'
                      : 'bg-white border-border-light text-text-primary-light placeholder:text-text-secondary-light focus:border-[#0169D9]'
                  } outline-none`}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className={`block text-sm mb-2 ${
                isDark ? 'text-white/70' : 'text-text-secondary-light'
              }`}>
                Email
              </label>
              <div className="relative">
                <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                  fieldErrors.email 
                    ? 'text-red-500' 
                    : isDark ? 'text-white/30' : 'text-text-secondary-light'
                }`} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    // Limpar erro ao digitar
                    if (fieldErrors.email) {
                      setFieldErrors(prev => ({ ...prev, email: '' }));
                      setEmailError('');
                    }
                  }}
                  placeholder="seu@email.com"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-lg border transition-colors ${
                    fieldErrors.email
                      ? 'border-red-500 focus:border-red-500 bg-red-500/5 text-red-500'
                      : isDark
                        ? 'bg-true-black border-white/[0.08] text-white placeholder:text-white/30 focus:border-[#0169D9]'
                        : 'bg-white border-border-light text-text-primary-light placeholder:text-text-secondary-light focus:border-[#0169D9]'
                  } outline-none`}
                  disabled={isLoading}
                />
                {fieldErrors.email && (
                  <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                )}
              </div>
              
              {/* Erro específico do campo email */}
              {fieldErrors.email && (
                <div className="mt-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-red-500">
                        {fieldErrors.email}
                      </p>
                      {emailError === 'duplicate' && (
                        <div className="mt-2 flex flex-col gap-1.5">
                          <button
                            type="button"
                            onClick={onSwitchToLogin}
                            className="text-xs text-[#0169D9] hover:underline font-medium text-left"
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
                  placeholder="Mínimo 6 caracteres"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-lg border transition-colors ${
                    isDark
                      ? 'bg-true-black border-white/[0.08] text-white placeholder:text-white/30 focus:border-[#0169D9]'
                      : 'bg-white border-border-light text-text-primary-light placeholder:text-text-secondary-light focus:border-[#0169D9]'
                  } outline-none`}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Workspace Name */}
            <div>
              <label className={`block text-sm mb-2 ${
                isDark ? 'text-white/70' : 'text-text-secondary-light'
              }`}>
                Nome do workspace
              </label>
              <div className="relative">
                <Briefcase className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                  isDark ? 'text-white/30' : 'text-text-secondary-light'
                }`} />
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="Minha Empresa"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-lg border transition-colors ${
                    isDark
                      ? 'bg-true-black border-white/[0.08] text-white placeholder:text-white/30 focus:border-[#0169D9]'
                      : 'bg-white border-border-light text-text-primary-light placeholder:text-text-secondary-light focus:border-[#0169D9]'
                  } outline-none`}
                  disabled={isLoading}
                />
              </div>
              <p className={`text-xs mt-1.5 ${
                isDark ? 'text-white/40' : 'text-text-secondary-light'
              }`}>
                Você poderá criar mais workspaces depois
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg bg-[#0169D9] hover:bg-[#0169D9]/90 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {isLoading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>

          {/* Switch to Login */}
          <div className="mt-6 text-center">
            <p className={`text-sm ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
              Já tem uma conta?{' '}
              <button
                onClick={onSwitchToLogin}
                className="text-[#0169D9] hover:underline"
                disabled={isLoading}
              >
                Fazer login
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}