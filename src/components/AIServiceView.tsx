import { useState, useEffect } from 'react';
import { Resizable } from 're-resizable';
import { 
  Database, 
  Bot,
  Plus,
  MoreHorizontal,
  Save,
  RotateCcw,
  Calendar,
  Trash2,
  ChevronDown,
  Upload,
  FileText,
  Clock,
  Shield,
  Zap,
  MessageSquare,
  GitBranch,
  Settings,
  Mic,
  Image as ImageIcon,
  X,
  Sun,
  Moon,
} from 'lucide-react';
import { useAIBuilderChat } from '../hooks/useAIBuilderChat';
import { AgentConfigForm } from './AgentConfigForm';
import { supabase } from '../utils/supabase/client';
import { ProfileMenu } from './ProfileMenu';

interface AIServiceViewProps {
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
  onNavigateToSettings: () => void;
}

export function AIServiceView({ theme, onThemeToggle, onNavigateToSettings }: AIServiceViewProps) {
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
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [existingAgentId, setExistingAgentId] = useState<string | null>(null);
  const [loadingAgent, setLoadingAgent] = useState(true);

  // Buscar workspace e agente existente
  useEffect(() => {
    async function loadExistingAgent() {
      try {
        // Buscar workspace do usuário
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: memberData } = await supabase
          .from('workspace_members')
          .select('workspace_id')
          .eq('user_id', user.id)
          .single();

        if (!memberData) return;

        const wsId = memberData.workspace_id;
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
      } catch (error) {
        console.error('[AIServiceView] Error loading existing agent:', error);
      } finally {
        setLoadingAgent(false);
      }
    }

    loadExistingAgent();
  }, []);

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
        <AIBuilderChatIntegrated isDark={isDark} theme={theme} />
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
          <div>
            <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
              Configuração
            </h2>
            <p className={`text-sm ${isDark ? 'text-white/60' : 'text-text-secondary-light'}`}>
              {loadingAgent ? 'Carregando...' : existingAgentId ? 'Edite o comportamento do agente' : 'Defina o comportamento do agente'}
            </p>
          </div>
          <div className={`ml-auto px-3 py-1 rounded-full text-xs font-medium border ${
            isDark 
              ? 'bg-green-500/10 text-green-400 border-green-500/20' 
              : 'bg-green-50 text-green-700 border-green-200'
          }`}>
            {existingAgentId ? 'Ativo' : 'Novo'}
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-6">
          {!loadingAgent && (
            <AgentConfigForm 
              isDark={isDark} 
              agentId={existingAgentId}
              onSaved={(savedId) => {
                console.log('[AIServiceView] Agent saved:', savedId);
                setExistingAgentId(savedId);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// INTEGRATED CHAT COMPONENT FOR AI BUILDER
// ============================================

function AIBuilderChatIntegrated({ isDark, theme }: { isDark: boolean; theme: 'dark' | 'light' }) {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const { conversation, loading, error, handleSendMessage, handleDeleteMessage, handleResetChat } = useAIBuilderChat({ workspaceId });

  // Get workspace ID from current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from('workspace_members')
          .select('workspace_id')
          .eq('user_id', user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setWorkspaceId(data.workspace_id);
            }
            setLoadingWorkspace(false);
          })
          .catch(() => {
            setLoadingWorkspace(false);
          });
      } else {
        setLoadingWorkspace(false);
      }
    });
  }, []);

  // Show loading while workspace or conversation is loading
  if (loadingWorkspace || loading) {
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

  if (error || !conversation) {
    return (
      <div className={`h-full flex items-center justify-center border-r ${
        isDark ? 'bg-elevated border-white/[0.08]' : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="text-center">
          <p className={`text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>
            {error || 'Erro ao carregar conversa'}
          </p>
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
           <div className={`px-2 py-0.5 rounded text-xs ${isDark ? 'bg-white/10 text-white/60' : 'bg-gray-200 text-gray-600'}`}>Test Chat</div>
        </div>
        <button 
          onClick={handleResetChat}
          className={`p-2 rounded-lg transition-colors ${
            isDark ? 'hover:bg-white/10 text-white/60 hover:text-white' : 'hover:bg-gray-200 text-gray-400 hover:text-gray-600'
          }`}
          title="Resetar Conversa"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
      
      {/* Chat Content - Full height */}
      <div className={`flex-1 flex flex-col min-h-0 ${isDark ? 'bg-true-black' : 'bg-light-bg'}`}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {conversation.messages.map((message) => {
            console.log('[AIServiceView] Rendering message:', message.id, 'type:', message.type);
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
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    isDark 
                      ? 'bg-white/[0.08] text-white rounded-tl-none' 
                      : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                  }`}>
                    {message.text}
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
          )})}
        </div>

        {/* Input */}
        <div className={`px-6 py-4 border-t ${isDark ? 'border-white/[0.08]' : 'border-border-light'}`}>
          <div className="flex items-end gap-2">
            <input
              type="text"
              placeholder="Digite uma mensagem..."
              className={`flex-1 border px-4 py-2 rounded-lg transition-all focus:outline-none focus:border-[#0169D9] ${
                isDark
                  ? 'bg-elevated border-white/[0.08] text-white placeholder-white/40'
                  : 'bg-light-elevated border-border-light text-text-primary-light placeholder-text-secondary-light'
              }`}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const input = e.currentTarget;
                  if (input.value.trim()) {
                    handleSendMessage({ text: input.value.trim(), contentType: 'text' });
                    input.value = '';
                  }
                }
              }}
            />
            <button
              onClick={() => {
                const input = document.querySelector('input[placeholder="Digite uma mensagem..."]') as HTMLInputElement;
                if (input?.value.trim()) {
                  handleSendMessage({ text: input.value.trim(), contentType: 'text' });
                  input.value = '';
                }
              }}
              className="p-2 rounded-lg transition-colors bg-[#0169D9] hover:bg-[#0169D9]/90 text-white"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
