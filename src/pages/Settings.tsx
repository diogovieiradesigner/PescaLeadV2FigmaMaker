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
  Trash2,
  Shield,
  Plus,
  Sun,
  Moon
} from 'lucide-react';
import { InviteMemberModal } from '../components/InviteMemberModal';
import { ProfileMenu } from '../components/ProfileMenu';
import { cn } from '../components/ui/utils';

interface SettingsProps {
  theme: Theme;
  onToggleTheme: () => void;
  onManageMembersClick?: () => void;
}

type SettingsSection = 'account' | 'workspace' | 'members' | 'appearance' | 'notifications' | 'security';

export default function Settings({ theme, onToggleTheme, onManageMembersClick }: SettingsProps) {
  const isDark = theme === 'dark';
  const { user, currentWorkspace, updateProfile, workspaces, accessToken, refreshWorkspaces } = useAuth();
  const [activeSection, setActiveSection] = useState<SettingsSection>('account');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Members
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  // Account form
  const [name, setName] = useState(user?.name || '');
  const [email] = useState(user?.email || '');

  // Workspace form
  const [workspaceName, setWorkspaceName] = useState(currentWorkspace?.name || '');

  // Load members when members section is active
  useEffect(() => {
    if (activeSection === 'members' && currentWorkspace) {
      loadMembers();
    }
  }, [activeSection, currentWorkspace]);

  const loadMembers = async () => {
    try {
      setLoadingMembers(true);
      
      // Validate token exists
      if (!accessToken) {
        console.error('[SETTINGS] Load members error: No access token available');
        setErrorMessage('Sessão expirada. Por favor, faça login novamente.');
        return;
      }

      console.log('[SETTINGS] Carregando membros do workspace:', currentWorkspace?.id);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/workspace-team/members?workspace_id=${currentWorkspace?.id}`,
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

      console.log('[SETTINGS] Membros carregados:', data.members);
      setMembers(data.members || []);
    } catch (error: any) {
      console.error('[SETTINGS] Load members error:', error);
      setErrorMessage(error.message || 'Erro ao carregar membros');
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Tem certeza que deseja remover este membro?')) return;

    try {
      console.log('[SETTINGS] Removendo membro:', memberId);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/workspace-team/remove-member`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            workspace_id: currentWorkspace?.id,
            target_user_id: memberId
          })
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove member');
      }

      console.log('[SETTINGS] Membro removido com sucesso');
      showMessage('Membro removido com sucesso!');
      loadMembers();
    } catch (error: any) {
      console.error('[SETTINGS] Erro ao remover membro:', error);
      showMessage(error.message || 'Erro ao remover membro', true);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      console.log('[SETTINGS] Alterando role do membro:', { memberId, newRole });

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/workspace-team/update-role`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            workspace_id: currentWorkspace?.id,
            target_user_id: memberId,
            new_role: newRole
          })
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to change role');
      }

      console.log('[SETTINGS] Role alterado com sucesso');
      showMessage('Função alterada com sucesso!');
      loadMembers();
    } catch (error: any) {
      console.error('[SETTINGS] Erro ao alterar função:', error);
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
  const [notificationPreferences, setNotificationPreferences] = useState<any>(null);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Load notification preferences when section becomes active
  useEffect(() => {
    if (activeSection === 'notifications' && user) {
      loadNotificationPreferences();
    }
  }, [activeSection, user]);

  const loadNotificationPreferences = async () => {
    try {
      setLoadingNotifications(true);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e4f9d774/notification-preferences`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load notification preferences');
      }

      const data = await response.json();
      console.log('[SETTINGS] Notification preferences loaded:', data);
      setNotificationPreferences(data.preferences);
    } catch (error: any) {
      console.error('[SETTINGS] Error loading notification preferences:', error);
      // Se falhar, criar com defaults
      setNotificationPreferences({
        email_enabled: true,
        whatsapp_enabled: false,
        push_enabled: true,
        transfer_email: true,
        transfer_whatsapp: true,
        transfer_push: true,
        new_message_email: false,
        new_message_whatsapp: false,
        new_message_push: true,
        lead_created_email: false,
        lead_created_whatsapp: false,
        lead_created_push: false,
        mention_email: true,
        mention_whatsapp: false,
        mention_push: true,
        quiet_hours_enabled: false,
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00',
        daily_summary_enabled: false,
        daily_summary_time: '09:00'
      });
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleSaveNotifications = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e4f9d774/notification-preferences`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(notificationPreferences)
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save notification preferences');
      }

      console.log('[SETTINGS] Notification preferences saved successfully');
      showMessage('Preferências de notificações salvas com sucesso!');
    } catch (error: any) {
      console.error('[SETTINGS] Error saving notification preferences:', error);
      showMessage(error.message || 'Erro ao salvar preferências', true);
    } finally {
      setIsLoading(false);
    }
  };

  const updateNotificationPref = (key: string, value: any) => {
    setNotificationPreferences((prev: any) => ({
      ...prev,
      [key]: value
    }));
  };

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

                {/* Empty state */}
                {members.filter(member => (member.user_id || member.id) !== user?.id).length === 0 && (
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

            {/* Invite member button */}
            <div className="mt-4">
              <button
                onClick={() => setShowInviteModal(true)}
                className="px-4 py-2 bg-[#0169D9] text-white rounded-lg hover:bg-[#0159C9] transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Convidar membro
              </button>
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
                    <Sun className="w-4 h-4" />
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
                    <Moon className="w-4 h-4" />
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
        if (loadingNotifications || !notificationPreferences) {
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
                  Carregando preferências...
                </p>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <div>
              <h2 className={`text-xl font-semibold mb-1 ${
                isDark ? 'text-white' : 'text-text-primary-light'
              }`}>
                Preferências de Notificações
              </h2>
              <p className={`text-sm ${
                isDark ? 'text-white/50' : 'text-text-secondary-light'
              }`}>
                Configure como e quando deseja receber notificações do sistema
              </p>
            </div>

            {/* Canais Globais */}
            <div className={`p-6 rounded-xl border ${
              isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-light-elevated border-border-light'
            }`}>
              <h3 className={`font-medium mb-4 ${
                isDark ? 'text-white' : 'text-text-primary-light'
              }`}>
                Canais de Notificação
              </h3>
              
              <div className="space-y-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className={`font-medium ${
                      isDark ? 'text-white' : 'text-text-primary-light'
                    }`}>
                      Email
                    </p>
                    <p className={`text-sm ${
                      isDark ? 'text-white/50' : 'text-text-secondary-light'
                    }`}>
                      Receber notificações por email
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationPreferences.email_enabled}
                    onChange={(e) => updateNotificationPref('email_enabled', e.target.checked)}
                    className="w-5 h-5 rounded accent-[#0169D9]"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className={`font-medium ${
                      isDark ? 'text-white' : 'text-text-primary-light'
                    }`}>
                      WhatsApp
                    </p>
                    <p className={`text-sm ${
                      isDark ? 'text-white/50' : 'text-text-secondary-light'
                    }`}>
                      Receber notificações no WhatsApp
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationPreferences.whatsapp_enabled}
                    onChange={(e) => updateNotificationPref('whatsapp_enabled', e.target.checked)}
                    className="w-5 h-5 rounded accent-[#0169D9]"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className={`font-medium ${
                      isDark ? 'text-white' : 'text-text-primary-light'
                    }`}>
                      Push (Navegador)
                    </p>
                    <p className={`text-sm ${
                      isDark ? 'text-white/50' : 'text-text-secondary-light'
                    }`}>
                      Receber notificações no navegador
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationPreferences.push_enabled}
                    onChange={(e) => updateNotificationPref('push_enabled', e.target.checked)}
                    className="w-5 h-5 rounded accent-[#0169D9]"
                  />
                </label>
              </div>
            </div>

            {/* Matriz de Tipos */}
            <div className={`p-6 rounded-xl border ${
              isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-light-elevated border-border-light'
            }`}>
              <h3 className={`font-medium mb-4 ${
                isDark ? 'text-white' : 'text-text-primary-light'
              }`}>
                Tipos de Notificação
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={`border-b ${
                      isDark ? 'border-white/[0.08]' : 'border-border-light'
                    }`}>
                      <th className={`text-left py-3 px-2 text-sm font-medium ${
                        isDark ? 'text-white/70' : 'text-text-secondary-light'
                      }`}>
                        Tipo
                      </th>
                      <th className={`text-center py-3 px-2 text-sm font-medium ${
                        isDark ? 'text-white/70' : 'text-text-secondary-light'
                      }`}>
                        Email
                      </th>
                      <th className={`text-center py-3 px-2 text-sm font-medium ${
                        isDark ? 'text-white/70' : 'text-text-secondary-light'
                      }`}>
                        WhatsApp
                      </th>
                      <th className={`text-center py-3 px-2 text-sm font-medium ${
                        isDark ? 'text-white/70' : 'text-text-secondary-light'
                      }`}>
                        Push
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Transferências */}
                    <tr className={`border-b ${
                      isDark ? 'border-white/[0.08]' : 'border-border-light'
                    }`}>
                      <td className={`py-3 px-2 text-sm ${
                        isDark ? 'text-white' : 'text-text-primary-light'
                      }`}>
                        Transferências
                      </td>
                      <td className="py-3 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={notificationPreferences.transfer_email}
                          disabled={!notificationPreferences.email_enabled}
                          onChange={(e) => updateNotificationPref('transfer_email', e.target.checked)}
                          className="w-5 h-5 rounded accent-[#0169D9] disabled:opacity-30 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="py-3 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={notificationPreferences.transfer_whatsapp}
                          disabled={!notificationPreferences.whatsapp_enabled}
                          onChange={(e) => updateNotificationPref('transfer_whatsapp', e.target.checked)}
                          className="w-5 h-5 rounded accent-[#0169D9] disabled:opacity-30 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="py-3 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={notificationPreferences.transfer_push}
                          disabled={!notificationPreferences.push_enabled}
                          onChange={(e) => updateNotificationPref('transfer_push', e.target.checked)}
                          className="w-5 h-5 rounded accent-[#0169D9] disabled:opacity-30 disabled:cursor-not-allowed"
                        />
                      </td>
                    </tr>

                    {/* Novas mensagens */}
                    <tr className={`border-b ${
                      isDark ? 'border-white/[0.08]' : 'border-border-light'
                    }`}>
                      <td className={`py-3 px-2 text-sm ${
                        isDark ? 'text-white' : 'text-text-primary-light'
                      }`}>
                        Novas mensagens
                      </td>
                      <td className="py-3 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={notificationPreferences.new_message_email}
                          disabled={!notificationPreferences.email_enabled}
                          onChange={(e) => updateNotificationPref('new_message_email', e.target.checked)}
                          className="w-5 h-5 rounded accent-[#0169D9] disabled:opacity-30 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="py-3 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={notificationPreferences.new_message_whatsapp}
                          disabled={!notificationPreferences.whatsapp_enabled}
                          onChange={(e) => updateNotificationPref('new_message_whatsapp', e.target.checked)}
                          className="w-5 h-5 rounded accent-[#0169D9] disabled:opacity-30 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="py-3 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={notificationPreferences.new_message_push}
                          disabled={!notificationPreferences.push_enabled}
                          onChange={(e) => updateNotificationPref('new_message_push', e.target.checked)}
                          className="w-5 h-5 rounded accent-[#0169D9] disabled:opacity-30 disabled:cursor-not-allowed"
                        />
                      </td>
                    </tr>

                    {/* Leads criados */}
                    <tr className={`border-b ${
                      isDark ? 'border-white/[0.08]' : 'border-border-light'
                    }`}>
                      <td className={`py-3 px-2 text-sm ${
                        isDark ? 'text-white' : 'text-text-primary-light'
                      }`}>
                        Leads criados
                      </td>
                      <td className="py-3 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={notificationPreferences.lead_created_email}
                          disabled={!notificationPreferences.email_enabled}
                          onChange={(e) => updateNotificationPref('lead_created_email', e.target.checked)}
                          className="w-5 h-5 rounded accent-[#0169D9] disabled:opacity-30 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="py-3 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={notificationPreferences.lead_created_whatsapp}
                          disabled={!notificationPreferences.whatsapp_enabled}
                          onChange={(e) => updateNotificationPref('lead_created_whatsapp', e.target.checked)}
                          className="w-5 h-5 rounded accent-[#0169D9] disabled:opacity-30 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="py-3 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={notificationPreferences.lead_created_push}
                          disabled={!notificationPreferences.push_enabled}
                          onChange={(e) => updateNotificationPref('lead_created_push', e.target.checked)}
                          className="w-5 h-5 rounded accent-[#0169D9] disabled:opacity-30 disabled:cursor-not-allowed"
                        />
                      </td>
                    </tr>

                    {/* Menções */}
                    <tr>
                      <td className={`py-3 px-2 text-sm ${
                        isDark ? 'text-white' : 'text-text-primary-light'
                      }`}>
                        Menções
                      </td>
                      <td className="py-3 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={notificationPreferences.mention_email}
                          disabled={!notificationPreferences.email_enabled}
                          onChange={(e) => updateNotificationPref('mention_email', e.target.checked)}
                          className="w-5 h-5 rounded accent-[#0169D9] disabled:opacity-30 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="py-3 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={notificationPreferences.mention_whatsapp}
                          disabled={!notificationPreferences.whatsapp_enabled}
                          onChange={(e) => updateNotificationPref('mention_whatsapp', e.target.checked)}
                          className="w-5 h-5 rounded accent-[#0169D9] disabled:opacity-30 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="py-3 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={notificationPreferences.mention_push}
                          disabled={!notificationPreferences.push_enabled}
                          onChange={(e) => updateNotificationPref('mention_push', e.target.checked)}
                          className="w-5 h-5 rounded accent-[#0169D9] disabled:opacity-30 disabled:cursor-not-allowed"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Horário Silencioso */}
            <div className={`p-6 rounded-xl border ${
              isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-light-elevated border-border-light'
            }`}>
              <h3 className={`font-medium mb-4 ${
                isDark ? 'text-white' : 'text-text-primary-light'
              }`}>
                Horário Silencioso
              </h3>

              <label className="flex items-center gap-3 mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationPreferences.quiet_hours_enabled}
                  onChange={(e) => updateNotificationPref('quiet_hours_enabled', e.target.checked)}
                  className="w-5 h-5 rounded accent-[#0169D9]"
                />
                <span className={`text-sm ${
                  isDark ? 'text-white' : 'text-text-primary-light'
                }`}>
                  Ativar horário silencioso
                </span>
              </label>

              {notificationPreferences.quiet_hours_enabled && (
                <div>
                  <p className={`text-sm mb-3 ${
                    isDark ? 'text-white/70' : 'text-text-secondary-light'
                  }`}>
                    Não receber notificações entre:
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="time"
                      value={notificationPreferences.quiet_hours_start}
                      onChange={(e) => updateNotificationPref('quiet_hours_start', e.target.value)}
                      className={`px-4 py-2 rounded-lg border ${
                        isDark
                          ? 'bg-white/[0.05] border-white/[0.08] text-white'
                          : 'bg-white border-border-light text-text-primary-light'
                      }`}
                    />
                    <span className={isDark ? 'text-white/50' : 'text-text-secondary-light'}>
                      até
                    </span>
                    <input
                      type="time"
                      value={notificationPreferences.quiet_hours_end}
                      onChange={(e) => updateNotificationPref('quiet_hours_end', e.target.value)}
                      className={`px-4 py-2 rounded-lg border ${
                        isDark
                          ? 'bg-white/[0.05] border-white/[0.08] text-white'
                          : 'bg-white border-border-light text-text-primary-light'
                      }`}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Resumo Diário */}
            <div className={`p-6 rounded-xl border ${
              isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-light-elevated border-border-light'
            }`}>
              <h3 className={`font-medium mb-4 ${
                isDark ? 'text-white' : 'text-text-primary-light'
              }`}>
                Resumo Diário
              </h3>

              <label className="flex items-center gap-3 mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationPreferences.daily_summary_enabled}
                  onChange={(e) => updateNotificationPref('daily_summary_enabled', e.target.checked)}
                  className="w-5 h-5 rounded accent-[#0169D9]"
                />
                <span className={`text-sm ${
                  isDark ? 'text-white' : 'text-text-primary-light'
                }`}>
                  Receber resumo diário por email
                </span>
              </label>

              {notificationPreferences.daily_summary_enabled && (
                <div>
                  <p className={`text-sm mb-3 ${
                    isDark ? 'text-white/70' : 'text-text-secondary-light'
                  }`}>
                    Horário do resumo:
                  </p>
                  <input
                    type="time"
                    value={notificationPreferences.daily_summary_time}
                    onChange={(e) => updateNotificationPref('daily_summary_time', e.target.value)}
                    className={`px-4 py-2 rounded-lg border ${
                      isDark
                        ? 'bg-white/[0.05] border-white/[0.08] text-white'
                        : 'bg-white border-border-light text-text-primary-light'
                    }`}
                  />
                </div>
              )}
            </div>

            {/* Botão Salvar */}
            <div className="flex justify-end">
              <button
                onClick={handleSaveNotifications}
                disabled={isLoading || loadingNotifications}
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
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header - Igual ao Dashboard */}
      <header className={cn(
        "h-16 border-b flex items-center justify-between px-6 transition-colors",
        isDark 
          ? "bg-black border-white/[0.08]" 
          : "bg-white border-zinc-200"
      )}>
        <div>
          <h1 className={cn("text-lg font-semibold", isDark ? "text-white" : "text-zinc-900")}>
            Configurações
          </h1>
          <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-zinc-600")}>
            Gerencie suas preferências e configurações do workspace
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          <button 
            onClick={onToggleTheme}
            className={cn(
              "h-9 w-9 rounded-lg transition-colors flex items-center justify-center",
              isDark 
                ? "hover:bg-white/10 text-white/70 hover:text-white" 
                : "hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900"
            )}
            title={isDark ? 'Alternar para modo claro' : 'Alternar para modo escuro'}
          >
            {isDark ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          {/* User Profile */}
          <ProfileMenu theme={theme} onManageMembersClick={onManageMembersClick} />
        </div>
      </header>

      {/* Content Area - Com scroll */}
      <div className={cn(
        "flex-1 overflow-auto",
        isDark ? "bg-black" : "bg-zinc-50"
      )}>
        <div className="max-w-7xl mx-auto px-6 py-8">
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
      </div>

      {/* Invite member modal */}
      {showInviteModal && (
        <InviteMemberModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          theme={theme}
          workspaceId={currentWorkspace?.id || ''}
          onSuccess={(member) => {
            showMessage(`${member.name} foi adicionado com sucesso!`);
            loadMembers();
          }}
        />
      )}
    </div>
  );
}