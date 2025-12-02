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

export interface MessageMetadata {
  tokensUsed?: number;
  durationMs?: number;
  ragUsed?: boolean;
  specialistUsed?: string | null;
  guardrailPassed?: boolean;
  pipelineId?: string;
  pipeline?: PipelineInfo | null;
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

export interface UseAIBuilderChatReturn {
  conversation: Conversation;
  isLoading: boolean;
  error: string | null;
  queueSize: number;
  handleSendMessage: (payload: { text: string }) => Promise<void>;
  handleDeleteMessage: (messageId: string) => Promise<void>;
  handleResetChat: () => Promise<void>;
  handleResetAndStartTemplate: (templateMessage: string) => Promise<void>;
  loadConversation: () => Promise<void>;
}

import { projectId } from '../utils/supabase/info';

// ==================== CONFIGURAÇÃO ====================

const API_BASE_URL = `https://${projectId}.supabase.co`;

// ==================== HOOK ====================

export function useAIBuilderChat(agentId: string | null): UseAIBuilderChatReturn {
  const [conversation, setConversation] = useState<Conversation>({
    id: '',
    messages: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queueSize, setQueueSize] = useState(0);
  
  // Fila de mensagens para permitir múltiplos envios simultâneos
  const messageQueueRef = useRef<Array<{ text: string; messageId: string }>>([]);
  const isProcessingRef = useRef(false);

  // ==================== CARREGAR CONVERSA DO BANCO ====================
  const loadConversation = useCallback(async () => {
    if (!agentId) return;

    try {
      // Buscar conversa de preview para este agente
      // A conversa é identificada por channel='preview' e contact_phone=agentId
      const { data: conversationData, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .eq('channel', 'preview')
        .eq('contact_phone', agentId)
        .single();

      if (convError || !conversationData) {
        // Conversa ainda não existe - será criada no primeiro envio
        setConversation({ id: '', messages: [] });
        return;
      }

      // Buscar mensagens existentes (excluindo deletadas)
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select(`
          id,
          text_content,
          message_type,
          created_at,
          pipeline_id,
          ai_pipeline_logs!pipeline_id (
            id,
            status,
            status_message,
            started_at,
            completed_at,
            total_duration_ms,
            total_tokens_used,
            total_cost_estimate,
            steps_completed,
            response_sent,
            response_text,
            error_message,
            error_step,
            ai_pipeline_steps (
              step_number,
              step_key,
              step_name,
              step_icon,
              status,
              status_message,
              started_at,
              completed_at,
              duration_ms,
              tokens_input,
              tokens_output,
              tokens_total,
              cost_estimate,
              input_summary,
              output_summary,
              error_message,
              config
            )
          )
        `)
        .eq('conversation_id', conversationData.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (msgError) {
        console.error('[useAIBuilderChat] Error loading messages:', msgError);
        return;
      }

      // Agrupar mensagens por pipeline_id para identificar a última de cada grupo
      const pipelineGroups = new Map<string, number>();
      (messages || []).forEach((msg: any, index: number) => {
        if (msg.pipeline_id) {
          pipelineGroups.set(msg.pipeline_id, index);
        }
      });

      // Converter mensagens para formato do componente
      const formattedMessages: Message[] = (messages || []).map((msg: any, index: number) => {
        const baseMessage = {
          id: msg.id,
          type: msg.message_type === 'received' ? 'sent' : 'received',
          text: msg.text_content || '',
          timestamp: new Date(msg.created_at)
        };

        // Se a mensagem tem pipeline_id e os dados do pipeline foram carregados
        if (msg.pipeline_id && msg.ai_pipeline_logs) {
          const pipelineData = msg.ai_pipeline_logs;
          const isLastInGroup = pipelineGroups.get(msg.pipeline_id) === index;
          
          if (isLastInGroup) {
            // Apenas na ÚLTIMA mensagem do grupo: incluir pipeline completo
            const sortedSteps = (pipelineData.ai_pipeline_steps || []).sort(
              (a: any, b: any) => a.step_number - b.step_number
            );

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
              steps: sortedSteps.map((step: any) => ({
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
                model: step.config?.model || null, // Extrair modelo de config.model
                config: step.config
              }))
            };

            console.log(`[useAIBuilderChat] ✅ Pipeline attached to LAST message of group:`, {
              messageId: msg.id,
              pipelineId: transformedPipeline.id,
              isLastInGroup: true,
              groupSize: (messages || []).filter((m: any) => m.pipeline_id === msg.pipeline_id).length,
              totalTokensUsed: pipelineData.total_tokens_used,
              totalDurationMs: pipelineData.total_duration_ms
            });

            return {
              ...baseMessage,
              metadata: {
                pipelineId: pipelineData.id,
                tokensUsed: pipelineData.total_tokens_used,
                durationMs: pipelineData.total_duration_ms,
                pipeline: transformedPipeline
              }
            };
          } else {
            // Mensagem intermediária: NÃO incluir metadata para não exibir "0"
            console.log(`[useAIBuilderChat] ⏭️ Skipping metadata for non-last message:`, {
              messageId: msg.id,
              pipelineId: msg.pipeline_id,
              isLastInGroup: false
            });
            
            // Retornar apenas a mensagem básica sem metadata
            return baseMessage;
          }
        }

        return baseMessage;
      });

      setConversation({
        id: conversationData.id,
        messages: formattedMessages
      });

      const messagesWithPipeline = formattedMessages.filter(m => m.metadata?.pipeline).length;
      console.log(`[useAIBuilderChat] ✅ Loaded ${formattedMessages.length} messages (${messagesWithPipeline} with pipeline data) from conversation ${conversationData.id}`);
    } catch (err) {
      console.error('[useAIBuilderChat] Error:', err);
    }
  }, [agentId]);

  // Carregar conversa quando agentId mudar
  useEffect(() => {
    if (agentId) {
      loadConversation();
    } else {
      setConversation({ id: '', messages: [] });
    }
  }, [agentId, loadConversation]);

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
        console.log(`[useAIBuilderChat] 📤 Processing message ${messageId} from queue (${messageQueueRef.current.length} remaining)`);

        // 1. Obter token de autenticação
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !sessionData?.session?.access_token) {
          throw new Error('Não autenticado. Faça login novamente.');
        }

        const accessToken = sessionData.session.access_token;

        // 2. Chamar a API
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

        console.log(`[useAIBuilderChat] ✅ Response received for ${messageId}:`, {
          replyLength: data.reply?.length,
          tokensUsed: data.tokensUsed,
          pipelineSteps: data.pipeline?.steps?.length || 0
        });

        // 4. Remover mensagem de loading e recarregar conversa do banco
        // Isso garante que as mensagens fracionadas (se houver) sejam exibidas corretamente
        setConversation(prev => ({
          ...prev,
          id: data.conversationId,
          messages: prev.messages.filter(msg => msg.id !== loadingId)
        }));

        // Aguardar um pouco para garantir que o banco foi atualizado
        await new Promise(resolve => setTimeout(resolve, 300));

        // Recarregar mensagens do banco para pegar fracionamento
        await loadConversation();

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
  }, [agentId]);

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

    console.log(`[useAIBuilderChat] 📝 Message added to queue (total: ${messageQueueRef.current.length})`);

    // 5. Processar fila (se não estiver processando)
    processMessageQueue();
  }, [agentId, processMessageQueue]);

  // ==================== DELETAR MENSAGEM ====================
  const handleDeleteMessage = useCallback(async (messageId: string) => {
    try {
      console.log(`[useAIBuilderChat] Deleting message ${messageId}...`);

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

      console.log(`[useAIBuilderChat] ✅ Message ${messageId} deleted successfully`);
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

      // Deletar conversa do banco (se existir)
      const { data: conversationData } = await supabase
        .from('conversations')
        .select('id')
        .eq('channel', 'preview')
        .eq('contact_phone', agentId)
        .single();

      if (conversationData?.id) {
        // Deletar mensagens primeiro
        await supabase
          .from('messages')
          .delete()
          .eq('conversation_id', conversationData.id);

        // Deletar conversa
        await supabase
          .from('conversations')
          .delete()
          .eq('id', conversationData.id);

        console.log('[useAIBuilderChat] Conversa deletada do banco:', conversationData.id);
      }
      
      console.log('[useAIBuilderChat] ✅ Chat resetado - totalmente limpo');
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
    if (!agentId || !templateMessage.trim()) return;

    try {
      // 1. Primeiro resetar tudo
      await handleResetChat();

      // 2. Aguardar um pouco para garantir que o reset foi processado
      await new Promise(resolve => setTimeout(resolve, 300));

      // 3. Obter workspace do usuário
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data: memberData } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .single();

      if (!memberData) {
        throw new Error('Workspace não encontrado');
      }

      // 4. Criar nova conversa (inbox_id pode ser NULL para preview)
      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          workspace_id: memberData.workspace_id,
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

      console.log('[useAIBuilderChat] ✅ Template salvo no banco:', {
        conversationId: newConversation.id,
        messageId: newMessage.id
      });
    } catch (err: any) {
      console.error('[useAIBuilderChat] Erro ao iniciar template:', err);
      setError(err.message || 'Erro ao iniciar template');
    }
  }, [agentId, handleResetChat]);

  return {
    conversation,
    isLoading,
    error,
    queueSize,
    handleSendMessage,
    handleDeleteMessage,
    handleResetChat,
    handleResetAndStartTemplate,
    loadConversation
  };
}

export default useAIBuilderChat;