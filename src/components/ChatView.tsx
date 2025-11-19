import { useState, useMemo } from 'react';
import { ConversationList } from './chat/ConversationList';
import { ChatArea } from './chat/ChatArea';
import { ContactInfo } from './chat/ContactInfo';
import { ChatHeader } from './chat/ChatHeader';
import { Theme } from '../hooks/useTheme';
import { mockConversations } from '../data/mockChatData';
import { Conversation, Message } from '../types/chat';

interface ChatViewProps {
  theme: Theme;
  onThemeToggle: () => void;
}

export function ChatView({ theme, onThemeToggle }: ChatViewProps) {
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    mockConversations[0]?.id || null
  );
  const [searchQuery, setSearchQuery] = useState('');

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;

    const query = searchQuery.toLowerCase();
    return conversations.filter(
      (conv) =>
        conv.contactName.toLowerCase().includes(query) ||
        conv.contactPhone.toLowerCase().includes(query) ||
        conv.lastMessage.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  const handleSendMessage = (messageData: Omit<Message, 'id' | 'timestamp' | 'type'>) => {
    if (!selectedConversationId) return;

    const newMessage: Message = {
      id: `m-${Date.now()}`,
      ...messageData,
      type: 'sent',
      timestamp: new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id === selectedConversationId) {
          const lastMessageText = 
            messageData.contentType === 'text' && messageData.text 
              ? messageData.text 
              : messageData.contentType === 'image'
              ? '📷 Imagem'
              : '🎤 Áudio';

          return {
            ...conv,
            messages: [...conv.messages, newMessage],
            lastMessage: lastMessageText,
            timestamp: 'Agora',
            totalMessages: conv.totalMessages + 1,
          };
        }
        return conv;
      })
    );
  };

  const handleStatusChange = (conversationId: string, status: string) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversationId
          ? { ...conv, status: status as any }
          : conv
      )
    );
  };

  const handleAssigneeChange = (conversationId: string, assignee: string) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversationId
          ? { ...conv, assignedTo: assignee }
          : conv
      )
    );
  };

  return (
    <div className="flex flex-col h-full">
      <ChatHeader theme={theme} onThemeToggle={onThemeToggle} />
      <div className="flex flex-1 overflow-hidden">
        <ConversationList
          conversations={filteredConversations}
          selectedId={selectedConversationId}
          onSelectConversation={setSelectedConversationId}
          theme={theme}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <ChatArea
          conversation={selectedConversation}
          theme={theme}
          onSendMessage={handleSendMessage}
        />
        <ContactInfo 
          conversation={selectedConversation} 
          theme={theme}
          onStatusChange={handleStatusChange}
          onAssigneeChange={handleAssigneeChange}
        />
      </div>
    </div>
  );
}