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
  Wrench
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
        <AIBuilderChatIntegrated isDark={isDark} theme={theme} agentId={existingAgentId} />
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

function AIBuilderChatIntegrated({ isDark, theme, agentId }: { isDark: boolean; theme: 'dark' | 'light'; agentId: string | null }) {
  const { conversation, isLoading, error, queueSize, handleSendMessage, handleDeleteMessage, handleResetChat, handleResetAndStartTemplate } = useAIBuilderChat(agentId);
  const [showResetMenu, setShowResetMenu] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateMessage, setTemplateMessage] = useState('');
  
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
      {/* Chat Header */}
      <div className={`h-20 px-6 border-b flex items-center justify-between shrink-0 ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`}>
        <div className="flex items-center gap-3">
           <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Pré-visualizar</span>
           <div className={`px-2 py-0.5 rounded text-xs ${isDark ? 'bg-white/10 text-white/60' : 'bg-gray-200 text-gray-600'}`}>
             {agentId ? 'Test Chat' : 'Selecione um agente'}
           </div>
        </div>
        <div className="relative">
          <button 
            onClick={() => setShowResetMenu(!showResetMenu)}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-white/10 text-white/60 hover:text-white' : 'hover:bg-gray-200 text-gray-400 hover:text-gray-600'
            }`}
            title="Opções de Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Dropdown Menu */}
          {showResetMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowResetMenu(false)}
              />
              <div className={`absolute right-0 top-full mt-2 w-64 rounded-lg shadow-lg border z-20 ${
                isDark ? 'bg-[#1C1C1E] border border-white/[0.08]' : 'bg-white border border-gray-200'
              }`}>
                <button
                  onClick={() => {
                    setShowResetMenu(false);
                    handleResetChat();
                  }}
                  className={`w-full px-4 py-3 text-left text-sm transition-colors rounded-t-lg ${
                    isDark ? 'hover:bg-white/5 text-white' : 'hover:bg-gray-50 text-gray-900'
                  }`}
                >
                  <div className="font-medium">Resetar Completamente</div>
                  <div className={`text-xs mt-0.5 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                    Limpar todo o histórico de mensagens
                  </div>
                </button>
                <div className={`border-t ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`} />
                <button
                  onClick={() => {
                    setShowResetMenu(false);
                    setShowTemplateModal(true);
                  }}
                  className={`w-full px-4 py-3 text-left text-sm transition-colors rounded-b-lg ${
                    isDark ? 'hover:bg-white/5 text-white' : 'hover:bg-gray-50 text-gray-900'
                  }`}
                >
                  <div className="font-medium">Resetar e Iniciar Template</div>
                  <div className={`text-xs mt-0.5 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                    Iniciar com mensagem do bot (prospecção)
                  </div>
                </button>
              </div>
            </>
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
    </div>
  );
}