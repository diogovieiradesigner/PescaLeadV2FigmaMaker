import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../utils/supabase/client';
import { Conversation, Message } from '../types/chat';
import { fetchConversation, fetchConversationByLeadId, sendMessageViaServer, sendAudioViaServer, sendMediaViaServer, sendMessage as sendMessageService, markMessagesAsRead, deleteConversation as deleteConversationService, clearConversationHistory } from '../services/chat-service';
import { CreateMessageData } from '../utils/supabase/chat-converters';
import { toast } from 'sonner';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseSingleConversationReturn {
  conversation: Conversation | null;
  loading: boolean;
  error: string | null;
  sendMessage: (messageData: any) => Promise<void>;
  markAsResolved: () => Promise<void>;
  changeStatus: (status: string) => Promise<void>;
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
          
          // ✅ OTIMIZAÇÃO: Update otimista - adicionar mensagem diretamente sem re-fetch completo
          setConversation(prev => {
            if (!prev) return null;
            
            // Converter payload para Message (simplificado)
            const newMessage: Message = {
              id: payload.new.id,
              conversationId: payload.new.conversation_id,
              sender: payload.new.sent_by === 'user' ? 'user' : 'agent',
              text: payload.new.text_content || '',
              timestamp: (() => { const d = new Date(payload.new.created_at); return `${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`; })(),
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
                      // ✅ CORREÇÃO: Sempre usar o type do payload, não condicional
                      type: payload.new.message_type as 'sent' | 'received' | 'delete',
                      // ✅ Atualizar transcrição se vier no payload
                      transcription: payload.new.transcription || m.transcription,
                      transcriptionStatus: payload.new.transcription_status || m.transcriptionStatus,
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
      timestamp: `${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ${now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`,
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

  const changeStatus = useCallback(async (status: string) => {
      if(!conversationId) return;
      try {
        const { error } = await supabase
          .from('conversations')
          .update({ status })
          .eq('id', conversationId);

        if (error) throw error;

        setConversation(prev => prev ? { ...prev, status } : null);
      } catch (err) {
        console.error('Erro ao alterar status:', err);
        toast.error('Erro ao alterar status da conversa');
      }
  }, [conversationId]);

  const markAsResolved = useCallback(async () => {
      await changeStatus('resolved');
  }, [changeStatus]);
  
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
      if (!workspaceId) return;

      // ✅ FEEDBACK IMEDIATO: Update otimista + toast ANTES da API
      setConversation(prev => {
          if(!prev) return null;
          return {
              ...prev,
              messages: prev.messages.map(m => m.id === messageId ? { ...m, type: 'delete' } : m)
          }
      });
      toast.success('Mensagem deletada');

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        if (!accessToken) {
          throw new Error('Sessão expirada');
        }

        const { projectId } = await import('../utils/supabase/info.tsx');
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-e4f9d774/messages/${messageId}/delete?workspaceId=${workspaceId}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Falha ao deletar mensagem');
        }
      } catch(e: any) {
          console.error(e);
          // ✅ Reverter update otimista em caso de erro
          setConversation(prev => {
              if(!prev) return null;
              return {
                  ...prev,
                  messages: prev.messages.map(m => m.id === messageId ? { ...m, type: 'sent' } : m)
              }
          });
          toast.error('Erro ao deletar mensagem', {
            description: e.message || 'Tente novamente'
          });
      }
  }, [workspaceId]);

  const refresh = useCallback(() => {
      // ✅ OTIMIZAÇÃO: Evitar refresh muito frequente (debounce manual)
      const now = Date.now();
      if (now - lastFetchRef.current < 1000) {
        return;
      }
      
      if (isFetchingRef.current) {
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
    changeStatus,
    clearHistory,
    deleteConversation,
    deleteMessage,
    refresh,
    setConversation: setConversationState
  };
}