/**
 * Hook para gerenciar dados de chat com Supabase Realtime
 */

import { useState, useEffect, useCallback } from 'react';
import { Conversation, Message, ConversationStatus } from '../types/chat';
import {
  fetchConversations,
  fetchConversation,
  sendMessage as sendMessageService,
  sendMessageViaServer,
  sendAudioViaServer,
  sendMediaViaServer,
  updateConversation,
  deleteConversation as deleteConversationService,
  clearConversationHistory,
  markMessagesAsRead,
  createConversation,
  fetchConversationCount,
} from '../services/chat-service';
import { CreateMessageData, CreateConversationData } from '../utils/supabase/chat-converters';
import { supabase } from '../utils/supabase/client.tsx';
import { projectId, publicAnonKey } from '../utils/supabase/info.tsx'; // ✅ Importar publicAnonKey

interface UseChatDataProps {
  workspaceId: string | null;
  searchQuery?: string; // ✅ Novo parâmetro de busca
}

export function useChatData({ workspaceId, searchQuery }: UseChatDataProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Paginação
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalConversations, setTotalConversations] = useState(0);
  const PAGE_SIZE = 10;

  // ============================================
  // LOAD CONVERSATIONS
  // ============================================

  const loadConversations = useCallback(async (reset = false) => {
    if (!workspaceId) {
      setConversations([]);
      setLoading(false);
      return;
    }

    try {
      if (reset) {
        setLoading(true);
        setError(null);
        
        // Carregar contagem total apenas no reset inicial (com filtro de busca)
        fetchConversationCount(workspaceId, searchQuery).then(setTotalConversations).catch(console.error);
      }

      // Se for reset, busca página 1. Se não, busca a próxima página baseada no estado atual
      // Mas cuidado: se chamarmos loadConversations(false), queremos buscar a página 'page'
      // Se chamarmos loadConversations(true), queremos buscar página 1 e resetar 'page' para 2
      
      const currentPage = reset ? 1 : page;
      
      // ✅ Passar searchQuery para a função de busca
      const data = await fetchConversations(workspaceId, currentPage, PAGE_SIZE, searchQuery);
      
      if (data.length < PAGE_SIZE) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      setConversations((prev) => {
        if (reset) return data;
        
        // ✅ Filtrar duplicatas de forma mais robusta
        // Criar um Map com todas as conversas (prev + data), usando o ID como chave
        // Isso garante que cada ID apareça apenas uma vez
        const conversationMap = new Map<string, Conversation>();
        
        // Primeiro adicionar as conversas antigas (preservar ordem)
        prev.forEach(c => conversationMap.set(c.id, c));
        
        // Depois adicionar/sobrescrever com as novas (atualiza dados)
        data.forEach(c => conversationMap.set(c.id, c));
        
        // Converter Map de volta para array
        return Array.from(conversationMap.values());
      });

      if (reset) {
        setPage(2);
      } else {
        setPage(prev => prev + 1);
      }

    } catch (err) {
      console.error('[useChatData] Error loading conversations:', err);
      setError('Erro ao carregar conversas');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, page, searchQuery]);

  useEffect(() => {
    loadConversations(true);
  }, [workspaceId]); // Apenas workspaceId como dependência para carga inicial

  // ✅ Reset quando searchQuery mudar
  useEffect(() => {
    if (workspaceId) {
      setPage(1);
      loadConversations(true);
    }
  }, [searchQuery]); // Resetar busca quando query mudar

  // ============================================
  // PROFILE PICTURE SYNC
  // ============================================

  // Fila de telefones já consultados na sessão para evitar loops
  const [checkedAvatars] = useState(new Set<string>());

  useEffect(() => {
    if (!workspaceId || conversations.length === 0) return;

    const fetchMissingAvatars = async () => {
      const missingAvatars = conversations.filter(
        (c) => !c.avatar && 
               c.channel === 'whatsapp' && 
               !checkedAvatars.has(c.contactPhone) &&
               !c.contactPhone.includes('@g.us') && // Ignorar grupos
               !c.contactPhone.includes('status@broadcast') // Ignorar status
      );

      if (missingAvatars.length === 0) return;

      // Marcar como verificados para não chamar novamente imediatamente
      missingAvatars.forEach(c => checkedAvatars.add(c.contactPhone));

      console.log(`[useChatData] Fetching avatars for ${missingAvatars.length} contacts...`);

      for (const conv of missingAvatars) {
        try {
          // Usar o ID do projeto Supabase para construir a URL da Edge Function
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;

          if (!token) continue;
          
          // Função auxiliar para formatar telefone e fazer a chamada
          const tryFetchAvatar = async (phoneToTry: string): Promise<{url: string | null, success: boolean}> => {
             // URL format: https://<project_id>.supabase.co/functions/v1/<function_name>/<route>
             const functionUrl = `https://${projectId}.supabase.co/functions/v1/make-server-e4f9d774/contacts/profile-picture?phone=${encodeURIComponent(phoneToTry)}&workspaceId=${workspaceId}&conversationId=${conv.id}`;
             
             console.log(`[useChatData] Requesting avatar for ${phoneToTry}: ${functionUrl}`);
             
             const res = await fetch(functionUrl, {
                headers: { Authorization: `Bearer ${token}` }
             });
             
             if (!res.ok) {
                 const text = await res.text();
                 throw new Error(`Server responded with ${res.status}: ${text}`);
             }
             
             const data = await res.json();
             return { url: data.url, success: !!data.url };
          };

          // Estratégia 1: Tentar com o número sanitizado padrão
          let initialPhone = conv.contactPhone;
          if (initialPhone.includes('@s.whatsapp.net')) initialPhone = initialPhone.split('@')[0];
          
          // Normalização básica
          let formattedPhone = initialPhone;
          if (formattedPhone.startsWith('+')) {
             formattedPhone = '+' + formattedPhone.substring(1).replace(/\D/g, '');
          } else {
             formattedPhone = `+${formattedPhone.replace(/\D/g, '')}`;
          }

          // Tentar fetch inicial
          let result = await tryFetchAvatar(formattedPhone);
          
          // Estratégia 2: Se falhou e é número brasileiro (DDI 55), verificar regra do 9º dígito
          // Formato esperado BR com 9: +55 (2 dígitos DDD) (9 dígitos número) = 13 dígitos (sem contar o + dá 13 chars? Não. +55 + 11 digits = 13 chars total.
          // +55 XX 9XXXX-XXXX -> 13 dígitos numéricos.
          // Se tiver 12 dígitos numéricos (+55 XX XXXX-XXXX), falta o 9.
          if (!result.success && formattedPhone.startsWith('+55')) {
              const digitsOnly = formattedPhone.replace(/\D/g, ''); // '55838564818' -> 11 digits. Wait.
              // DDI(2) + DDD(2) + Num(8) = 12 digits total.
              // DDI(2) + DDD(2) + 9 + Num(8) = 13 digits total.
              
              if (digitsOnly.length === 12) {
                  console.log(`[useChatData] Avatar not found for ${formattedPhone}. Trying to inject '9' digit for Brazil...`);
                  // Inserir 9 após o DDD (índice 4 na string de dígitos: 0,1=DDI, 2,3=DDD, inserir no 4)
                  // digitsOnly = 55 83 8564818
                  // newDigits = 55 83 9 8564818
                  const newDigits = digitsOnly.slice(0, 4) + '9' + digitsOnly.slice(4);
                  const phoneWith9 = `+${newDigits}`;
                  
                  result = await tryFetchAvatar(phoneWith9);
              }
          }

          if (result.success && result.url) {
             // Atualizar estado local imediatamente
              setConversations(prev => prev.map(c => 
                c.id === conv.id ? { ...c, avatar: result.url! } : c
              ));
          }
          
        } catch (error) {
          console.error(`[useChatData] Error processing avatar for ${conv.contactPhone}`, error);
        }
      }
    };

    fetchMissingAvatars();
  }, [conversations, workspaceId, checkedAvatars]);

  // ============================================
  // REALTIME SUBSCRIPTIONS (100% REALTIME - SEM POLLING!)
  // ============================================

  useEffect(() => {
    if (!workspaceId) return;

    console.log('🔥 [useChatData] Setting up REALTIME subscriptions for workspace:', workspaceId);

    // Subscribe to conversations changes
    const conversationsChannel = supabase
      .channel(`conversations-realtime-${workspaceId}`, {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        async (payload) => {
          console.log('✅ [REALTIME] Conversation change detected:', payload.eventType, payload);
          console.log('📊 [REALTIME] Payload workspace_id:', payload.new?.workspace_id || payload.old?.workspace_id);
          console.log('📊 [REALTIME] Current workspace_id:', workspaceId);

          if (payload.eventType === 'INSERT') {
            // Nova conversa criada
            console.log('➕ [REALTIME] NEW CONVERSATION INSERTED!');
            console.log('   Conversation ID:', payload.new.id);
            console.log('   Workspace ID:', payload.new.workspace_id);
            console.log('   Contact Name:', payload.new.contact_name);
            
            setTotalConversations(prev => prev + 1);
            const newConversation = await fetchConversation(payload.new.id);
            if (newConversation) {
              console.log('✅ [REALTIME] Adding new conversation:', newConversation.contactName);
              setConversations((prev) => {
                // ✅ SEGURANÇA: Verificar se já existe antes de adicionar
                const exists = prev.some(c => c.id === newConversation.id);
                if (exists) {
                  console.warn('⚠️ [REALTIME] Conversation already exists, skipping INSERT:', newConversation.id);
                  return prev;
                }
                console.log('🎉 [REALTIME] Conversation added to state! Total:', prev.length + 1);
                return [newConversation, ...prev];
              });
            } else {
              console.error('❌ [REALTIME] Failed to fetch new conversation details');
            }
          } else if (payload.eventType === 'UPDATE') {
            // Conversa atualizada
            const updatedConversation = await fetchConversation(payload.new.id);
            if (updatedConversation) {
              console.log('✅ [REALTIME] Updating conversation:', updatedConversation.contactName);
              setConversations((prev) =>
                prev.map((conv) =>
                  conv.id === updatedConversation.id 
                    ? { 
                        ...updatedConversation, 
                        // ✅ Preservar avatar se já existir no estado local
                        avatar: conv.avatar || updatedConversation.avatar 
                      } 
                    : conv
                )
              );
            }
          } else if (payload.eventType === 'DELETE') {
            // Conversa deletada
            console.log('✅ [REALTIME] Deleting conversation:', payload.old.id);
            setTotalConversations(prev => Math.max(0, prev - 1));
            setConversations((prev) => prev.filter((conv) => conv.id !== payload.old.id));
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ [REALTIME] Conversations channel CONNECTED!');
          console.log('📡 [REALTIME] Listening for changes in workspace:', workspaceId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [REALTIME] Conversations channel error:', err?.message || '', err);
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ [REALTIME] Conversations channel timeout - connection failed');
        } else if (status === 'CLOSED') {
          console.log('🔌 [REALTIME] Conversations channel closed');
        } else {
          console.log('🔄 [REALTIME] Conversations channel status:', status);
        }
      });

    // Subscribe to messages changes
    const messagesChannel = supabase
      .channel(`messages-realtime-${workspaceId}`, {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          console.log('✅ [REALTIME] Message change detected:', payload.eventType, payload);

          // Recarregar a conversa afetada
          const conversationId = payload.new?.conversation_id || payload.old?.conversation_id;
          
          if (!conversationId) {
            console.log('⚠️ [REALTIME] No conversation_id found in message payload');
            return;
          }

          const updatedConversation = await fetchConversation(conversationId);

          if (updatedConversation && updatedConversation.workspaceId === workspaceId) {
            console.log('✅ [REALTIME] Updating conversation with new message:', updatedConversation.contactName);
            setConversations((prev) => {
              // ✅ Filtrar TODAS as ocorrências (caso haja duplicatas)
              const filtered = prev.filter((c) => c.id !== conversationId);
              // ✅ Preservar avatar da conversa anterior se existir
              const previousConv = prev.find((c) => c.id === conversationId);
              const conversationWithAvatar = {
                ...updatedConversation,
                avatar: previousConv?.avatar || updatedConversation.avatar,
              };
              // ✅ Adicionar no início e garantir unicidade
              const newList = [conversationWithAvatar, ...filtered];
              
              // ✅ DEDUPLICAÇÃO FINAL: Remover qualquer duplicata por ID
              const seen = new Set<string>();
              return newList.filter(conv => {
                if (seen.has(conv.id)) {
                  console.warn('⚠️ [REALTIME] Duplicate conversation detected and removed:', conv.id);
                  return false;
                }
                seen.add(conv.id);
                return true;
              });
            });
          } else {
            console.log('⚠️ [REALTIME] Message belongs to different workspace, ignoring');
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ [REALTIME] Messages channel CONNECTED!');
        } else if (status === 'CHANNEL_ERROR') {
          console.log('⚠️ [REALTIME] Messages channel error (silent):', err?.message || '');
        } else if (status === 'TIMED_OUT') {
          console.log('⏱️ [REALTIME] Messages channel timeout');
        } else if (status === 'CLOSED') {
          console.log('🔌 [REALTIME] Messages channel closed');
        }
      });

    return () => {
      console.log('🔌 [REALTIME] Cleaning up realtime subscriptions');
      conversationsChannel.unsubscribe();
      messagesChannel.unsubscribe();
    };
  }, [workspaceId]);

  // ============================================
  // CONVERSATION ACTIONS
  // ============================================

  const handleCreateConversation = useCallback(
    async (data: CreateConversationData) => {
      try {
        const newConversation = await createConversation(data);
        setConversations((prev) => [newConversation, ...prev]);
        return newConversation;
      } catch (err) {
        console.error('[useChatData] Error creating conversation:', err);
        throw err;
      }
    },
    []
  );

  const handleUpdateStatus = useCallback(
    async (conversationId: string, status: ConversationStatus) => {
      try {
        await updateConversation(conversationId, { status });
        
        // Atualizar localmente
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === conversationId ? { ...conv, status } : conv
          )
        );
      } catch (err) {
        console.error('[useChatData] Error updating status:', err);
        throw err;
      }
    },
    []
  );

  const handleAssignAgent = useCallback(
    async (conversationId: string, agentId: string) => {
      try {
        // ✅ Se agentId for string vazia, passar null (não atribuído)
        const assignedToValue = agentId === '' ? null : agentId;
        
        await updateConversation(conversationId, { assigned_to: assignedToValue });
        
        // ✅ Não fazer update otimista aqui - deixar o realtime atualizar com os dados corretos do banco
        // O realtime vai buscar o assignedUser e popular assignedTo + assignedToName corretamente
      } catch (err) {
        console.error('[useChatData] Error assigning agent:', err);
        throw err;
      }
    },
    []
  );

  const handleUpdateTags = useCallback(
    async (conversationId: string, tags: string[]) => {
      try {
        await updateConversation(conversationId, { tags });
        
        // Atualizar localmente
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === conversationId ? { ...conv, tags } : conv
          )
        );
      } catch (err) {
        console.error('[useChatData] Error updating tags:', err);
        throw err;
      }
    },
    []
  );

  const handleDeleteConversation = useCallback(
    async (conversationId: string) => {
      try {
        await deleteConversationService(conversationId);
        setConversations((prev) => prev.filter((conv) => conv.id !== conversationId));
      } catch (err) {
        console.error('[useChatData] Error deleting conversation:', err);
        throw err;
      }
    },
    []
  );

  const handleClearHistory = useCallback(
    async (conversationId: string) => {
      try {
        await clearConversationHistory(conversationId);
        
        // Atualizar localmente
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === conversationId
              ? { ...conv, messages: [], lastMessage: '', totalMessages: 0 }
              : conv
          )
        );
      } catch (err) {
        console.error('[useChatData] Error clearing history:', err);
        throw err;
      }
    },
    []
  );

  // ============================================
  // MESSAGE ACTIONS
  // ============================================

  const handleSendMessage = useCallback(
    async (conversationId: string, messageData: any) => {
      if (!workspaceId) {
        throw new Error('Workspace ID is required to send message');
      }

      // 🎯 OPTIMISTIC UPDATE: Adicionar mensagem imediatamente na UI
      const optimisticMessageId = `temp-${Date.now()}`;
      const now = new Date();
      const optimisticMessage: Message = {
        id: optimisticMessageId,
        conversationId,
        sender: 'agent',
        text: messageData.text || '',
        timestamp: now.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        createdAt: now.toISOString(), // ✅ Timestamp completo para ordenação
        read: true,
        contentType: messageData.contentType,
        imageUrl: messageData.imageUrl,
        audioUrl: messageData.audioUrl,
        audioDuration: messageData.audioDuration,
        type: 'sent', // ✅ Adicionar tipo da mensagem
        status: 'sending', // Status temporário
      };

      // Adicionar mensagem temporária na UI
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId
            ? {
                ...conv,
                messages: [...conv.messages, optimisticMessage],
                lastMessage: messageData.text || 'Mídia',
                lastUpdate: 'Agora',
              }
            : conv
        )
      );

      try {
        // Apenas mensagens de texto são enviadas via Evolution API
        if (messageData.contentType === 'text' && messageData.text) {
          // Enviar via servidor (Evolution API)
          const result = await sendMessageViaServer(conversationId, workspaceId, messageData.text);
          
          // ✅ Atualizar mensagem temporária com dados reais
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === conversationId
                ? {
                    ...conv,
                    messages: conv.messages.map((msg) =>
                      msg.id === optimisticMessageId
                        ? { ...msg, id: result.message.id, status: 'sent' }
                        : msg
                    ),
                  }
                : conv
            )
          );
        } else if (messageData.contentType === 'audio' && messageData.audioUrl) {
          // Enviar áudio via servidor (Evolution API)
          console.log('🎤 [useChatData] ==========================================');
          console.log('🎤 [useChatData] SENDING AUDIO MESSAGE');
          console.log('🎤 [useChatData] ==========================================');
          console.log('   Conversation ID:', conversationId);
          console.log('   Audio URL length:', messageData.audioUrl?.length);
          console.log('   Audio Duration (raw):', messageData.audioDuration);
          console.log('   Audio Duration (type):', typeof messageData.audioDuration);
          console.log('🎤 [useChatData] ==========================================');
          
          const result = await sendAudioViaServer(conversationId, workspaceId, messageData.audioUrl, messageData.audioDuration);
          
          console.log('🎤 [useChatData] Audio sent successfully. Result:', result);
          
          // ✅ Atualizar mensagem temporária com dados reais
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === conversationId
                ? {
                    ...conv,
                    messages: conv.messages.map((msg) =>
                      msg.id === optimisticMessageId
                        ? { ...msg, id: result.message.id, status: 'sent' }
                        : msg
                    ),
                  }
                : conv
            )
          );
        } else if (messageData.contentType === 'image' && messageData.imageUrl) {
          // ✅ Enviar imagem via servidor (Evolution API)
          
          // Tentar detectar mimeType do base64 se possível
          let mimeType = 'image/jpeg';
          if (messageData.imageUrl.startsWith('data:image/png')) mimeType = 'image/png';
          else if (messageData.imageUrl.startsWith('data:image/gif')) mimeType = 'image/gif';
          else if (messageData.imageUrl.startsWith('data:image/webp')) mimeType = 'image/webp';

          const result = await sendMediaViaServer(
            conversationId, 
            workspaceId, 
            {
              mediaUrl: messageData.imageUrl,
              mediaType: 'image',
              mimeType: mimeType,
              caption: messageData.text || '', // Usar texto como legenda se existir
              fileName: 'image.' + mimeType.split('/')[1]
            }
          );
          
          // ✅ Atualizar mensagem temporária com dados reais
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === conversationId
                ? {
                    ...conv,
                    messages: conv.messages.map((msg) =>
                      msg.id === optimisticMessageId
                        ? { ...msg, id: result.message.id, status: 'sent' }
                        : msg
                    ),
                  }
                : conv
            )
          );
        } else {
          // Para outros tipos (áudio, imagem), salvar apenas no banco
          const createData: CreateMessageData = {
            conversation_id: conversationId,
            message_type: 'sent', // ✅ Corrigido: banco usa message_type
            content_type: messageData.contentType,
            text_content: messageData.text,
            media_url: messageData.imageUrl || messageData.audioUrl,
            media_duration: messageData.audioDuration,
          };

          const savedMessage = await sendMessageService(createData);
          
          // ✅ Atualizar mensagem temporária com dados reais
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === conversationId
                ? {
                    ...conv,
                    messages: conv.messages.map((msg) =>
                      msg.id === optimisticMessageId
                        ? { ...msg, id: savedMessage.id, status: 'sent' }
                        : msg
                    ),
                  }
                : conv
            )
          );
        }
      } catch (err) {
        console.error('[useChatData] Error sending message:', err);
        
        // ❌ Marcar mensagem como erro
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  messages: conv.messages.map((msg) =>
                    msg.id === optimisticMessageId
                      ? { ...msg, status: 'error' }
                      : msg
                  ),
                }
              : conv
          )
        );
        
        throw err;
      }
    },
    [workspaceId]
  );

  const handleMarkAsRead = useCallback(async (conversationId: string) => {
    try {
      await markMessagesAsRead(conversationId);
      
      // Atualizar localmente
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId
            ? {
                ...conv,
                unreadCount: 0,
                messages: conv.messages.map((msg) => ({ ...msg, read: true })),
              }
            : conv
        )
      );
    } catch (err) {
      console.error('[useChatData] Error marking as read:', err);
      throw err;
    }
  }, []);

  const handleUpdateAttendantType = useCallback(
    async (conversationId: string, attendantType: 'human' | 'ai') => {
      if (!workspaceId) {
        throw new Error('Workspace ID is required');
      }

      try {
        console.log(`[useChatData] Updating attendant type: ${conversationId} → ${attendantType}`);

        // ✅ Obter token do usuário autenticado
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;

        if (!accessToken) {
          throw new Error('No active session. Please login again.');
        }

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-e4f9d774/conversations/${conversationId}/attendant-type`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`, // ✅ Usar access token do usuário
            },
            body: JSON.stringify({ attendant_type: attendantType }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update attendant type');
        }

        // Atualizar localmente
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === conversationId
              ? { ...conv, attendantType }
              : conv
          )
        );

        console.log(`[useChatData] Attendant type updated successfully`);
      } catch (err) {
        console.error('[useChatData] Error updating attendant type:', err);
        throw err;
      }
    },
    [workspaceId]
  );

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (!workspaceId) {
        throw new Error('Workspace ID is required');
      }

      try {
        console.log(`[useChatData] Deleting message: ${messageId}`);

        // ✅ Obter token do usuário autenticado
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;

        if (!accessToken) {
          throw new Error('No active session. Please login again.');
        }

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-e4f9d774/messages/${messageId}/delete?workspaceId=${workspaceId}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete message');
        }

        // ✅ Atualizar mensagem no estado local como deletada (manter o conteúdo)
        setConversations((prev) =>
          prev.map((conv) => ({
            ...conv,
            messages: conv.messages.map((msg) =>
              msg.id === messageId
                ? { ...msg, type: 'delete' } // ✅ Apenas mudar o tipo, manter texto/mídia
                : msg
            ),
            // Atualizar lastMessage se a mensagem deletada era a última
            ...(conv.messages[conv.messages.length - 1]?.id === messageId && {
              lastMessage: conv.messages[conv.messages.length - 2]?.text || '',
            }),
          }))
        );

        console.log(`[useChatData] Message deleted successfully`);
      } catch (err) {
        console.error('[useChatData] Error deleting message:', err);
        throw err;
      }
    },
    [workspaceId]
  );

  return {
    conversations,
    loading,
    error,
    refresh: () => loadConversations(true),
    loadMore: () => loadConversations(false),
    hasMore,
    totalConversations,
    // Actions
    createConversation: handleCreateConversation,
    updateStatus: handleUpdateStatus,
    assignAgent: handleAssignAgent,
    updateTags: handleUpdateTags,
    updateAttendantType: handleUpdateAttendantType,
    deleteConversation: handleDeleteConversation,
    clearHistory: handleClearHistory,
    sendMessage: handleSendMessage,
    markAsRead: handleMarkAsRead,
    deleteMessage: handleDeleteMessage,
  };
}