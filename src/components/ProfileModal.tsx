import { useState } from 'react';
import { X, User, Lock, Mail, Save, Loader2, Phone } from 'lucide-react';
import { Theme } from '../hooks/useTheme';
import { useAuth } from '../contexts/AuthContext';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
}

export function ProfileModal({ isOpen, onClose, theme }: ProfileModalProps) {
  const isDark = theme === 'dark';
  const { user, updateProfile, updatePassword } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'info' | 'security'>('info');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Format phone number to Brazilian format (XX) XXXXX-XXXX
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Apply Brazilian phone format
    if (digits.length <= 2) {
      return digits;
    } else if (digits.length <= 7) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    } else if (digits.length <= 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    } else {
      // Limit to 11 digits
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    }
  };

  // Info form state - format initial phone value
  const [name, setName] = useState(user?.name || '');
  const [email] = useState(user?.email || ''); // Email não pode ser editado
  const [phone, setPhone] = useState(user?.phone ? formatPhoneNumber(user.phone) : '');

  // Security form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  if (!isOpen || !user) return null;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  // Validate phone number (must have 10 or 11 digits)
  const validatePhone = (phoneNumber: string): boolean => {
    if (!phoneNumber) return true; // Phone is optional
    const digits = phoneNumber.replace(/\D/g, '');
    return digits.length === 10 || digits.length === 11;
  };

  // Get user initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const initials = getInitials(user.name);

  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    // Validate phone
    if (!validatePhone(phone)) {
      setErrorMessage('Telefone inválido. Use o formato (XX) XXXXX-XXXX');
      setIsLoading(false);
      return;
    }

    try {
      // Remove formatting from phone before saving
      const cleanPhone = phone.replace(/\D/g, '');
      await updateProfile({ name, phone: cleanPhone || undefined });
      setSuccessMessage('Perfil atualizado com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setErrorMessage(error.message || 'Erro ao atualizar perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    // Validations
    if (newPassword.length < 6) {
      setErrorMessage('A nova senha deve ter no mínimo 6 caracteres');
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('As senhas não coincidem');
      setIsLoading(false);
      return;
    }

    try {
      await updatePassword(currentPassword, newPassword);
      setSuccessMessage('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setErrorMessage(error.message || 'Erro ao alterar senha');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal - Fundo preto 100% opaco */}
      <div className="relative w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden bg-black opacity-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">
            Meu Perfil
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/[0.05] text-white/70 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Avatar Section */}
        <div className="px-6 py-6 border-b border-white/[0.08]">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-[#0169D9] flex items-center justify-center">
              <span className="text-white text-2xl font-medium">{initials}</span>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">
                {user.name}
              </h3>
              <p className="text-sm text-white/50">
                {user.email}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-white/[0.08]">
          <div className="flex gap-6">
            <button
              onClick={() => {
                setActiveTab('info');
                setSuccessMessage('');
                setErrorMessage('');
              }}
              className={`py-3 px-1 border-b-2 transition-colors ${
                activeTab === 'info'
                  ? 'border-[#0169D9] text-[#0169D9]'
                  : 'border-transparent text-white/50 hover:text-white/70'
              }`}
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">Informações Pessoais</span>
              </div>
            </button>
            <button
              onClick={() => {
                setActiveTab('security');
                setSuccessMessage('');
                setErrorMessage('');
              }}
              className={`py-3 px-1 border-b-2 transition-colors ${
                activeTab === 'security'
                  ? 'border-[#0169D9] text-[#0169D9]'
                  : 'border-transparent text-white/50 hover:text-white/70'
              }`}
            >
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span className="text-sm font-medium">Segurança</span>
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* Success/Error Messages */}
          {successMessage && (
            <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-sm text-green-500">{successMessage}</p>
            </div>
          )}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-500">{errorMessage}</p>
            </div>
          )}

          {/* Info Tab */}
          {activeTab === 'info' && (
            <form onSubmit={handleUpdateInfo} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-white/70' : 'text-text-secondary-light'
                }`}>
                  Nome completo
                </label>
                <div className="relative">
                  <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                    isDark ? 'text-white/50' : 'text-text-secondary-light'
                  }`} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg border transition-colors focus:outline-none focus:border-[#0169D9] ${
                      isDark
                        ? 'bg-white/[0.05] border-white/[0.08] text-white placeholder-white/40'
                        : 'bg-light-elevated border-border-light text-text-primary-light placeholder-text-secondary-light'
                    }`}
                    placeholder="Digite seu nome completo"
                    required
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-white/70' : 'text-text-secondary-light'
                }`}>
                  Email
                </label>
                <div className="relative">
                  <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                    isDark ? 'text-white/50' : 'text-text-secondary-light'
                  }`} />
                  <input
                    type="email"
                    value={email}
                    disabled
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg border transition-colors cursor-not-allowed ${
                      isDark
                        ? 'bg-white/[0.02] border-white/[0.08] text-white/50'
                        : 'bg-gray-50 border-border-light text-text-secondary-light'
                    }`}
                  />
                </div>
                <p className={`text-xs mt-1 ${
                  isDark ? 'text-white/40' : 'text-text-secondary-light'
                }`}>
                  O email não pode ser alterado
                </p>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-white/70' : 'text-text-secondary-light'
                }`}>
                  Telefone
                </label>
                <div className="relative">
                  <Phone className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                    isDark ? 'text-white/50' : 'text-text-secondary-light'
                  }`} />
                  <input
                    type="text"
                    value={phone}
                    onChange={handlePhoneChange}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg border transition-colors focus:outline-none focus:border-[#0169D9] ${
                      isDark
                        ? 'bg-white/[0.05] border-white/[0.08] text-white placeholder-white/40'
                        : 'bg-light-elevated border-border-light text-text-primary-light placeholder-text-secondary-light'
                    }`}
                    placeholder="Digite seu telefone (XX) XXXXX-XXXX"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={isLoading || (name === user.name && phone === (user.phone ? formatPhoneNumber(user.phone) : ''))}
                  className="px-6 py-2.5 bg-[#0169D9] text-white rounded-lg hover:bg-[#0159C9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Salvar alterações
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-white/70' : 'text-text-secondary-light'
                }`}>
                  Senha atual
                </label>
                <div className="relative">
                  <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                    isDark ? 'text-white/50' : 'text-text-secondary-light'
                  }`} />
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg border transition-colors focus:outline-none focus:border-[#0169D9] ${
                      isDark
                        ? 'bg-white/[0.05] border-white/[0.08] text-white placeholder-white/40'
                        : 'bg-light-elevated border-border-light text-text-primary-light placeholder-text-secondary-light'
                    }`}
                    placeholder="Digite sua senha atual"
                    required
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-white/70' : 'text-text-secondary-light'
                }`}>
                  Nova senha
                </label>
                <div className="relative">
                  <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                    isDark ? 'text-white/50' : 'text-text-secondary-light'
                  }`} />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg border transition-colors focus:outline-none focus:border-[#0169D9] ${
                      isDark
                        ? 'bg-white/[0.05] border-white/[0.08] text-white placeholder-white/40'
                        : 'bg-light-elevated border-border-light text-text-primary-light placeholder-text-secondary-light'
                    }`}
                    placeholder="Digite sua nova senha (mín. 6 caracteres)"
                    required
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-white/70' : 'text-text-secondary-light'
                }`}>
                  Confirmar nova senha
                </label>
                <div className="relative">
                  <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                    isDark ? 'text-white/50' : 'text-text-secondary-light'
                  }`} />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg border transition-colors focus:outline-none focus:border-[#0169D9] ${
                      isDark
                        ? 'bg-white/[0.05] border-white/[0.08] text-white placeholder-white/40'
                        : 'bg-light-elevated border-border-light text-text-primary-light placeholder-text-secondary-light'
                    }`}
                    placeholder="Confirme sua nova senha"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 bg-[#0169D9] text-white rounded-lg hover:bg-[#0159C9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Alterando...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Alterar senha
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}