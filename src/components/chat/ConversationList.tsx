import { Search, MessageSquare } from 'lucide-react';
import { Theme } from '../../hooks/useTheme';
import { Conversation, ConversationStatus } from '../../types/chat';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelectConversation: (id: string) => void;
  theme: Theme;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const statusLabels: Record<ConversationStatus, string> = {
  waiting: 'Aguardando',
  'in-progress': 'Em Atendimento',
  resolved: 'Resolvido',
};

const statusColors: Record<ConversationStatus, string> = {
  waiting: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  'in-progress': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  resolved: 'bg-green-500/10 text-green-500 border-green-500/20',
};

export function ConversationList({
  conversations,
  selectedId,
  onSelectConversation,
  theme,
  searchQuery,
  onSearchChange,
}: ConversationListProps) {
  const isDark = theme === 'dark';

  return (
    <div
      className={`w-80 border-r flex flex-col transition-colors ${
        isDark ? 'bg-true-black border-white/[0.08]' : 'bg-light-bg border-border-light'
      }`}
    >
      {/* Header */}
      <div
        className={`px-4 py-3 border-b ${
          isDark ? 'border-white/[0.08]' : 'border-border-light'
        }`}
      >
        <h2 className={`mb-3 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
          Atendimentos
        </h2>
        
        {/* Search */}
        <div className="relative">
          <Search
            className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
              isDark ? 'text-white/50' : 'text-text-secondary-light'
            }`}
          />
          <input
            type="text"
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`w-full border text-sm pl-9 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-[#0169D9] transition-all ${
              isDark
                ? 'bg-elevated border-white/[0.08] text-white placeholder-white/40'
                : 'bg-light-elevated border-border-light text-text-primary-light placeholder-text-secondary-light'
            }`}
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
            className={`w-full px-4 py-3 border-b transition-colors text-left ${
              selectedId === conversation.id
                ? isDark
                  ? 'bg-white/[0.05] border-white/[0.08]'
                  : 'bg-light-elevated border-border-light'
                : isDark
                ? 'border-white/[0.08] hover:bg-white/[0.03]'
                : 'border-border-light hover:bg-light-elevated-hover'
            }`}
          >
            <div className="flex gap-3">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <img
                  src={conversation.avatar}
                  alt={conversation.contactName}
                  className="w-12 h-12 rounded-full object-cover"
                />
                {conversation.unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">
                    {conversation.unreadCount}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-1">
                  <h3
                    className={`text-sm truncate ${
                      isDark ? 'text-white' : 'text-text-primary-light'
                    }`}
                  >
                    {conversation.contactName}
                  </h3>
                  <span
                    className={`text-xs flex-shrink-0 ml-2 ${
                      isDark ? 'text-white/50' : 'text-text-secondary-light'
                    }`}
                  >
                    {conversation.timestamp}
                  </span>
                </div>

                <p
                  className={`text-xs mb-2 truncate ${
                    isDark ? 'text-white/50' : 'text-text-secondary-light'
                  }`}
                >
                  {conversation.lastMessage}
                </p>

                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs px-2 py-0.5 rounded border ${
                      statusColors[conversation.status]
                    }`}
                  >
                    {statusLabels[conversation.status]}
                  </span>
                  <span
                    className={`text-xs ${
                      isDark ? 'text-white/40' : 'text-text-secondary-light'
                    }`}
                  >
                    {conversation.assignedTo}
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}