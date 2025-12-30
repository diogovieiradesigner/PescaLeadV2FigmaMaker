import { useState, useRef, useEffect } from 'react';
import { Theme } from '../../hooks/useTheme';
import { AIConversation } from '../../types/ai-assistant';
import { Plus, Trash2, MessageSquare, Pencil } from 'lucide-react';
import { updateConversationTitle } from '../../services/ai-assistant-service';
import { toast } from 'sonner';

interface ConversationSidebarProps {
  conversations: AIConversation[];
  selectedConversation: AIConversation | null;
  onSelectConversation: (conversation: AIConversation) => void;
  onNewConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
  onConversationUpdated?: (conversation: AIConversation) => void;
  theme: Theme;
}

export function ConversationSidebar({
  conversations,
  selectedConversation,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onConversationUpdated,
  theme
}: ConversationSidebarProps) {
  const isDark = theme === 'dark';
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

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
      {/* Header */}
      <div className={`p-4 border-b ${
        isDark ? 'border-white/[0.08]' : 'border-border-light'
      }`}>
        <button
          onClick={onNewConversation}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-colors ${
            isDark
              ? 'bg-white/[0.05] hover:bg-white/[0.08] text-white'
              : 'bg-light-elevated hover:bg-light-elevated-hover text-text-primary-light'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">Nova Conversa</span>
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
        {conversations.length === 0 ? (
          <div className={`text-center p-4 text-sm ${
            isDark ? 'text-white/30' : 'text-text-secondary-light'
          }`}>
            Nenhuma conversa ainda
          </div>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`group relative mb-1`}
            >
              <button
                onClick={() => editingId !== conversation.id && onSelectConversation(conversation)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                  selectedConversation?.id === conversation.id
                    ? isDark
                      ? 'bg-white/[0.08] text-white'
                      : 'bg-light-elevated text-text-primary-light'
                    : isDark
                    ? 'hover:bg-white/[0.03] text-white/70'
                    : 'hover:bg-light-elevated text-text-secondary-light'
                }`}
              >
                <div className={`flex items-start gap-2 ${editingId !== conversation.id ? 'pr-16' : 'pr-2'}`}>
                  <MessageSquare className={`w-4 h-4 mt-0.5 flex-shrink-0 ${editingId === conversation.id ? 'hidden' : ''}`} />
                  <div className="flex-1 min-w-0">
                    {editingId === conversation.id ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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
                      <>
                        <p className="text-sm font-medium truncate">
                          {conversation.title}
                        </p>
                        <p className={`text-xs mt-0.5 ${
                          isDark ? 'text-white/30' : 'text-text-secondary-light'
                        }`}>
                          {new Date(conversation.updated_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit'
                          })}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </button>

              {/* Action buttons (only show when not editing) */}
              {editingId !== conversation.id && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                  {/* Edit button */}
                  <button
                    onClick={(e) => handleStartEdit(conversation, e)}
                    className={`p-1.5 rounded transition-colors ${
                      isDark
                        ? 'hover:bg-white/[0.08] text-white/40 hover:text-white'
                        : 'hover:bg-light-elevated-hover text-text-secondary-light hover:text-text-primary-light'
                    }`}
                    title="Renomear conversa"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(conversation.id);
                    }}
                    className={`p-1.5 rounded transition-colors ${
                      isDark
                        ? 'hover:bg-red-500/10 text-white/40 hover:text-red-400'
                        : 'hover:bg-red-50 text-text-secondary-light hover:text-red-500'
                    }`}
                    title="Deletar conversa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
