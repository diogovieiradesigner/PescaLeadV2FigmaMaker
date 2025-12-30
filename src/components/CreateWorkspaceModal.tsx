import { useState, useEffect } from 'react';
import { Theme } from '../hooks/useTheme';
import { useAuth } from '../contexts/AuthContext';
import { X, Building2, Loader2, CheckCircle2 } from 'lucide-react';

interface CreateWorkspaceModalProps {
  theme: Theme;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateWorkspaceModal({ theme, isOpen, onClose, onSuccess }: CreateWorkspaceModalProps) {
  const isDark = theme === 'dark';
  const { createWorkspace, refreshWorkspaces, switchWorkspace } = useAuth();
  
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setName('');
      setError('');
      setSuccess(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Digite um nome para o workspace');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      
      // Create workspace (it will be automatically set as current)
      await createWorkspace(name.trim());
      

      setSuccess(true);
      
      // Close modal after success
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('[CREATE WORKSPACE MODAL] ❌ Error:', err);
      setError(err.message || 'Erro ao criar workspace');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div 
        className={`w-full max-w-md rounded-xl shadow-xl ${
          isDark ? 'bg-elevated' : 'bg-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0169D9]/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[#0169D9]" />
            </div>
            <h2 className={`text-lg font-semibold ${
              isDark ? 'text-white' : 'text-text-primary-light'
            }`}>
              Criar Novo Workspace
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors ${
              isDark
                ? 'hover:bg-white/[0.05] text-white/70'
                : 'hover:bg-black/[0.05] text-text-secondary-light'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${
                isDark ? 'text-white' : 'text-text-primary-light'
              }`}>
                Workspace Criado!
              </h3>
              <p className={`text-sm ${
                isDark ? 'text-white/50' : 'text-text-secondary-light'
              }`}>
                Redirecionando...
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-white/70' : 'text-text-secondary-light'
                }`}>
                  Nome do workspace
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Minha Empresa"
                  className={`w-full px-4 py-2.5 rounded-lg border transition-colors focus:outline-none focus:border-[#0169D9] ${
                    isDark
                      ? 'bg-white/[0.05] border-white/[0.08] text-white placeholder-white/40'
                      : 'bg-white border-border-light text-text-primary-light placeholder-text-secondary-light'
                  }`}
                  disabled={isLoading}
                  autoFocus
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              )}

              <div className={`p-4 rounded-lg ${
                isDark ? 'bg-white/[0.02]' : 'bg-gray-50'
              }`}>
                <p className={`text-sm ${
                  isDark ? 'text-white/50' : 'text-text-secondary-light'
                }`}>
                  Você será o <strong className={isDark ? 'text-white' : 'text-text-primary-light'}>owner</strong> deste workspace e poderá convidar outros membros.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className={`flex-1 px-4 py-2.5 rounded-lg transition-colors ${
                    isDark
                      ? 'bg-white/[0.05] hover:bg-white/[0.08] text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-text-primary-light'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !name.trim()}
                  className="flex-1 px-4 py-2.5 bg-[#0169D9] text-white rounded-lg hover:bg-[#0159C9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Building2 className="w-4 h-4" />
                      Criar Workspace
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}