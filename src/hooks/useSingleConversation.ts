import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../utils/supabase/client';
import { Conversation, Message } from '../types/chat';
import { fetchConversation, fetchConversationByLeadId, sendMessageViaServer, sendAudioViaServer, sendMediaViaServer, sendMessage as sendMessageService, markMessagesAsRead, deleteConversation as deleteConversationService, clearConversationHistory } from '../services/chat-service';
import { CreateMessageData } from '../utils/supabase/chat-converters';
import { toast } from 'sonner@2.0.3';
import { RealtimeChannel } from 'npm:@supabase/supabase-js@2';

interface UseSingleConversationReturn {
  conversation: Conversation | null;
  loading: boolean;
  error: string | null;
  sendMessage: (messageData: any) => Promise<void>;
  markAsResolved: () => Promise<void>;
  clearHistory: () => Promise<void>;
  deleteConversation: () => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  refresh: () => void;
  setConversation: (conversation: Conversation | null) => void;
}

export function useSingleConversation(leadId: string | null, workspaceId: string): UseSingleConversationReturn {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  
  // ✅ OTIMIZAÇÃO: Usar ref para evitar re-fetches duplicados
  const isFetchingRef = useRef(false);
  const lastFetchRef = useRef<number>(0);

  // 1. Buscar Conversation ID pelo Lead ID
  useEffect(() => {
    if (!leadId) {
      setConversation(null);
      setConversationId(null);
      return;
    }

    const loadConversation = async () => {
      // ✅ Evitar fetch duplicado
      if (isFetchingRef.current) return;
      
      isFetchingRef.current = true;
      setLoading(true);
      
      try {
        const conv = await fetchConversationByLeadId(leadId);
        if (conv) {
          setConversation(conv);
          setConversationId(conv.id);
          lastFetchRef.current = Date.now();
        } else {
          setConversation(null);
          setConversationId(null);
        }
      } catch (err) {
        console.error('Error loading conversation:', err);
        setError('Erro ao carregar conversa');
      } finally {
        setLoading(false);
        isFetchingRef.current = false;
      }
    };

    loadConversation();
  }, [leadId]);

  // 2. Realtime Subscription - OTIMIZADO COM CLEANUP FORÇADO
  useEffect(() => {
    if (!conversationId || !workspaceId) return;

    console.log(`🔌 [useSingleConversation] Subscribing to conversation: ${conversationId}`);

    // ✅ CORREÇÃO: Variável local para garantir cleanup do canal correto
    let channelToCleanup: RealtimeChannel | null = null;

    // Subscribe to messages
    const channel = supabase.channel(`single-conversation-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          console.log('✅ [REALTIME] New message inserted');
          
          // ✅ OTIMIZAÇÃO: Update otimista - adicionar mensagem diretamente sem re-fetch completo
          setConversation(prev => {
            if (!prev) return null;
            
            // Converter payload para Message (simplificado)
            const newMessage: Message = {
              id: payload.new.id,
              conversationId: payload.new.conversation_id,
              sender: payload.new.sent_by === 'user' ? 'user' : 'agent',
              text: payload.new.text_content || '',
              timestamp: new Date(payload.new.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
              createdAt: payload.new.created_at,
              read: payload.new.is_read,
              contentType: payload.new.content_type,
              imageUrl: payload.new.media_url,
              audioUrl: payload.new.media_url,
              audioDuration: payload.new.audio_duration,
              type: payload.new.message_type,
              status: 'sent',
            };
            
            // Verificar se mensagem já existe (evitar duplicatas)
            if (prev.messages.some(m => m.id === newMessage.id)) {
              return prev;
            }
            
            return {
              ...prev,
              messages: [...prev.messages, newMessage],
              lastMessage: newMessage.text || 'Mídia',
              lastUpdate: 'Agora',
            };
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          console.log('✅ [REALTIME] Message updated');
          
          // ✅ OTIMIZAÇÃO: Atualizar mensagem específica sem re-fetch
          setConversation(prev => {
            if (!prev) return null;
            
            return {
              ...prev,
              messages: prev.messages.map(m => 
                m.id === payload.new.id 
                  ? {
                      ...m,
                      read: payload.new.is_read,
                      type: payload.new.message_type === 'delete' ? 'delete' : m.type,
                    }
                  : m
              ),
            };
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${conversationId}`,
        },
        async (payload) => {
          console.log('✅ [REALTIME] Conversation updated');
          
          // ✅ OTIMIZAÇÃO: Atualizar apenas metadados da conversa
          setConversation(prev => {
            if (!prev) return null;
            
            return {
              ...prev,
              status: payload.new.status,
              tags: payload.new.tags,
            };
          });
        }
      )
      .subscribe();

    // ✅ CORREÇÃO: Armazenar referência do canal para cleanup
    channelToCleanup = channel;

    return () => {
      console.log(`🔌 [useSingleConversation] Unsubscribing from conversation: ${conversationId}`);
      
      // ✅ CORREÇÃO: Garantir que o canal correto seja removido
      if (channelToCleanup) {
        supabase.removeChannel(channelToCleanup);
        channelToCleanup = null;
      }
    };
  }, [conversationId, workspaceId]);

  // 3. Send Message Logic - OTIMIZADO
  const sendMessage = useCallback(async (messageData: any) => {
    if (!conversationId || !workspaceId) return;

    // Optimistic Update
    const optimisticMessageId = `temp-${Date.now()}`;
    const now = new Date();
    const optimisticMessage: Message = {
      id: optimisticMessageId,
      conversationId,
      sender: 'agent',
      text: messageData.text || '',
      timestamp: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      createdAt: now.toISOString(),
      read: true,
      contentType: messageData.contentType,
      imageUrl: messageData.imageUrl,
      audioUrl: messageData.audioUrl,
      audioDuration: messageData.audioDuration,
      type: 'sent',
      status: 'sending',
    };

    setConversation(prev => {
      if (!prev) return null;
      return {
        ...prev,
        messages: [...prev.messages, optimisticMessage],
        lastMessage: messageData.text || 'Mídia',
        lastUpdate: 'Agora',
      };
    });

    try {
        if (messageData.contentType === 'text' && messageData.text) {
            await sendMessageViaServer(conversationId, workspaceId, messageData.text);
        } else if (messageData.contentType === 'audio' && messageData.audioUrl) {
            await sendAudioViaServer(conversationId, workspaceId, messageData.audioUrl, messageData.audioDuration);
        } else if (messageData.contentType === 'image' && messageData.imageUrl) {
            let mimeType = 'image/jpeg';
            if (messageData.imageUrl.startsWith('data:image/png')) mimeType = 'image/png';
            
            await sendMediaViaServer(conversationId, workspaceId, {
              mediaUrl: messageData.imageUrl,
              mediaType: 'image',
              mimeType,
              caption: messageData.text || '',
              fileName: 'image.jpg'
            });
        }
        
        // ✅ OTIMIZAÇÃO: Remover setTimeout - realtime cuida da atualização
        // O realtime subscription receberá o INSERT e atualizará automaticamente

    } catch (err: any) {
        console.error('Error sending message:', err);
        
        // ✅ Mostrar erro para o usuário
        const errorMessage = err.message || "Erro ao enviar mensagem";
        toast.error(errorMessage);

        // Mark as error in state
        setConversation(prev => {
            if (!prev) return null;
            return {
                ...prev,
                messages: prev.messages.map(m => m.id === optimisticMessageId ? { ...m, status: 'error' } : m)
            };
        });
    }
  }, [conversationId, workspaceId]);

  const markAsResolved = useCallback(async () => {
      if(!conversationId) return;
      // Logic to update status
      // For now just a log, implementation depends on updating conversation table
      console.log('Mark as resolved not implemented in hook yet');
  }, [conversationId]);
  
  const clearHistory = useCallback(async () => {
      if(!conversationId) return;
      await clearConversationHistory(conversationId);
      setConversation(prev => prev ? { ...prev, messages: [] } : null);
  }, [conversationId]);

  const deleteConversation = useCallback(async () => {
      if(!conversationId) return;
      await deleteConversationService(conversationId);
      setConversation(null);
  }, [conversationId]);

  const deleteMessage = useCallback(async (messageId: string) => {
      // Implement delete logic if needed
       if (!workspaceId) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        if (!accessToken) return;

        const { projectId } = await import('../utils/supabase/info.tsx'); // Lazy import to avoid cycle if any
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-e4f9d774/messages/${messageId}/delete?workspaceId=${workspaceId}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        
        // ✅ OTIMIZAÇÃO: Update otimista imediato
        setConversation(prev => {
            if(!prev) return null;
            return {
                ...prev,
                messages: prev.messages.map(m => m.id === messageId ? { ...m, type: 'delete' } : m)
            }
        })
      } catch(e) {
          console.error(e);
      }
  }, [workspaceId]);

  const refresh = useCallback(() => {
      // ✅ OTIMIZAÇÃO: Evitar refresh muito frequente (debounce manual)
      const now = Date.now();
      if (now - lastFetchRef.current < 1000) {
        console.log('[useSingleConversation] Skipping refresh - too soon');
        return;
      }
      
      if (isFetchingRef.current) {
        console.log('[useSingleConversation] Skipping refresh - already fetching');
        return;
      }
      
      isFetchingRef.current = true;
      lastFetchRef.current = now;
      
      // ✅ Se já tem conversationId, recarregar pela ID
      if(conversationId) {
        fetchConversation(conversationId)
          .then(setConversation)
          .finally(() => { isFetchingRef.current = false; });
      } 
      // ✅ Senão, forçar busca pela leadId (para quando conversa é criada)
      else if (leadId) {
        fetchConversationByLeadId(leadId)
          .then((conv) => {
            if (conv) {
              setConversation(conv);
              setConversationId(conv.id);
            }
          })
          .finally(() => { isFetchingRef.current = false; });
      } else {
        isFetchingRef.current = false;
      }
  }, [conversationId, leadId]);

  const setConversationState = useCallback((conversation: Conversation | null) => {
    setConversation(conversation);
    if (conversation) {
      setConversationId(conversation.id);
    } else {
      setConversationId(null);
    }
  }, []);

  return {
    conversation,
    loading,
    error,
    sendMessage,
    markAsResolved,
    clearHistory,
    deleteConversation,
    deleteMessage,
    refresh,
    setConversation: setConversationState
  };
}