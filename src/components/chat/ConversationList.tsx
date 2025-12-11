import { Search, MessageSquare } from 'lucide-react';
import { Theme } from '../../hooks/useTheme';
import { Conversation, ConversationStatus } from '../../types/chat';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { useState, useRef, useEffect } from 'react';
import { ConversationFilters, ConversationFiltersState, LeadExtraction } from './ConversationFilters';
import { DbUser } from '../../types/database-chat';
import { Inbox } from '../SettingsView';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelectConversation: (id: string) => void;
  theme: Theme;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  agents?: DbUser[];
  inboxes?: Inbox[];
  extractions?: LeadExtraction[];
  filters: ConversationFiltersState;
  onFiltersChange: (filters: ConversationFiltersState) => void;
  loadMore?: () => void;
  hasMore?: boolean;
  totalConversations?: number;
  isSearching?: boolean; // ✅ Novo prop para indicar busca em andamento
  onCreateConversation?: () => void; // ✅ Novo prop para criar nova conversa
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
  agents,
  inboxes,
  extractions,
  filters,
  onFiltersChange,
  loadMore,
  hasMore,
  totalConversations = 0,
  isSearching = false, // ✅ Novo prop
  onCreateConversation, // ✅ Novo prop
}: ConversationListProps) {
  const isDark = theme === 'dark';
  const [width, setWidth] = useState(320); // Largura inicial (w-80 = 320px)
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const MIN_WIDTH = 280; // Largura mínima
  const MAX_WIDTH = 500; // Largura máxima

  // Contador de filtros ativos
  const activeFiltersCount =
    (!filters.assignees.includes('all') ? 1 : 0) +
    (!filters.inboxes.includes('all') ? 1 : 0) +
    (!filters.statuses.includes('all') ? 1 : 0) +
    (!filters.attendantTypes.includes('all') ? 1 : 0) +
    (!filters.extractions.includes('all') ? 1 : 0);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const containerLeft = containerRef.current.getBoundingClientRect().left;
      const newWidth = e.clientX - containerLeft;

      // Aplicar limites
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div
      ref={containerRef}
      style={{ width: `${width}px` }}
      className={`border-r flex flex-col transition-colors relative ${
        isDark ? 'bg-true-black border-white/[0.08]' : 'bg-light-bg border-border-light'
      }`}
    >
      {/* Header */}
      <div
        className={`px-4 py-3 border-b h-[85px] flex flex-col justify-center ${
          isDark ? 'border-white/[0.08]' : 'border-border-light'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className={isDark ? 'text-white' : 'text-text-primary-light'}>
            Atendimentos <span className="text-sm opacity-60">({activeFiltersCount > 0 ? conversations.length : totalConversations})</span>
          </h2>
          
          {/* ✅ Botão para criar nova conversa */}
          <button
            onClick={onCreateConversation}
            className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all ${
              isDark
                ? 'bg-white/[0.08] hover:bg-white/[0.12] text-white'
                : 'bg-black/[0.05] hover:bg-black/[0.08] text-text-primary-light'
            }`}
            title="Criar nova conversa"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        
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
          {/* ✅ Indicador de busca */}
          {isSearching && searchQuery && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-[#0169D9] border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="relative z-10">
        <ConversationFilters
          theme={theme}
          agents={agents || []}
          inboxes={inboxes || []}
          extractions={extractions || []}
          filters={filters}
          onFiltersChange={onFiltersChange}
        />
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* ✅ Mensagem quando não houver resultados */}
        {!isSearching && conversations.length === 0 && searchQuery && (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <MessageSquare className={`w-12 h-12 mb-3 ${isDark ? 'text-white/20' : 'text-gray-300'}`} />
            <p className={`text-sm mb-1 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
              Nenhuma conversa encontrada
            </p>
            <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
              Tente buscar por outro nome ou telefone
            </p>
          </div>
        )}
        
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
                <ImageWithFallback
                  src={conversation.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(conversation.contactName)}&background=random`}
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
                  {conversation.assignedToName && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        isDark 
                          ? 'bg-white/10 text-white/70' 
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {conversation.assignedToName}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}

        {hasMore && loadMore && (
          <div className="p-4 flex justify-center">
            <button
              onClick={loadMore}
              className={`text-sm px-4 py-2 rounded-lg transition-colors ${
                isDark
                  ? 'bg-white/[0.05] hover:bg-white/[0.1] text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              Carregar mais
            </button>
          </div>
        )}
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`absolute top-0 right-0 w-1 h-full cursor-col-resize group hover:w-1.5 transition-all ${
          isResizing ? 'bg-[#0169D9]' : isDark ? 'hover:bg-white/20' : 'hover:bg-gray-300'
        }`}
        style={{ zIndex: 10 }}
      >
        <div className={`absolute inset-y-0 -right-1 w-3 ${isResizing ? 'cursor-col-resize' : ''}`} />
      </div>
    </div>
  );
}