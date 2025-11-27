/**
 * Hook para gerenciar chat de testes do AI Builder
 * Usa a estrutura existente de conversas/mensagens com canal "builder_test"
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase/client.tsx';
import { Conversation, Message } from '../types/chat';
import {
  fetchConversation,
  sendMessage as sendMessageService,
  deleteConversation,
  clearConversationHistory,
} from '../services/chat-service';
import { CreateMessageData } from '../utils/supabase/chat-converters';
import { dbConversationToFrontend, dbMessageToFrontend } from '../utils/supabase/chat-converters';
import { DbConversation, DbMessage } from '../types/database-chat';

interface UseAIBuilderChatProps {
  workspaceId: string | null;
}

export function useAIBuilderChat({ workspaceId }: UseAIBuilderChatProps) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // CRIAR/BUSCAR CONVERSA DE TESTE
  // ============================================

  const initializeTestConversation = useCallback(async () => {
    if (!workspaceId) {
      setConversation(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Buscar conversa existente com canal chat e contact_phone específico
      const { data: existingConv, error: searchError } = await supabase
        .from('conversations')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('channel', 'chat')
        .eq('contact_phone', 'builder_test@internal')
        .single();

      let conversationId: string;

      if (existingConv) {
        // Conversa já existe
        conversationId = existingConv.id;
        console.log('[useAIBuilderChat] Found existing test conversation:', conversationId);
      } else {
        // Criar nova conversa de teste usando canal 'chat'
        const { data: newConv, error: createError } = await supabase
          .from('conversations')
          .insert({
            workspace_id: workspaceId,
            contact_name: 'AI Builder Test',
            contact_phone: 'builder_test@internal',
            channel: 'chat', // Usando canal válido
            status: 'in-progress',
            attendant_type: 'ai',
          })
          .select()
          .single();

        if (createError) throw createError;
        conversationId = newConv.id;
        console.log('[useAIBuilderChat] Created new test conversation:', conversationId);
      }

      // Carregar conversa completa com mensagens
      const fullConversation = await fetchConversation(conversationId);
      setConversation(fullConversation);
    } catch (err) {
      console.error('[useAIBuilderChat] Error initializing conversation:', err);
      setError('Erro ao inicializar conversa de teste');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    initializeTestConversation();
  }, [initializeTestConversation]);

  // ============================================
  // REALTIME SUBSCRIPTION
  // ============================================

  useEffect(() => {
    if (!conversation?.id || !workspaceId) return;

    console.log('[useAIBuilderChat] Setting up realtime for conversation:', conversation.id);

    const channel = supabase
      .channel(`ai-builder-messages-${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        async (payload) => {
          console.log('[useAIBuilderChat] Message change detected:', payload.eventType);

          // Recarregar conversa completa
          const updatedConversation = await fetchConversation(conversation.id);
          if (updatedConversation) {
            setConversation(updatedConversation);
          }
        }
      )
      .subscribe((status) => {
        console.log('[useAIBuilderChat] Realtime status:', status);
      });

    return () => {
      console.log('[useAIBuilderChat] Cleaning up realtime');
      channel.unsubscribe();
    };
  }, [conversation?.id, workspaceId]);

  // ============================================
  // MESSAGE ACTIONS
  // ============================================

  const handleSendMessage = useCallback(
    async (messageData: { text?: string; contentType: 'text' | 'image' | 'audio'; imageUrl?: string; audioUrl?: string; audioDuration?: number }) => {
      if (!conversation?.id) {
        throw new Error('No active conversation');
      }

      try {
        const createData: CreateMessageData = {
          conversation_id: conversation.id,
          message_type: 'sent', // Mensagens enviadas pelo usuário (teste como atendente)
          content_type: messageData.contentType,
          text_content: messageData.text,
          media_url: messageData.imageUrl || messageData.audioUrl,
          media_duration: messageData.audioDuration,
        };

        await sendMessageService(createData);
        
        // Não precisa atualizar manualmente, o realtime vai fazer isso
      } catch (err) {
      }
    },
    [conversation?.id]
  );

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (!conversation?.id) return;

      try {
        // Deletar mensagem do banco
        const { error } = await supabase
          .from('messages')
          .delete()
          .eq('id', messageId);

        if (error) throw error;

        // Atualizar localmente (optimistic)
        setConversation((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages.filter((m) => m.id !== messageId),
          };
        });
      } catch (err) {
        console.error('[useAIBuilderChat] Error deleting message:', err);
        throw err;
      }
    },
    [conversation?.id]
  );

  const handleResetChat = useCallback(async () => {
    if (!conversation?.id) return;

    try {
      await clearConversationHistory(conversation.id);
      
      // Limpar mensagens localmente
      setConversation((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: [],
          lastMessage: '',
          totalMessages: 0,
        };
      });
    } catch (err) {
      console.error('[useAIBuilderChat] Error resetting chat:', err);
      throw err;
    }
  }, [conversation?.id]);

  return {
    conversation,
    loading,
    error,
    handleSendMessage,
    handleDeleteMessage,
    handleResetChat,
  };
}