import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Theme } from '../../hooks/useTheme';
import { AIConversation, AICustomAgent } from '../../types/ai-assistant';
import {
  Plus, Trash2, Pencil, ChevronDown, Settings, MoreHorizontal, Copy, Database, Check,
  Bot, Brain, Sparkles, Zap, Rocket, Lightbulb, Code, PencilIcon,
  BookOpen, GraduationCap, Briefcase, Calculator, BarChart3, Globe2,
  Heart, MessageCircle, Search, Shield, Star, Target, Terminal, User, Users, Wand2,
  Loader2, X
} from 'lucide-react';
import { updateConversationTitle, searchConversations } from '../../services/ai-assistant-service';
import { getAgents } from '../../services/ai-agents-service';
import { toast } from 'sonner';

// Mapeamento de nome do ícone para componente
const iconComponents: Record<string, React.ComponentType<{ className?: string }>> = {
  'bot': Bot,
  'brain': Brain,
  'sparkles': Sparkles,
  'zap': Zap,
  'rocket': Rocket,
  'lightbulb': Lightbulb,
  'code': Code,
  'pencil': PencilIcon,
  'book-open': BookOpen,
  'graduation-cap': GraduationCap,
  'briefcase': Briefcase,
  'calculator': Calculator,
  'chart-bar': BarChart3,
  'globe': Globe2,
  'heart': Heart,
  'message-circle': MessageCircle,
  'search': Search,
  'shield': Shield,
  'star': Star,
  'target': Target,
  'terminal': Terminal,
  'user': User,
  'users': Users,
  'wand-2': Wand2,
};

interface ConversationSidebarProps {
  conversations: AIConversation[];
  selectedConversation: AIConversation | null;
  onSelectConversation: (conversation: AIConversation) => void;
  onNewConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
  onCopyConversation?: (conversationId: string) => void;
  onSaveToRag?: (conversationId: string) => void;
  savedToRagIds?: string[]; // IDs das conversas já salvas no RAG
  onConversationUpdated?: (conversation: AIConversation) => void;
  onSelectAgent?: (agent: AICustomAgent) => void;
  onEditAgent?: (agent: AICustomAgent) => void;
  onCreateAgent?: () => void;
  workspaceId: string;
  theme: Theme;
}

export function ConversationSidebar({
  conversations,
  selectedConversation,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onCopyConversation,
  onSaveToRag,
  savedToRagIds = [],
  onConversationUpdated,
  onSelectAgent,
  onEditAgent,
  onCreateAgent,
  workspaceId,
  theme
}: ConversationSidebarProps) {
  const isDark = theme === 'dark';
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Agents state
  const [agents, setAgents] = useState<AICustomAgent[]>([]);
  const [agentsExpanded, setAgentsExpanded] = useState(true);
  const [conversationsExpanded, setConversationsExpanded] = useState(true);

  // Pagination state
  const CONVERSATIONS_PER_PAGE = 20;
  const [visibleCount, setVisibleCount] = useState(CONVERSATIONS_PER_PAGE);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<string[] | null>(null);

  // Search handlers
  const handleSearch = async () => {
    if (!searchTerm.trim() || searchTerm.length < 2) return;

    setIsSearching(true);
    const { conversationIds, error } = await searchConversations(
      workspaceId,
      searchTerm.trim(),
      100
    );

    if (error) {
      toast.error('Erro ao buscar conversas');
    }

    setSearchResults(conversationIds);
    setIsSearching(false);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchResults(null);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Filtered conversations based on search
  const filteredConversations = useMemo(() => {
    if (searchResults === null) return conversations;
    return conversations.filter(c => searchResults.includes(c.id));
  }, [conversations, searchResults]);

  // Paginated conversations (only show visibleCount)
  const paginatedConversations = useMemo(() => {
    return filteredConversations.slice(0, visibleCount);
  }, [filteredConversations, visibleCount]);

  // Check if there are more conversations to load
  const hasMoreConversations = filteredConversations.length > visibleCount;

  // Load more conversations
  const handleLoadMore = () => {
    setVisibleCount(prev => prev + CONVERSATIONS_PER_PAGE);
  };

  // Reset pagination when search changes
  useEffect(() => {
    setVisibleCount(CONVERSATIONS_PER_PAGE);
  }, [searchResults]);

  // Load agents
  useEffect(() => {
    if (workspaceId) {
      loadAgents();
    }
  }, [workspaceId]);

  const loadAgents = async () => {
    try {
      const data = await getAgents(workspaceId);
      setAgents(data);
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };

  const renderAgentIcon = (iconName: string, color: string) => {
    const IconComponent = iconComponents[iconName] || Bot;
    return <IconComponent className="w-4 h-4" style={{ color }} />;
  };

  // Focus input when editing starts
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        // Verificar se o clique foi no botão do menu
        const buttonEl = menuOpenId ? menuButtonRefs.current.get(menuOpenId) : null;
        if (buttonEl && buttonEl.contains(event.target as Node)) {
          return; // Não fecha se clicou no próprio botão
        }
        setMenuOpenId(null);
        setMenuPosition(null);
      }
    };

    if (menuOpenId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpenId]);

  const handleStartEdit = (conversation: AIConversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conversation.id);
    setEditingTitle(conversation.title);
  };

  const handleCancelEdit = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingId(null);
    setEditingTitle('');
  };

  const handleSaveTitle = async (conversationId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();

    const trimmedTitle = editingTitle.trim();
    if (!trimmedTitle) {
      toast.error('O título não pode estar vazio');
      return;
    }

    try {
      await updateConversationTitle(conversationId, trimmedTitle);

      // Update local state via callback
      const updatedConversation = conversations.find(c => c.id === conversationId);
      if (updatedConversation && onConversationUpdated) {
        onConversationUpdated({ ...updatedConversation, title: trimmedTitle });
      }

      toast.success('Título atualizado');
      setEditingId(null);
      setEditingTitle('');
    } catch (error) {
      console.error('Error updating title:', error);
      toast.error('Erro ao atualizar título');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, conversationId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveTitle(conversationId);
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div className={`w-64 border-r flex flex-col ${
      isDark ? 'bg-true-black border-white/[0.08]' : 'bg-light-bg border-border-light'
    }`}>
      {/* Header with New Conversation button */}
      <div className={`p-3 border-b ${
        isDark ? 'border-white/[0.08]' : 'border-border-light'
      }`}>
        <button
          onClick={onNewConversation}
          onAuxClick={(e) => {
            // Middle-click (scroll button) - abre em nova aba
            if (e.button === 1) {
              e.preventDefault();
              window.open('/assistente-ia', '_blank');
            }
          }}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-colors ${
            isDark
              ? 'bg-white/[0.05] hover:bg-white/[0.08] text-white'
              : 'bg-light-elevated hover:bg-light-elevated-hover text-text-primary-light'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">Nova Conversa</span>
        </button>

        {/* Search Field */}
        <div className="mt-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Buscar em conversas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className={`flex-1 px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${
                isDark
                  ? 'bg-white/[0.05] border-white/[0.08] text-white placeholder-white/40 focus:border-[#0169D9]'
                  : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-[#0169D9]'
              }`}
            />
            <button
              onClick={handleSearch}
              disabled={isSearching || searchTerm.length < 2}
              className={`px-3 py-2 rounded-lg transition-colors ${
                isDark
                  ? 'bg-[#0169D9] hover:bg-[#0158B8] disabled:bg-white/10 disabled:text-white/30'
                  : 'bg-[#0169D9] hover:bg-[#0158B8] disabled:bg-zinc-200 disabled:text-zinc-400'
              } text-white`}
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Search Results Counter + Clear Button */}
          {searchResults !== null && (
            <div className="flex items-center justify-between mt-2">
              <p className={`text-xs ${isDark ? 'text-white/50' : 'text-zinc-500'}`}>
                {filteredConversations.length} conversa(s) encontrada(s)
              </p>
              <button
                onClick={handleClearSearch}
                className={`text-xs flex items-center gap-1 ${
                  isDark ? 'text-white/50 hover:text-white/70' : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                <X className="w-3 h-3" />
                Limpar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Agents Section (ChatGPT style) */}
      {agents.length > 0 && (
        <div className={`border-b ${isDark ? 'border-white/[0.08]' : 'border-border-light'}`}>
          {/* Agents Header - Collapsible */}
          <button
            onClick={() => setAgentsExpanded(!agentsExpanded)}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors ${
              isDark
                ? 'text-white/40 hover:text-white/60'
                : 'text-text-secondary-light hover:text-text-primary-light'
            }`}
          >
            <span>Agentes</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${agentsExpanded ? '' : '-rotate-90'}`} />
          </button>

          {/* Agents List */}
          {agentsExpanded && (
            <div className="px-2 pb-2 space-y-0.5">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className={`group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors text-left ${
                    isDark
                      ? 'hover:bg-white/[0.05] text-white/80 hover:text-white'
                      : 'hover:bg-light-elevated text-text-secondary-light hover:text-text-primary-light'
                  }`}
                >
                  <button
                    onClick={() => onSelectAgent?.(agent)}
                    onAuxClick={(e) => {
                      // Middle-click (scroll button) - abre em nova aba com o agente pré-selecionado
                      if (e.button === 1) {
                        e.preventDefault();
                        window.open(`/assistente-ia?agent=${agent.id}`, '_blank');
                      }
                    }}
                    className="flex items-center justify-start gap-2.5 flex-1 min-w-0 text-left"
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${agent.color}20` }}
                    >
                      {renderAgentIcon(agent.icon, agent.color)}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium truncate text-left">{agent.name}</p>
                      {agent.description && (
                        <p className={`text-xs truncate text-left ${isDark ? 'text-white/30' : 'text-text-secondary-light'}`}>
                          {agent.description}
                        </p>
                      )}
                    </div>
                  </button>
                  {/* Edit button - appears on hover */}
                  {onEditAgent && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditAgent(agent);
                      }}
                      className={`p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 ${
                        isDark
                          ? 'hover:bg-white/10 text-white/40 hover:text-white'
                          : 'hover:bg-gray-200 text-gray-400 hover:text-gray-600'
                      }`}
                      title="Editar agente"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}

              {/* Add New Agent Button */}
              {onCreateAgent && (
                <button
                  onClick={onCreateAgent}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors text-left ${
                    isDark
                      ? 'hover:bg-white/[0.05] text-white/40 hover:text-white/70'
                      : 'hover:bg-light-elevated text-text-secondary-light hover:text-text-primary-light'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border border-dashed ${
                    isDark ? 'border-white/20' : 'border-gray-300'
                  }`}>
                    <Plus className="w-4 h-4" />
                  </div>
                  <span className="text-sm">Novo agente</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Conversations Header - Collapsible */}
        <button
          onClick={() => setConversationsExpanded(!conversationsExpanded)}
          className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors ${
            isDark
              ? 'text-white/40 hover:text-white/60'
              : 'text-text-secondary-light hover:text-text-primary-light'
          }`}
        >
          <span>Conversas {filteredConversations.length > 0 && `(${filteredConversations.length})`}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${conversationsExpanded ? '' : '-rotate-90'}`} />
        </button>

        {/* Conversations Content */}
        {conversationsExpanded && (
          <div className="px-2 pb-2">
            {filteredConversations.length === 0 ? (
              <div className={`text-center p-4 text-sm ${
                isDark ? 'text-white/30' : 'text-text-secondary-light'
              }`}>
                {searchResults !== null ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
              </div>
            ) : (
              <>
              {paginatedConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`group relative mb-1`}
                >
                  <button
                    onClick={() => editingId !== conversation.id && onSelectConversation(conversation)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedConversation?.id === conversation.id
                        ? isDark
                          ? 'bg-white/[0.08] text-white'
                          : 'bg-light-elevated text-text-primary-light'
                        : isDark
                        ? 'hover:bg-white/[0.03] text-white/70'
                        : 'hover:bg-light-elevated text-text-secondary-light'
                    }`}
                  >
                    {editingId === conversation.id ? (
                      <div className="flex items-center gap-2 pr-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          ref={inputRef}
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, conversation.id)}
                          onBlur={() => handleSaveTitle(conversation.id)}
                          className={`flex-1 text-sm px-2 py-1 rounded-md border-none outline-none ${
                            isDark
                              ? 'bg-white/[0.08] text-white placeholder:text-white/30'
                              : 'bg-black/[0.05] text-text-primary-light placeholder:text-text-secondary-light'
                          }`}
                          placeholder="Nome da conversa..."
                        />
                      </div>
                    ) : (
                      <p className={`text-sm truncate ${editingId !== conversation.id ? 'pr-8' : ''}`}>
                        {conversation.title}
                      </p>
                    )}
                  </button>

                  {/* 3-dot menu (only show when not editing) */}
                  {editingId !== conversation.id && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <button
                        ref={(el) => {
                          if (el) menuButtonRefs.current.set(conversation.id, el);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (menuOpenId === conversation.id) {
                            setMenuOpenId(null);
                            setMenuPosition(null);
                          } else {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setMenuPosition({
                              top: rect.bottom + 4,
                              left: rect.right - 176, // 176 = w-44 (11rem)
                            });
                            setMenuOpenId(conversation.id);
                          }
                        }}
                        className={`p-1.5 rounded transition-all ${
                          menuOpenId === conversation.id
                            ? isDark
                              ? 'bg-white/[0.08] text-white'
                              : 'bg-light-elevated-hover text-text-primary-light'
                            : `opacity-0 group-hover:opacity-100 ${
                                isDark
                                  ? 'hover:bg-white/[0.08] text-white/40 hover:text-white'
                                  : 'hover:bg-light-elevated-hover text-text-secondary-light hover:text-text-primary-light'
                              }`
                        }`}
                        title="Opções"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Load More Button */}
              {hasMoreConversations && (
                <button
                  onClick={handleLoadMore}
                  className={`w-full mt-2 py-2 text-xs font-medium rounded-lg transition-colors ${
                    isDark
                      ? 'text-white/50 hover:text-white/70 hover:bg-white/[0.05]'
                      : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  Carregar mais ({filteredConversations.length - visibleCount} restantes)
                </button>
              )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Portal do Dropdown Menu - renderizado fora da hierarquia DOM */}
      {menuOpenId && menuPosition && createPortal(
        <div
          ref={menuRef}
          className="fixed w-44 py-1 rounded-lg border"
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
            zIndex: 99999,
            backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
            borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#e5e7eb',
            boxShadow: isDark
              ? '0 8px 32px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.1)'
              : '0 8px 32px rgba(0,0,0,0.2)',
          }}
        >
          {/* Rename option */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              const conv = conversations.find(c => c.id === menuOpenId);
              if (conv) handleStartEdit(conv, e);
              setMenuOpenId(null);
              setMenuPosition(null);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
              isDark
                ? 'hover:bg-white/[0.08] text-white'
                : 'hover:bg-gray-50 text-gray-700'
            }`}
          >
            <Pencil className="w-4 h-4" />
            <span>Renomear</span>
          </button>

          {/* Copy option */}
          {onCopyConversation && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (menuOpenId) onCopyConversation(menuOpenId);
                setMenuOpenId(null);
                setMenuPosition(null);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                isDark
                  ? 'hover:bg-white/[0.08] text-white'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <Copy className="w-4 h-4" />
              <span>Copiar conteúdo</span>
            </button>
          )}

          {/* Save to RAG option */}
          {onSaveToRag && menuOpenId && (
            savedToRagIds.includes(menuOpenId) ? (
              // Already saved - show disabled state
              <div
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm ${
                  isDark ? 'text-green-400' : 'text-green-600'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>Salvo no histórico</span>
              </div>
            ) : (
              // Not saved - show action button
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (menuOpenId) onSaveToRag(menuOpenId);
                  setMenuOpenId(null);
                  setMenuPosition(null);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                  isDark
                    ? 'hover:bg-white/[0.08] text-white'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>Salvar no histórico</span>
              </button>
            )
          )}

          {/* Divider */}
          <div className={`my-1 ${isDark ? 'border-t border-white/10' : 'border-t border-gray-100'}`} />

          {/* Delete option */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (menuOpenId) onDeleteConversation(menuOpenId);
              setMenuOpenId(null);
              setMenuPosition(null);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
              isDark
                ? 'hover:bg-red-500/10 text-red-400'
                : 'hover:bg-red-50 text-red-500'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>Apagar</span>
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}
