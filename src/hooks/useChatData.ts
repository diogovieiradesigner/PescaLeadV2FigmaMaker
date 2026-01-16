/**
 * Hook para gerenciar dados de chat com Supabase Realtime
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
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
import { CreateMessageData, CreateConversationData, dbMessageToFrontend } from '../utils/supabase/chat-converters';
import { supabase } from '../utils/supabase/client.tsx';
import { projectId } from '../utils/supabase/info.tsx';

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
  // PROFILE PICTURE SYNC (BAIXA PRIORIDADE - RODA EM BACKGROUND)
  // ============================================

  // ✅ Refs para tracking sem causar re-renders
  const checkedAvatarsRef = useRef(new Set<string>());
  const avatarCacheRef = useRef(new Map<string, string>());

  useEffect(() => {
    // ✅ Só rodar depois que conversas carregaram
    if (!workspaceId || conversations.length === 0 || loading) return;

    // ✅ BAIXA PRIORIDADE: Esperar 3 segundos antes de buscar avatares
    // Isso garante que chat, mensagens e interações funcionem primeiro
    const timeoutId = setTimeout(async () => {
      const missingAvatars = conversations.filter(
        (c) => !c.avatar &&
               !avatarCacheRef.current.has(c.id) &&
               c.channel === 'whatsapp' &&
               !checkedAvatarsRef.current.has(c.contactPhone) &&
               !c.contactPhone.includes('@g.us') &&
               !c.contactPhone.includes('status@broadcast')
      );

      if (missingAvatars.length === 0) return;

      // Marcar como verificados para não tentar de novo
      missingAvatars.forEach(c => checkedAvatarsRef.current.add(c.contactPhone));

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      // ✅ Processar em background, um por vez com delay (não bloqueia UI)
      for (const conv of missingAvatars.slice(0, 5)) { // Máximo 5 por vez
        try {
          let phone = conv.contactPhone;
          if (phone.includes('@s.whatsapp.net')) phone = phone.split('@')[0];
          const formattedPhone = phone.startsWith('+') ? phone : `+${phone.replace(/\D/g, '')}`;

          const res = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-e4f9d774/contacts/profile-picture?phone=${encodeURIComponent(formattedPhone)}&workspaceId=${workspaceId}&conversationId=${conv.id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (res.ok) {
            const data = await res.json();
            if (data.url) {
              avatarCacheRef.current.set(conv.id, data.url);
              setConversations(prev => prev.map(c =>
                c.id === conv.id ? { ...c, avatar: data.url } : c
              ));
            }
          }
        } catch {
          // Silenciar - avatares não são críticos
        }
        // Pequeno delay entre requests para não sobrecarregar
        await new Promise(r => setTimeout(r, 200));
      }
    }, 3000); // ✅ 3 segundos de delay - prioridade é o chat funcionar

    return () => clearTimeout(timeoutId);
  }, [conversations.length, workspaceId, loading]);


  // ============================================
  // REALTIME SUBSCRIPTIONS (100% REALTIME - SEM POLLING!)
  // ============================================

  useEffect(() => {
    if (!workspaceId) return;


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

          if (payload.eventType === 'INSERT') {
            // Nova conversa criada
            
            // ✅ Verificar se já existe ANTES de buscar os detalhes
            const exists = conversations.some(c => c.id === payload.new.id);
            if (exists) {
              return;
            }

            setTotalConversations(prev => prev + 1);
            const newConversation = await fetchConversation(payload.new.id);
            if (newConversation) {
              setConversations((prev) => {
                // ✅ SEGURANÇA: Double check antes de adicionar (race condition protection)
                const stillNotExists = !prev.some(c => c.id === newConversation.id);
                if (stillNotExists) {
                  return [newConversation, ...prev];
                }
                return prev;
              });
            } else {
              console.error('❌ [REALTIME] Failed to fetch new conversation details');
            }
          } else if (payload.eventType === 'UPDATE') {
            // ✅ OTIMIZADO: Update incremental sem fetchConversation
            // Apenas atualiza campos que mudaram no payload
            const updatedFields = payload.new;
            setConversations((prev) =>
              prev.map((conv) => {
                if (conv.id !== updatedFields.id) return conv;

                // ✅ Preservar avatar do cache ou estado local
                const cachedAvatar = avatarCacheRef.current.get(conv.id);

                return {
                  ...conv,
                  // Atualizar apenas campos relevantes do payload
                  status: updatedFields.status || conv.status,
                  contactName: updatedFields.contact_name || conv.contactName,
                  attendantType: updatedFields.attendant_type || conv.attendantType,
                  tags: updatedFields.tags || conv.tags,
                  // ✅ Preservar avatar
                  avatar: cachedAvatar || conv.avatar,
                };
              })
            );
          } else if (payload.eventType === 'DELETE') {
            // Conversa deletada
            setTotalConversations(prev => Math.max(0, prev - 1));
            setConversations((prev) => prev.filter((conv) => conv.id !== payload.old.id));
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [REALTIME] Conversations channel error:', err?.message || '', err);
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ [REALTIME] Conversations channel timeout - connection failed');
        } else if (status === 'CLOSED') {
        } else {
        }
      });

    // Subscribe to messages changes
    // ✅ OTIMIZADO: Update incremental em vez de fetchConversation completo
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
          const conversationId = payload.new?.conversation_id || payload.old?.conversation_id;

          if (!conversationId) return;

          // ✅ UPDATE INCREMENTAL: Não fazer fetchConversation completo
          setConversations((prev) => {
            const existingConv = prev.find((c) => c.id === conversationId);

            // Se a conversa não está no estado local, ignorar (pode ser de outro workspace)
            if (!existingConv) {
              return prev;
            }

            // Verificar se pertence ao workspace correto
            if (existingConv.workspaceId !== workspaceId) {
              return prev;
            }

            let updatedMessages = [...existingConv.messages];
            let lastMessageText = existingConv.lastMessage;

            if (payload.eventType === 'INSERT') {
              // ✅ Nova mensagem - converter e adicionar
              const newMessage = dbMessageToFrontend(payload.new as any);

              // Verificar se já existe (evitar duplicata de optimistic update)
              const exists = updatedMessages.some(m => m.id === newMessage.id);
              if (!exists) {
                updatedMessages.push(newMessage);
                // Atualizar lastMessage preview
                if (newMessage.contentType === 'text' && newMessage.text) {
                  lastMessageText = newMessage.text;
                } else if (newMessage.contentType === 'image') {
                  lastMessageText = '📷 Imagem';
                } else if (newMessage.contentType === 'audio') {
                  lastMessageText = '🎤 Áudio';
                } else if (newMessage.contentType === 'video') {
                  lastMessageText = '🎬 Vídeo';
                } else if (newMessage.contentType === 'document') {
                  lastMessageText = `📎 ${newMessage.fileName || 'Documento'}`;
                }
              }

            } else if (payload.eventType === 'UPDATE') {
              // ✅ Mensagem atualizada - atualizar no array
              const updatedMessage = dbMessageToFrontend(payload.new as any);
              updatedMessages = updatedMessages.map(m =>
                m.id === updatedMessage.id ? { ...m, ...updatedMessage } : m
              );

            } else if (payload.eventType === 'DELETE') {
              // ✅ Mensagem deletada - marcar como delete ou remover
              const deletedId = payload.old?.id;
              if (deletedId) {
                updatedMessages = updatedMessages.map(m =>
                  m.id === deletedId ? { ...m, type: 'delete' as const } : m
                );
              }
            }

            // ✅ Ordenar mensagens por createdAt
            updatedMessages.sort((a, b) => {
              const timeA = new Date(a.createdAt || 0).getTime();
              const timeB = new Date(b.createdAt || 0).getTime();
              return timeA - timeB;
            });

            // Calcular unreadCount
            const unreadCount = updatedMessages.filter(
              m => m.type === 'received' && !m.read
            ).length;

            // ✅ Mover conversa para o topo da lista
            const filtered = prev.filter((c) => c.id !== conversationId);
            const updatedConv = {
              ...existingConv,
              messages: updatedMessages,
              lastMessage: lastMessageText,
              lastUpdate: 'Agora',
              unreadCount,
            };

            return [updatedConv, ...filtered];
          });
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
        } else if (status === 'CHANNEL_ERROR') {
        } else if (status === 'TIMED_OUT') {
        } else if (status === 'CLOSED') {
        }
      });

    return () => {
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
        timestamp: `${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ${now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`,
        createdAt: now.toISOString(), // ✅ Timestamp completo para ordenação
        read: true,
        contentType: messageData.contentType,
        imageUrl: messageData.imageUrl,
        audioUrl: messageData.audioUrl,
        audioDuration: messageData.audioDuration,
        mediaUrl: messageData.mediaUrl,      // ✅ Para documentos e vídeos
        fileName: messageData.fileName,      // ✅ Nome do arquivo
        fileSize: messageData.fileSize,      // ✅ Tamanho do arquivo
        mimeType: messageData.mimeType,      // ✅ MIME type
        type: 'sent', // ✅ Adicionar tipo da mensagem
        status: 'sending', // Status temporário
      };

      // Adicionar mensagem temporária na UI
      // Determinar texto para lastMessage baseado no tipo de conteúdo
      let lastMessageText = messageData.text || 'Mídia';
      if (!messageData.text) {
        if (messageData.contentType === 'image') lastMessageText = '📷 Imagem';
        else if (messageData.contentType === 'video') lastMessageText = '🎥 Vídeo';
        else if (messageData.contentType === 'document') lastMessageText = `📎 ${messageData.fileName || 'Documento'}`;
        else if (messageData.contentType === 'audio') lastMessageText = '🎤 Áudio';
      }

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId
            ? {
                ...conv,
                messages: [...conv.messages, optimisticMessage],
                lastMessage: lastMessageText,
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
          
          const result = await sendAudioViaServer(conversationId, workspaceId, messageData.audioUrl, messageData.audioDuration);
          
          
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
        } else if ((messageData.contentType === 'document' || messageData.contentType === 'video') && messageData.mediaUrl) {
          // ✅ Enviar documento ou vídeo via servidor

          const result = await sendMediaViaServer(
            conversationId,
            workspaceId,
            {
              mediaUrl: messageData.mediaUrl,
              mediaType: messageData.contentType,
              mimeType: messageData.mimeType || 'application/octet-stream',
              caption: messageData.text || '',
              fileName: messageData.fileName || `file.${messageData.contentType === 'video' ? 'mp4' : 'pdf'}`
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


      // ✅ FEEDBACK IMEDIATO: Update otimista + toast ANTES da API
      setConversations((prev) =>
        prev.map((conv) => ({
          ...conv,
          messages: conv.messages.map((msg) =>
            msg.id === messageId
              ? { ...msg, type: 'delete' as const }
              : msg
          ),
          ...(conv.messages[conv.messages.length - 1]?.id === messageId && {
            lastMessage: conv.messages[conv.messages.length - 2]?.text || '',
          }),
        }))
      );
      toast.success('Mensagem deletada');

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;

        if (!accessToken) {
          throw new Error('Sessão expirada');
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

      } catch (err: any) {
        console.error('[useChatData] Error deleting message:', err);
        // ✅ Reverter update otimista em caso de erro
        setConversations((prev) =>
          prev.map((conv) => ({
            ...conv,
            messages: conv.messages.map((msg) =>
              msg.id === messageId
                ? { ...msg, type: 'sent' as const }
                : msg
            ),
          }))
        );
        toast.error('Erro ao deletar mensagem', {
          description: err.message || 'Tente novamente'
        });
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