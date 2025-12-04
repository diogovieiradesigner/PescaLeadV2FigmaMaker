import { useState } from 'react';
import { X, UserPlus, Mail, Copy, Check, Trash2, Crown, User as UserIcon, Loader2 } from 'lucide-react';
import { Theme } from '../hooks/useTheme';
import { useWorkspaceMembers } from '../hooks/useWorkspaceMembers';
import { toast } from 'sonner';

interface WorkspaceMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  workspaceId: string | null;
  workspaceName: string;
  accessToken: string | null;
  currentUserId: string;
}

export function WorkspaceMembersModal({
  isOpen,
  onClose,
  theme,
  workspaceId,
  workspaceName,
  accessToken,
  currentUserId,
}: WorkspaceMembersModalProps) {
  const isDark = theme === 'dark';
  const { members, loading, createInvite, removeMember, fetchMembers } = useWorkspaceMembers(workspaceId, accessToken);
  
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateInvite = async () => {
    setIsCreatingInvite(true);
    
    try {
      const result = await createInvite(inviteRole, 7);
      
      if (result.success && result.code) {
        setInviteCode(result.code);
        toast.success('Convite criado com sucesso!', {
          description: `Válido por 7 dias`,
        });
      } else {
        toast.error('Erro ao criar convite', {
          description: result.error || 'Tente novamente',
        });
      }
    } catch (err) {
      toast.error('Erro ao criar convite');
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const handleCopyInviteLink = () => {
    if (!inviteCode) return;
    
    // ✅ NOVO FORMATO: Query params ao invés de hash routing
    const inviteLink = `${window.location.origin}/?invite=${inviteCode}`;
    navigator.clipboard.writeText(inviteLink);
    setCopiedCode(true);
    toast.success('Link copiado!');
    
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleRemoveMember = async (userId: string, userName: string) => {
    if (userId === currentUserId) {
      toast.error('Você não pode remover a si mesmo');
      return;
    }

    setRemovingUserId(userId);
    
    try {
      const result = await removeMember(userId);
      
      if (result.success) {
        toast.success(`${userName} foi removido do workspace`);
        await fetchMembers();
      } else {
        toast.error('Erro ao remover membro', {
          description: result.error || 'Tente novamente',
        });
      }
    } catch (err) {
      toast.error('Erro ao remover membro');
    } finally {
      setRemovingUserId(null);
    }
  };

  const currentUserMember = members.find(m => m.user_id === currentUserId);
  const isAdmin = currentUserMember?.role === 'admin';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden ${
        isDark ? 'bg-[#0A0A0A]' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDark ? 'border-white/[0.08] bg-[#0A0A0A]' : 'border-border-light bg-white'
        }`}>
          <div>
            <h2 className={`text-lg font-medium ${
              isDark ? 'text-white' : 'text-text-primary-light'
            }`}>
              Gerenciar Membros
            </h2>
            <p className={`text-sm mt-1 ${
              isDark ? 'text-white/50' : 'text-text-secondary-light'
            }`}>
              {workspaceName}
            </p>
          </div>
          <button
            onClick={onClose}
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
        <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
          {/* Create Invite Section - Only for admins */}
          {isAdmin && (
            <div className="mb-6 p-4 rounded-lg bg-white/[0.03] border border-white/[0.08]">
              <div className="flex items-center gap-2 mb-3">
                <UserPlus className="w-5 h-5 text-[#0169D9]" />
                <h3 className="font-medium text-white">Convidar Membro</h3>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Cargo
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white focus:outline-none focus:border-[#0169D9] transition-colors"
                  >
                    <option value="member">Membro</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <button
                  onClick={handleCreateInvite}
                  disabled={isCreatingInvite}
                  className="w-full px-4 py-2.5 bg-[#0169D9] text-white rounded-lg hover:bg-[#0159C9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCreatingInvite ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Gerando convite...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Gerar link de convite
                    </>
                  )}
                </button>

                {inviteCode && (
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-xs text-green-400 mb-2">Link de convite gerado:</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={`${window.location.origin}/invite/${inviteCode}`}
                        readOnly
                        className="flex-1 px-3 py-2 text-sm rounded bg-black/30 border border-green-500/30 text-green-300 font-mono"
                      />
                      <button
                        onClick={handleCopyInviteLink}
                        className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors flex items-center gap-2"
                      >
                        {copiedCode ? (
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
                )}
              </div>
            </div>
          )}

          {/* Members List */}
          <div>
            <h3 className="font-medium text-white mb-3 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-white/70" />
              Membros ({members.length})
            </h3>

            {loading && members.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-white/50" />
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8 text-white/50">
                Nenhum membro encontrado
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.05] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#0169D9] flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {member.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-white">{member.name}</p>
                          {member.role === 'admin' && (
                            <Crown className="w-4 h-4 text-yellow-500" />
                          )}
                          {member.user_id === currentUserId && (
                            <span className="text-xs px-2 py-0.5 rounded bg-[#0169D9]/20 text-[#0169D9] border border-[#0169D9]/30">
                              Você
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-white/50">{member.email}</p>
                      </div>
                    </div>

                    {isAdmin && member.user_id !== currentUserId && (
                      <button
                        onClick={() => handleRemoveMember(member.user_id, member.name)}
                        disabled={removingUserId === member.user_id}
                        className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        title="Remover membro"
                      >
                        {removingUserId === member.user_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.08] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] text-white transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}