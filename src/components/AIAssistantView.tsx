import { useState, useEffect, useRef, useCallback, DragEvent } from 'react';
import { Theme } from '../hooks/useTheme';
import { Settings, Sun, Moon, Menu, Loader2, Check, ImageIcon } from 'lucide-react';
import { AIConversation, AIMessage, SearchStep, SearchSource, MediaAttachment, AIConfiguration, AICustomAgent, ImageGenerationData } from '../types/ai-assistant';
import { useRagImport, useRagDocuments } from '../hooks/useAssistantRag';
import { importConversationToRag } from '../services/ai-assistant-rag-service';
import {
  getConversations,
  createConversation,
  deleteConversation,
  getMessages,
  sendMessageStream,
  deleteMessage,
  createMessage,
  uploadMedia,
  updateConversationModel,
  getConfiguration,
  getContextUsage,
  forceCompactContext,
  generateImage,
  ContextInfo,
  UsageIndicators,
  ImageGenerationConfig,
} from '../services/ai-assistant-service';
import { incrementAgentUsage, getAgent } from '../services/ai-agents-service';
import { countRAGDocuments } from '../services/ai-rag-service';
import { ChatMessageList } from './ai-assistant/ChatMessageList';
import { ChatInput } from './ai-assistant/ChatInput';
import { ConversationSidebar } from './ai-assistant/ConversationSidebar';
import { AIConfigModal } from './ai-assistant/AIConfigModal';
import { AgentEditModal } from './ai-assistant/AgentEditModal';
import { ModelSelector } from './ai-assistant/ModelSelector';
import { ImageGenerationPanel, ImageGenerationPanelRef } from './ai-assistant/ImageGenerationPanel';
import { DataToolProgress, useDataToolCalls } from './ai-assistant/DataToolProgress';
import { ProfileMenu } from './ProfileMenu';
import { toast } from 'sonner';
import { cn } from './ui/utils';

interface AIAssistantViewProps {
  theme: Theme;
  workspaceId: string;
  userId: string;
  onThemeToggle: () => void;
  onNavigateToSettings: () => void;
  onManageMembersClick?: () => void;
  onMobileMenuClick?: () => void;
  initialConversationId?: string | null;
  initialAgentId?: string | null; // ID do agente para pré-selecionar (via URL ?agent=xxx)
  onConversationChange?: (conversationId: string | null) => void;
  onAgentUsed?: () => void; // Callback quando o agente é usado (para limpar da URL)
}

export function AIAssistantView({
  theme,
  workspaceId,
  userId,
  onThemeToggle,
  onNavigateToSettings,
  onManageMembersClick,
  onMobileMenuClick,
  initialConversationId,
  initialAgentId,
  onConversationChange,
  onAgentUsed
}: AIAssistantViewProps) {
  const isDark = theme === 'dark';

  // State
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<AIConversation | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Web Search State
  const [searchSteps, setSearchSteps] = useState<SearchStep[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchSources, setSearchSources] = useState<SearchSource[]>([]);

  // Thinking/Reasoning State (para modelos como DeepSeek R1)
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingContent, setThinkingContent] = useState('');

  // Media Upload State
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // Configuration State
  const [config, setConfig] = useState<AIConfiguration | null>(null);

  // RAG State
  const [ragEnabled, setRagEnabled] = useState(false);
  const {
    totalDocuments: ragDocCount,
    savedConversationIds,
    refresh: refreshRagDocuments
  } = useRagDocuments(workspaceId);
  const {
    isImporting,
    isImported,
    importConversation,
    checkImported
  } = useRagImport(workspaceId, selectedConversation?.id || null);

  // Context Usage State
  const [contextUsage, setContextUsage] = useState({
    usagePercent: 0,
    usedTokens: 0,
    maxTokens: 0,
  });
  const [isCompacting, setIsCompacting] = useState(false);

  // Agent State - agente selecionado para nova conversa
  const [selectedAgent, setSelectedAgent] = useState<AICustomAgent | null>(null);

  // Agent RAG State - RAG específico do agente
  const [agentRagEnabled, setAgentRagEnabled] = useState(false);
  const [agentRagDocCount, setAgentRagDocCount] = useState(0);

  // Web Search State - busca na internet
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);

  // MCP Tool Calls State
  const [mcpToolCalls, setMcpToolCalls] = useState<Array<{
    id: string;
    server_id: string;
    server_name: string;
    tool_name: string;
    arguments: Record<string, unknown>;
    status: 'executing' | 'completed' | 'failed';
    result?: unknown;
    error?: string;
    execution_time_ms?: number;
    timestamp: Date;
  }>>([]);
  const [isMcpExecuting, setIsMcpExecuting] = useState(false);

  // Data Tool Calls State (SQL Tool Nativa)
  const dataToolState = useDataToolCalls();
  const [isDataToolExecuting, setIsDataToolExecuting] = useState(false);

  // Agent Modal State - para abrir modal de edição/criação de agente
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [editingAgentFromSidebar, setEditingAgentFromSidebar] = useState<AICustomAgent | null>(null);
  const [sidebarAgentsKey, setSidebarAgentsKey] = useState(0); // Para forçar refresh da sidebar

  // Image Generation State
  const [showImageGenerationPanel, setShowImageGenerationPanel] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageGenerationMode, setImageGenerationMode] = useState<'text-to-image' | 'image-to-image'>('text-to-image');
  const [imageGenerationPrompt, setImageGenerationPrompt] = useState('');

  // Usage indicators - indicadores de quais recursos foram usados na resposta
  const usageIndicatorsRef = useRef<UsageIndicators | null>(null);

  // Refs para salvar mensagem parcial quando streaming é interrompido
  const streamingMessageRef = useRef<string>('');
  const streamingConversationIdRef = useRef<string | null>(null);

  // Drag and Drop State
  const [isDragging, setIsDragging] = useState(false);
  const [droppedImage, setDroppedImage] = useState<{ file: File; preview: string } | null>(null);
  const dragCounterRef = useRef(0);

  // Abort controller para cancelar streaming
  const abortControllerRef = useRef<AbortController | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const imageGenerationPanelRef = useRef<ImageGenerationPanelRef>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Load conversations and config on mount
  useEffect(() => {
    if (workspaceId) {
      loadConversations(true); // true = selecionar conversa inicial da URL
      loadConfiguration();
    }
  }, [workspaceId]);

  // Pré-selecionar agente quando initialAgentId mudar (via URL ?agent=xxx)
  useEffect(() => {
    if (initialAgentId && !selectedConversation) {
      // Carregar e pré-selecionar o agente
      const loadAndSelectAgent = async () => {
        try {
          const agent = await getAgent(initialAgentId);
          if (agent) {
            setSelectedAgent(agent);
            // Notificar que o agente foi usado (para limpar da URL)
            onAgentUsed?.();
          }
        } catch (error) {
          console.error('[AIAssistantView] Error loading agent:', error);
        }
      };
      loadAndSelectAgent();
    }
  }, [initialAgentId, selectedConversation, onAgentUsed]);

  // Salvar mensagem parcial quando componente é desmontado durante streaming
  // ou quando o usuário sai da página
  useEffect(() => {
    const savePartialMessage = async () => {
      const partialMessage = streamingMessageRef.current;
      const conversationId = streamingConversationIdRef.current;

      if (partialMessage && partialMessage.trim() && conversationId) {
        console.log('[Cleanup] Saving partial message:', partialMessage.substring(0, 100));
        try {
          await createMessage({
            conversation_id: conversationId,
            role: 'assistant',
            content: partialMessage + '\n\n*[Resposta interrompida]*',
          });
        } catch (error) {
          console.error('[Cleanup] Failed to save partial message:', error);
        }
      }
    };

    // Handler para beforeunload (fechar aba/navegar para fora)
    const handleBeforeUnload = () => {
      if (streamingMessageRef.current && streamingConversationIdRef.current) {
        // Usar sendBeacon para garantir que a requisição seja enviada
        const data = JSON.stringify({
          conversation_id: streamingConversationIdRef.current,
          role: 'assistant',
          content: streamingMessageRef.current + '\n\n*[Resposta interrompida]*',
        });
        // Tentar salvar via sendBeacon (não garantido, mas melhor que nada)
        navigator.sendBeacon?.('/api/save-partial-message', data);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Salvar mensagem parcial quando componente é desmontado
      savePartialMessage();
    };
  }, []);

  const loadConfiguration = async () => {
    const configData = await getConfiguration(workspaceId);
    setConfig(configData);
  };

  // Carrega o uso de contexto de uma conversa (definido antes do useEffect que o usa)
  const loadContextUsage = useCallback(async (conversationId: string) => {
    console.log('[loadContextUsage] Loading context for conversation:', conversationId);
    const contextInfo = await getContextUsage(conversationId, workspaceId);
    console.log('[loadContextUsage] Result:', contextInfo);
    if (contextInfo) {
      setContextUsage({
        usagePercent: contextInfo.usagePercent,
        usedTokens: contextInfo.usedTokens,
        maxTokens: contextInfo.maxTokens,
      });
    }
  }, [workspaceId]);

  // Load messages and context usage when conversation changes
  // Nota: isStreaming está nas dependências para recarregar mensagens após o streaming acabar
  // mas só executa quando !isStreaming para não interferir durante o streaming
  useEffect(() => {
    console.log('[useEffect] selectedConversation:', selectedConversation?.id, 'isStreaming:', isStreaming);
    if (selectedConversation && !isStreaming) {
      loadMessages(selectedConversation.id);
      // Carregar uso de contexto também
      loadContextUsage(selectedConversation.id);
    } else if (!selectedConversation) {
      setMessages([]);
      // Resetar contexto quando não há conversa
      setContextUsage({ usagePercent: 0, usedTokens: 0, maxTokens: 0 });
    }
  }, [selectedConversation?.id, isStreaming, loadContextUsage]);

  // Load agent RAG document count when conversation has an agent
  useEffect(() => {
    const loadAgentRagCount = async () => {
      // Usar o agente da conversa selecionada ou o agente selecionado para nova conversa
      const agentId = selectedConversation?.agent_id || selectedAgent?.id;

      if (agentId) {
        try {
          const count = await countRAGDocuments(agentId);
          setAgentRagDocCount(count);
          // Se não tem documentos, desativar o RAG do agente
          if (count === 0) {
            setAgentRagEnabled(false);
          }
        } catch (error) {
          console.error('Error loading agent RAG count:', error);
          setAgentRagDocCount(0);
          setAgentRagEnabled(false);
        }
      } else {
        setAgentRagDocCount(0);
        setAgentRagEnabled(false);
      }
    };

    loadAgentRagCount();
  }, [selectedConversation?.agent_id, selectedAgent?.id]);

  // Auto-scroll to bottom on new messages (only if user hasn't scrolled up)
  useEffect(() => {
    if (shouldAutoScroll && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      // Scroll suave usando scrollTop em vez de scrollIntoView
      // Isso evita os "pulos" quando novos tokens chegam
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, streamingMessage, searchSteps, thinkingContent, shouldAutoScroll]);

  // Detectar se o usuário está no final do scroll
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Considera "no final" se estiver a menos de 100px do bottom
    const threshold = 100;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;

    setShouldAutoScroll(isAtBottom);
  }, []);

  // Reset auto-scroll when changing conversation or starting new message
  useEffect(() => {
    setShouldAutoScroll(true);
  }, [selectedConversation?.id]);

  const loadConversations = async (selectInitial = false) => {
    const data = await getConversations(workspaceId);
    setConversations(data);

    // Se temos um ID inicial da URL, selecionar essa conversa
    if (selectInitial && initialConversationId) {
      const initialConversation = data.find(c => c.id === initialConversationId);
      if (initialConversation) {
        setSelectedConversation(initialConversation);
        return;
      }
    }

    // Auto-select first conversation if none selected
    if (data.length > 0 && !selectedConversation) {
      const firstConversation = data[0];
      setSelectedConversation(firstConversation);
      // Atualizar URL para a primeira conversa
      onConversationChange?.(firstConversation.id);
    }
  };

  const loadMessages = async (conversationId: string) => {
    const data = await getMessages(conversationId);
    setMessages(data);
  };

  const handleNewConversation = async () => {
    const { conversation, error } = await createConversation({
      workspace_id: workspaceId,
      user_id: userId,
      title: 'Nova Conversa',
    });

    if (error) {
      toast.error('Erro ao criar conversa');
      return;
    }

    if (conversation) {
      setConversations(prev => [conversation, ...prev]);
      setSelectedConversation(conversation);
      setMessages([]);
      // Atualizar URL para a nova conversa
      onConversationChange?.(conversation.id);
      toast.success('Conversa criada!');
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await deleteConversation(conversationId);
      const remainingConversations = conversations.filter(c => c.id !== conversationId);
      setConversations(remainingConversations);

      if (selectedConversation?.id === conversationId) {
        // Selecionar próxima conversa ou limpar
        if (remainingConversations.length > 0) {
          const nextConversation = remainingConversations[0];
          setSelectedConversation(nextConversation);
          onConversationChange?.(nextConversation.id);
        } else {
          setSelectedConversation(null);
          setMessages([]);
          onConversationChange?.(null);
        }
      }

      toast.success('Conversa deletada');
    } catch (error) {
      toast.error('Erro ao deletar conversa');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      toast.success('Mensagem deletada');
    } catch (error) {
      toast.error('Erro ao deletar mensagem');
    }
  };

  const handleSelectConversation = async (conversation: AIConversation | null) => {
    // Se estiver em streaming, salvar mensagem parcial antes de trocar
    if (isStreaming && abortControllerRef.current) {
      // Salvar mensagem parcial se houver conteúdo
      const partialMessage = streamingMessageRef.current;
      const conversationId = streamingConversationIdRef.current;

      if (partialMessage && partialMessage.trim() && conversationId) {
        console.log('[handleSelectConversation] Saving partial message before switching');
        try {
          await createMessage({
            conversation_id: conversationId,
            role: 'assistant',
            content: partialMessage + '\n\n*[Resposta interrompida]*',
          });
        } catch (error) {
          console.error('[handleSelectConversation] Failed to save partial message:', error);
        }
      }

      // Cancelar streaming
      abortControllerRef.current.abort();
      setIsStreaming(false);
      setStreamingMessage('');
      setSearchSteps([]);
      setIsSearching(false);
      setIsThinking(false);
      setThinkingContent('');
      // Limpar refs
      streamingMessageRef.current = '';
      streamingConversationIdRef.current = null;
    }

    setSelectedConversation(conversation);
    // Atualizar URL para a conversa selecionada
    onConversationChange?.(conversation?.id || null);
  };

  const handleModelChange = async (modelId: string) => {
    if (!selectedConversation) return;

    try {
      const updated = await updateConversationModel(
        selectedConversation.id,
        modelId || null // String vazia = usar padrão
      );

      if (updated) {
        // Atualizar estado local
        setSelectedConversation(updated);
        setConversations(prev =>
          prev.map(c => c.id === updated.id ? updated : c)
        );
        toast.success(modelId ? 'Modelo alterado!' : 'Usando modelo padrão');
      }
    } catch (error) {
      console.error('Error updating model:', error);
      toast.error('Erro ao alterar modelo');
    }
  };

  const handleSendMessage = async (content: string, media?: MediaAttachment, useRag?: boolean, useAgentRag?: boolean, useWebSearch?: boolean) => {
    const hasContent = content.trim() || media;
    if (!hasContent || isStreaming || isUploadingMedia) return;

    let conversationToUse = selectedConversation;

    // Se não há conversa selecionada, criar automaticamente
    if (!conversationToUse) {
      // Usar agente selecionado se houver
      const agentId = selectedAgent?.id;

      const { conversation, error } = await createConversation({
        workspace_id: workspaceId,
        user_id: userId,
        title: selectedAgent ? selectedAgent.name : 'Nova Conversa',
        agent_id: agentId,
      });

      if (error || !conversation) {
        toast.error('Erro ao criar conversa');
        return;
      }

      // Incrementar uso do agente
      if (agentId) {
        incrementAgentUsage(agentId);
      }

      conversationToUse = conversation;
      setConversations(prev => [conversation, ...prev]);
      setSelectedConversation(conversation);
      onConversationChange?.(conversation.id);

      // Limpar agente selecionado após criar conversa
      setSelectedAgent(null);
    }

    // Upload media if present
    let mediaUrl: string | undefined;
    let contentType: 'image' | 'audio' | undefined;

    if (media) {
      setIsUploadingMedia(true);
      try {
        const { url, error: uploadError } = await uploadMedia(
          media.file,
          workspaceId,
          media.type
        );

        if (uploadError || !url) {
          toast.error('Erro ao fazer upload do arquivo');
          setIsUploadingMedia(false);
          return;
        }

        mediaUrl = url;
        contentType = media.type;
      } catch (error) {
        console.error('Upload error:', error);
        toast.error('Erro ao fazer upload do arquivo');
        setIsUploadingMedia(false);
        return;
      }
      setIsUploadingMedia(false);
    }

    // Add user message to UI immediately (optimistic update)
    const userMessage: AIMessage = {
      id: crypto.randomUUID(),
      conversation_id: conversationToUse.id,
      role: 'user',
      content: content.trim() || (contentType === 'image' ? '[Imagem enviada]' : '[Áudio enviado]'),
      tokens_used: 0,
      created_at: new Date().toISOString(),
      media_url: mediaUrl,
      content_type: contentType,
      // Se tem mídia, começa com status 'pending' para mostrar o loading
      transcription_status: mediaUrl ? 'pending' : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);
    setShouldAutoScroll(true); // Ativar auto-scroll ao enviar nova mensagem
    setStreamingMessage('');
    setSearchSteps([]);
    setIsSearching(false);
    setSearchSources([]);
    setIsThinking(false);
    setThinkingContent('');

    // Inicializar refs para salvar mensagem parcial em caso de interrupção
    streamingMessageRef.current = '';
    streamingConversationIdRef.current = conversationToUse.id;

    // Criar AbortController para permitir cancelamento
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    await sendMessageStream(
      conversationToUse.id,
      content.trim(),
      workspaceId,
      // On token
      (token: string) => {
        setStreamingMessage(prev => prev + token);
        // Atualizar ref para poder salvar em caso de interrupção
        streamingMessageRef.current += token;
      },
      // On complete
      async (finalMessage?: string) => {
        // Primeiro, adicionar a mensagem do assistente ao estado local para evitar "piscar"
        // Isso garante que a mensagem continue visível enquanto buscamos do banco
        if (finalMessage) {
          const indicators = usageIndicatorsRef.current;
          console.log('[AIAssistantView] onComplete - indicators from ref:', indicators);
          const tempAssistantMessage: AIMessage = {
            id: `temp-${Date.now()}`,
            conversation_id: conversationToUse.id,
            role: 'assistant',
            content: finalMessage,
            tokens_used: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            sources: searchSources.length > 0 ? searchSources : undefined,
            thinking_content: thinkingContent || undefined,
            // Indicadores de recursos usados
            used_workspace_rag: indicators?.usedWorkspaceRag,
            used_agent_rag: indicators?.usedAgentRag,
            used_web_search: indicators?.usedWebSearch,
            // Fonte de análise de mídia (native ou gemini)
            media_analysis_source: indicators?.mediaAnalysisSource,
          };
          setMessages(prev => [...prev, tempAssistantMessage]);
        }

        setIsStreaming(false);
        setStreamingMessage('');
        setIsSearching(false);
        setIsThinking(false);
        // Limpar indicadores para próxima mensagem
        usageIndicatorsRef.current = null;
        // Limpar refs de streaming (mensagem já foi salva pelo backend)
        streamingMessageRef.current = '';
        streamingConversationIdRef.current = null;

        // Reload messages para obter dados persistidos (sources, thinking_content do banco)
        // Isso substitui a mensagem temporária pela versão do banco silenciosamente
        await loadMessages(conversationToUse.id);

        // Atualizar uso de contexto após a resposta (inclui a nova mensagem do assistente)
        console.log('[onComplete] Calling loadContextUsage for conversation:', conversationToUse.id);
        await loadContextUsage(conversationToUse.id);
        console.log('[onComplete] loadContextUsage completed');

        // Reload conversations to update timestamp
        await loadConversations();
        // Clear search state after a delay
        // MCP tool calls ficam visíveis por mais tempo para o usuário ver o resultado
        setTimeout(() => {
          setSearchSteps([]);
          setSearchSources([]);
          setThinkingContent('');
        }, 500);
        // Limpar Data Tool calls IMEDIATAMENTE para evitar duplicação
        // O histórico permanente fica salvo na mensagem via data_tool_calls
        dataToolState.reset();
        setIsDataToolExecuting(false);

        // Limpar MCP tool calls depois de 3 segundos para dar tempo de ver
        // O histórico permanente fica salvo na mensagem via mcp_tool_calls
        setTimeout(() => {
          setMcpToolCalls([]);
          setIsMcpExecuting(false);
        }, 3000);
      },
      // On error
      (error: Error) => {
        console.error('Stream error:', error);
        setIsStreaming(false);
        setStreamingMessage('');
        setIsSearching(false);
        setIsThinking(false);
        setThinkingContent('');
        setSearchSteps([]);
        setSearchSources([]);
        setMcpToolCalls([]);
        setIsMcpExecuting(false);
        // Limpar Data Tool calls
        dataToolState.reset();
        setIsDataToolExecuting(false);
        // Limpar refs de streaming
        streamingMessageRef.current = '';
        streamingConversationIdRef.current = null;
        toast.error('Erro ao enviar mensagem. Tente novamente.');
      },
      // On search step
      (step: SearchStep) => {
        setIsSearching(step.type !== 'complete');
        setSearchSteps(prev => {
          // Avoid duplicate steps
          const exists = prev.some(s => s.id === step.id);
          if (exists) return prev;
          return [...prev, step];
        });
      },
      // On search sources
      (sources: SearchSource[]) => {
        setSearchSources(sources);
      },
      // Media info
      mediaUrl,
      contentType,
      // Thinking callbacks
      () => {
        // On thinking start
        setIsThinking(true);
        setThinkingContent('');
      },
      (token: string) => {
        // On thinking token
        setThinkingContent(prev => prev + token);
      },
      () => {
        // On thinking end
        setIsThinking(false);
      },
      // On media transcribed - atualiza o status da mensagem do usuário
      (transcription: string) => {
        setMessages(prev => prev.map(msg => {
          // Atualiza a última mensagem do usuário que tem mídia
          if (msg.role === 'user' && msg.media_url && msg.transcription_status !== 'completed') {
            return {
              ...msg,
              transcription,
              transcription_status: 'completed' as const
            };
          }
          return msg;
        }));
      },
      // Abort signal
      abortController.signal,
      // Use RAG - passar o estado do toggle (workspace conversations)
      useRag,
      // Context info callback
      (info: ContextInfo) => {
        setContextUsage({
          usagePercent: Math.round(info.usagePercent),
          usedTokens: info.usedTokens,
          maxTokens: info.maxTokens,
        });
      },
      // Summarization callback
      (message: string) => {
        toast.info(message, {
          duration: 5000,
          icon: '📝',
        });
      },
      // Use Agent RAG - passar o estado do toggle (agent documents)
      useAgentRag,
      // Usage indicators callback - quais recursos foram usados
      (indicators: UsageIndicators) => {
        console.log('[AIAssistantView] onUsageIndicators called with:', indicators);
        usageIndicatorsRef.current = indicators;
      },
      // Use Web Search - passar o estado do toggle (busca na internet)
      useWebSearch,
      // MCP Tool Call callback
      (data) => {
        console.log('[AIAssistantView] onMcpToolCall:', data);
        setIsMcpExecuting(true);
        setMcpToolCalls(prev => [
          ...prev,
          {
            id: `${data.server_id}_${data.tool_name}_${Date.now()}`,
            server_id: data.server_id,
            server_name: data.server_name,
            tool_name: data.tool_name,
            arguments: data.arguments,
            status: 'executing' as const,
            timestamp: new Date(),
          }
        ]);
      },
      // MCP Tool Result callback
      (data) => {
        console.log('[AIAssistantView] onMcpToolResult:', data);
        setMcpToolCalls(prev => {
          const updated = prev.map(call => {
            // Encontrar o call correspondente (mesmo server_id e tool_name em execução)
            if (call.server_id === data.server_id && call.tool_name === data.tool_name && call.status === 'executing') {
              return {
                ...call,
                status: (data.success ? 'completed' : 'failed') as const,
                result: data.result,
                error: data.error,
                execution_time_ms: data.execution_time_ms,
              };
            }
            return call;
          });
          // Verificar se ainda há algum tool em execução
          const stillExecuting = updated.some(c => c.status === 'executing');
          if (!stillExecuting) {
            setIsMcpExecuting(false);
          }
          return updated;
        });
      },
      // Data Tool Call callback
      (data) => {
        console.log('[AIAssistantView] onDataToolCall:', data);
        setIsDataToolExecuting(true);
        dataToolState.addCall(data);
      },
      // Data Tool Result callback
      (data) => {
        console.log('[AIAssistantView] onDataToolResult:', data);
        dataToolState.updateCall(data);
        // Verificar se ainda há algum tool em execução
        if (data.success || data.error) {
          // Pequeno delay para verificar se há mais tools em execução
          setTimeout(() => {
            const stillExecuting = dataToolState.calls.some(c => c.status === 'executing');
            if (!stillExecuting) {
              setIsDataToolExecuting(false);
            }
          }, 100);
        }
      }
    );

    // Limpar referência ao terminar
    abortControllerRef.current = null;
  };

  // Função para parar/cancelar o streaming
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setStreamingMessage('');
    setIsSearching(false);
    setIsThinking(false);
    setThinkingContent('');
    setSearchSteps([]);
    setSearchSources([]);
    setMcpToolCalls([]);
    setIsMcpExecuting(false);
    // Limpar Data Tool calls
    dataToolState.reset();
    setIsDataToolExecuting(false);
  };

  // Função para forçar compactação do contexto
  const handleForceCompact = async () => {
    if (!selectedConversation || isCompacting) return;

    setIsCompacting(true);
    try {
      const result = await forceCompactContext(selectedConversation.id, workspaceId);

      if (result.compacted) {
        toast.success(`Contexto compactado! ${result.messagesDeleted || 0} mensagens resumidas.`);
        // Recarregar mensagens e contexto
        await loadMessages(selectedConversation.id);
        await loadContextUsage(selectedConversation.id);
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Error compacting context:', error);
      toast.error('Erro ao compactar contexto');
    } finally {
      setIsCompacting(false);
    }
  };

  // Image Generation handler
  const handleGenerateImage = async (config: ImageGenerationConfig) => {
    let conversationToUse = selectedConversation;

    // Se não há conversa selecionada, criar automaticamente
    if (!conversationToUse) {
      const { conversation, error } = await createConversation({
        workspace_id: workspaceId,
        user_id: userId,
        title: 'Geração de Imagem',
        agent_id: selectedAgent?.id,
      });

      if (error || !conversation) {
        toast.error('Erro ao criar conversa');
        return;
      }

      conversationToUse = conversation;
      setConversations(prev => [conversation, ...prev]);
      setSelectedConversation(conversation);
      onConversationChange?.(conversation.id);
      setSelectedAgent(null);
    }

    setIsGeneratingImage(true);
    setShowImageGenerationPanel(false);
    setImageGenerationPrompt(''); // Limpar prompt após iniciar geração

    // Criar mensagem do usuário IMEDIATAMENTE (antes de chamar a API)
    // Isso mostra as configurações de geração na UI enquanto a imagem é gerada
    const userMessage: AIMessage = {
      id: `temp-user-${Date.now()}`,
      conversation_id: conversationToUse.id,
      role: 'user',
      content: '', // Conteúdo vazio - será mostrado via image_generation_data
      tokens_used: 0,
      created_at: new Date().toISOString(),
      image_generation_data: {
        mode: config.mode,
        prompt: config.prompt,
        negative_prompt: config.negative_prompt,
        style: config.style,
        width: config.width,
        height: config.height,
        guidance_scale: 7.5, // valor padrão
        num_inference_steps: config.num_inference_steps,
        seed: config.seed,
        strength: config.strength,
        model_id: config.model_id,
      },
    };

    // Adicionar mensagem do usuário à UI imediatamente
    setMessages(prev => [...prev, userMessage]);
    setShouldAutoScroll(true);

    // Mostrar toast de loading
    const loadingToast = toast.loading(
      config.mode === 'image-to-image'
        ? 'Transformando imagem...'
        : 'Gerando imagem...',
      { duration: 60000 }
    );

    try {
      const result = await generateImage(
        conversationToUse.id,
        workspaceId,
        config
      );

      toast.dismiss(loadingToast);

      if (result.success) {
        toast.success(
          `Imagem ${config.mode === 'image-to-image' ? 'transformada' : 'gerada'} em ${((result.generation_time_ms || 0) / 1000).toFixed(1)}s!`
        );

        // Recarregar mensagens para mostrar a nova imagem e atualizar a mensagem do usuário
        await loadMessages(conversationToUse.id);
        // Atualizar lista de conversas
        await loadConversations();
      } else {
        toast.error(result.error || 'Erro ao gerar imagem');
        // Em caso de erro, recarregar mensagens para remover a temporária
        await loadMessages(conversationToUse.id);
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('[handleGenerateImage] Error:', error);
      toast.error('Erro ao gerar imagem');
      // Em caso de erro, recarregar mensagens para remover a temporária
      if (conversationToUse) {
        await loadMessages(conversationToUse.id);
      }
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Handler para o botão de gerar no ChatInput
  const handleGenerateFromChatInput = useCallback(() => {
    if (imageGenerationPanelRef.current) {
      imageGenerationPanelRef.current.submit();
    }
  }, []);

  // Handler para reusar configurações de imagem de uma mensagem anterior
  const handleReuseImageConfig = useCallback((config: ImageGenerationData) => {
    // Abrir o painel de geração de imagem
    setShowImageGenerationPanel(true);

    // Definir o prompt
    setImageGenerationPrompt(config.prompt || '');

    // Usar um pequeno delay para garantir que o painel está montado
    setTimeout(() => {
      if (imageGenerationPanelRef.current) {
        imageGenerationPanelRef.current.setConfigFromData(config);
      }
    }, 100);

    toast.success('Configurações carregadas! Ajuste o que precisar e gere novamente.');
  }, []);

  // Drag and Drop handlers
  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;

    // Verificar se tem arquivos sendo arrastados
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;

    // Só esconde quando realmente sai da área (counter = 0)
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Reset drag state
    dragCounterRef.current = 0;
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));

    if (imageFile) {
      // Criar preview da imagem
      const reader = new FileReader();
      reader.onloadend = () => {
        setDroppedImage({
          file: imageFile,
          preview: reader.result as string,
        });
      };
      reader.readAsDataURL(imageFile);
    } else if (files.length > 0) {
      toast.error('Por favor, arraste apenas imagens');
    }
  }, []);

  // Limpar imagem arrastada quando for usada
  const handleClearDroppedImage = useCallback(() => {
    setDroppedImage(null);
  }, []);

  // Função para copiar toda a conversa em Markdown
  const handleCopyConversation = async () => {
    if (!selectedConversation || messages.length === 0) return;

    try {
      const visibleMessages = messages.filter(m => m.role !== 'system');

      // Construir o Markdown
      let markdown = `# ${selectedConversation.title || 'Conversa'}\n\n`;
      markdown += `**Criada em:** ${new Date(selectedConversation.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}\n\n`;
      markdown += `**Total de mensagens:** ${visibleMessages.length}\n\n`;
      markdown += `---\n\n`;

      for (const msg of visibleMessages) {
        const dateTime = new Date(msg.created_at);
        const date = dateTime.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        const time = dateTime.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        });

        if (msg.role === 'user') {
          markdown += `### 👤 **USUÁRIO** — ${date} às ${time}\n\n`;
          markdown += `${msg.content}\n\n`;
        } else {
          markdown += `### 🤖 **ASSISTENTE IA** — ${date} às ${time}\n\n`;
          markdown += `${msg.content}\n\n`;

          // Adicionar fontes se houver
          if (msg.sources && msg.sources.length > 0) {
            markdown += `> **Fontes consultadas:**\n`;
            for (const source of msg.sources) {
              markdown += `> - [${source.title}](${source.url})\n`;
            }
            markdown += '\n';
          }
        }

        markdown += `---\n\n`;
      }

      await navigator.clipboard.writeText(markdown);
      toast.success('Conversa copiada em Markdown!');
    } catch (error) {
      console.error('Error copying conversation:', error);
      toast.error('Erro ao copiar conversa');
    }
  };

  // Função para copiar conversa pelo ID (para uso no sidebar)
  const handleCopyConversationById = async (conversationId: string) => {
    try {
      const conversation = conversations.find(c => c.id === conversationId);
      if (!conversation) return;

      // Buscar mensagens da conversa
      const conversationMessages = await getMessages(conversationId);
      if (!conversationMessages || conversationMessages.length === 0) {
        toast.error('Conversa sem mensagens');
        return;
      }

      const visibleMessages = conversationMessages.filter(m => m.role !== 'system');

      // Construir o Markdown
      let markdown = `# ${conversation.title || 'Conversa'}\n\n`;
      markdown += `**Criada em:** ${new Date(conversation.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}\n\n`;
      markdown += `**Total de mensagens:** ${visibleMessages.length}\n\n`;
      markdown += `---\n\n`;

      for (const msg of visibleMessages) {
        const dateTime = new Date(msg.created_at);
        const date = dateTime.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        const time = dateTime.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        });

        if (msg.role === 'user') {
          markdown += `### 👤 **USUÁRIO** — ${date} às ${time}\n\n`;
          markdown += `${msg.content}\n\n`;
        } else {
          markdown += `### 🤖 **ASSISTENTE IA** — ${date} às ${time}\n\n`;
          markdown += `${msg.content}\n\n`;

          // Adicionar fontes se houver
          if (msg.sources && msg.sources.length > 0) {
            markdown += `> **Fontes consultadas:**\n`;
            for (const source of msg.sources) {
              markdown += `> - [${source.title}](${source.url})\n`;
            }
            markdown += '\n';
          }
        }

        markdown += `---\n\n`;
      }

      await navigator.clipboard.writeText(markdown);
      toast.success('Conversa copiada em Markdown!');
    } catch (error) {
      console.error('Error copying conversation:', error);
      toast.error('Erro ao copiar conversa');
    }
  };

  // Função para salvar conversa no RAG pelo ID (para uso no sidebar)
  const handleSaveToRagById = async (conversationId: string) => {
    try {
      await importConversationToRag(workspaceId, conversationId);
      refreshRagDocuments(); // Atualizar lista de documentos e IDs salvos
      toast.success('Conversa salva na base de conhecimento!');
    } catch (error: any) {
      console.error('Error saving to RAG:', error);
      toast.error(error.message || 'Erro ao salvar conversa');
    }
  };

  return (
    <div className={`h-full flex ${isDark ? 'bg-true-black' : 'bg-light-bg'}`}>
      {/* Sidebar */}
      <ConversationSidebar
        conversations={conversations}
        selectedConversation={selectedConversation}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onCopyConversation={handleCopyConversationById}
        onSaveToRag={handleSaveToRagById}
        savedToRagIds={savedConversationIds}
        onConversationUpdated={(updatedConversation) => {
          // Update conversations list
          setConversations(prev =>
            prev.map(c => c.id === updatedConversation.id ? updatedConversation : c)
          );
          // Update selected conversation if it's the one being edited
          if (selectedConversation?.id === updatedConversation.id) {
            setSelectedConversation(updatedConversation);
          }
        }}
        onSelectAgent={(agent) => {
          // Limpar conversa selecionada para ir para tela inicial
          setSelectedConversation(null);
          // Selecionar agente
          setSelectedAgent(agent);
        }}
        onEditAgent={(agent) => {
          setEditingAgentFromSidebar(agent);
          setShowAgentModal(true);
        }}
        onCreateAgent={() => {
          setEditingAgentFromSidebar(null);
          setShowAgentModal(true);
        }}
        workspaceId={workspaceId}
        theme={theme}
        key={sidebarAgentsKey}
      />

      {/* Main Chat Area */}
      <div
        className="flex-1 flex flex-col relative"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drag Overlay */}
        {isDragging && (
          <div className={cn(
            "absolute inset-0 z-50 flex items-center justify-center pointer-events-none",
            isDark ? "bg-black/80" : "bg-white/90"
          )}>
            <div className={cn(
              "flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-dashed",
              isDark
                ? "border-[#0169D9] bg-[#0169D9]/10"
                : "border-[#0169D9] bg-[#0169D9]/5"
            )}>
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center",
                isDark ? "bg-[#0169D9]/20" : "bg-[#0169D9]/10"
              )}>
                <ImageIcon className="w-8 h-8 text-[#0169D9]" />
              </div>
              <div className="text-center">
                <p className={cn(
                  "text-lg font-medium",
                  isDark ? "text-white" : "text-gray-900"
                )}>
                  Solte a imagem aqui
                </p>
                <p className={cn(
                  "text-sm mt-1",
                  isDark ? "text-white/60" : "text-gray-500"
                )}>
                  A imagem será adicionada à sua mensagem
                </p>
              </div>
            </div>
          </div>
        )}
        {/* Header */}
        <header className={cn(
          "h-16 border-b flex items-center justify-between px-4 md:px-6 transition-colors",
          isDark
            ? "bg-black border-white/[0.08]"
            : "bg-white border-zinc-200"
        )}>
          {/* Left side: Mobile Menu + Title */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Mobile Menu Button */}
            {onMobileMenuClick && (
              <button
                onClick={onMobileMenuClick}
                className={cn(
                  "md:hidden h-9 w-9 rounded-lg transition-colors flex items-center justify-center",
                  isDark
                    ? "hover:bg-white/10 text-white/70 hover:text-white"
                    : "hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900"
                )}
                title="Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            {/* Title and Description */}
            <div className="flex-1 md:flex-none">
              <div className="flex items-center gap-2">
                <h1 className={cn("text-lg font-semibold", isDark ? "text-white" : "text-zinc-900")}>
                  {selectedConversation?.title || 'Assistente IA'}
                </h1>
                {/* Agent Badge - mostra qual agente está sendo usado */}
                {selectedConversation?.agent && (
                  <span
                    className="px-2 py-0.5 text-xs font-medium rounded-full"
                    style={{
                      backgroundColor: `${selectedConversation.agent.color}20`,
                      color: selectedConversation.agent.color,
                      border: `1px solid ${selectedConversation.agent.color}40`,
                    }}
                  >
                    {selectedConversation.agent.name}
                  </span>
                )}
              </div>
              <p className={cn("text-xs mt-0.5 hidden sm:block", isDark ? "text-zinc-400" : "text-zinc-600")}>
                {selectedConversation?.agent
                  ? `Conversa com agente: ${selectedConversation.agent.name}`
                  : 'Converse com a inteligência artificial'}
              </p>
            </div>
          </div>

          {/* Center/Right: Model Selector + Config + Import RAG */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Model Selector - só mostra quando há conversa selecionada */}
            {selectedConversation && (
              <div className="hidden md:block">
                <ModelSelector
                  selectedModelId={selectedConversation.model_id || null}
                  onModelChange={handleModelChange}
                  theme={theme}
                  defaultModelId={config?.model_id}
                />
              </div>
            )}

            {/* Config Button */}
            <button
              onClick={() => setShowConfigModal(true)}
              className={cn(
                "h-9 w-9 rounded-lg transition-colors flex items-center justify-center",
                isDark
                  ? "hover:bg-white/10 text-white/70 hover:text-white"
                  : "hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900"
              )}
              title="Configurações da IA"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={onThemeToggle}
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
            <ProfileMenu theme={theme} onNavigateToSettings={onNavigateToSettings} onManageMembersClick={onManageMembersClick} />
          </div>
        </header>

        {/* Content Area */}
        {(selectedConversation && messages.length > 0) || isStreaming ? (
          <div className="flex-1 flex flex-col relative overflow-hidden min-h-0">
            {/* Gradient background - cobre toda a área (mensagens + input) */}
            <div
              className="absolute inset-0 pointer-events-none z-0"
              style={{
                background: isDark
                  ? 'linear-gradient(135deg, rgba(1, 105, 217, 0.1) 0%, rgba(0, 0, 0, 0) 50%, rgba(0, 207, 250, 0.1) 100%)'
                  : 'linear-gradient(135deg, rgba(1, 105, 217, 0.05) 0%, rgba(255, 255, 255, 0) 50%, rgba(0, 207, 250, 0.05) 100%)'
              }}
            />
            {/* Messages */}
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-6 py-4 scroll-smooth scrollbar-thin relative z-10 min-h-0"
            >
              <ChatMessageList
                messages={messages}
                streamingMessage={streamingMessage}
                isStreaming={isStreaming}
                theme={theme}
                onDeleteMessage={handleDeleteMessage}
                searchSteps={searchSteps}
                isSearching={isSearching}
                searchSources={searchSources}
                isThinking={isThinking}
                thinkingContent={thinkingContent}
                mcpToolCalls={mcpToolCalls}
                dataToolCalls={dataToolState.calls}
                isDataToolExecuting={isDataToolExecuting}
                isMcpExecuting={isMcpExecuting}
                onReuseImageConfig={handleReuseImageConfig}
              />
              <div ref={messagesEndRef} />
            </div>

            {/* Input at bottom */}
            <div className="relative z-10 flex-shrink-0 px-4">
              {/* Image Generation Panel - acima do input */}
              <div className="max-w-3xl mx-auto">
                <ImageGenerationPanel
                  ref={imageGenerationPanelRef}
                  isOpen={showImageGenerationPanel}
                  onClose={() => setShowImageGenerationPanel(false)}
                  onGenerate={handleGenerateImage}
                  isGenerating={isGeneratingImage}
                  theme={theme}
                  prompt={imageGenerationPrompt}
                  onModeChange={setImageGenerationMode}
                />
              </div>
              <ChatInput
                onSend={handleSendMessage}
                isStreaming={isStreaming}
                theme={theme}
                onStop={handleStopStreaming}
                ragEnabled={ragEnabled}
                onRagToggle={() => setRagEnabled(!ragEnabled)}
                hasRagDocuments={ragDocCount > 0}
                agentRagEnabled={agentRagEnabled}
                onAgentRagToggle={() => setAgentRagEnabled(!agentRagEnabled)}
                hasAgentRagDocuments={agentRagDocCount > 0}
                webSearchEnabled={webSearchEnabled}
                onWebSearchToggle={() => setWebSearchEnabled(!webSearchEnabled)}
                contextUsage={contextUsage}
                externalImage={droppedImage}
                onClearExternalImage={handleClearDroppedImage}
                onForceCompact={handleForceCompact}
                isCompacting={isCompacting}
                onOpenImageGeneration={() => setShowImageGenerationPanel(!showImageGenerationPanel)}
                isGeneratingImage={isGeneratingImage}
                isImagePanelOpen={showImageGenerationPanel}
                onGenerateImage={handleGenerateFromChatInput}
                imageGenerationMode={imageGenerationMode}
                imagePrompt={imageGenerationPrompt}
                onImagePromptChange={setImageGenerationPrompt}
              />
            </div>
          </div>
        ) : (
          <>
            {/* Centered initial screen (estilo ChatGPT) */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 relative overflow-hidden">
              {/* Simple gradient background */}
              <div
                className="absolute inset-0"
                style={{
                  background: isDark
                    ? 'linear-gradient(135deg, rgba(1, 105, 217, 0.1) 0%, rgba(0, 0, 0, 0) 50%, rgba(0, 207, 250, 0.1) 100%)'
                    : 'linear-gradient(135deg, rgba(1, 105, 217, 0.05) 0%, rgba(255, 255, 255, 0) 50%, rgba(0, 207, 250, 0.05) 100%)'
                }}
              />

              {/* Content */}
              <div className="relative z-10 w-full flex flex-col items-center">
                {/* Selected Agent indicator */}
                {selectedAgent && (
                  <div className={`mb-4 px-4 py-2 rounded-xl flex items-center gap-3 ${
                    isDark ? 'bg-white/[0.05] border border-white/[0.08]' : 'bg-white border border-gray-200 shadow-sm'
                  }`}>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${selectedAgent.color}20` }}
                    >
                      <span style={{ color: selectedAgent.color }}>🤖</span>
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {selectedAgent.name}
                      </p>
                      {selectedAgent.description && (
                        <p className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                          {selectedAgent.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedAgent(null)}
                      className={`ml-2 p-1 rounded-lg transition-colors ${
                        isDark ? 'hover:bg-white/10 text-white/40' : 'hover:bg-gray-100 text-gray-400'
                      }`}
                    >
                      ✕
                    </button>
                  </div>
                )}

                <h1 className={`text-4xl font-semibold mb-8 text-center ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                  {selectedAgent ? `Conversar com ${selectedAgent.name}` : 'Como posso ajudar você hoje?'}
                </h1>

                {/* Centered input */}
                <div className="w-full max-w-3xl">
                  {/* Image Generation Panel - acima do input */}
                  <ImageGenerationPanel
                    ref={imageGenerationPanelRef}
                    isOpen={showImageGenerationPanel}
                    onClose={() => setShowImageGenerationPanel(false)}
                    onGenerate={handleGenerateImage}
                    isGenerating={isGeneratingImage}
                    theme={theme}
                    prompt={imageGenerationPrompt}
                    onModeChange={setImageGenerationMode}
                  />
                  <ChatInput
                    onSend={handleSendMessage}
                    isStreaming={isStreaming}
                    theme={theme}
                    centered={true}
                    onStop={handleStopStreaming}
                    ragEnabled={ragEnabled}
                    onRagToggle={() => setRagEnabled(!ragEnabled)}
                    hasRagDocuments={ragDocCount > 0}
                    agentRagEnabled={agentRagEnabled}
                    onAgentRagToggle={() => setAgentRagEnabled(!agentRagEnabled)}
                    hasAgentRagDocuments={agentRagDocCount > 0}
                    webSearchEnabled={webSearchEnabled}
                    onWebSearchToggle={() => setWebSearchEnabled(!webSearchEnabled)}
                    contextUsage={contextUsage}
                    externalImage={droppedImage}
                    onClearExternalImage={handleClearDroppedImage}
                    onForceCompact={handleForceCompact}
                    isCompacting={isCompacting}
                    onOpenImageGeneration={() => setShowImageGenerationPanel(!showImageGenerationPanel)}
                    isGeneratingImage={isGeneratingImage}
                    isImagePanelOpen={showImageGenerationPanel}
                    onGenerateImage={handleGenerateFromChatInput}
                    imageGenerationMode={imageGenerationMode}
                    imagePrompt={imageGenerationPrompt}
                    onImagePromptChange={setImageGenerationPrompt}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Config Modal */}
      <AIConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        workspaceId={workspaceId}
        userId={userId}
        theme={theme}
      />

      {/* Agent Modal - para editar/criar agentes */}
      {showAgentModal && (
        <AgentEditModal
          isOpen={showAgentModal}
          onClose={() => {
            setShowAgentModal(false);
            setEditingAgentFromSidebar(null);
          }}
          workspaceId={workspaceId}
          userId={userId}
          theme={theme}
          editingAgent={editingAgentFromSidebar}
          onAgentUpdated={() => {
            setSidebarAgentsKey(prev => prev + 1);
          }}
        />
      )}
    </div>
  );
}
