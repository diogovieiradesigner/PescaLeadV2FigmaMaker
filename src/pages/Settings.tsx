import { useState, useEffect } from 'react';
import { Theme } from '../hooks/useTheme';
import { useAuth } from '../contexts/AuthContext';
import { projectId } from '../utils/supabase/info';
import { 
  User, 
  Building2, 
  Users, 
  Palette, 
  Bell, 
  Lock,
  Save,
  Loader2,
  X,
  Plus,
  Trash2,
  Mail,
  Shield,
  Link as LinkIcon,
  Clock
} from 'lucide-react';
import { InviteMemberModal } from '../components/InviteMemberModal';

interface SettingsProps {
  theme: Theme;
  onToggleTheme: () => void;
}

type SettingsSection = 'account' | 'workspace' | 'members' | 'appearance' | 'notifications' | 'security';

export default function Settings({ theme, onToggleTheme }: SettingsProps) {
  const isDark = theme === 'dark';
  const { user, currentWorkspace, updateProfile, workspaces, accessToken, refreshWorkspaces } = useAuth();
  const [activeSection, setActiveSection] = useState<SettingsSection>('account');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  // Members and invites
  const [members, setMembers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Account form
  const [name, setName] = useState(user?.name || '');
  const [email] = useState(user?.email || '');

  // Workspace form
  const [workspaceName, setWorkspaceName] = useState(currentWorkspace?.name || '');

  // Load members and invites when members section is active
  useEffect(() => {
    if (activeSection === 'members' && currentWorkspace) {
      loadMembers();
      loadInvites();
    }
  }, [activeSection, currentWorkspace]);

  const loadMembers = async () => {
    try {
      setLoadingMembers(true);
      
      // Validate token exists
      if (!accessToken) {
        console.error('Load members error: No access token available');
        setErrorMessage('Sessão expirada. Por favor, faça login novamente.');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e4f9d774/workspaces/${currentWorkspace?.id}/members`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Resposta inválida do servidor');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load members');
      }

      setMembers(data.members || []);
    } catch (error: any) {
      console.error('Load members error:', error);
      setErrorMessage(error.message || 'Erro ao carregar membros');
    } finally {
      setLoadingMembers(false);
    }
  };

  const loadInvites = async () => {
    try {
      // Validate token exists
      if (!accessToken) {
        console.error('Load invites error: No access token available');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e4f9d774/workspaces/${currentWorkspace?.id}/invites`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('Invites endpoint not available or returned invalid response');
        setInvites([]);
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load invites');
      }

      setInvites(data.invites || []);
    } catch (error: any) {
      console.error('Load invites error:', error);
      // Don't show error to user - invites are optional
      setInvites([]);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Tem certeza que deseja remover este membro?')) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e4f9d774/workspaces/${currentWorkspace?.id}/members/${memberId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove member');
      }

      showMessage('Membro removido com sucesso!');
      loadMembers();
    } catch (error: any) {
      showMessage(error.message || 'Erro ao remover membro', true);
    }
  };

  const handleRevokeInvite = async (inviteCode: string) => {
    if (!confirm('Tem certeza que deseja revogar este convite?')) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e4f9d774/workspaces/${currentWorkspace?.id}/invites/${inviteCode}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to revoke invite');
      }

      showMessage('Convite revogado com sucesso!');
      loadInvites();
    } catch (error: any) {
      showMessage(error.message || 'Erro ao revogar convite', true);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e4f9d774/workspaces/${currentWorkspace?.id}/members/${memberId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ role: newRole })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change role');
      }

      showMessage('Função alterada com sucesso!');
      loadMembers();
    } catch (error: any) {
      showMessage(error.message || 'Erro ao alterar função', true);
    }
  };

  const handleLeaveWorkspace = async () => {
    if (!confirm('Tem certeza que deseja sair deste workspace? Você precisará ser convidado novamente para retornar.')) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e4f9d774/workspaces/${currentWorkspace?.id}/members/${user?.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to leave workspace');
      }

      showMessage('Você saiu do workspace com sucesso!');
      // Reload to switch to another workspace or logout
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      showMessage(error.message || 'Erro ao sair do workspace', true);
    }
  };

  const handleDeleteWorkspace = async () => {
    const confirmation = prompt('Esta ação é IRREVERSÍVEL. Digite o nome do workspace para confirmar a exclusão:');
    
    if (confirmation !== currentWorkspace?.name) {
      showMessage('Nome do workspace incorreto. Exclusão cancelada.', true);
      return;
    }

    try {
      setIsLoading(true);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e4f9d774/workspaces/${currentWorkspace?.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete workspace');
      }

      showMessage('Workspace excluído com sucesso!');
      // Reload to switch to another workspace or logout
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      showMessage(error.message || 'Erro ao excluir workspace', true);
    } finally {
      setIsLoading(false);
    }
  };

  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [leadAssignedNotif, setLeadAssignedNotif] = useState(true);
  const [leadMovedNotif, setLeadMovedNotif] = useState(true);
  const [commentNotif, setCommentNotif] = useState(true);

  const sections = [
    { id: 'account' as SettingsSection, label: 'Conta', icon: User },
    { id: 'workspace' as SettingsSection, label: 'Workspace', icon: Building2 },
    { id: 'members' as SettingsSection, label: 'Membros', icon: Users },
    { id: 'appearance' as SettingsSection, label: 'Aparência', icon: Palette },
    { id: 'notifications' as SettingsSection, label: 'Notificações', icon: Bell },
    { id: 'security' as SettingsSection, label: 'Segurança', icon: Lock },
  ];

  const showMessage = (message: string, isError = false) => {
    if (isError) {
      setErrorMessage(message);
      setSuccessMessage('');
    } else {
      setSuccessMessage(message);
      setErrorMessage('');
    }
    setTimeout(() => {
      setSuccessMessage('');
      setErrorMessage('');
    }, 3000);
  };

  const handleSaveAccount = async () => {
    try {
      setIsLoading(true);
      await updateProfile({ name });
      showMessage('Conta atualizada com sucesso!');
    } catch (error: any) {
      showMessage(error.message || 'Erro ao atualizar conta', true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveWorkspace = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e4f9d774/workspaces/${currentWorkspace?.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name: workspaceName })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update workspace');
      }

      showMessage('Workspace atualizado com sucesso!');
      // Refresh workspaces to update the name
      await refreshWorkspaces();
    } catch (error: any) {
      showMessage(error.message || 'Erro ao atualizar workspace', true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    try {
      setIsLoading(true);
      // TODO: Implement notifications update
      await new Promise(resolve => setTimeout(resolve, 500));
      showMessage('Notificações atualizadas com sucesso!');
    } catch (error: any) {
      showMessage(error.message || 'Erro ao atualizar notificações', true);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'account':
        return (
          <div className="space-y-6">
            <div>
              <h2 className={`text-xl font-semibold mb-1 ${
                isDark ? 'text-white' : 'text-text-primary-light'
              }`}>
                Informações da Conta
              </h2>
              <p className={`text-sm ${
                isDark ? 'text-white/50' : 'text-text-secondary-light'
              }`}>
                Gerencie suas informações pessoais e preferências
              </p>
            </div>

            {/* Avatar */}
            <div className={`p-6 rounded-xl border ${
              isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-light-elevated border-border-light'
            }`}>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-[#0169D9] flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-2xl font-medium">
                    {getInitials(name)}
                  </span>
                </div>
                <div>
                  <h3 className={`font-medium mb-1 ${
                    isDark ? 'text-white' : 'text-text-primary-light'
                  }`}>
                    Foto de perfil
                  </h3>
                  <p className={`text-sm mb-3 ${
                    isDark ? 'text-white/50' : 'text-text-secondary-light'
                  }`}>
                    O avatar é gerado automaticamente com suas iniciais
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className={`p-6 rounded-xl border ${
              isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-light-elevated border-border-light'
            }`}>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-white/70' : 'text-text-secondary-light'
                  }`}>
                    Nome completo
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors focus:outline-none focus:border-[#0169D9] ${
                      isDark
                        ? 'bg-white/[0.05] border-white/[0.08] text-white placeholder-white/40'
                        : 'bg-white border-border-light text-text-primary-light placeholder-text-secondary-light'
                    }`}
                    placeholder="Digite seu nome completo"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-white/70' : 'text-text-secondary-light'
                  }`}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors cursor-not-allowed ${
                      isDark
                        ? 'bg-white/[0.02] border-white/[0.08] text-white/50'
                        : 'bg-gray-50 border-border-light text-text-secondary-light'
                    }`}
                  />
                  <p className={`text-xs mt-1 ${
                    isDark ? 'text-white/40' : 'text-text-secondary-light'
                  }`}>
                    O email não pode ser alterado
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSaveAccount}
                    disabled={isLoading || name === user?.name}
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
              </div>
            </div>
          </div>
        );

      case 'workspace':
        return (
          <div className="space-y-6">
            <div>
              <h2 className={`text-xl font-semibold mb-1 ${
                isDark ? 'text-white' : 'text-text-primary-light'
              }`}>
                Configurações do Workspace
              </h2>
              <p className={`text-sm ${
                isDark ? 'text-white/50' : 'text-text-secondary-light'
              }`}>
                Gerencie as configurações do seu workspace
              </p>
            </div>

            <div className={`p-6 rounded-xl border ${
              isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-light-elevated border-border-light'
            }`}>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-white/70' : 'text-text-secondary-light'
                  }`}>
                    Nome do workspace
                  </label>
                  <input
                    type="text"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors focus:outline-none focus:border-[#0169D9] ${
                      isDark
                        ? 'bg-white/[0.05] border-white/[0.08] text-white placeholder-white/40'
                        : 'bg-white border-border-light text-text-primary-light placeholder-text-secondary-light'
                    }`}
                    placeholder="Nome do workspace"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-white/70' : 'text-text-secondary-light'
                  }`}>
                    Função
                  </label>
                  <div className={`px-4 py-2.5 rounded-lg border ${
                    isDark
                      ? 'bg-white/[0.02] border-white/[0.08] text-white/50'
                      : 'bg-gray-50 border-border-light text-text-secondary-light'
                  }`}>
                    {currentWorkspace?.role || 'owner'}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSaveWorkspace}
                    disabled={isLoading || workspaceName === currentWorkspace?.name}
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
              </div>
            </div>
          </div>
        );

      case 'members':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`text-xl font-semibold mb-1 ${
                  isDark ? 'text-white' : 'text-text-primary-light'
                }`}>
                  Membros da Equipe
                </h2>
                <p className={`text-sm ${
                  isDark ? 'text-white/50' : 'text-text-secondary-light'
                }`}>
                  Gerencie quem tem acesso ao workspace
                </p>
              </div>
              <button className="px-4 py-2 bg-[#0169D9] text-white rounded-lg hover:bg-[#0159C9] transition-colors flex items-center gap-2" onClick={() => setShowInviteModal(true)}>
                <Plus className="w-4 h-4" />
                Convidar membro
              </button>
            </div>

            <div className={`p-6 rounded-xl border ${
              isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-light-elevated border-border-light'
            }`}>
              <div className="space-y-3">
                {/* Current user */}
                <div className={`flex items-center justify-between p-3 rounded-lg ${
                  isDark ? 'bg-white/[0.02]' : 'bg-gray-50'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#0169D9] flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {getInitials(user?.name || '')}
                      </span>
                    </div>
                    <div>
                      <p className={`font-medium ${
                        isDark ? 'text-white' : 'text-text-primary-light'
                      }`}>
                        {user?.name} <span className={`text-sm font-normal ${
                          isDark ? 'text-white/50' : 'text-text-secondary-light'
                        }`}>(Você)</span>
                      </p>
                      <p className={`text-sm ${
                        isDark ? 'text-white/50' : 'text-text-secondary-light'
                      }`}>
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm px-3 py-1 rounded-full ${
                      isDark ? 'bg-[#0169D9]/20 text-[#0169D9]' : 'bg-[#0169D9]/10 text-[#0169D9]'
                    }`}>
                      {currentWorkspace?.role || 'owner'}
                    </span>
                  </div>
                </div>

                {/* Members */}
                {members.filter(member => (member.user_id || member.id) !== user?.id).map(member => (
                  <div key={member.user_id || member.id} className={`flex items-center justify-between p-3 rounded-lg ${
                    isDark ? 'bg-white/[0.02]' : 'bg-gray-50'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#0169D9] flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {getInitials(member.user?.name || member.name || '')}
                        </span>
                      </div>
                      <div>
                        <p className={`font-medium ${
                          isDark ? 'text-white' : 'text-text-primary-light'
                        }`}>
                          {member.user?.name || member.name}
                        </p>
                        <p className={`text-sm ${
                          isDark ? 'text-white/50' : 'text-text-secondary-light'
                        }`}>
                          {member.user?.email || member.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Role Dropdown - Only if admin/owner and not owner member */}
                      {member.role !== 'owner' && currentWorkspace?.role && ['admin', 'owner'].includes(currentWorkspace.role) ? (
                        <select
                          value={member.role || 'member'}
                          onChange={(e) => handleChangeRole(member.user_id || member.id, e.target.value)}
                          className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                            isDark 
                              ? 'bg-[#0169D9]/20 text-[#0169D9] border-[#0169D9]/30 hover:bg-[#0169D9]/30' 
                              : 'bg-[#0169D9]/10 text-[#0169D9] border-[#0169D9]/20 hover:bg-[#0169D9]/20'
                          }`}
                        >
                          <option value="viewer">Viewer</option>
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span className={`text-sm px-3 py-1 rounded-full ${
                          isDark ? 'bg-[#0169D9]/20 text-[#0169D9]' : 'bg-[#0169D9]/10 text-[#0169D9]'
                        }`}>
                          {member.role || 'member'}
                        </span>
                      )}
                      
                      {/* Remove button - Only if admin/owner and not current user */}
                      {member.role !== 'owner' && member.user_id !== user?.id && currentWorkspace?.role && ['admin', 'owner'].includes(currentWorkspace.role) && (
                        <button
                          onClick={() => handleRemoveMember(member.user_id || member.id)}
                          className="px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Invites */}
                {invites.map(invite => (
                  <div key={invite.code} className={`flex items-center justify-between p-3 rounded-lg border ${
                    isDark ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-yellow-50 border-yellow-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                        <LinkIcon className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className={`font-medium ${
                          isDark ? 'text-white' : 'text-text-primary-light'
                        }`}>
                          Convite por link • {invite.role || 'member'}
                        </p>
                        <p className={`text-sm ${
                          isDark ? 'text-white/50' : 'text-text-secondary-light'
                        }`}>
                          Expira em {new Date(invite.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleRevokeInvite(invite.code)}
                        className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-1.5 text-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Revogar
                      </button>
                    </div>
                  </div>
                ))}

                {/* Empty state */}
                {members.filter(member => (member.user_id || member.id) !== user?.id).length === 0 && invites.length === 0 && (
                  <div className={`text-center py-8 ${
                    isDark ? 'text-white/40' : 'text-text-secondary-light'
                  }`}>
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Nenhum outro membro ainda</p>
                    <p className="text-xs mt-1">Convide pessoas para colaborar no workspace</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <div>
              <h2 className={`text-xl font-semibold mb-1 ${
                isDark ? 'text-white' : 'text-text-primary-light'
              }`}>
                Aparência
              </h2>
              <p className={`text-sm ${
                isDark ? 'text-white/50' : 'text-text-secondary-light'
              }`}>
                Personalize a aparência do CRM
              </p>
            </div>

            <div className={`p-6 rounded-xl border ${
              isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-light-elevated border-border-light'
            }`}>
              <h3 className={`font-medium mb-4 ${
                isDark ? 'text-white' : 'text-text-primary-light'
              }`}>
                Tema
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Light theme */}
                <button
                  onClick={() => theme === 'dark' && onToggleTheme()}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    theme === 'light'
                      ? 'border-[#0169D9] bg-[#0169D9]/5'
                      : isDark
                        ? 'border-white/[0.08] hover:border-white/20'
                        : 'border-border-light hover:border-gray-300'
                  }`}
                >
                  <div className="aspect-video rounded-md bg-white border border-gray-200 mb-3 flex items-center justify-center">
                    <div className="text-4xl">☀️</div>
                  </div>
                  <p className={`font-medium ${
                    theme === 'light' ? 'text-[#0169D9]' : isDark ? 'text-white' : 'text-text-primary-light'
                  }`}>
                    Claro
                  </p>
                </button>

                {/* Dark theme */}
                <button
                  onClick={() => theme === 'light' && onToggleTheme()}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    theme === 'dark'
                      ? 'border-[#0169D9] bg-[#0169D9]/5'
                      : isDark
                        ? 'border-white/[0.08] hover:border-white/20'
                        : 'border-border-light hover:border-gray-300'
                  }`}
                >
                  <div className="aspect-video rounded-md bg-black border border-white/10 mb-3 flex items-center justify-center">
                    <div className="text-4xl">🌙</div>
                  </div>
                  <p className={`font-medium ${
                    theme === 'dark' ? 'text-[#0169D9]' : isDark ? 'text-white' : 'text-text-primary-light'
                  }`}>
                    Escuro
                  </p>
                </button>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h2 className={`text-xl font-semibold mb-1 ${
                isDark ? 'text-white' : 'text-text-primary-light'
              }`}>
                Notificações
              </h2>
              <p className={`text-sm ${
                isDark ? 'text-white/50' : 'text-text-secondary-light'
              }`}>
                Configure como você deseja receber notificações
              </p>
            </div>

            <div className={`p-6 rounded-xl border ${
              isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-light-elevated border-border-light'
            }`}>
              <div className="space-y-4">
                <h3 className={`font-medium mb-3 ${
                  isDark ? 'text-white' : 'text-text-primary-light'
                }`}>
                  Canais de Notificação
                </h3>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className={`font-medium ${
                      isDark ? 'text-white' : 'text-text-primary-light'
                    }`}>
                      Notificações por email
                    </p>
                    <p className={`text-sm ${
                      isDark ? 'text-white/50' : 'text-text-secondary-light'
                    }`}>
                      Receba atualizações importantes por email
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    className="w-5 h-5 rounded accent-[#0169D9]"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className={`font-medium ${
                      isDark ? 'text-white' : 'text-text-primary-light'
                    }`}>
                      Notificações desktop
                    </p>
                    <p className={`text-sm ${
                      isDark ? 'text-white/50' : 'text-text-secondary-light'
                    }`}>
                      Receba notificações no navegador
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={pushNotifications}
                    onChange={(e) => setPushNotifications(e.target.checked)}
                    className="w-5 h-5 rounded accent-[#0169D9]"
                  />
                </label>
              </div>
            </div>

            <div className={`p-6 rounded-xl border ${
              isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-light-elevated border-border-light'
            }`}>
              <div className="space-y-4">
                <h3 className={`font-medium mb-3 ${
                  isDark ? 'text-white' : 'text-text-primary-light'
                }`}>
                  Eventos
                </h3>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className={isDark ? 'text-white/70' : 'text-text-primary-light'}>
                    Lead atribuído a mim
                  </span>
                  <input
                    type="checkbox"
                    checked={leadAssignedNotif}
                    onChange={(e) => setLeadAssignedNotif(e.target.checked)}
                    className="w-5 h-5 rounded accent-[#0169D9]"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className={isDark ? 'text-white/70' : 'text-text-primary-light'}>
                    Lead movido no pipeline
                  </span>
                  <input
                    type="checkbox"
                    checked={leadMovedNotif}
                    onChange={(e) => setLeadMovedNotif(e.target.checked)}
                    className="w-5 h-5 rounded accent-[#0169D9]"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className={isDark ? 'text-white/70' : 'text-text-primary-light'}>
                    Novos comentários
                  </span>
                  <input
                    type="checkbox"
                    checked={commentNotif}
                    onChange={(e) => setCommentNotif(e.target.checked)}
                    className="w-5 h-5 rounded accent-[#0169D9]"
                  />
                </label>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleSaveNotifications}
                    disabled={isLoading}
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
                        Salvar preferências
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div>
              <h2 className={`text-xl font-semibold mb-1 ${
                isDark ? 'text-white' : 'text-text-primary-light'
              }`}>
                Segurança
              </h2>
              <p className={`text-sm ${
                isDark ? 'text-white/50' : 'text-text-secondary-light'
              }`}>
                Gerencie a segurança da sua conta
              </p>
            </div>

            <div className={`p-6 rounded-xl border ${
              isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-light-elevated border-border-light'
            }`}>
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${
                  isDark ? 'bg-white/[0.05]' : 'bg-gray-100'
                }`}>
                  <Shield className={`w-6 h-6 ${
                    isDark ? 'text-white/70' : 'text-text-secondary-light'
                  }`} />
                </div>
                <div className="flex-1">
                  <h3 className={`font-medium mb-1 ${
                    isDark ? 'text-white' : 'text-text-primary-light'
                  }`}>
                    Senha
                  </h3>
                  <p className={`text-sm mb-3 ${
                    isDark ? 'text-white/50' : 'text-text-secondary-light'
                  }`}>
                    Para alterar sua senha, acesse o menu de perfil
                  </p>
                  <button className={`text-sm text-[#0169D9] hover:underline`}>
                    Abrir perfil →
                  </button>
                </div>
              </div>
            </div>

            {/* Leave Workspace - If not owner */}
            {currentWorkspace?.role !== 'owner' && (
              <div className={`p-6 rounded-xl border border-orange-500/20 ${
                isDark ? 'bg-orange-500/5' : 'bg-orange-50'
              }`}>
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <h3 className={`font-medium mb-1 text-orange-500`}>
                      Sair do Workspace
                    </h3>
                    <p className={`text-sm mb-4 ${
                      isDark ? 'text-white/50' : 'text-text-secondary-light'
                    }`}>
                      Você deixará de ter acesso a este workspace e precisará ser convidado novamente para retornar.
                    </p>
                    <button 
                      onClick={handleLeaveWorkspace}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      Sair do workspace
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Workspace - Owner only */}
            {currentWorkspace?.role === 'owner' && (
              <div className={`p-6 rounded-xl border border-red-500/20 ${
                isDark ? 'bg-red-500/5' : 'bg-red-50'
              }`}>
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <h3 className={`font-medium mb-1 text-red-500`}>
                      Zona de Perigo
                    </h3>
                    <p className={`text-sm mb-4 ${
                      isDark ? 'text-white/50' : 'text-text-secondary-light'
                    }`}>
                      Esta ação é IRREVERSÍVEL. Todos os dados e membros serão removidos permanentemente.
                    </p>
                    <button 
                      onClick={handleDeleteWorkspace}
                      disabled={isLoading}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Excluindo...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          Excluir workspace
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-dark' : 'bg-light'}`}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-2xl font-semibold mb-2 ${
            isDark ? 'text-white' : 'text-text-primary-light'
          }`}>
            Configurações
          </h1>
          <p className={`text-sm ${
            isDark ? 'text-white/50' : 'text-text-secondary-light'
          }`}>
            Gerencie suas preferências e configurações do workspace
          </p>
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-between">
            <p className="text-sm text-green-500">{successMessage}</p>
            <button onClick={() => setSuccessMessage('')}>
              <X className="w-4 h-4 text-green-500" />
            </button>
          </div>
        )}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-between">
            <p className="text-sm text-red-500">{errorMessage}</p>
            <button onClick={() => setErrorMessage('')}>
              <X className="w-4 h-4 text-red-500" />
            </button>
          </div>
        )}

        {/* Layout */}
        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <nav className="space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                      activeSection === section.id
                        ? 'bg-[#0169D9] text-white'
                        : isDark
                          ? 'text-white/70 hover:bg-white/[0.05] hover:text-white'
                          : 'text-text-secondary-light hover:bg-black/[0.05] hover:text-text-primary-light'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{section.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Invite Member Modal */}
      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        theme={theme}
        workspaceId={currentWorkspace?.id || ''}
        onInviteCreated={() => {
          showMessage('Convite criado com sucesso!');
        }}
      />
    </div>
  );
}