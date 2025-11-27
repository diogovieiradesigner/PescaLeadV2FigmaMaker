import { useState } from 'react';
import { X, Link as LinkIcon, Copy, Check, Loader2 } from 'lucide-react';
import { Theme } from '../hooks/useTheme';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  workspaceId: string;
  onInviteCreated?: () => void;
}

export function InviteMemberModal({ isOpen, onClose, theme, workspaceId, onInviteCreated }: InviteMemberModalProps) {
  const isDark = theme === 'dark';
  const [role, setRole] = useState<'member' | 'admin' | 'viewer'>('member');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [isLoading, setIsLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleGenerateLink = async () => {
    try {
      setIsLoading(true);
      setError('');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e4f9d774/workspaces/${workspaceId}/invites`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: JSON.stringify({ role, expiresInDays })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate invite');
      }

      // Generate local URL with hash
      const localUrl = `${window.location.origin}${window.location.pathname}#/invite/${data.invite.code}`;
      setInviteUrl(localUrl);
      if (onInviteCreated) onInviteCreated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleClose = () => {
    setInviteUrl('');
    setCopied(false);
    setError('');
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
      <div className={`relative w-full max-w-md rounded-xl shadow-2xl overflow-hidden ${
        isDark ? 'bg-elevated' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDark ? 'border-white/[0.08]' : 'border-border-light'
        }`}>
          <h2 className={`text-lg font-medium ${
            isDark ? 'text-white' : 'text-text-primary-light'
          }`}>
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
        <div className="px-6 py-6">
          {!inviteUrl ? (
            <div className="space-y-4">
              <p className={`text-sm ${
                isDark ? 'text-white/70' : 'text-text-secondary-light'
              }`}>
                Gere um link de convite para adicionar novos membros ao workspace.
              </p>

              {/* Role Selection */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-white/70' : 'text-text-secondary-light'
                }`}>
                  Função
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className={`w-full px-4 py-2.5 rounded-lg border transition-colors focus:outline-none focus:border-[#0169D9] ${
                    isDark
                      ? 'bg-white/[0.05] border-white/[0.08] text-white'
                      : 'bg-white border-border-light text-text-primary-light'
                  }`}
                >
                  <option value="viewer">Viewer (Visualização)</option>
                  <option value="member">Member (Membro)</option>
                  <option value="admin">Admin (Administrador)</option>
                </select>
              </div>

              {/* Expiration */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-white/70' : 'text-text-secondary-light'
                }`}>
                  Validade do link
                </label>
                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(Number(e.target.value))}
                  className={`w-full px-4 py-2.5 rounded-lg border transition-colors focus:outline-none focus:border-[#0169D9] ${
                    isDark
                      ? 'bg-white/[0.05] border-white/[0.08] text-white'
                      : 'bg-white border-border-light text-text-primary-light'
                  }`}
                >
                  <option value="1">1 dia</option>
                  <option value="7">7 dias</option>
                  <option value="30">30 dias</option>
                  <option value="365">1 ano</option>
                </select>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={handleClose}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    isDark
                      ? 'hover:bg-white/[0.05] text-white/70'
                      : 'hover:bg-black/[0.05] text-text-secondary-light'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGenerateLink}
                  disabled={isLoading}
                  className="px-6 py-2 bg-[#0169D9] text-white rounded-lg hover:bg-[#0159C9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-4 h-4" />
                      Gerar link
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg flex items-center justify-center ${
                isDark ? 'bg-green-500/10' : 'bg-green-50'
              }`}>
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="w-6 h-6 text-green-500" />
                  </div>
                  <p className={`text-sm font-medium mb-1 ${
                    isDark ? 'text-white' : 'text-text-primary-light'
                  }`}>
                    Link gerado com sucesso!
                  </p>
                  <p className={`text-xs ${
                    isDark ? 'text-white/50' : 'text-text-secondary-light'
                  }`}>
                    Compartilhe com quem você deseja convidar
                  </p>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-white/70' : 'text-text-secondary-light'
                }`}>
                  Link de convite
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inviteUrl}
                    readOnly
                    className={`flex-1 px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? 'bg-white/[0.02] border-white/[0.08] text-white/70'
                        : 'bg-gray-50 border-border-light text-text-secondary-light'
                    }`}
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2 ${
                      copied
                        ? 'bg-green-500 text-white'
                        : isDark
                          ? 'bg-white/[0.05] hover:bg-white/[0.08] text-white/70'
                          : 'bg-gray-100 hover:bg-gray-200 text-text-secondary-light'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copiar
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className={`p-3 rounded-lg text-xs ${
                isDark ? 'bg-white/[0.02] text-white/50' : 'bg-gray-50 text-text-secondary-light'
              }`}>
                <p className="mb-1">
                  <strong>Função:</strong> {role === 'viewer' ? 'Viewer' : role === 'member' ? 'Member' : 'Admin'}
                </p>
                <p>
                  <strong>Válido por:</strong> {expiresInDays === 1 ? '1 dia' : `${expiresInDays} dias`}
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleClose}
                  className="px-6 py-2 bg-[#0169D9] text-white rounded-lg hover:bg-[#0159C9] transition-colors"
                >
                  Concluir
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}