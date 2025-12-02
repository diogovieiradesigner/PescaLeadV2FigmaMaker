import { useState, useEffect, useMemo } from 'react';
import { ConversationList } from './chat/ConversationList';
import { ChatArea } from './chat/ChatArea';
import { ContactInfo } from './chat/ContactInfo';
import { ChatHeader } from './chat/ChatHeader';
import { EmptyChatState } from './chat/EmptyChatState';
import { Theme } from '../hooks/useTheme';
import { Message } from '../types/chat';
import { Instance, Inbox } from './SettingsView';
import { useChatData } from '../hooks/useChatData';
import { useAuth } from '../contexts/AuthContext';
import { fetchAgents } from '../services/chat-service';
import { DbUser } from '../types/database-chat';
import { ConversationFiltersState } from './chat/ConversationFilters';
import { useDebounce } from '../hooks/useDebounce'; // ✅ Importar hook de debounce

interface ChatViewProps {
  theme: Theme;
  onThemeToggle: () => void;
  onNavigateToPipeline?: (leadId: string) => void;
  onNavigateToSettings?: () => void;
  onKanbanRefresh?: () => void; // ✅ Callback para refresh do kanban
  instances: Instance[];
  inboxes: Inbox[];
}

export function ChatView({ 
  theme, 
  onThemeToggle, 
  onNavigateToPipeline, 
  onNavigateToSettings,
  onKanbanRefresh, // ✅ Callback para refresh do kanban
  instances,
  inboxes
}: ChatViewProps) {
  const { currentWorkspace } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dbAgents, setDbAgents] = useState<DbUser[]>([]);
  
  // ✅ Debounce do searchQuery para evitar muitas requisições
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  
  // ✅ Estado para filtros
  const [filters, setFilters] = useState<ConversationFiltersState>({
    assignees: ['all'],
    inboxes: ['all'],
    statuses: ['all'],
    attendantTypes: ['all'],
  });

  // Hook de chat com Supabase (agora com searchQuery)
  const {
    conversations,
    loading,
    error,
    updateStatus,
    assignAgent,
    updateTags,
    updateAttendantType, // ✅ Nova função
    deleteConversation,
    clearHistory,
    sendMessage,
    markAsRead,
    deleteMessage, // ✅ Adicionar função de deletar mensagem
    loadMore,
    hasMore,
    totalConversations,
  } = useChatData({
    workspaceId: currentWorkspace?.id || null,
    searchQuery: debouncedSearchQuery, // ✅ Passar searchQuery com debounce
  });

  // Carregar agentes do banco (membros do workspace)
  useEffect(() => {
    if (currentWorkspace?.id) {
      fetchAgents(currentWorkspace.id).then(setDbAgents).catch(console.error);
    }
  }, [currentWorkspace?.id]);

  // ✅ Selecionar primeira conversa APENAS na carga inicial (não durante busca/filtros)
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversationId && !loading) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations.length, selectedConversationId, loading]); // ✅ Usar .length ao invés do array completo

  // ✅ Buscar conversa selecionada na lista COMPLETA (não apenas na filtrada)
  // Isso permite manter o chat aberto mesmo se ele não aparecer nos filtros/busca
  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  // ✅ Filtros locais (exceto busca que agora é no backend)
  const filteredConversations = useMemo(() => {
    let result = conversations;

    // ✅ REMOVIDO: Filtro de busca local (agora é feito no backend via useChatData)

    // Aplicar filtro de atendentes
    if (!filters.assignees.includes('all')) {
      result = result.filter((conv) => {
        if (filters.assignees.includes('unassigned')) {
          return !conv.assignedTo || filters.assignees.includes(conv.assignedTo);
        }
        return conv.assignedTo && filters.assignees.includes(conv.assignedTo);
      });
    }

    // Aplicar filtro de caixas de entrada
    if (!filters.inboxes.includes('all')) {
      // Precisamos do inbox_id da conversa. Como não está no tipo Conversation,
      // vamos buscar pelo workspaceId (todas as conversas do workspace estão na mesma inbox por enquanto)
      // TODO: Adicionar inbox_id ao tipo Conversation se necessário
    }

    // Aplicar filtro de status
    if (!filters.statuses.includes('all')) {
      result = result.filter((conv) => filters.statuses.includes(conv.status));
    }

    // Aplicar filtro de tipo de atendimento
    if (!filters.attendantTypes.includes('all')) {
      result = result.filter((conv) => {
        const attendantType = conv.attendantType || 'human';
        return filters.attendantTypes.includes(attendantType);
      });
    }

    return result;
  }, [conversations, filters]); // ✅ Removido searchQuery das dependências

  const handleSendMessage = async (messageData: Omit<Message, 'id' | 'timestamp' | 'type'>) => {
    if (!selectedConversationId) return;

    try {
      await sendMessage(selectedConversationId, messageData);
    } catch (error) {
      console.error('[ChatView] Error sending message:', error);
      alert('Erro ao enviar mensagem. Tente novamente.');
    }
  };

  const handleStatusChange = async (conversationId: string, status: string) => {
    try {
      await updateStatus(conversationId, status as any);
    } catch (error) {
      console.error('[ChatView] Error updating status:', error);
      alert('Erro ao atualizar status. Tente novamente.');
    }
  };

  const handleAssigneeChange = async (conversationId: string, assigneeId: string) => {
    try {
      await assignAgent(conversationId, assigneeId);
    } catch (error) {
      console.error('[ChatView] Error assigning agent:', error);
      alert('Erro ao atribuir atendente. Tente novamente.');
    }
  };

  const handleTagsChange = async (conversationId: string, tags: string[]) => {
    try {
      await updateTags(conversationId, tags);
    } catch (error) {
      console.error('[ChatView] Error updating tags:', error);
      alert('Erro ao atualizar tags. Tente novamente.');
    }
  };

  const handleAttendantTypeChange = async (conversationId: string, attendantType: 'human' | 'ai') => {
    try {
      console.log(`[ChatView] Updating attendant type: ${conversationId} → ${attendantType}`);
      await updateAttendantType(conversationId, attendantType);
    } catch (error) {
      console.error('[ChatView] Error updating attendant type:', error);
      alert('Erro ao atualizar tipo de atendente. Tente novamente.');
    }
  };

  const handleClearHistory = async (conversationId: string) => {
    try {
      await clearHistory(conversationId);
    } catch (error) {
      console.error('[ChatView] Error clearing history:', error);
      alert('Erro ao limpar histórico. Tente novamente.');
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await deleteConversation(conversationId);
      // Se a conversa deletada era a selecionada, selecionar a primeira disponível
      if (selectedConversationId === conversationId) {
        const remaining = conversations.filter((c) => c.id !== conversationId);
        setSelectedConversationId(remaining[0]?.id || null);
      }
    } catch (error) {
      console.error('[ChatView] Error deleting conversation:', error);
      alert('Erro ao deletar conversa. Tente novamente.');
    }
  };

  const handleMarkAsResolved = async (conversationId: string) => {
    await handleStatusChange(conversationId, 'resolved');
  };

  // Marcar mensagens como lidas quando selecionar conversa
  useEffect(() => {
    if (selectedConversationId) {
      const conversation = conversations.find((c) => c.id === selectedConversationId);
      if (conversation && conversation.unreadCount > 0) {
        markAsRead(selectedConversationId).catch(console.error);
      }
    }
  }, [selectedConversationId, conversations, markAsRead]);

  // Verificar se há configurações necessárias (apenas instâncias e inboxes, já que agentes são membros)
  const hasMissingConfiguration = instances.length === 0;

  // Loading state
  if (loading && conversations.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <ChatHeader 
          theme={theme} 
          onThemeToggle={onThemeToggle}
          onNavigateToSettings={() => onNavigateToSettings?.()} 
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0169D9] mx-auto mb-4"></div>
            <p className={theme === 'dark' ? 'text-white/60' : 'text-text-secondary-light'}>
              Carregando conversas...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col h-full">
        <ChatHeader 
          theme={theme} 
          onThemeToggle={onThemeToggle}
          onNavigateToSettings={() => onNavigateToSettings?.()} 
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#0169D9] text-white rounded hover:bg-[#0169D9]/90"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ChatHeader 
        theme={theme} 
        onThemeToggle={onThemeToggle}
        onNavigateToSettings={() => onNavigateToSettings?.()} 
      />
      {hasMissingConfiguration ? (
        <EmptyChatState 
          theme={theme} 
          onNavigateToSettings={() => onNavigateToSettings?.()} 
        />
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <ConversationList
            conversations={filteredConversations}
            selectedId={selectedConversationId}
            onSelectConversation={setSelectedConversationId}
            theme={theme}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            agents={dbAgents}
            inboxes={inboxes}
            filters={filters}
            onFiltersChange={setFilters}
            loadMore={loadMore}
            hasMore={hasMore}
            totalConversations={totalConversations}
            isSearching={loading} // ✅ Passar estado de loading
          />
          <ChatArea
            conversation={selectedConversation}
            theme={theme}
            onSendMessage={handleSendMessage}
            onMarkAsResolved={() => selectedConversation && handleMarkAsResolved(selectedConversation.id)}
            onClearHistory={() => selectedConversation && handleClearHistory(selectedConversation.id)}
            onDeleteConversation={() => selectedConversation && handleDeleteConversation(selectedConversation.id)}
            onNavigateToPipeline={onNavigateToPipeline}
            onDeleteMessage={deleteMessage}
          />
          <ContactInfo 
            conversation={selectedConversation} 
            theme={theme}
            agents={dbAgents}
            onStatusChange={handleStatusChange}
            onAssigneeChange={handleAssigneeChange}
            onTagsChange={handleTagsChange}
            onAttendantTypeChange={handleAttendantTypeChange}
            onNavigateToPipeline={onNavigateToPipeline}
            onNavigateToSettings={onNavigateToSettings}
            onKanbanRefresh={onKanbanRefresh} // ✅ Passar callback para refresh do kanban
          />
        </div>
      )}
    </div>
  );
}