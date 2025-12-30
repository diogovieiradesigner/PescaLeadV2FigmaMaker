import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuid } from 'uuid';
import { supabase } from '../utils/supabase/client';

// ==================== TIPOS ====================

export interface PipelineStep {
  number: number;
  key: string;
  name: string;
  icon: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  statusMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  tokensInput: number | null;
  tokensOutput: number | null;
  tokensTotal: number | null;
  costEstimate: number | null;
  inputSummary: string | null;
  outputSummary: string | null;
  errorMessage: string | null;
  model: string | null; // Modelo de IA usado no step
  config: any | null; // Configuração do step
  inputData: any | null; // Dados de entrada do step
  outputData: any | null; // Dados de saída do step
}

export interface PipelineInfo {
  id: string;
  status: string;
  statusMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  totalDurationMs: number | null;
  totalTokensUsed: number | null;
  totalCostEstimate: number | null;
  stepsCompleted: number | null;
  responseSent: boolean;
  errorMessage: string | null;
  errorStep: string | null;
  steps: PipelineStep[];
}

export interface ToolCall {
  name: string;
  status: 'success' | 'error' | 'skipped';
  displayName?: string;
  params?: Record<string, any>;
  result?: Record<string, any>;
  isPreview?: boolean;
}

export interface MessageMetadata {
  tokensUsed?: number;
  durationMs?: number;
  ragUsed?: boolean;
  specialistUsed?: string | null;
  guardrailPassed?: boolean;
  pipelineId?: string;
  pipeline?: PipelineInfo | null;
  toolCalls?: ToolCall[];
}

export interface Message {
  id: string;
  type: 'sent' | 'received';
  text: string;
  timestamp: Date;
  isLoading?: boolean;
  isError?: boolean;
  metadata?: MessageMetadata;
}

export interface Conversation {
  id: string;
  messages: Message[];
}

// Preview conversation item for the list
export interface PreviewConversationItem {
  id: string;
  name: string;
  createdAt: Date;
  lastMessage?: string;
  messageCount: number;
}

export interface UseAIBuilderChatReturn {
  conversation: Conversation;
  isLoading: boolean;
  error: string | null;
  queueSize: number;
  // Existing functions
  handleSendMessage: (payload: { text: string }) => Promise<void>;
  handleDeleteMessage: (messageId: string) => Promise<void>;
  handleResetChat: () => Promise<void>;
  handleResetAndStartTemplate: (templateMessage: string) => Promise<void>;
  loadConversation: (conversationIdToLoad?: string) => Promise<void>;
  // New: Multiple conversations support
  previewConversations: PreviewConversationItem[];
  selectedConversationId: string | null;
  selectConversation: (conversationId: string) => Promise<void>;
  createNewConversation: (templateMessage?: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<{ success: boolean; error?: string }>;
  deleteAllConversations: () => Promise<{ success: boolean; error?: string }>;
  loadPreviewConversations: (autoSelectFirst?: boolean) => Promise<void>;
}

import { projectId } from '../utils/supabase/info';

// ==================== CONFIGURAÇÃO ====================

const API_BASE_URL = `https://${projectId}.supabase.co`;

// ==================== HOOK ====================

// Helper para formatar data/hora para nome da conversa
function formatConversationName(date: Date): string {
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function useAIBuilderChat(agentId: string | null, workspaceId: string | null): UseAIBuilderChatReturn {
  const [conversation, setConversation] = useState<Conversation>({
    id: '',
    messages: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queueSize, setQueueSize] = useState(0);

  // Multiple conversations support
  const [previewConversations, setPreviewConversations] = useState<PreviewConversationItem[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  // Fila de mensagens para permitir múltiplos envios simultâneos
  const messageQueueRef = useRef<Array<{ text: string; messageId: string }>>([]);
  const isProcessingRef = useRef(false);

  // ==================== CARREGAR CONVERSA DO BANCO ====================
  // Agora usa o conversation.id atual ao invés de buscar por agentId
  const loadConversation = useCallback(async (conversationIdToLoad?: string) => {
    const targetConversationId = conversationIdToLoad || conversation.id;

    if (!targetConversationId) {
      return;
    }

    try {

      // Usar RPC para buscar mensagens (bypass RLS)
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_conversation_messages', { p_conversation_id: targetConversationId });


      // Log detalhado de cada mensagem com pipeline_id
      if (rpcData) {
        rpcData.forEach((m: any) => {
          if (m.pipeline_id) {
          }
        });
      }

      if (rpcError) {
        console.error('[useAIBuilderChat] ⚠️ Error loading messages:', rpcError);
        return;
      }

      const messages = rpcData || [];

      // Buscar dados do pipeline para mensagens que têm pipeline_id
      const messagesWithPipeline = await Promise.all(
        messages.map(async (msg: any) => {
          const baseMessage = {
            id: msg.id,
            type: msg.message_type === 'received' ? 'sent' : 'received',
            text: msg.text_content || '',
            timestamp: new Date(msg.created_at)
          };

          if (msg.pipeline_id) {
            // Buscar pipeline usando RPC
            const { data: pipelineData, error: pipelineError } = await supabase
              .rpc('get_pipeline_with_steps', { p_pipeline_id: msg.pipeline_id });

            if (pipelineError) {
              console.error(`[useAIBuilderChat] ❌ Error loading pipeline ${msg.pipeline_id}:`, pipelineError);
            } else {
            }

            if (pipelineData) {
              const transformedPipeline: PipelineInfo = {
                id: pipelineData.id,
                status: pipelineData.status,
                statusMessage: pipelineData.status_message,
                startedAt: pipelineData.started_at,
                completedAt: pipelineData.completed_at,
                totalDurationMs: pipelineData.total_duration_ms,
                totalTokensUsed: pipelineData.total_tokens_used,
                totalCostEstimate: pipelineData.total_cost_estimate,
                stepsCompleted: pipelineData.steps_completed,
                responseSent: pipelineData.response_sent,
                errorMessage: pipelineData.error_message,
                errorStep: pipelineData.error_step,
                steps: (pipelineData.steps || []).map((step: any) => ({
                  number: step.step_number,
                  key: step.step_key,
                  name: step.step_name,
                  icon: step.step_icon || '',
                  status: step.status,
                  statusMessage: step.status_message,
                  startedAt: step.started_at,
                  completedAt: step.completed_at,
                  durationMs: step.duration_ms,
                  tokensInput: step.tokens_input,
                  tokensOutput: step.tokens_output,
                  tokensTotal: step.tokens_total,
                  costEstimate: step.cost_estimate,
                  inputSummary: step.input_summary,
                  outputSummary: step.output_summary,
                  errorMessage: step.error_message,
                  model: step.config?.model || null,
                  config: step.config,
                  inputData: step.input_data || null,
                  outputData: step.output_data || null
                }))
              };

              // Extrair tool calls dos steps do pipeline
              const toolCalls: ToolCall[] = transformedPipeline.steps
                .filter(step => step.key.startsWith('tool_'))
                .map(step => ({
                  name: step.key.replace('tool_', ''),
                  status: step.status as 'success' | 'error' | 'skipped',
                  displayName: step.name,
                  params: step.inputData || undefined,
                  result: step.outputData || undefined,
                  isPreview: step.config?.preview_mode || false
                }));

              return {
                ...baseMessage,
                metadata: {
                  pipelineId: pipelineData.id,
                  tokensUsed: pipelineData.total_tokens_used,
                  durationMs: pipelineData.total_duration_ms,
                  pipeline: transformedPipeline,
                  toolCalls: toolCalls.length > 0 ? toolCalls : undefined
                }
              };
            }
          }

          return baseMessage;
        })
      );

      setConversation({
        id: targetConversationId,
        messages: messagesWithPipeline
      });

      const messagesWithPipelineData = messagesWithPipeline.filter(m => m.metadata?.pipeline).length;
    } catch (err) {
      console.error('[useAIBuilderChat] Error:', err);
    }
  }, [conversation.id]);

  // NOTA: A carga inicial de conversas agora é feita pelo useEffect de loadPreviewConversations
  // O loadConversation é usado apenas para recarregar a conversa atual após enviar mensagem

  // ==================== PROCESSAR FILA DE MENSAGENS ====================
  const processMessageQueue = useCallback(async () => {
    if (isProcessingRef.current || messageQueueRef.current.length === 0 || !agentId) {
      return;
    }

    isProcessingRef.current = true;
    setIsLoading(true);

    while (messageQueueRef.current.length > 0) {
      const item = messageQueueRef.current.shift();
      setQueueSize(messageQueueRef.current.length); // Atualizar contador
      
      if (!item) continue;

      const { text, messageId } = item;
      const loadingId = `loading-${messageId}`;

      try {

        // 1. Obter token de autenticação
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !sessionData?.session?.access_token) {
          throw new Error('Não autenticado. Faça login novamente.');
        }

        const accessToken = sessionData.session.access_token;

        // 2. Chamar a API - passar conversationId se existir
        const currentConversationId = conversation.id || selectedConversationId;
        const response = await fetch(
          `${API_BASE_URL}/functions/v1/ai-preview-chat`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              agentId,
              message: text,
              conversationId: currentConversationId || undefined,
              preview: true,
              debug: true
            })
          }
        );

        // 3. Tratar resposta
        const data = await response.json();

        if (!response.ok || !data.success) {
          const errorMessage = data.error || data.message || `Erro ${response.status}`;
          throw new Error(errorMessage);
        }


        // 4. Recarregar mensagens do banco usando o conversationId da resposta
        // IMPORTANTE: Passar o ID explicitamente para evitar closure stale
        const responseConversationId = data.conversationId;

        // Aguardar um pouco para garantir que o banco foi atualizado
        await new Promise(resolve => setTimeout(resolve, 300));

        // Recarregar mensagens do banco passando o ID explicitamente
        await loadConversation(responseConversationId);

        // Atualizar selectedConversationId se necessário
        setSelectedConversationId(responseConversationId);

      } catch (err: any) {
        console.error(`[useAIBuilderChat] ❌ Error processing ${messageId}:`, err);
        
        // Atualizar mensagem de loading com erro
        setConversation(prev => ({
          ...prev,
          messages: prev.messages.map(msg =>
            msg.id === loadingId
              ? {
                  id: msg.id,
                  type: 'received' as const,
                  text: `❌ Erro: ${err.message}`,
                  timestamp: new Date(),
                  isLoading: false,
                  isError: true
                }
              : msg
          )
        }));
      }
    }

    isProcessingRef.current = false;
    setIsLoading(false);
  }, [agentId, conversation.id, selectedConversationId, loadConversation]);

  // ==================== ENVIAR MENSAGEM (ADICIONAR À FILA) ====================
  const handleSendMessage = useCallback(async (payload: { text: string }) => {
    // Validações
    if (!agentId) {
      console.error('[useAIBuilderChat] Erro: agentId não fornecido');
      setError('Nenhum agente selecionado');
      return;
    }

    if (!payload.text?.trim()) {
      console.error('[useAIBuilderChat] Erro: mensagem vazia');
      return;
    }

    setError(null);

    // 1. Criar mensagem do usuário (otimista)
    const messageId = uuid();
    const userMessage: Message = {
      id: messageId,
      type: 'sent',
      text: payload.text.trim(),
      timestamp: new Date()
    };

    // 2. Criar placeholder de loading
    const loadingId = `loading-${messageId}`;
    const loadingMessage: Message = {
      id: loadingId,
      type: 'received',
      text: '...',
      timestamp: new Date(),
      isLoading: true
    };

    // 3. Adicionar à UI imediatamente
    setConversation(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage, loadingMessage]
    }));

    // 4. Adicionar à fila
    messageQueueRef.current.push({
      text: payload.text.trim(),
      messageId
    });
    setQueueSize(messageQueueRef.current.length);


    // 5. Processar fila (se não estiver processando)
    processMessageQueue();
  }, [agentId, processMessageQueue]);

  // ==================== DELETAR MENSAGEM ====================
  const handleDeleteMessage = useCallback(async (messageId: string) => {
    try {

      // 1. Remove do estado local IMEDIATAMENTE (feedback visual)
      setConversation(prev => ({
        ...prev,
        messages: prev.messages.filter(msg => msg.id !== messageId)
      }));

      // 2. Soft delete no banco (marca deleted_at)
      const { error: deleteError } = await supabase
        .from('messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', messageId);

      if (deleteError) {
        console.error('[useAIBuilderChat] Error deleting message:', deleteError);
        // Recarregar conversa em caso de erro
        loadConversation();
        return;
      }

    } catch (err) {
      console.error('[useAIBuilderChat] Error in handleDeleteMessage:', err);
      // Recarregar conversa em caso de erro
      loadConversation();
    }
  }, [loadConversation]);

  // ==================== RESETAR CHAT ====================
  const handleResetChat = useCallback(async () => {
    if (!agentId) return;

    try {
      // Limpar estado local imediatamente
      setConversation({
        id: '',
        messages: []
      });
      setError(null);

      // ✅ USAR RPC para buscar conversa (bypass RLS)
      const { data: rpcData } = await supabase
        .rpc('get_preview_conversation_with_messages', { p_agent_id: agentId });

      if (rpcData?.conversation?.id) {
        const conversationId = rpcData.conversation.id;
        
        // Deletar mensagens primeiro
        await supabase
          .from('messages')
          .delete()
          .eq('conversation_id', conversationId);

        // Deletar conversa
        await supabase
          .from('conversations')
          .delete()
          .eq('id', conversationId);

      }
      
    } catch (err: any) {
      console.error('[useAIBuilderChat] Erro ao resetar:', err);
      // Mesmo com erro, mantém o estado limpo
      setConversation({
        id: '',
        messages: []
      });
      setError(null); // Não mostrar erro ao usuário, só no console
    }
  }, [agentId]);

  // ==================== RESETAR E INICIAR COM TEMPLATE ====================
  const handleResetAndStartTemplate = useCallback(async (templateMessage: string) => {
    if (!agentId || !templateMessage.trim() || !workspaceId) return;

    try {
      // 1. Primeiro resetar tudo
      await handleResetChat();

      // 2. Aguardar um pouco para garantir que o reset foi processado
      await new Promise(resolve => setTimeout(resolve, 300));

      // 3. Usar o workspace passado como parâmetro (workspace atual que o usuário está acessando)

      // 4. Criar nova conversa (inbox_id pode ser NULL para preview)
      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          workspace_id: workspaceId, // ✅ Usar workspace do contexto, não do usuário
          inbox_id: null, // NULL é permitido para conversas de preview
          channel: 'preview', // Canal específico para preview
          contact_phone: agentId,
          contact_name: 'Preview Test',
          status: 'in-progress', // Status válido: 'waiting' | 'in-progress' | 'resolved'
          attendant_type: 'ai'
        })
        .select()
        .single();

      if (convError) {
        console.error('[useAIBuilderChat] Erro ao criar conversa:', convError);
        throw new Error(`Erro ao criar conversa: ${convError.message}`);
      }

      if (!newConversation) {
        throw new Error('Conversa não foi criada');
      }

      // 5. Inserir mensagem template como se fosse do bot (message_type: 'sent')
      const { data: newMessage, error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: newConversation.id,
          content_type: 'text',
          message_type: 'sent', // 'sent' = mensagem enviada pela IA/bot
          text_content: templateMessage,
          is_read: false
        })
        .select()
        .single();

      if (msgError) {
        console.error('[useAIBuilderChat] Erro ao criar mensagem:', msgError);
        throw new Error(`Erro ao criar mensagem: ${msgError.message}`);
      }

      if (!newMessage) {
        throw new Error('Mensagem não foi criada');
      }

      // 6. Atualizar estado local
      setConversation({
        id: newConversation.id,
        messages: [{
          id: newMessage.id,
          type: 'received', // No frontend, mensagens do bot são 'received'
          text: templateMessage,
          timestamp: new Date(newMessage.created_at),
          isLoading: false
        }]
      });


      // Atualizar lista localmente (evita chamada circular)
      const newConvItem: PreviewConversationItem = {
        id: newConversation.id,
        name: 'Preview ' + new Date().toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        createdAt: new Date(newConversation.created_at),
        lastMessage: templateMessage,
        messageCount: 1
      };
      setPreviewConversations(prev => [newConvItem, ...prev]);
      setSelectedConversationId(newConversation.id);
    } catch (err: any) {
      console.error('[useAIBuilderChat] Erro ao iniciar template:', err);
      setError(err.message || 'Erro ao iniciar template');
    }
  }, [agentId, workspaceId, handleResetChat]);

  // ==================== CARREGAR LISTA DE CONVERSAS DE PREVIEW ====================
  const loadPreviewConversations = useCallback(async (autoSelectFirst: boolean = false) => {
    if (!agentId || !workspaceId) return;

    try {

      // Usar RPC para bypass RLS - passa workspace para filtrar conversas do workspace atual
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('list_preview_conversations', { p_agent_id: agentId, p_workspace_id: workspaceId });


      if (rpcError) {
        console.error('[useAIBuilderChat] Error loading conversations:', rpcError);
        return;
      }

      // rpcData é um array JSON retornado pela função (pode ser array direto ou jsonb)
      let conversations: any[] = [];
      if (Array.isArray(rpcData)) {
        conversations = rpcData;
      } else if (rpcData && typeof rpcData === 'object') {
        // Se for um objeto, tentar extrair array
        conversations = Object.values(rpcData);
      }

      const items: PreviewConversationItem[] = conversations.map((conv: any) => ({
        id: conv.id,
        name: conv.contact_name || formatConversationName(new Date(conv.created_at)),
        createdAt: new Date(conv.created_at),
        lastMessage: conv.last_message || undefined,
        messageCount: conv.total_messages || 0
      }));


      // Se não tem conversas, criar uma automaticamente
      if (items.length === 0) {

        // Criar conversa via RPC - passa workspace_id explícito
        const { data: createData, error: createError } = await supabase
          .rpc('create_preview_conversation', {
            p_agent_id: agentId,
            p_template_message: null,
            p_workspace_id: workspaceId
          });

        if (createError) {
          console.error('[useAIBuilderChat] Error creating initial conversation:', createError);
          return;
        }

        if (createData?.success && createData?.conversation_id) {

          // Recarregar a lista (sem recursão infinita pois agora terá 1 conversa)
          const { data: newRpcData } = await supabase
            .rpc('list_preview_conversations', { p_agent_id: agentId, p_workspace_id: workspaceId });

          if (Array.isArray(newRpcData) && newRpcData.length > 0) {
            const newItems: PreviewConversationItem[] = newRpcData.map((conv: any) => ({
              id: conv.id,
              name: conv.contact_name || formatConversationName(new Date(conv.created_at)),
              createdAt: new Date(conv.created_at),
              lastMessage: conv.last_message || undefined,
              messageCount: conv.total_messages || 0
            }));

            setPreviewConversations(newItems);
            setSelectedConversationId(newItems[0].id);
            setConversation({ id: newItems[0].id, messages: [] });
          }
        }
        return;
      }

      setPreviewConversations(items);

      // Apenas auto-selecionar a primeira se solicitado E não tiver uma já selecionada
      if (autoSelectFirst && items.length > 0 && !selectedConversationId) {
        setSelectedConversationId(items[0].id);
        // Carregar mensagens da primeira conversa via RPC
        const { data: messagesData } = await supabase
          .rpc('get_conversation_messages', { p_conversation_id: items[0].id });

        if (messagesData) {
          // messagesData pode ser array ou jsonb
          const messagesArray = Array.isArray(messagesData) ? messagesData : [];
          const formattedMessages: Message[] = messagesArray.map((msg: any) => ({
            id: msg.id,
            type: msg.message_type === 'received' ? 'sent' : 'received',
            text: msg.text_content || '',
            timestamp: new Date(msg.created_at),
            isLoading: false
          }));
          setConversation({ id: items[0].id, messages: formattedMessages });
        }
      }
    } catch (err) {
      console.error('[useAIBuilderChat] Error:', err);
    }
  }, [agentId, workspaceId, selectedConversationId]);

  // ==================== SELECIONAR CONVERSA ====================
  const selectConversation = useCallback(async (conversationId: string) => {
    if (!agentId) return;

    try {
      setSelectedConversationId(conversationId);

      // Carregar mensagens da conversa selecionada via RPC
      const { data: messagesData, error: msgError } = await supabase
        .rpc('get_conversation_messages', { p_conversation_id: conversationId });

      if (msgError) {
        console.error('[useAIBuilderChat] Error loading messages:', msgError);
        return;
      }

      // Transformar mensagens para o formato do frontend
      const formattedMessages: Message[] = (messagesData || []).map((msg: any) => ({
        id: msg.id,
        type: msg.message_type === 'received' ? 'sent' : 'received',
        text: msg.text_content || '',
        timestamp: new Date(msg.created_at),
        isLoading: false
      }));

      setConversation({
        id: conversationId,
        messages: formattedMessages
      });

    } catch (err) {
      console.error('[useAIBuilderChat] Error selecting conversation:', err);
    }
  }, [agentId]);

  // ==================== CRIAR NOVA CONVERSA ====================
  const createNewConversation = useCallback(async (templateMessage?: string) => {
    if (!agentId || !workspaceId) return;

    try {

      // Usar RPC para criar conversa (bypass RLS) - passa workspace_id explícito
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('create_preview_conversation', {
          p_agent_id: agentId,
          p_template_message: templateMessage?.trim() || null,
          p_workspace_id: workspaceId // ✅ Passar workspace atual
        });


      if (rpcError) throw new Error(rpcError.message);
      if (!rpcData?.success) throw new Error(rpcData?.error || 'Erro ao criar conversa');

      const conversationId = rpcData.conversation_id;
      const createdAt = new Date(rpcData.created_at);

      let initialMessages: Message[] = [];

      // Se tinha template, adicionar mensagem inicial ao estado
      if (templateMessage?.trim() && rpcData.message_id) {
        initialMessages = [{
          id: rpcData.message_id,
          type: 'received',
          text: templateMessage.trim(),
          timestamp: createdAt,
          isLoading: false
        }];
      }

      // Atualizar estado PRIMEIRO
      setConversation({
        id: conversationId,
        messages: initialMessages
      });
      setSelectedConversationId(conversationId);

      // Adicionar a nova conversa diretamente à lista local (otimista)
      const newConvItem: PreviewConversationItem = {
        id: conversationId,
        name: formatConversationName(createdAt),
        createdAt: createdAt,
        lastMessage: templateMessage?.trim() || undefined,
        messageCount: templateMessage?.trim() ? 1 : 0
      };

      setPreviewConversations(prev => [newConvItem, ...prev]);


      // NÃO recarregar do banco - já temos o estado atualizado localmente
      // O loadPreviewConversations pode causar race condition e limpar a conversa

    } catch (err: any) {
      console.error('[useAIBuilderChat] Error creating conversation:', err);
      setError(err.message || 'Erro ao criar conversa');
    }
  }, [agentId, workspaceId]);

  // ==================== DELETAR CONVERSA ====================
  const deleteConversation = useCallback(async (conversationId: string): Promise<{ success: boolean; error?: string }> => {
    if (!agentId) return { success: false, error: 'Agent ID não encontrado' };

    try {

      // Verificar se a conversa ainda existe na lista local
      const conversationExists = previewConversations.some(c => c.id === conversationId);
      if (!conversationExists) {
        // A conversa pode já ter sido deletada, apenas recarregar a lista
        await loadPreviewConversations();
        return { success: true }; // Considerar sucesso pois a conversa não existe mais
      }

      // Verificar se é a última conversa - não permitir deletar
      if (previewConversations.length <= 1) {
        return { success: false, error: 'Não é possível deletar a última conversa. Deve haver pelo menos uma conversa ativa.' };
      }

      // Usar RPC para deletar conversa (bypass RLS)
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('delete_preview_conversation', { p_conversation_id: conversationId });

      if (rpcError) throw new Error(rpcError.message);

      // Se a conversa não foi encontrada no banco, pode já ter sido deletada
      if (!rpcData?.success) {
        if (rpcData?.error?.includes('not found')) {
          // Atualizar lista local removendo a conversa
          setPreviewConversations(prev => prev.filter(c => c.id !== conversationId));
          await loadPreviewConversations();
          return { success: true };
        }
        throw new Error(rpcData?.error || 'Erro ao deletar conversa');
      }

      // IMPORTANTE: Atualizar estado local IMEDIATAMENTE
      setPreviewConversations(prev => prev.filter(c => c.id !== conversationId));

      // Se era a conversa selecionada, selecionar outra
      if (selectedConversationId === conversationId) {
        // Encontrar outra conversa para selecionar (usando lista filtrada)
        const remainingConversations = previewConversations.filter(c => c.id !== conversationId);
        const otherConversation = remainingConversations[0];
        if (otherConversation) {
          setSelectedConversationId(otherConversation.id);
          await loadConversation(otherConversation.id);
        } else {
          setSelectedConversationId(null);
          setConversation({ id: '', messages: [] });
        }
      }

      // Recarregar lista para garantir consistência
      await loadPreviewConversations();

      return { success: true };
    } catch (err: any) {
      console.error('[useAIBuilderChat] Error deleting conversation:', err);
      // Se houver erro, recarregar a lista para sincronizar
      await loadPreviewConversations();
      setError(err.message || 'Erro ao deletar conversa');
      return { success: false, error: err.message || 'Erro ao deletar conversa' };
    }
  }, [agentId, selectedConversationId, previewConversations, loadPreviewConversations, loadConversation]);

  // ==================== DELETAR TODAS AS CONVERSAS ====================
  const deleteAllConversations = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!agentId) return { success: false, error: 'Agent ID não encontrado' };

    try {

      // Precisa ter pelo menos 2 conversas para deletar (mantém 1)
      if (previewConversations.length <= 1) {
        return { success: false, error: 'Existe apenas uma conversa. Nada a deletar.' };
      }

      // Manter a primeira conversa (mais recente), deletar o resto
      const conversationsToDelete = previewConversations.slice(1);
      const firstConversation = previewConversations[0];


      // Deletar todas exceto a primeira
      let deletedCount = 0;
      for (const conv of conversationsToDelete) {
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('delete_preview_conversation', { p_conversation_id: conv.id });

        if (!rpcError && rpcData?.success) {
          deletedCount++;
        } else {
        }
      }


      // IMPORTANTE: Atualizar estado local IMEDIATAMENTE para evitar dessincronização
      // Isso evita que o usuário tente deletar conversas que já foram removidas
      setPreviewConversations([firstConversation]);

      // Selecionar a primeira conversa (que foi mantida)
      setSelectedConversationId(firstConversation.id);
      await loadConversation(firstConversation.id);

      // Recarregar lista do banco para garantir consistência
      await loadPreviewConversations();

      return { success: true };
    } catch (err: any) {
      console.error('[useAIBuilderChat] Error deleting all conversations:', err);
      setError(err.message || 'Erro ao deletar conversas');
      return { success: false, error: err.message || 'Erro ao deletar conversas' };
    }
  }, [agentId, previewConversations, loadPreviewConversations, loadConversation]);

  // Carregar lista de conversas quando agentId ou workspaceId mudar
  useEffect(() => {
    if (agentId && workspaceId) {
      loadPreviewConversations(true); // Auto-selecionar a primeira conversa
    } else {
      setPreviewConversations([]);
      setSelectedConversationId(null);
      setConversation({ id: '', messages: [] });
    }
  }, [agentId, workspaceId]); // Removida dependência de loadPreviewConversations para evitar loop

  return {
    conversation,
    isLoading,
    error,
    queueSize,
    handleSendMessage,
    handleDeleteMessage,
    handleResetChat,
    handleResetAndStartTemplate,
    loadConversation,
    // Multiple conversations
    previewConversations,
    selectedConversationId,
    selectConversation,
    createNewConversation,
    deleteConversation,
    deleteAllConversations,
    loadPreviewConversations
  };
}

export default useAIBuilderChat;