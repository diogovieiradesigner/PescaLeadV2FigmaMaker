import { useState } from 'react';
import { Mail, AlertCircle, Loader2, X } from 'lucide-react';
import { Theme } from '../hooks/useTheme';
import { inviteMemberByEmail } from '../services/teamService';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  workspaceId: string;
  onSuccess?: (member: any) => void;
}

export function InviteMemberModal({ 
  isOpen, 
  onClose, 
  theme, 
  workspaceId, 
  onSuccess 
}: InviteMemberModalProps) {
  const isDark = theme === 'dark';
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    console.log('[INVITE-MODAL] Form submitted:', { email, role, workspaceId });

    try {
      console.log('[INVITE-MODAL] Calling inviteMemberByEmail...');
      const result = await inviteMemberByEmail(workspaceId, email, role);
      console.log('[INVITE-MODAL] Invite successful:', result);
      
      // Show success message
      if (onSuccess) {
        console.log('[INVITE-MODAL] Calling onSuccess callback');
        onSuccess(result.member);
      }
      
      // Close modal and reset
      console.log('[INVITE-MODAL] Closing modal');
      handleClose();
    } catch (err: any) {
      console.error('[INVITE-MODAL] Error caught:', err);
      console.error('[INVITE-MODAL] Error code:', err.code);
      console.error('[INVITE-MODAL] Error message:', err.message);
      
      if (err.code === 'USER_NOT_FOUND') {
        setError('Este e-mail não possui conta. O usuário precisa criar uma conta primeiro.');
      } else if (err.code === 'ALREADY_MEMBER') {
        setError(err.message);
      } else {
        setError(err.message || 'Erro ao convidar membro');
      }
    } finally {
      setLoading(false);
      console.log('[INVITE-MODAL] Loading finished');
    }
  };

  const handleClose = () => {
    setEmail('');
    setRole('member');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className={`relative w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[95vh] rounded-xl shadow-2xl overflow-hidden flex flex-col ${
        isDark ? 'bg-[#0A0A0A]' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`px-4 sm:px-6 py-4 border-b flex items-center justify-between flex-shrink-0 ${
          isDark ? 'border-white/[0.08] bg-[#0A0A0A]' : 'border-border-light bg-white'
        }`}>
          <h2 className={`text-lg font-medium flex items-center gap-2 ${
            isDark ? 'text-white' : 'text-text-primary-light'
          }`}>
            <Mail className="w-5 h-5" />
            Convidar Membro
          </h2>
          <button
            onClick={handleClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark
                ? 'hover:bg-white/[0.05] text-white/70 hover:text-white'
                : 'hover:bg-black/[0.05] text-text-secondary-light hover:text-text-primary-light'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-6">
          <div className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            {/* Email Input */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDark ? 'text-white/70' : 'text-text-secondary-light'
              }`}>
                E-mail do usuário
              </label>
              <input
                type="email"
                placeholder="usuario@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                className={`w-full px-4 py-2.5 rounded-lg border transition-colors focus:outline-none focus:border-[#0169D9] ${
                  isDark
                    ? 'bg-white/[0.05] border-white/[0.08] text-white placeholder-white/40'
                    : 'bg-white border-border-light text-text-primary-light placeholder-text-secondary-light'
                }`}
              />
            </div>

            {/* Role Selection */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDark ? 'text-white/70' : 'text-text-secondary-light'
              }`}>
                Função
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as typeof role)}
                disabled={loading}
                className={`w-full px-4 py-2.5 rounded-lg border transition-colors focus:outline-none focus:border-[#0169D9] ${
                  isDark
                    ? 'bg-white/[0.05] border-white/[0.08] text-white'
                    : 'bg-white border-border-light text-text-primary-light'
                }`}
              >
                <option value="viewer">Visualizador</option>
                <option value="member">Membro</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isDark
                    ? 'hover:bg-white/[0.05] text-white/70'
                    : 'hover:bg-black/[0.05] text-text-secondary-light'
                }`}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !email}
                className="px-6 py-2 bg-[#0169D9] text-white rounded-lg hover:bg-[#0159C9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Convidando...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Convidar
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}