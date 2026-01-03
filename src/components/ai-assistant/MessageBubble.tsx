import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Theme } from '../../hooks/useTheme';
import { AIMessage, SearchSource, ImageGenerationData } from '../../types/ai-assistant';
import { User, Bot, Trash2, Image as ImageIcon, Mic, Loader2, X, Copy, Check, Database, FileText, Globe, Plug, Wand2, RotateCcw, Eye, Sparkles } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { SourcesCollapsible } from './SourcesCollapsible';
import { ThinkingDisplay } from './ThinkingDisplay';
import { McpToolCallsDisplay } from './McpToolCallsDisplay';
import { DataToolCallsDisplay } from './DataToolCallsDisplay';
import { toast } from 'sonner';

interface MessageBubbleProps {
  message: AIMessage;
  theme: Theme;
  isStreaming?: boolean;
  onDelete?: (messageId: string) => void;
  sources?: SearchSource[];
  onReuseImageConfig?: (config: ImageGenerationData) => void;
}

export function MessageBubble({
  message,
  theme,
  isStreaming = false,
  onDelete,
  sources,
  onReuseImageConfig,
}: MessageBubbleProps) {
  const isDark = theme === 'dark';
  const isUser = message.role === 'user';
  const canDelete = !isStreaming && message.id !== 'streaming' && onDelete;
  // Garantir que sources nunca seja null/undefined
  const safeSources = sources ?? [];
  const hasSources = !isUser && safeSources.length > 0;
  // MCP tool calls salvas na mensagem
  const hasMcpToolCalls = !isUser && message.mcp_tool_calls && message.mcp_tool_calls.length > 0;
  // Data tool calls salvas na mensagem
  const hasDataToolCalls = !isUser && message.data_tool_calls && message.data_tool_calls.length > 0;

  // Media state
  const hasMedia = message.media_url && message.content_type;
  const isImage = message.content_type === 'image';
  const isAudio = message.content_type === 'audio';
  const isTranscribing = message.transcription_status === 'pending' || message.transcription_status === 'processing';
  const transcriptionFailed = message.transcription_status === 'failed';

  // Verificar se tem transcrição ou status de transcrição mesmo sem media_url
  // (pode acontecer com mensagens antigas ou erros de carregamento)
  const hasTranscriptionData = message.transcription || message.transcription_status;
  const showTranscriptionOnly = isUser && hasTranscriptionData && !hasMedia;

  // Image generation request (mensagem do usuário com image_generation_data)
  const isImageGenerationRequest = isUser && message.image_generation_data && !hasMedia;

  // State para expandir/colapsar configs de geração
  const [showGenerationConfigs, setShowGenerationConfigs] = useState(false);

  // Image lightbox state
  const [showLightbox, setShowLightbox] = useState(false);

  // Image load error state
  const [imageLoadError, setImageLoadError] = useState(false);

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
              <div className="mb-3">
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
                  <div className="space-y-2 min-w-[280px]">
                    {/* Audio Player - Clean design */}
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-white/10">
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                        <Mic className="w-4 h-4 text-white" />
                      </div>
                      <audio
                        src={message.media_url}
                        controls
                        className="flex-1 h-9"
                        style={{ minWidth: '200px' }}
                      />
                    </div>

                    {/* Transcription Status/Content */}
                    {isTranscribing && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10">
                        <Loader2 className="w-4 h-4 animate-spin text-white/70" />
                        <span className="text-sm text-white/70">Transcrevendo...</span>
                      </div>
                    )}

                    {transcriptionFailed && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/20">
                        <X className="w-4 h-4 text-red-300" />
                        <span className="text-sm text-red-300">Falha na transcrição</span>
                      </div>
                    )}

                    {message.transcription && !isTranscribing && !transcriptionFailed && (
                      <div className="px-3 py-2 rounded-lg bg-white/10">
                        <p className="text-xs text-white/50 mb-1">Transcrição:</p>
                        <p className="text-sm text-white/90 whitespace-pre-wrap">{message.transcription}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Transcription only (when media_url is missing but transcription exists) */}
            {showTranscriptionOnly && (
              <div className="mb-3 space-y-2">
                {/* Transcription Status/Content */}
                {isTranscribing && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10">
                    <Loader2 className="w-4 h-4 animate-spin text-white/70" />
                    <span className="text-sm text-white/70">Transcrevendo...</span>
                  </div>
                )}

                {transcriptionFailed && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/20">
                    <X className="w-4 h-4 text-red-300" />
                    <span className="text-sm text-red-300">Falha na transcrição</span>
                  </div>
                )}

                {message.transcription && !isTranscribing && !transcriptionFailed && (
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-white/50 flex-shrink-0" />
                    <p className="text-sm text-white/90 whitespace-pre-wrap">{message.transcription}</p>
                  </div>
                )}
              </div>
            )}

            {isUser ? (
              // User messages
              isImageGenerationRequest && message.image_generation_data ? (
                // Image generation request - visual compacto e elegante
                <div className="space-y-3">
                  {/* Header com botão de reusar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-white/80" />
                      <span className="text-sm font-medium text-white">
                        {message.image_generation_data.mode === 'image-to-image' ? 'Transformar Imagem' : 'Gerar Imagem'}
                      </span>
                    </div>
                    {/* Botão reusar configurações - aparece no hover */}
                    {onReuseImageConfig && (
                      <button
                        onClick={() => onReuseImageConfig(message.image_generation_data!)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/20 hover:bg-white/30 text-white/90 text-[11px] font-medium"
                        title="Reusar estas configurações"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reusar
                      </button>
                    )}
                  </div>

                  {/* Prompt - com fundo escuro para melhor leitura */}
                  <div className="p-3 rounded-lg bg-black/20 backdrop-blur-sm">
                    <p className="text-sm text-white/90 leading-relaxed">
                      {showGenerationConfigs || message.image_generation_data.prompt.length <= 150
                        ? `"${message.image_generation_data.prompt}"`
                        : `"${message.image_generation_data.prompt.slice(0, 150)}..."`
                      }
                    </p>
                  </div>

                  {/* Configurações inline - tags com fundo */}
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    {/* Modelo de IA */}
                    {(message.image_generation_data.model_name || message.image_generation_data.model_id) && (
                      <span className="px-2 py-1 rounded bg-black/25 text-white/80">
                        {message.image_generation_data.model_name ||
                         ({
                           'flux-schnell': 'FLUX.1 Schnell',
                           'z-image-turbo': 'Z-Image Turbo',
                           'hidream': 'HiDream',
                           'hunyuan': 'Hunyuan Image 3',
                           'juggernaut-xl': 'Juggernaut XL',
                           'juggernaut-ragnarok': 'Juggernaut Ragnarok',
                           'dreamshaper': 'DreamShaper XL',
                           'sdxl': 'Stable Diffusion XL',
                           'chroma': 'Chroma',
                           'illustrious': 'Illustrij',
                         }[message.image_generation_data.model_id || ''] || message.image_generation_data.model_id)}
                      </span>
                    )}
                    <span className="px-2 py-1 rounded bg-black/25 text-white/80">
                      {message.image_generation_data.width}x{message.image_generation_data.height}
                    </span>
                    {message.image_generation_data.style && (
                      <span className="px-2 py-1 rounded bg-black/25 text-white/80 capitalize">
                        {message.image_generation_data.style.replace('_', ' ')}
                      </span>
                    )}
                    <span className="px-2 py-1 rounded bg-black/25 text-white/80">
                      {message.image_generation_data.num_inference_steps} steps
                    </span>
                  </div>

                  {/* Botão Ver mais / Ver menos */}
                  {(message.image_generation_data.prompt.length > 150 ||
                    message.image_generation_data.negative_prompt ||
                    message.image_generation_data.seed) && (
                    <button
                      onClick={() => setShowGenerationConfigs(!showGenerationConfigs)}
                      className="text-[11px] text-white/60 hover:text-white/80 transition-colors"
                    >
                      {showGenerationConfigs ? '▲ Ver menos' : '▼ Ver mais detalhes'}
                    </button>
                  )}

                  {/* Detalhes expandidos - com fundo escuro */}
                  {showGenerationConfigs && (
                    <div className="p-3 rounded-lg bg-black/30 space-y-2 text-[11px]">
                      {/* Modelo (nome técnico) */}
                      {message.image_generation_data.model && (
                        <div className="flex justify-between items-center">
                          <span className="text-white/50">Modelo</span>
                          <span className="text-white/90 font-medium text-[10px]">{message.image_generation_data.model}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <span className="text-white/50">Guidance</span>
                        <span className="text-white/90 font-medium">{message.image_generation_data.guidance_scale}</span>
                      </div>

                      {message.image_generation_data.seed && (
                        <div className="flex justify-between items-center">
                          <span className="text-white/50">Seed</span>
                          <span className="text-white/90 font-medium">{message.image_generation_data.seed}</span>
                        </div>
                      )}

                      {message.image_generation_data.mode === 'image-to-image' && message.image_generation_data.strength && (
                        <div className="flex justify-between items-center">
                          <span className="text-white/50">Força</span>
                          <span className="text-white/90 font-medium">{Math.round(message.image_generation_data.strength * 100)}%</span>
                        </div>
                      )}

                      {message.image_generation_data.generation_time_ms && (
                        <div className="flex justify-between items-center">
                          <span className="text-white/50">Tempo</span>
                          <span className="text-white/90 font-medium">{(message.image_generation_data.generation_time_ms / 1000).toFixed(1)}s</span>
                        </div>
                      )}

                      {message.image_generation_data.negative_prompt && (
                        <div className="pt-2 border-t border-white/10">
                          <span className="block text-white/50 mb-1">Negative prompt</span>
                          <span className="block text-white/70 text-[10px] leading-relaxed">
                            {message.image_generation_data.negative_prompt}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (hasMedia || showTranscriptionOnly) && (message.content === '[Áudio enviado]' || message.content === '[Imagem enviada]' || !message.content) ? null : (
                // Regular text message (hide placeholder text)
                message.content ? (
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                ) : null
              )
            ) : (
              // Assistant messages: markdown rendering or generated image
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

                {/* Generated image - imagens geradas pelo assistente */}
                {isImage && message.media_url && (
                  <div className="mb-3">
                    <div className="relative">
                      {imageLoadError ? (
                        <div className={`flex flex-col items-center justify-center p-8 rounded-lg ${
                          isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'
                        }`}>
                          <ImageIcon className={`w-12 h-12 mb-2 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
                          <p className={`text-sm font-medium ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                            Erro ao carregar imagem
                          </p>
                          <p className={`text-xs mt-1 ${isDark ? 'text-red-400/70' : 'text-red-500/70'}`}>
                            A imagem pode ter expirado ou não estar disponível
                          </p>
                          <button
                            onClick={() => {
                              setImageLoadError(false);
                              // Forçar reload tentando adicionar timestamp à URL
                              const imgElement = document.querySelector(`img[data-message-id="${message.id}"]`) as HTMLImageElement;
                              if (imgElement) {
                                imgElement.src = message.media_url + '?t=' + Date.now();
                              }
                            }}
                            className={`mt-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              isDark
                                ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                                : 'bg-red-100 text-red-600 hover:bg-red-200'
                            }`}
                          >
                            Tentar novamente
                          </button>
                        </div>
                      ) : (
                        <img
                          data-message-id={message.id}
                          src={message.media_url}
                          alt="Imagem gerada"
                          className="max-w-full max-h-96 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setShowLightbox(true)}
                          onError={() => {
                            console.error('[MessageBubble] Image load failed:', message.media_url);
                            setImageLoadError(true);
                          }}
                          onLoad={() => setImageLoadError(false)}
                        />
                      )}
                    </div>
                    {/* Mostrar info de geração se disponível */}
                    {message.image_generation_data && (
                      <div className={`mt-2 text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                        <span className="inline-flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          {message.image_generation_data.width}x{message.image_generation_data.height}
                          {message.image_generation_data.generation_time_ms && (
                            <> • {(message.image_generation_data.generation_time_ms / 1000).toFixed(1)}s</>
                          )}
                          {message.image_generation_data.style && (
                            <> • {message.image_generation_data.style}</>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Text content - oculta se for uma imagem gerada (texto é apenas descritivo) */}
                {!(isImage && message.media_url) && (
                  <MarkdownRenderer content={message.content} theme={theme} sources={safeSources} />
                )}
              </div>
            )}

            {/* MCP Tool Calls - mostra histórico de ferramentas MCP utilizadas */}
            {hasMcpToolCalls && !isStreaming && (
              <McpToolCallsDisplay toolCalls={message.mcp_tool_calls!} theme={theme} />
            )}

            {/* Data Tool Calls - mostra histórico de consultas Data Tools (SQL) */}
            {hasDataToolCalls && !isStreaming && (
              <DataToolCallsDisplay toolCalls={message.data_tool_calls!} theme={theme} />
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

        <div className={`flex items-center gap-2 text-xs mt-1 px-2 ${
          isUser ? 'justify-end' : 'justify-start'
        } ${
          isDark ? 'text-white/30' : 'text-text-secondary-light'
        }`}>
          {/* Timestamp */}
          <span>
            {new Date(message.created_at).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>

          {/* Usage indicators - apenas para mensagens do assistente */}
          {!isUser && !isStreaming && (message.used_workspace_rag || message.used_agent_rag || message.used_web_search || hasMcpToolCalls || hasDataToolCalls || message.media_analysis_source) && (
            <div className="flex items-center gap-1.5 ml-1">
              <span className={isDark ? 'text-white/20' : 'text-gray-300'}>•</span>

              {/* RAG do Workspace (conversas anteriores) */}
              {message.used_workspace_rag && (
                <div
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full ${
                    isDark ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'
                  }`}
                  title="Usou conversas anteriores"
                >
                  <Database className="w-3 h-3" />
                  <span className="text-[10px] font-medium">Histórico</span>
                </div>
              )}

              {/* RAG do Agente (documentos) */}
              {message.used_agent_rag && (
                <div
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full ${
                    isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                  }`}
                  title="Usou base de conhecimento do agente"
                >
                  <FileText className="w-3 h-3" />
                  <span className="text-[10px] font-medium">Docs Agent</span>
                </div>
              )}

              {/* Busca na Web */}
              {message.used_web_search && (
                <div
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full ${
                    isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'
                  }`}
                  title="Usou busca na internet"
                >
                  <Globe className="w-3 h-3" />
                  <span className="text-[10px] font-medium">Web</span>
                </div>
              )}

              {/* MCP Tools */}
              {hasMcpToolCalls && (
                <div
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full ${
                    isDark ? 'bg-violet-500/10 text-violet-400' : 'bg-violet-50 text-violet-600'
                  }`}
                  title="Usou ferramentas MCP"
                >
                  <Plug className="w-3 h-3" />
                  <span className="text-[10px] font-medium">MCP</span>
                </div>
              )}

              {/* Data Tools */}
              {hasDataToolCalls && (
                <div
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full ${
                    isDark ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-50 text-cyan-600'
                  }`}
                  title="Usou Data Tools"
                >
                  <Database className="w-3 h-3" />
                  <span className="text-[10px] font-medium">Data</span>
                </div>
              )}

              {/* Media Analysis Source - Mostra origem da análise de imagem */}
              {message.media_analysis_source && (
                <div
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full ${
                    message.media_analysis_source === 'native'
                      ? isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'
                      : isDark ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-50 text-cyan-600'
                  }`}
                  title={message.media_analysis_source === 'native'
                    ? 'Análise nativa do modelo multimodal'
                    : 'Análise via Google Gemini'
                  }
                >
                  {message.media_analysis_source === 'native' ? (
                    <>
                      <Sparkles className="w-3 h-3" />
                      <span className="text-[10px] font-medium">Visão Nativa</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3 h-3" />
                      <span className="text-[10px] font-medium">Gemini</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isUser && (
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isDark ? 'bg-white/[0.05]' : 'bg-light-elevated'
        }`}>
          <User className={`w-4 h-4 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`} />
        </div>
      )}

      {/* Image Lightbox - usando createPortal para renderizar fora da hierarquia DOM */}
      {showLightbox && isImage && message.media_url && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
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
        </div>,
        document.body
      )}
    </div>
  );
}
