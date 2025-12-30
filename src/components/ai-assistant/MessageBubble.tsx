import { useState } from 'react';
import { Theme } from '../../hooks/useTheme';
import { AIMessage, SearchSource } from '../../types/ai-assistant';
import { User, Bot, Trash2, Image as ImageIcon, Mic, Loader2, X, Copy, Check } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { SourcesCollapsible } from './SourcesCollapsible';
import { ThinkingDisplay } from './ThinkingDisplay';
import { toast } from 'sonner';

interface MessageBubbleProps {
  message: AIMessage;
  theme: Theme;
  isStreaming?: boolean;
  onDelete?: (messageId: string) => void;
  sources?: SearchSource[];
}

export function MessageBubble({
  message,
  theme,
  isStreaming = false,
  onDelete,
  sources,
}: MessageBubbleProps) {
  const isDark = theme === 'dark';
  const isUser = message.role === 'user';
  const canDelete = !isStreaming && message.id !== 'streaming' && onDelete;
  // Garantir que sources nunca seja null/undefined
  const safeSources = sources ?? [];
  const hasSources = !isUser && safeSources.length > 0;

  // Media state
  const hasMedia = message.media_url && message.content_type;
  const isImage = message.content_type === 'image';
  const isAudio = message.content_type === 'audio';
  const isTranscribing = message.transcription_status === 'pending' || message.transcription_status === 'processing';
  const transcriptionFailed = message.transcription_status === 'failed';

  // Image lightbox state
  const [showLightbox, setShowLightbox] = useState(false);

  // Copy state
  const [copied, setCopied] = useState(false);

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast.success('Mensagem copiada!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying message:', error);
      toast.error('Erro ao copiar mensagem');
    }
  };

  return (
    <div className={`group flex gap-4 ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      {!isUser && (
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isDark ? 'bg-[#0169D9]/10' : 'bg-[#0169D9]/10'
        }`}>
          <Bot className="w-4 h-4 text-[#0169D9]" />
        </div>
      )}

      <div className={`max-w-[70%] ${isUser ? 'order-first' : ''}`}>
        <div className="relative">
          <div className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-[#0169D9] text-white'
              : isDark
              ? 'bg-white/[0.05] text-white'
              : 'bg-light-elevated text-text-primary-light'
          }`}>
            {/* Media content (image or audio) */}
            {hasMedia && isUser && (
              <div className="mb-2">
                {isImage && message.media_url && (
                  <div className="relative">
                    <img
                      src={message.media_url}
                      alt="Imagem enviada"
                      className="max-w-full max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setShowLightbox(true)}
                    />
                    {isTranscribing && (
                      <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                        <div className="flex items-center gap-2 text-white text-sm">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Analisando...</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {isAudio && message.media_url && (
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${
                    isDark ? 'bg-white/10' : 'bg-black/5'
                  }`}>
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <Mic className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <audio
                        src={message.media_url}
                        controls
                        className="w-full h-8"
                        style={{ filter: 'invert(1)' }}
                      />
                    </div>
                    {isTranscribing && (
                      <div className="flex items-center gap-2 text-white/70 text-xs">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Transcrevendo...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {isUser ? (
              // User messages: plain text
              <p className="text-sm whitespace-pre-wrap break-words">
                {message.content}
              </p>
            ) : (
              // Assistant messages: markdown rendering
              <div className="text-sm prose-sm max-w-none">
                {/* Thinking content - mostra raciocínio salvo de modelos como DeepSeek R1 */}
                {message.thinking_content && !isStreaming && (
                  <div className="mb-3">
                    <ThinkingDisplay
                      thinkingContent={message.thinking_content}
                      isThinking={false}
                      theme={theme}
                    />
                  </div>
                )}
                <MarkdownRenderer content={message.content} theme={theme} sources={safeSources} />
              </div>
            )}

            {/* Sources Collapsible - dentro do bubble */}
            {hasSources && !isStreaming && (
              <SourcesCollapsible sources={safeSources} theme={theme} />
            )}
          </div>

          {/* Action buttons - appears on hover */}
          <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all ${
            isUser ? '-left-16' : '-right-16'
          }`}>
            {/* Copy button */}
            <button
              onClick={handleCopyMessage}
              className={`p-1.5 rounded-lg transition-all ${
                copied
                  ? isDark
                    ? 'bg-green-500/10 text-green-400'
                    : 'bg-green-50 text-green-500'
                  : isDark
                    ? 'hover:bg-white/10 text-white/30 hover:text-white/70'
                    : 'hover:bg-gray-100 text-gray-300 hover:text-gray-500'
              }`}
              title="Copiar mensagem"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Delete button */}
            {canDelete && (
              <button
                onClick={() => onDelete(message.id)}
                className={`p-1.5 rounded-lg transition-all ${
                  isDark
                    ? 'hover:bg-red-500/10 text-white/30 hover:text-red-400'
                    : 'hover:bg-red-50 text-gray-300 hover:text-red-500'
                }`}
                title="Deletar mensagem"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className={`text-xs mt-1 px-2 ${
          isUser ? 'text-right' : ''
        } ${
          isDark ? 'text-white/30' : 'text-text-secondary-light'
        }`}>
          {new Date(message.created_at).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>

      {isUser && (
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isDark ? 'bg-white/[0.05]' : 'bg-light-elevated'
        }`}>
          <User className={`w-4 h-4 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`} />
        </div>
      )}

      {/* Image Lightbox */}
      {showLightbox && isImage && message.media_url && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowLightbox(false)}
        >
          <button
            onClick={() => setShowLightbox(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={message.media_url}
            alt="Imagem ampliada"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
