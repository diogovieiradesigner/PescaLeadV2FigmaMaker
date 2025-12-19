import { useState, useEffect, useRef, useCallback } from 'react';
import { Resizable } from 're-resizable';
import {
  Bot,
  Save,
  RotateCcw,
  Trash2,
  Sun,
  Moon,
  ScrollText,
  Calendar,
  Search,
  UserCheck,
  PhoneOff,
  Wrench,
  MessageSquare,
  ChevronDown,
  Plus,
  X,
  Link2,
  Copy,
  Check,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
  Code2,
  Upload,
  Image as ImageIcon,
  Settings
} from 'lucide-react';
import { useAIBuilderChat } from '../hooks/useAIBuilderChat';
import { AgentConfigForm } from './AgentConfigForm';
import { supabase } from '../utils/supabase/client';
import { ProfileMenu } from './ProfileMenu';
import { PipelineLogsViewer } from './PipelineLogsViewer';
import { FollowUpCategoriesManager } from './FollowUpCategoriesManager';
import { FollowUpModelsManager } from './FollowUpModelsManager';
import { DatabaseSetupNotice } from './DatabaseSetupNotice';
import { AgentSystemToolsManager } from './AgentSystemToolsManager';
import { cn } from './ui/utils';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmDialog } from './ui/confirm-dialog';

interface AIServiceViewProps {
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
  onNavigateToSettings: () => void;
  onNavigateToLogs?: () => void;
}

export function AIServiceView({ theme, onThemeToggle, onNavigateToSettings, onNavigateToLogs }: AIServiceViewProps) {
  const isDark = theme === 'dark';

  return (
    <div className={`relative flex h-full overflow-hidden ${isDark ? 'bg-true-black' : 'bg-light-bg'}`}>
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className={`h-16 px-6 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'bg-true-black border-white/[0.08]' : 'bg-white border-border-light'
        }`}>
          <div className="flex items-center gap-3">
            <h1 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
              Configuração de Agente
            </h1>
            <span className={`px-2 py-0.5 text-xs rounded-full border ${
              isDark 
                ? 'bg-white/[0.05] border-white/[0.1] text-white/60' 
                : 'bg-gray-100 border-gray-200 text-gray-500'
            }`}>
              1 ativo
            </span>
          </div>
          
          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Logs Button */}
            {onNavigateToLogs && (
              <button
                onClick={onNavigateToLogs}
                className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${
                  isDark
                    ? 'hover:bg-white/[0.05] text-white/70'
                    : 'hover:bg-light-elevated text-text-secondary-light'
                }`}
                title="Logs do Sistema"
              >
                <ScrollText className="w-5 h-5" />
                <span className="text-sm font-medium hidden sm:block">Logs</span>
              </button>
            )}

            {/* Theme Toggle */}
            {onThemeToggle && (
              <button
                onClick={onThemeToggle}
                className={`p-2 rounded-lg transition-colors ${
                  isDark
                    ? 'hover:bg-white/[0.05] text-white/70'
                    : 'hover:bg-light-elevated text-text-secondary-light'
                }`}
                title={isDark ? 'Modo claro' : 'Modo escuro'}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            )}

            {/* Profile Menu */}
            <ProfileMenu theme={theme} onNavigateToSettings={onNavigateToSettings} />
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-hidden">
          <AgentsList isDark={isDark} theme={theme} />
        </main>
      </div>
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function AgentsList({ isDark, theme }: { isDark: boolean; theme: 'dark' | 'light' }) {
  // ✅ Usar contexto de autenticação
  const { currentWorkspace } = useAuth();
  
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [existingAgentId, setExistingAgentId] = useState<string | null>(null);
  const [loadingAgent, setLoadingAgent] = useState(true);
  const [tablesExist, setTablesExist] = useState(true);
  const [checkingTables, setCheckingTables] = useState(false);
  
  // Estados para controlar salvamento
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveFunction = useRef<(() => Promise<void>) | null>(null);

  // Estado para sincronizar atualização de categorias entre componentes
  const [categoriesRefreshTrigger, setCategoriesRefreshTrigger] = useState(0);

  // Função para verificar tabelas
  const checkTablesExistence = async () => {
    setCheckingTables(true);
    try {
      const { error: tableError } = await supabase
        .from('follow_up_categories')
        .select('id')
        .limit(1);

      if (tableError && (tableError.code === 'PGRST205' || tableError.code === '42501' || tableError.message?.includes('Could not find') || tableError.message?.includes('permission denied'))) {
        setTablesExist(false);
      } else {
        setTablesExist(true);
      }
    } catch (error) {
      console.error('Error checking tables:', error);
    } finally {
      setCheckingTables(false);
    }
  };

  // Buscar workspace e agente existente
  useEffect(() => {
    async function loadExistingAgent() {
      try {
        // ✅ Usar workspace do contexto de autenticação
        if (!currentWorkspace?.id) {
          console.log('[AIServiceView] ⚠️ No current workspace in context');
          return;
        }

        const wsId = currentWorkspace.id;
        console.log('[AIServiceView] ✅ Using workspace from context:', {
          id: wsId,
          name: currentWorkspace.name,
          role: currentWorkspace.role
        });
        setWorkspaceId(wsId);

        // Buscar agente existente para este workspace
        // IMPORTANTE: usar .maybeSingle() ao invés de .single() para evitar erro quando não há agentes
        const { data: existingAgent, error: agentError } = await supabase
          .from('ai_agents')
          .select('id, name, created_at')
          .eq('workspace_id', wsId)
          .order('created_at', { ascending: true }) // Pegar o primeiro (original)
          .limit(1)
          .maybeSingle();

        if (agentError) {
          console.error('[AIServiceView] Erro ao buscar agente:', agentError);
        }

        if (existingAgent) {
          console.log('[AIServiceView] ✅ Agente existente encontrado:', {
            id: existingAgent.id,
            name: existingAgent.name,
            created_at: existingAgent.created_at
          });
          setExistingAgentId(existingAgent.id);
        } else {
          console.log('[AIServiceView] ℹ️ Nenhum agente encontrado. Modo CRIAÇÃO ativado.');
          setExistingAgentId(null);
        }

        // Verificar se tabelas de follow-up existem
        await checkTablesExistence();
      } catch (error) {
        console.error('[AIServiceView] Error loading existing agent:', error);
      } finally {
        setLoadingAgent(false);
      }
    }

    loadExistingAgent();
  }, [currentWorkspace?.id]); // ✅ Re-executar quando workspace mudar

  return (
    <div className="h-full flex overflow-hidden">
      {/* LEFT COLUMN: Preview Chat - Resizable */}
      <Resizable
        defaultSize={{
          width: '50%',
          height: '100%',
        }}
        minWidth="30%"
        maxWidth="70%"
        enable={{
          top: false,
          right: true,
          bottom: false,
          left: false,
          topRight: false,
          bottomRight: false,
          bottomLeft: false,
          topLeft: false,
        }}
        handleStyles={{
          right: {
            width: '4px',
            right: '-2px',
            cursor: 'col-resize',
          },
        }}
        handleClasses={{
          right: isDark 
            ? 'hover:bg-[#0169D9]/50 transition-colors' 
            : 'hover:bg-[#0169D9]/30 transition-colors',
        }}
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        <AIBuilderChatIntegrated isDark={isDark} theme={theme} agentId={existingAgentId} workspaceId={workspaceId} />
      </Resizable>

      {/* RIGHT COLUMN: Configuration */}
      <div className={`flex-1 flex flex-col overflow-hidden ${ 
        isDark ? 'bg-transparent' : 'bg-white'
      }`}>
        {/* Header */}
        <div className="px-8 py-6 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isDark ? 'bg-white/[0.05]' : 'bg-blue-50'
          }`}>
            <Bot className={`w-6 h-6 ${isDark ? 'text-white' : 'text-[#0169D9]'}`} />
          </div>
          <div className="flex-1">
            <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
              Configuração
            </h2>
            <p className={`text-sm ${isDark ? 'text-white/60' : 'text-text-secondary-light'}`}>
              {loadingAgent ? 'Carregando...' : existingAgentId ? 'Edite o comportamento do agente' : 'Defina o comportamento do agente'}
            </p>
          </div>
          
          {/* Tags de Status */}
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <div className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border",
                isDark 
                  ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" 
                  : "bg-yellow-50 text-yellow-700 border-yellow-200"
              )}>
                Não salvo
              </div>
            )}
            <div className={`px-3 py-1 rounded-full text-xs font-medium border ${
              isDark 
                ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                : 'bg-green-50 text-green-700 border-green-200'
            }`}>
              {existingAgentId ? 'Ativo' : 'Novo'}
            </div>
          </div>
          
          {/* Botão Salvar */}
          {saveFunction.current && (
            <button
              onClick={async () => {
                if (saveFunction.current) {
                  setSaving(true);
                  try {
                    await saveFunction.current();
                    setHasUnsavedChanges(false); // ✅ Resetar após salvar com sucesso
                  } catch (error) {
                    console.error('[AIServiceView] Erro ao salvar:', error);
                  } finally {
                    setSaving(false);
                  }
                }
              }}
              disabled={saving || !hasUnsavedChanges}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                saving || !hasUnsavedChanges
                  ? "bg-gray-400 cursor-not-allowed opacity-50"
                  : "bg-[#0169D9] hover:bg-[#0159c9] text-white"
              )}
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar
                </>
              )}
            </button>
          )}
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-8 pb-8 space-y-6">
          {!loadingAgent && (
            <>
              <AgentConfigForm 
                isDark={isDark} 
                agentId={existingAgentId}
                onSaved={(savedId) => {
                  console.log('[AIServiceView] Agent saved:', savedId);
                  setExistingAgentId(savedId);
                }}
                onHasChanges={setHasUnsavedChanges}
                onSaveRef={(fn) => saveFunction.current = fn}
              />

              {/* Separator */}
              <div className={cn(
                "my-8 border-t",
                isDark ? "border-white/[0.08]" : "border-zinc-200"
              )} />

              {/* Follow-ups Management */}
              {existingAgentId && (
                <FollowUpCategoriesManager 
                  isDark={isDark} 
                  agentId={existingAgentId} 
                  workspaceId={workspaceId} 
                  refreshTrigger={categoriesRefreshTrigger}
                  onCategoryChanged={() => setCategoriesRefreshTrigger(prev => prev + 1)}
                />
              )}

              <div className={cn(
                "my-6 border-t",
                isDark ? "border-white/[0.08]" : "border-zinc-200"
              )} />

              <FollowUpModelsManager 
                isDark={isDark} 
                workspaceId={workspaceId} 
                categoriesRefreshTrigger={categoriesRefreshTrigger}
              />

              <div className={cn(
                "my-6 border-t",
                isDark ? "border-white/[0.08]" : "border-zinc-200"
              )} />

              {/* System Tools Management */}
              {existingAgentId && workspaceId && (
                <AgentSystemToolsManager
                  isDark={isDark}
                  agentId={existingAgentId}
                  workspaceId={workspaceId}
                />
              )}

            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// INTEGRATED CHAT COMPONENT FOR AI BUILDER
// ============================================

function AIBuilderChatIntegrated({ isDark, theme, agentId, workspaceId }: { isDark: boolean; theme: 'dark' | 'light'; agentId: string | null; workspaceId: string | null }) {
  const {
    conversation,
    isLoading,
    error,
    queueSize,
    handleSendMessage,
    handleDeleteMessage,
    handleResetChat,
    handleResetAndStartTemplate,
    // Multiple conversations
    previewConversations,
    selectedConversationId,
    selectConversation,
    createNewConversation,
    deleteConversation,
    deleteAllConversations
  } = useAIBuilderChat(agentId, workspaceId);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateMessage, setTemplateMessage] = useState('');
  const [showConversationDropdown, setShowConversationDropdown] = useState(false);
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const [newConversationTemplate, setNewConversationTemplate] = useState('');
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; conversationId: string | null; isDeleteAll?: boolean }>({
    isOpen: false,
    conversationId: null,
    isDeleteAll: false
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Estados para Links Públicos
  const [showPublicLinkDropdown, setShowPublicLinkDropdown] = useState(false);
  const [publicLinks, setPublicLinks] = useState<any[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [expandedLinkId, setExpandedLinkId] = useState<string | null>(null);
  const [resettingLinkId, setResettingLinkId] = useState<string | null>(null);
  const [uploadingIcon, setUploadingIcon] = useState<string | null>(null); // 'button' | 'avatar' | null
  const [widgetConfigModalLink, setWidgetConfigModalLink] = useState<any | null>(null); // Link selecionado para configurar widget

  // Ref para input de arquivo oculto
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingUploadType, setPendingUploadType] = useState<'button' | 'avatar' | null>(null);
  const [pendingUploadLinkId, setPendingUploadLinkId] = useState<string | null>(null);

  // Upload de ícone customizado para o widget
  const uploadWidgetIcon = async (linkId: string, iconType: 'button' | 'avatar', file: File) => {
    if (!workspaceId) return;

    setUploadingIcon(iconType);
    try {
      // Validar tipo de arquivo
      const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        alert('Tipo de arquivo não suportado. Use PNG, JPG, GIF, WebP ou SVG.');
        return;
      }

      // Validar tamanho (max 1MB)
      if (file.size > 1048576) {
        alert('Arquivo muito grande. Máximo 1MB.');
        return;
      }

      // Gerar nome único para o arquivo
      const ext = file.name.split('.').pop() || 'png';
      const fileName = `${workspaceId}/${linkId}/${iconType}-${Date.now()}.${ext}`;

      // Upload para o Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('widget-icons')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Obter URL pública
      const { data: publicUrlData } = supabase.storage
        .from('widget-icons')
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData.publicUrl;

      // Atualizar o link no banco com a URL do ícone
      const updateField = iconType === 'button' ? 'widget_button_icon_url' : 'widget_avatar_icon_url';
      const { error: updateError } = await supabase
        .from('ai_public_chat_links')
        .update({ [updateField]: publicUrl })
        .eq('id', linkId);

      if (updateError) throw updateError;

      // Atualizar estado local
      setPublicLinks(prev => prev.map(link =>
        link.id === linkId ? { ...link, [updateField]: publicUrl } : link
      ));

      // Atualizar estado do modal se estiver aberto
      if (widgetConfigModalLink && widgetConfigModalLink.id === linkId) {
        setWidgetConfigModalLink({ ...widgetConfigModalLink, [updateField]: publicUrl });
      }

      console.log(`✅ Widget ${iconType} icon uploaded:`, publicUrl);
    } catch (err) {
      console.error('Error uploading widget icon:', err);
      alert('Erro ao fazer upload do ícone. Tente novamente.');
    } finally {
      setUploadingIcon(null);
    }
  };

  // Remover ícone customizado
  const removeWidgetIcon = async (linkId: string, iconType: 'button' | 'avatar') => {
    try {
      const updateField = iconType === 'button' ? 'widget_button_icon_url' : 'widget_avatar_icon_url';
      const { error } = await supabase
        .from('ai_public_chat_links')
        .update({ [updateField]: null })
        .eq('id', linkId);

      if (error) throw error;

      // Atualizar estado local
      setPublicLinks(prev => prev.map(link =>
        link.id === linkId ? { ...link, [updateField]: null } : link
      ));
    } catch (err) {
      console.error('Error removing widget icon:', err);
    }
  };

  // Handler para seleção de arquivo
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && pendingUploadType && pendingUploadLinkId) {
      uploadWidgetIcon(pendingUploadLinkId, pendingUploadType, file);
    }
    // Reset
    e.target.value = '';
    setPendingUploadType(null);
    setPendingUploadLinkId(null);
  };

  // Trigger file input
  const triggerFileUpload = (linkId: string, iconType: 'button' | 'avatar') => {
    setPendingUploadLinkId(linkId);
    setPendingUploadType(iconType);
    fileInputRef.current?.click();
  };

  // Ref para o container de mensagens (scrollable)
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Scroll automático quando mensagens mudarem
  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, []);
  
  // Rolar quando mensagens mudarem ou loading mudar
  useEffect(() => {
    scrollToBottom();
  }, [conversation.messages, scrollToBottom]);

  // Carregar links públicos quando o dropdown abrir
  const loadPublicLinks = useCallback(async () => {
    if (!agentId || !workspaceId) return;
    setLoadingLinks(true);
    try {
      const { data, error } = await supabase
        .from('ai_public_chat_links')
        .select('*')
        .eq('agent_id', agentId)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPublicLinks(data || []);
    } catch (err) {
      console.error('Error loading public links:', err);
    } finally {
      setLoadingLinks(false);
    }
  }, [agentId, workspaceId]);

  // Criar novo link público
  const createPublicLink = async () => {
    if (!agentId || !workspaceId) return;
    setCreatingLink(true);
    try {
      const { data, error } = await supabase.rpc('create_public_chat_link', {
        p_agent_id: agentId,
        p_workspace_id: workspaceId,
        p_name: null,
        p_welcome_message: null,
        p_chat_title: 'Chat de Atendimento',
        p_chat_subtitle: null,
        p_expires_at: null,
        p_max_conversations: null
      });

      if (error) throw error;
      if (data?.success) {
        await loadPublicLinks();
      }
    } catch (err) {
      console.error('Error creating public link:', err);
    } finally {
      setCreatingLink(false);
    }
  };

  // Toggle link ativo/inativo
  const toggleLinkActive = async (linkId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('ai_public_chat_links')
        .update({ is_active: !currentStatus })
        .eq('id', linkId);

      if (error) throw error;
      setPublicLinks(prev => prev.map(link =>
        link.id === linkId ? { ...link, is_active: !currentStatus } : link
      ));
    } catch (err) {
      console.error('Error toggling link:', err);
    }
  };

  // Copiar apenas o link para clipboard
  const copyLinkToClipboard = (link: any) => {
    // ✅ URL limpa sem hash - usa rota pública /chat/:slug
    const publicUrl = `${window.location.origin}/chat/${link.public_slug}`;

    navigator.clipboard.writeText(publicUrl);
    setCopiedLinkId(link.id);
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  // Copiar link + senha para compartilhar com cliente
  const copyLinkWithPassword = (link: any) => {
    // ✅ URL limpa sem hash - usa rota pública /chat/:slug
    const publicUrl = `${window.location.origin}/chat/${link.public_slug}`;
    const fullText = `🔗 Link do Chat: ${publicUrl}\n🔑 Senha de Acesso: ${link.access_code}`;

    navigator.clipboard.writeText(fullText);
    setCopiedLinkId(`${link.id}-full`);
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  // Deletar link
  const deletePublicLink = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from('ai_public_chat_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;
      setPublicLinks(prev => prev.filter(link => link.id !== linkId));
    } catch (err) {
      console.error('Error deleting link:', err);
    }
  };

  // Resetar chat do link (limpa conversas e incrementa contador)
  const resetPublicLinkChat = async (linkId: string) => {
    setResettingLinkId(linkId);
    try {
      // Deletar todas as conversas desse link
      const { error: deleteError } = await supabase
        .from('ai_public_chat_conversations')
        .delete()
        .eq('link_id', linkId);

      if (deleteError) throw deleteError;

      // Incrementar contador de resets e zerar contadores de uso
      const link = publicLinks.find(l => l.id === linkId);
      const newResetCount = (link?.reset_count || 0) + 1;

      const { error: updateError } = await supabase
        .from('ai_public_chat_links')
        .update({
          reset_count: newResetCount,
          current_conversations: 0,
          total_messages: 0
        })
        .eq('id', linkId);

      if (updateError) throw updateError;

      // Atualizar estado local
      setPublicLinks(prev => prev.map(l =>
        l.id === linkId
          ? { ...l, reset_count: newResetCount, current_conversations: 0, total_messages: 0 }
          : l
      ));
    } catch (err) {
      console.error('Error resetting link chat:', err);
    } finally {
      setResettingLinkId(null);
    }
  };

  // Carregar links quando agente/workspace estiver disponível
  useEffect(() => {
    if (agentId && workspaceId) {
      loadPublicLinks();
    }
  }, [agentId, workspaceId, loadPublicLinks]);

  if (isLoading && conversation.messages.length === 0) {
    return (
      <div className={`h-full flex items-center justify-center border-r ${
        isDark ? 'bg-elevated border-white/[0.08]' : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#0169D9] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            Carregando chat...
          </p>
        </div>
      </div>
    );
  }

  if (error && conversation.messages.length === 0) {
    return (
      <div className={`h-full flex items-center justify-center border-r ${
        isDark ? 'bg-elevated border-white/[0.08]' : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="text-center">
          <p className={`text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>
            {error || 'Erro ao carregar conversa'}
          </p>
          <button 
            onClick={handleResetChat}
            className="mt-4 text-xs underline opacity-70 hover:opacity-100"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col border-r overflow-hidden ${
      isDark ? 'bg-elevated border-white/[0.08]' : 'bg-gray-50 border-gray-200'
    }`}>
      {/* Input de arquivo oculto para upload de ícones */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
        className="hidden"
      />

      {/* Chat Header */}
      <div className={`h-20 px-6 border-b flex items-center justify-between shrink-0 ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`}>
        <div className="flex items-center gap-3">
           <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Pré-visualizar</span>

           {/* Conversation Selector Dropdown */}
           {agentId && (
             <div className="relative">
               <button
                 onClick={() => setShowConversationDropdown(!showConversationDropdown)}
                 className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                   isDark
                     ? 'bg-white/[0.05] hover:bg-white/[0.08] text-white/70'
                     : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                 }`}
               >
                 <MessageSquare className="w-3.5 h-3.5" />
                 <span className="max-w-[120px] truncate">
                   {previewConversations.find(c => c.id === selectedConversationId)?.name || 'Nova conversa'}
                 </span>
                 <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showConversationDropdown ? 'rotate-180' : ''}`} />
               </button>

               {/* Dropdown Menu */}
               {showConversationDropdown && (
                 <>
                   <div className="fixed inset-0 z-40" onClick={() => setShowConversationDropdown(false)} />
                   <div className={`absolute left-0 top-full mt-1 w-64 rounded-lg shadow-xl border z-50 overflow-hidden ${
                     isDark ? 'bg-elevated border-white/[0.08]' : 'bg-white border-gray-200'
                   }`}>
                     {/* New Conversation Button */}
                     <button
                       onClick={() => {
                         setShowConversationDropdown(false);
                         setShowNewConversationModal(true);
                       }}
                       className={`w-full px-4 py-3 text-left text-sm flex items-center gap-2 border-b transition-colors ${
                         isDark
                           ? 'hover:bg-white/[0.05] text-[#0169D9] border-white/[0.08]'
                           : 'hover:bg-gray-50 text-blue-600 border-gray-100'
                       }`}
                     >
                       <Plus className="w-4 h-4" />
                       <span className="font-medium">Nova Conversa</span>
                     </button>

                     {/* Conversations List */}
                     <div className="max-h-[300px] overflow-y-auto">
                       {previewConversations.length === 0 ? (
                         <div className={`px-4 py-6 text-center text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                           Nenhuma conversa ainda
                         </div>
                       ) : (
                         previewConversations.map((conv) => (
                           <div
                             key={conv.id}
                             className={`group flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors ${
                               selectedConversationId === conv.id
                                 ? isDark ? 'bg-white/[0.08]' : 'bg-blue-50'
                                 : isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-gray-50'
                             }`}
                             onClick={() => {
                               selectConversation(conv.id);
                               setShowConversationDropdown(false);
                             }}
                           >
                             <div className="flex-1 min-w-0">
                               <div className={`text-sm font-medium truncate ${
                                 isDark ? 'text-white/90' : 'text-gray-900'
                               }`}>
                                 {conv.name}
                               </div>
                               <div className={`text-xs truncate mt-0.5 ${
                                 isDark ? 'text-white/40' : 'text-gray-400'
                               }`}>
                                 {conv.lastMessage || `${conv.messageCount} mensagens`}
                               </div>
                             </div>
                             {/* Só mostrar botão de delete se houver mais de 1 conversa */}
                             {previewConversations.length > 1 && (
                               <button
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setDeleteConfirmModal({ isOpen: true, conversationId: conv.id });
                                 }}
                                 className={`opacity-0 group-hover:opacity-100 p-1.5 rounded transition-all ${
                                   isDark
                                     ? 'hover:bg-red-500/20 text-white/40 hover:text-red-400'
                                     : 'hover:bg-red-50 text-gray-400 hover:text-red-500'
                                 }`}
                               >
                                 <Trash2 className="w-3.5 h-3.5" />
                               </button>
                             )}
                           </div>
                         ))
                       )}
                     </div>

                     {/* Delete All Button */}
                     {previewConversations.length > 1 && (
                       <button
                         onClick={(e) => {
                           e.stopPropagation();
                           setShowConversationDropdown(false);
                           setDeleteConfirmModal({ isOpen: true, conversationId: null, isDeleteAll: true });
                         }}
                         className={`w-full px-4 py-3 text-left text-sm flex items-center gap-2 border-t transition-colors ${
                           isDark
                             ? 'hover:bg-red-500/10 text-red-400 border-white/[0.08]'
                             : 'hover:bg-red-50 text-red-500 border-gray-100'
                         }`}
                       >
                         <Trash2 className="w-4 h-4" />
                         <span className="font-medium">Limpar Histórico</span>
                         <span className={`ml-auto text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                           ({previewConversations.length - 1})
                         </span>
                       </button>
                     )}
                   </div>
                 </>
               )}
             </div>
           )}
        </div>
        <div className="flex items-center gap-1">
          {/* Widget Config Button - Always visible when agent exists */}
          {agentId && (
            <button
              onClick={async () => {
                // Se já tem links, abre o modal com o primeiro ativo
                if (publicLinks.length > 0) {
                  const activeLink = publicLinks.find(l => l.is_active) || publicLinks[0];
                  if (activeLink) {
                    setWidgetConfigModalLink(activeLink);
                  }
                } else {
                  // Se não tem links, cria um automaticamente
                  setCreatingLink(true);
                  try {
                    const { data, error } = await supabase.rpc('create_public_chat_link', {
                      p_agent_id: agentId,
                      p_workspace_id: workspaceId,
                      p_name: 'Widget Embed',
                      p_welcome_message: null,
                      p_chat_title: 'Chat de Atendimento',
                      p_chat_subtitle: null,
                      p_expires_at: null,
                      p_max_conversations: null
                    });
                    if (error) throw error;
                    if (data?.success && data?.link_id) {
                      // Buscar o link criado do banco
                      const { data: newLink, error: fetchError } = await supabase
                        .from('ai_public_chat_links')
                        .select('*')
                        .eq('id', data.link_id)
                        .single();

                      if (!fetchError && newLink) {
                        setPublicLinks([newLink]);
                        setWidgetConfigModalLink(newLink);
                      }
                    }
                  } catch (err) {
                    console.error('Error creating link for widget:', err);
                  } finally {
                    setCreatingLink(false);
                  }
                }
              }}
              className={`p-2 rounded-lg transition-colors ${
                isDark ? 'hover:bg-white/10 text-purple-400 hover:text-purple-300' : 'hover:bg-gray-200 text-purple-500 hover:text-purple-600'
              }`}
              title="Configurar Widget Embeddable"
            >
              <Code2 className="w-4 h-4" />
            </button>
          )}

          {/* Public Link Button */}
          {agentId && (
            <div className="relative">
              <button
                onClick={() => setShowPublicLinkDropdown(!showPublicLinkDropdown)}
                className={`p-2 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-white/10 text-white/60 hover:text-white' : 'hover:bg-gray-200 text-gray-400 hover:text-gray-600'
                }`}
                title="Links Públicos"
              >
                <Link2 className="w-4 h-4" />
              </button>

              {/* Public Link Dropdown */}
              {showPublicLinkDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowPublicLinkDropdown(false)}
                  />
                  <div className={`absolute right-0 top-full mt-2 w-80 rounded-lg shadow-xl border z-20 ${
                    isDark ? 'bg-[#1C1C1E] border-white/[0.08]' : 'bg-white border-gray-200'
                  }`}>
                    <div className={`px-4 py-3 border-b ${isDark ? 'border-white/[0.08]' : 'border-gray-100'}`}>
                      <div className="flex items-center justify-between">
                        <h3 className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          Links Públicos
                        </h3>
                        <button
                          onClick={createPublicLink}
                          disabled={creatingLink}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            isDark
                              ? 'bg-[#0169D9] hover:bg-[#0169D9]/80 text-white'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          } disabled:opacity-50`}
                        >
                          {creatingLink ? (
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <Plus className="w-3 h-3" />
                          )}
                          Criar
                        </button>
                      </div>
                      <p className={`text-xs mt-1 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                        Compartilhe com clientes para testar o chat
                      </p>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto">
                      {loadingLinks ? (
                        <div className="py-8 text-center">
                          <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
                        </div>
                      ) : publicLinks.length === 0 ? (
                        <div className={`py-8 text-center text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                          Nenhum link criado
                        </div>
                      ) : (
                        publicLinks.map((link) => (
                          <div
                            key={link.id}
                            className={`border-b last:border-b-0 ${
                              isDark ? 'border-white/[0.05]' : 'border-gray-50'
                            }`}
                          >
                            {/* Header do Link */}
                            <div className="p-4">
                              {/* Status + Expand */}
                              <div className="flex items-center justify-between mb-3">
                                <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                                  link.is_active
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {link.is_active ? '● Ativo' : '○ Inativo'}
                                </span>
                                <button
                                  onClick={() => setExpandedLinkId(expandedLinkId === link.id ? null : link.id)}
                                  className={`p-1.5 rounded transition-colors ${
                                    isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-500'
                                  }`}
                                  title="Ver detalhes"
                                >
                                  <ChevronDown className={`w-4 h-4 transition-transform ${expandedLinkId === link.id ? 'rotate-180' : ''}`} />
                                </button>
                              </div>

                              {/* Senha - Bem clara */}
                              <div className={`mb-3 p-3 rounded-lg ${isDark ? 'bg-white/[0.03]' : 'bg-gray-50'}`}>
                                <div className={`text-[10px] uppercase tracking-wider mb-1.5 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                                  🔑 Senha de Acesso
                                </div>
                                <div className={`text-xl font-mono font-bold tracking-[0.3em] ${
                                  isDark ? 'text-[#0169D9]' : 'text-blue-600'
                                }`}>
                                  {link.access_code}
                                </div>
                              </div>

                              {/* Link */}
                              <div className={`mb-3`}>
                                <div className={`text-[10px] uppercase tracking-wider mb-1.5 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                                  🔗 Link Público
                                </div>
                                <div className={`text-xs truncate ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                                  {window.location.origin}/chat/{link.public_slug}
                                </div>
                              </div>

                              {/* Botões de Copiar */}
                              <div className="flex gap-2">
                                <button
                                  onClick={() => copyLinkToClipboard(link)}
                                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                    isDark
                                      ? 'bg-white/[0.05] hover:bg-white/[0.08] text-white/70'
                                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                                  }`}
                                  title="Copiar apenas o link"
                                >
                                  {copiedLinkId === link.id ? (
                                    <Check className="w-3.5 h-3.5 text-green-500" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                  Copiar Link
                                </button>
                                <button
                                  onClick={() => copyLinkWithPassword(link)}
                                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                    isDark
                                      ? 'bg-[#0169D9]/20 hover:bg-[#0169D9]/30 text-[#0169D9]'
                                      : 'bg-blue-100 hover:bg-blue-200 text-blue-600'
                                  }`}
                                  title="Copiar link + senha para enviar ao cliente"
                                >
                                  {copiedLinkId === `${link.id}-full` ? (
                                    <Check className="w-3.5 h-3.5 text-green-500" />
                                  ) : (
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  )}
                                  Enviar p/ Cliente
                                </button>
                              </div>
                            </div>

                            {/* Dropdown de Detalhes */}
                            {expandedLinkId === link.id && (
                              <div className={`px-4 pb-3 pt-0 space-y-3 ${isDark ? 'bg-black/20' : 'bg-gray-50'}`}>
                                {/* Estatísticas */}
                                <div className="grid grid-cols-3 gap-2">
                                  <div className={`p-2 rounded-lg text-center ${isDark ? 'bg-white/5' : 'bg-white'}`}>
                                    <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                      {link.total_messages || 0}
                                    </div>
                                    <div className={`text-[9px] uppercase ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                                      Mensagens
                                    </div>
                                  </div>
                                  <div className={`p-2 rounded-lg text-center ${isDark ? 'bg-white/5' : 'bg-white'}`}>
                                    <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                      {link.current_conversations || 0}
                                    </div>
                                    <div className={`text-[9px] uppercase ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                                      Conversas
                                    </div>
                                  </div>
                                  <div className={`p-2 rounded-lg text-center ${isDark ? 'bg-white/5' : 'bg-white'}`}>
                                    <div className={`text-lg font-bold ${isDark ? 'text-[#0169D9]' : 'text-blue-600'}`}>
                                      {link.reset_count || 0}
                                    </div>
                                    <div className={`text-[9px] uppercase ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                                      Resets
                                    </div>
                                  </div>
                                </div>

                                {/* Ações */}
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => resetPublicLinkChat(link.id)}
                                    disabled={resettingLinkId === link.id}
                                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                      isDark
                                        ? 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-400'
                                        : 'bg-orange-100 hover:bg-orange-200 text-orange-600'
                                    } disabled:opacity-50`}
                                  >
                                    {resettingLinkId === link.id ? (
                                      <div className="w-3 h-3 border-2 border-orange-400/30 border-t-orange-400 rounded-full animate-spin" />
                                    ) : (
                                      <RotateCcw className="w-3 h-3" />
                                    )}
                                    Resetar Chat
                                  </button>
                                  <button
                                    onClick={() => toggleLinkActive(link.id, link.is_active)}
                                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                      link.is_active
                                        ? isDark ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400' : 'bg-yellow-100 hover:bg-yellow-200 text-yellow-600'
                                        : isDark ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400' : 'bg-green-100 hover:bg-green-200 text-green-600'
                                    }`}
                                  >
                                    {link.is_active ? (
                                      <>
                                        <ToggleLeft className="w-3 h-3" />
                                        Desativar
                                      </>
                                    ) : (
                                      <>
                                        <ToggleRight className="w-3 h-3" />
                                        Ativar
                                      </>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => deletePublicLink(link.id)}
                                    className={`p-2 rounded-lg transition-colors ${
                                      isDark ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400' : 'bg-red-100 hover:bg-red-200 text-red-600'
                                    }`}
                                    title="Excluir link"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Chat Content - Full height */}
      <div className={`flex-1 flex flex-col min-h-0 ${isDark ? 'bg-true-black' : 'bg-light-bg'}`}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4 space-y-4" ref={messagesContainerRef}>
          {!agentId && conversation.messages.length === 0 ? (
            <div className="flex items-center justify-center h-full opacity-50 text-sm">
              Nenhum agente selecionado
            </div>
          ) : (
            conversation.messages.map((message) => {
              return (
              <div key={message.id} className="group">
                {/* Mensagens 'sent' vão para direita (azul), 'received' vão para esquerda (cinza) */}
                {message.type === 'sent' ? (
                  <div className="flex justify-end items-start gap-2">
                    {/* Delete button (appears on hover) */}
                    <button
                      onClick={() => handleDeleteMessage(message.id)}
                      className={`opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg mt-1 ${
                        isDark 
                          ? 'hover:bg-white/10 text-white/40 hover:text-red-400' 
                          : 'hover:bg-gray-100 text-gray-400 hover:text-red-600'
                      }`}
                      title="Deletar mensagem"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm bg-[#0169D9] text-white rounded-tr-none">
                      {message.text}
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-start items-start gap-2">
                    <div className="flex flex-col max-w-[85%]">
                      <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        isDark 
                          ? 'bg-white/[0.08] text-white rounded-tl-none' 
                          : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                      }`}>
                        {message.text}
                      </div>
                      
                      {/* Metadata + Pipeline (inline) */}
                      {!message.isLoading && message.metadata && (
                        <div className="mt-1 px-1">
                          {/* Tool Calls Badge (destaque) */}
                          {message.metadata.toolCalls && message.metadata.toolCalls.length > 0 && (
                            <div className="mb-1 flex flex-wrap gap-1">
                              {message.metadata.toolCalls.map((tool, idx) => {
                                const getToolIcon = () => {
                                  switch (tool.name) {
                                    case 'agendar_reuniao': return <Calendar size={10} />;
                                    case 'consultar_disponibilidade': return <Search size={10} />;
                                    case 'transferir_para_humano': return <UserCheck size={10} />;
                                    case 'finalizar_atendimento': return <PhoneOff size={10} />;
                                    default: return <Wrench size={10} />;
                                  }
                                };
                                const getToolLabel = () => {
                                  switch (tool.name) {
                                    case 'agendar_reuniao': return 'Agendar';
                                    case 'consultar_disponibilidade': return 'Disponibilidade';
                                    case 'transferir_para_humano': return 'Transferir';
                                    case 'finalizar_atendimento': return 'Finalizar';
                                    default: return tool.displayName || tool.name;
                                  }
                                };
                                return (
                                  <span
                                    key={idx}
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${
                                      tool.status === 'success'
                                        ? isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700'
                                        : tool.status === 'error'
                                          ? isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-700'
                                          : isDark ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-100 text-gray-600'
                                    }`}
                                    title={`Tool: ${tool.name}${tool.isPreview ? ' (Preview)' : ''}`}
                                  >
                                    {getToolIcon()}
                                    {getToolLabel()}
                                    {tool.isPreview && <span className="opacity-60">(P)</span>}
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {/* Linha de métricas */}
                          <div className={`text-[10px] flex items-center gap-2 flex-wrap ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                            {/* Pipeline Logs (primeiro) */}
                            {message.metadata.pipeline && (
                              <div className="flex-shrink-0">
                                <PipelineLogsViewer
                                  pipeline={message.metadata.pipeline}
                                  defaultExpanded={false}
                                  isDark={isDark}
                                />
                              </div>
                            )}

                            {/* Tokens e Tempo: só mostrar se NÃO houver pipeline (para evitar duplicação) */}
                            {!message.metadata.pipeline && (
                              <>
                                {/* Tokens */}
                                {message.metadata.tokensUsed != null && message.metadata.tokensUsed > 0 && (
                                  <span>🎫 {message.metadata.tokensUsed} tokens</span>
                                )}

                                {/* Tempo */}
                                {message.metadata.durationMs != null && message.metadata.durationMs > 0 && (
                                  <span>⏱️ {(message.metadata.durationMs / 1000).toFixed(1)}s</span>
                                )}
                              </>
                            )}

                            {/* Outras métricas */}
                            {message.metadata.model && (
                              <span>🤖 {message.metadata.model.split('/').pop()}</span>
                            )}
                            {message.metadata.ragUsed && (
                              <span className="text-blue-400">📚 RAG</span>
                            )}
                            {message.metadata.specialistUsed && (
                              <span className="text-purple-400">🎯 {message.metadata.specialistUsed}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Delete button (appears on hover) */}
                    <button
                      onClick={() => handleDeleteMessage(message.id)}
                      className={`opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg mt-1 ${
                        isDark 
                          ? 'hover:bg-white/10 text-white/40 hover:text-red-400' 
                          : 'hover:bg-gray-100 text-gray-400 hover:text-red-600'
                      }`}
                      title="Deletar mensagem"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )})
          )}
        </div>

        {/* Input */}
        <div className={`px-6 py-4 border-t ${isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'border-border-light'}`}>
          {/* Queue indicator */}
          {queueSize > 0 && (
            <div className={`mb-2 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 ${
              isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'
            }`}>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span>{queueSize} mensagem{queueSize > 1 ? 's' : ''} na fila</span>
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              type="text"
              placeholder={agentId ? "Digite uma mensagem... (pode enviar múltiplas)" : "Selecione um agente para começar"}
              disabled={!agentId}
              className={`flex-1 border px-4 py-2 rounded-lg transition-all focus:outline-none focus:border-[#0169D9] ${
                isDark
                  ? 'bg-elevated border-white/[0.08] text-white placeholder-white/40 disabled:opacity-50'
                  : 'bg-light-elevated border-border-light text-text-primary-light placeholder-text-secondary-light disabled:opacity-50'
              }`}
              onKeyDown={(e) => {
                // Verifica se é Cmd+A (Mac) ou Ctrl+A (Windows/Linux)
                // Incluímos também C, V, X, Z para garantir copiar/colar/desfazer
                const isModifier = e.metaKey || e.ctrlKey;
                const key = e.key.toLowerCase();
                
                if (isModifier && ['a', 'c', 'v', 'x', 'z'].includes(key)) {
                  // Impede que o evento suba para listeners globais que possam bloquear a ação
                  e.stopPropagation();
                  // Tenta impedir outros listeners nativos no mesmo nível
                  e.nativeEvent && e.nativeEvent.stopImmediatePropagation && e.nativeEvent.stopImmediatePropagation();
                  return;
                }

                if (e.key === 'Enter') {
                  e.preventDefault();
                  const input = e.currentTarget;
                  if (input.value.trim()) {
                    handleSendMessage({ text: input.value.trim() });
                    input.value = '';
                  }
                }
              }}
            />
            <button
              onClick={() => {
                const input = document.querySelector('input[placeholder*="Digite uma mensagem"]') as HTMLInputElement;
                if (input?.value.trim()) {
                  handleSendMessage({ text: input.value.trim() });
                  input.value = '';
                }
              }}
              disabled={!agentId}
              className={`p-2 rounded-lg transition-colors ${
                !agentId 
                 ? 'bg-gray-400 cursor-not-allowed'
                 : isLoading
                   ? 'bg-[#0169D9] cursor-wait'
                   : 'bg-[#0169D9] hover:bg-[#0169D9]/90'
              } text-white`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modal Template */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowTemplateModal(false)}>
          <div 
            className={`w-full max-w-2xl mx-4 rounded-xl shadow-2xl ${
              isDark ? 'bg-[#1C1C1E] border border-white/[0.08]' : 'bg-white border border-gray-200'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`px-6 py-4 border-b ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`}>
              <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Mensagem Template de Prospecção
              </h3>
              <p className={`text-sm mt-1 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                Esta mensagem será enviada como se fosse do bot. Depois você pode responder como cliente para testar a continuidade.
              </p>
            </div>

            <div className="p-6">
              <textarea
                value={templateMessage}
                onChange={(e) => setTemplateMessage(e.target.value)}
                onKeyDown={(e) => {
                  // Permitir Ctrl+A / Command+A para selecionar tudo
                  if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
                    e.preventDefault();
                    e.currentTarget.select();
                  }
                }}
                placeholder="Ex: Olá! Meu nome é Maria da XYZ Company. Notei que você trabalha com vendas e gostaria de apresentar nossa solução..."
                rows={8}
                className={`w-full px-4 py-3 rounded-lg border outline-none transition-colors resize-none ${
                  isDark
                    ? 'bg-white/[0.05] border-white/[0.1] text-white placeholder-white/40 focus:border-[#0169D9]'
                    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#0169D9]'
                }`}
                autoFocus
              />
            </div>

            <div className={`px-6 py-4 border-t flex items-center justify-end gap-3 ${
              isDark ? 'border-white/[0.08]' : 'border-gray-200'
            }`}>
              <button
                onClick={() => {
                  setShowTemplateModal(false);
                  setTemplateMessage('');
                }}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-white/5 text-white/60' : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (templateMessage.trim()) {
                    handleResetAndStartTemplate(templateMessage.trim());
                    setShowTemplateModal(false);
                    setTemplateMessage('');
                  }
                }}
                disabled={!templateMessage.trim()}
                className="px-4 py-2 bg-[#0169D9] text-white rounded-lg hover:bg-[#0159C1] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Iniciar Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Conversa */}
      {showNewConversationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowNewConversationModal(false)}>
          <div
            className={`w-full max-w-md mx-4 rounded-xl shadow-2xl ${
              isDark ? 'bg-[#1C1C1E] border border-white/[0.08]' : 'bg-white border border-gray-200'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`}>
              <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Nova Conversa de Teste
              </h3>
              <button
                onClick={() => setShowNewConversationModal(false)}
                className={`p-1.5 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-white/10 text-white/50' : 'hover:bg-gray-100 text-gray-400'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                Escolha como iniciar a nova conversa:
              </p>

              {/* Conversa Vazia */}
              <button
                onClick={() => {
                  createNewConversation();
                  setShowNewConversationModal(false);
                }}
                className={`w-full p-4 rounded-lg border text-left transition-colors ${
                  isDark
                    ? 'border-white/[0.08] hover:bg-white/[0.03] hover:border-white/[0.12]'
                    : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                }`}
              >
                <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Conversa Vazia
                </div>
                <div className={`text-xs mt-1 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                  Começar do zero, você envia a primeira mensagem
                </div>
              </button>

              {/* Com Template */}
              <div className={`p-4 rounded-lg border ${
                isDark ? 'border-white/[0.08]' : 'border-gray-200'
              }`}>
                <div className={`font-medium mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Com Mensagem Inicial (Template)
                </div>
                <textarea
                  value={newConversationTemplate}
                  onChange={(e) => setNewConversationTemplate(e.target.value)}
                  placeholder="Ex: Olá! Meu nome é Maria da XYZ Company..."
                  rows={4}
                  className={`w-full px-3 py-2 rounded-lg border outline-none transition-colors resize-none text-sm ${
                    isDark
                      ? 'bg-white/[0.05] border-white/[0.1] text-white placeholder-white/40 focus:border-[#0169D9]'
                      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#0169D9]'
                  }`}
                />
                <button
                  onClick={() => {
                    if (newConversationTemplate.trim()) {
                      createNewConversation(newConversationTemplate.trim());
                      setShowNewConversationModal(false);
                      setNewConversationTemplate('');
                    }
                  }}
                  disabled={!newConversationTemplate.trim()}
                  className="mt-3 w-full px-4 py-2 bg-[#0169D9] text-white text-sm rounded-lg hover:bg-[#0159C1] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Criar com Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação para deletar conversa */}
      <ConfirmDialog
        isOpen={deleteConfirmModal.isOpen}
        onClose={() => setDeleteConfirmModal({ isOpen: false, conversationId: null, isDeleteAll: false })}
        onConfirm={async () => {
          setIsDeleting(true);
          try {
            if (deleteConfirmModal.isDeleteAll) {
              // Deletar todas as conversas
              const result = await deleteAllConversations();
              if (result.success) {
                setDeleteConfirmModal({ isOpen: false, conversationId: null, isDeleteAll: false });
              } else {
                setDeleteConfirmModal({ isOpen: false, conversationId: null, isDeleteAll: false });
                alert(result.error || 'Erro ao limpar histórico');
              }
            } else if (deleteConfirmModal.conversationId) {
              // Deletar uma conversa
              const result = await deleteConversation(deleteConfirmModal.conversationId);
              if (result.success) {
                setDeleteConfirmModal({ isOpen: false, conversationId: null, isDeleteAll: false });
              } else {
                setDeleteConfirmModal({ isOpen: false, conversationId: null, isDeleteAll: false });
                alert(result.error || 'Erro ao deletar conversa');
              }
            }
          } finally {
            setIsDeleting(false);
          }
        }}
        title={deleteConfirmModal.isDeleteAll ? "Limpar histórico" : "Deletar conversa"}
        description={
          deleteConfirmModal.isDeleteAll
            ? `Tem certeza que deseja deletar ${previewConversations.length - 1} conversa(s)? A conversa mais recente será mantida. Esta ação não pode ser desfeita.`
            : previewConversations.length <= 1
              ? "Esta é a única conversa. Não é possível deletá-la."
              : "Tem certeza que deseja deletar esta conversa? Esta ação não pode ser desfeita."
        }
        confirmText={deleteConfirmModal.isDeleteAll ? "Limpar" : "Deletar"}
        cancelText="Cancelar"
        variant="danger"
        isDark={isDark}
        isLoading={isDeleting}
      />

      {/* Modal de Configuração do Widget */}
      {widgetConfigModalLink && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setWidgetConfigModalLink(null)}
        >
          <div
            className={`w-full max-w-lg mx-4 rounded-xl shadow-2xl overflow-hidden ${
              isDark ? 'bg-[#1C1C1E] border border-white/[0.08]' : 'bg-white border border-gray-200'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isDark ? 'bg-purple-500/20' : 'bg-purple-100'}`}>
                  <Code2 className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                </div>
                <div>
                  <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Configurar Widget
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                    Personalize a aparência do widget
                  </p>
                </div>
              </div>
              <button
                onClick={() => setWidgetConfigModalLink(null)}
                className={`p-2 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-white/10 text-white/50' : 'hover:bg-gray-100 text-gray-400'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Link Selector - se houver múltiplos links */}
              {publicLinks.length > 1 && (
                <div>
                  <label className={`block text-xs font-medium uppercase tracking-wider mb-2 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                    Selecionar Link
                  </label>
                  <select
                    value={widgetConfigModalLink.id}
                    onChange={(e) => {
                      const selected = publicLinks.find(l => l.id === e.target.value);
                      if (selected) setWidgetConfigModalLink(selected);
                    }}
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${
                      isDark
                        ? 'bg-white/[0.05] border-white/[0.1] text-white'
                        : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  >
                    {publicLinks.map(link => (
                      <option key={link.id} value={link.id}>
                        {link.public_slug} {link.is_active ? '(Ativo)' : '(Inativo)'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Código do Widget */}
              <div>
                <label className={`block text-xs font-medium uppercase tracking-wider mb-2 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                  Código para Incorporar
                </label>
                <div className={`p-3 rounded-lg font-mono text-xs break-all ${isDark ? 'bg-black/30 text-white/70' : 'bg-gray-100 text-gray-600'}`}>
                  {`<script src="${import.meta.env.VITE_WIDGET_URL || 'https://widget.pescalead.com.br'}/api/chat?slug=${widgetConfigModalLink.public_slug}"></script>`}
                </div>
                <button
                  onClick={() => {
                    const widgetUrl = import.meta.env.VITE_WIDGET_URL || 'https://widget.pescalead.com.br';
                    const widgetCode = `<script src="${widgetUrl}/api/chat?slug=${widgetConfigModalLink.public_slug}"></script>`;
                    navigator.clipboard.writeText(widgetCode);
                    setCopiedLinkId(`${widgetConfigModalLink.id}-widget-modal`);
                    setTimeout(() => setCopiedLinkId(null), 2000);
                  }}
                  className={`mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isDark
                      ? 'bg-purple-500/30 hover:bg-purple-500/40 text-purple-300'
                      : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
                  }`}
                >
                  {copiedLinkId === `${widgetConfigModalLink.id}-widget-modal` ? (
                    <>
                      <Check className="w-4 h-4 text-green-500" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copiar Código
                    </>
                  )}
                </button>
              </div>

              {/* Ícones Customizados */}
              <div>
                <label className={`block text-xs font-medium uppercase tracking-wider mb-3 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                  Ícones Customizados
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {/* Ícone do Botão */}
                  <div className={`p-4 rounded-xl border ${isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-gray-50 border-gray-200'}`}>
                    <div className={`text-xs font-medium mb-3 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                      Botão Flutuante
                    </div>
                    {widgetConfigModalLink.widget_button_icon_url ? (
                      <div className="flex flex-col items-center gap-3">
                        <img
                          src={widgetConfigModalLink.widget_button_icon_url}
                          alt="Button icon"
                          className="w-16 h-16 rounded-xl object-cover border-2 border-purple-500/30 shadow-lg"
                        />
                        <button
                          onClick={() => {
                            removeWidgetIcon(widgetConfigModalLink.id, 'button');
                            setWidgetConfigModalLink({ ...widgetConfigModalLink, widget_button_icon_url: null });
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                            isDark ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400' : 'bg-red-100 hover:bg-red-200 text-red-600'
                          }`}
                        >
                          <X className="w-3 h-3" />
                          Remover
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-gray-200'}`}>
                          <MessageSquare className={`w-8 h-8 ${isDark ? 'text-white/20' : 'text-gray-400'}`} />
                        </div>
                        <button
                          onClick={() => triggerFileUpload(widgetConfigModalLink.id, 'button')}
                          disabled={uploadingIcon === 'button'}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                            isDark
                              ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300'
                              : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
                          } disabled:opacity-50`}
                        >
                          {uploadingIcon === 'button' ? (
                            <div className="w-3 h-3 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                          ) : (
                            <Upload className="w-3 h-3" />
                          )}
                          Upload
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Ícone do Avatar */}
                  <div className={`p-4 rounded-xl border ${isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-gray-50 border-gray-200'}`}>
                    <div className={`text-xs font-medium mb-3 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                      Avatar do Chat
                    </div>
                    {widgetConfigModalLink.widget_avatar_icon_url ? (
                      <div className="flex flex-col items-center gap-3">
                        <img
                          src={widgetConfigModalLink.widget_avatar_icon_url}
                          alt="Avatar icon"
                          className="w-16 h-16 rounded-full object-cover border-2 border-purple-500/30 shadow-lg"
                        />
                        <button
                          onClick={() => {
                            removeWidgetIcon(widgetConfigModalLink.id, 'avatar');
                            setWidgetConfigModalLink({ ...widgetConfigModalLink, widget_avatar_icon_url: null });
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                            isDark ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400' : 'bg-red-100 hover:bg-red-200 text-red-600'
                          }`}
                        >
                          <X className="w-3 h-3" />
                          Remover
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-gray-200'}`}>
                          <Bot className={`w-8 h-8 ${isDark ? 'text-white/20' : 'text-gray-400'}`} />
                        </div>
                        <button
                          onClick={() => triggerFileUpload(widgetConfigModalLink.id, 'avatar')}
                          disabled={uploadingIcon === 'avatar'}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                            isDark
                              ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300'
                              : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
                          } disabled:opacity-50`}
                        >
                          {uploadingIcon === 'avatar' ? (
                            <div className="w-3 h-3 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                          ) : (
                            <Upload className="w-3 h-3" />
                          )}
                          Upload
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <p className={`text-[10px] mt-3 text-center ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                  Formatos aceitos: PNG, JPG, GIF, WebP ou SVG. Tamanho máximo: 1MB
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className={`px-6 py-4 border-t ${isDark ? 'border-white/[0.08] bg-white/[0.02]' : 'border-gray-200 bg-gray-50'}`}>
              <button
                onClick={() => setWidgetConfigModalLink(null)}
                className={`w-full px-4 py-2.5 rounded-lg font-medium transition-colors ${
                  isDark
                    ? 'bg-white/[0.05] hover:bg-white/[0.08] text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}