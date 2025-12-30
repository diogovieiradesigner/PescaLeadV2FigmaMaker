import { useState } from 'react';
import { Brain, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Theme } from '../../hooks/useTheme';
import { cn } from '../ui/utils';
import ReactMarkdown from 'react-markdown';

interface ThinkingDisplayProps {
  thinkingContent: string;
  isThinking: boolean;
  theme: Theme;
}

export function ThinkingDisplay({ thinkingContent, isThinking, theme }: ThinkingDisplayProps) {
  const isDark = theme === 'dark';
  const [isExpanded, setIsExpanded] = useState(false);

  // Não renderizar se não há conteúdo e não está pensando
  if (!thinkingContent && !isThinking) {
    return null;
  }

  return (
    <div className={cn(
      "mb-3 rounded-lg border overflow-hidden transition-all",
      isDark
        ? "bg-purple-500/5 border-purple-500/20"
        : "bg-purple-50 border-purple-200"
    )}>
      {/* Header - sempre visível */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 transition-colors",
          isDark
            ? "hover:bg-purple-500/10"
            : "hover:bg-purple-100"
        )}
      >
        <div className="flex items-center gap-2">
          {isThinking ? (
            <Loader2 className={cn(
              "w-4 h-4 animate-spin",
              isDark ? "text-purple-400" : "text-purple-600"
            )} />
          ) : (
            <Brain className={cn(
              "w-4 h-4",
              isDark ? "text-purple-400" : "text-purple-600"
            )} />
          )}
          <span className={cn(
            "text-sm font-medium",
            isDark ? "text-purple-300" : "text-purple-700"
          )}>
            {isThinking ? 'Pensando...' : 'Raciocínio'}
          </span>
          {!isThinking && thinkingContent && (
            <span className={cn(
              "text-xs px-1.5 py-0.5 rounded",
              isDark ? "bg-purple-500/20 text-purple-400" : "bg-purple-200 text-purple-600"
            )}>
              {Math.ceil(thinkingContent.length / 4)} tokens
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronUp className={cn(
              "w-4 h-4",
              isDark ? "text-purple-400" : "text-purple-600"
            )} />
          ) : (
            <ChevronDown className={cn(
              "w-4 h-4",
              isDark ? "text-purple-400" : "text-purple-600"
            )} />
          )}
        </div>
      </button>

      {/* Content - colapsável */}
      {isExpanded && thinkingContent && (
        <div className={cn(
          "px-3 pb-3 border-t",
          isDark ? "border-purple-500/20" : "border-purple-200"
        )}>
          <div className={cn(
            "mt-2 text-sm max-h-[400px] overflow-y-auto scrollbar-thin prose prose-sm",
            isDark
              ? "text-purple-200/80 prose-invert prose-headings:text-purple-300 prose-p:text-purple-200/70 prose-strong:text-purple-200 prose-code:text-purple-300 prose-code:bg-purple-500/20"
              : "text-purple-800 prose-headings:text-purple-900 prose-p:text-purple-700 prose-strong:text-purple-900 prose-code:text-purple-700 prose-code:bg-purple-100"
          )}>
            <ReactMarkdown>
              {thinkingContent}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Loading indicator quando está pensando mas ainda não tem conteúdo */}
      {isThinking && !thinkingContent && (
        <div className={cn(
          "px-3 pb-3 flex items-center gap-2",
          isDark ? "text-purple-400/60" : "text-purple-500"
        )}>
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}

      {/* Streaming content quando está pensando */}
      {isThinking && thinkingContent && isExpanded && (
        <div className={cn(
          "px-3 pb-3 border-t",
          isDark ? "border-purple-500/20" : "border-purple-200"
        )}>
          <div className={cn(
            "mt-2 text-sm max-h-[400px] overflow-y-auto scrollbar-thin",
            isDark ? "text-purple-200/80" : "text-purple-800"
          )}>
            <ReactMarkdown>
              {thinkingContent}
            </ReactMarkdown>
            <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
          </div>
        </div>
      )}
    </div>
  );
}
