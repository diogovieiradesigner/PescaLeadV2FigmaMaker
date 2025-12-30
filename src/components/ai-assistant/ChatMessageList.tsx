import { Theme } from '../../hooks/useTheme';
import { AIMessage, SearchStep, SearchSource } from '../../types/ai-assistant';
import { MessageBubble } from './MessageBubble';
import { SearchProgress } from './SearchProgress';
import { ThinkingDisplay } from './ThinkingDisplay';
import { Loader2 } from 'lucide-react';

interface ChatMessageListProps {
  messages: AIMessage[];
  streamingMessage: string;
  isStreaming: boolean;
  theme: Theme;
  onDeleteMessage?: (messageId: string) => void;
  searchSteps?: SearchStep[];
  isSearching?: boolean;
  searchSources?: SearchSource[];
  isThinking?: boolean;
  thinkingContent?: string;
}

export function ChatMessageList({
  messages,
  streamingMessage,
  isStreaming,
  theme,
  onDeleteMessage,
  searchSteps = [],
  isSearching = false,
  searchSources = [],
  isThinking = false,
  thinkingContent = '',
}: ChatMessageListProps) {
  const isDark = theme === 'dark';

  // Filter out system messages (não mostrar para usuário)
  const visibleMessages = messages.filter(m => m.role !== 'system');

  if (visibleMessages.length === 0 && !isStreaming) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className={`text-center max-w-md ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
          <p className="text-lg mb-2">Bem-vindo ao Assistente IA!</p>
          <p className="text-sm">
            Faça uma pergunta ou inicie uma conversa. Eu estou aqui para ajudar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {visibleMessages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          theme={theme}
          onDelete={onDeleteMessage}
          sources={message.sources}
        />
      ))}

      {/* Search Progress - mostra durante busca */}
      {isStreaming && searchSteps.length > 0 && (
        <SearchProgress
          steps={searchSteps}
          isSearching={isSearching}
          theme={theme}
        />
      )}

      {/* Thinking Display - mostra raciocínio de modelos como DeepSeek R1 */}
      {isStreaming && (isThinking || thinkingContent) && (
        <div className="mb-4">
          <ThinkingDisplay
            thinkingContent={thinkingContent}
            isThinking={isThinking}
            theme={theme}
          />
        </div>
      )}

      {/* Streaming message */}
      {isStreaming && streamingMessage && (
        <MessageBubble
          message={{
            id: 'streaming',
            conversation_id: '',
            role: 'assistant',
            content: streamingMessage,
            tokens_used: 0,
            created_at: new Date().toISOString(),
          }}
          theme={theme}
          isStreaming={true}
          sources={searchSources}
        />
      )}

      {/* Typing indicator (quando ainda não há tokens e não está buscando) */}
      {isStreaming && !streamingMessage && searchSteps.length === 0 && (
        <div className="flex gap-4 mb-6">
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            isDark ? 'bg-[#0169D9]/10' : 'bg-[#0169D9]/10'
          }`}>
            <Loader2 className="w-4 h-4 text-[#0169D9] animate-spin" />
          </div>

          <div className={`rounded-2xl px-4 py-3 ${
            isDark ? 'bg-white/[0.05]' : 'bg-light-elevated'
          }`}>
            <div className="flex gap-1">
              <span className={`w-2 h-2 rounded-full bg-current animate-bounce ${
                isDark ? 'text-white/50' : 'text-text-secondary-light'
              }`} style={{ animationDelay: '0ms' }} />
              <span className={`w-2 h-2 rounded-full bg-current animate-bounce ${
                isDark ? 'text-white/50' : 'text-text-secondary-light'
              }`} style={{ animationDelay: '150ms' }} />
              <span className={`w-2 h-2 rounded-full bg-current animate-bounce ${
                isDark ? 'text-white/50' : 'text-text-secondary-light'
              }`} style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
