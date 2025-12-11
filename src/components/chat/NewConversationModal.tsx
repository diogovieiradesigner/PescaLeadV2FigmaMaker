import { useState } from 'react';
import { X, Phone } from 'lucide-react';
import { Theme } from '../../hooks/useTheme';

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateConversation: (phoneNumber: string) => Promise<void>;
  theme: Theme;
}

export function NewConversationModal({
  isOpen,
  onClose,
  onCreateConversation,
  theme,
}: NewConversationModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDark = theme === 'dark';

  if (!isOpen) return null;

  const formatPhoneNumber = (value: string) => {
    // Remove tudo exceto números
    const numbers = value.replace(/\D/g, '');
    return numbers;
  };

  const validatePhoneNumber = (phone: string): boolean => {
    // Remove caracteres não numéricos
    const numbers = phone.replace(/\D/g, '');
    
    // Validação básica: aceita números com 10-13 dígitos
    // 10-11: celular BR sem DDI
    // 12-13: celular BR com DDI (55)
    return numbers.length >= 10 && numbers.length <= 15;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanNumber = formatPhoneNumber(phoneNumber);

    if (!validatePhoneNumber(cleanNumber)) {
      setError('Número de telefone inválido. Digite um número válido (ex: 11999999999 ou 5511999999999)');
      return;
    }

    try {
      setIsCreating(true);
      await onCreateConversation(cleanNumber);
      setPhoneNumber('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conversa');
    } finally {
      setIsCreating(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-md mx-4 rounded-2xl shadow-2xl bg-black border border-white/[0.08]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <h2 className="text-lg text-white">
            Nova Conversa
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg transition-colors hover:bg-white/[0.08] text-white/70 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <label
              htmlFor="phone"
              className="block text-sm mb-2 text-white/70"
            >
              Número de Telefone
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                id="phone"
                type="text"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  setError(null);
                }}
                placeholder="Ex: 11999999999 ou 5511999999999"
                className={`w-full pl-10 pr-4 py-3 rounded-lg border transition-all focus:outline-none focus:border-[#0169D9] bg-true-black border-white/[0.08] text-white placeholder-white/40 ${
                  error ? 'border-red-500' : ''
                }`}
                autoFocus
                disabled={isCreating}
              />
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-500">{error}</p>
            )}
            <p className="mt-2 text-xs text-white/50">
              Digite o número com DDD (ex: 11999999999) ou com código do país (ex: 5511999999999)
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="flex-1 px-4 py-2.5 rounded-lg transition-colors bg-white/[0.08] hover:bg-white/[0.12] text-white disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isCreating || !phoneNumber.trim()}
              className="flex-1 px-4 py-2.5 bg-[#0169D9] hover:bg-[#0156b8] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Criando...
                </>
              ) : (
                'Criar Conversa'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}