import React, { memo, useState } from 'react';
import { Clock, AlertCircle, Check, CheckCheck, Trash2, FileText, Download, Play } from 'lucide-react';
import { Message } from '../../types/chat';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { AudioPlayer } from './AudioPlayer';
import { PipelineLogsViewer } from '../PipelineLogsViewer';
import { usePipelineLogs } from '../../hooks/usePipelineLogs';
import { TranscriptionDropdown } from './TranscriptionDropdown';

// ✅ Helper para formatar tamanho de arquivo
function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ✅ Helper para obter ícone do documento baseado no MIME type
function getDocumentIcon(mimeType?: string): string {
  if (!mimeType) return '📄';
  if (mimeType.includes('pdf')) return '📕';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📘';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📗';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📙';
  if (mimeType.includes('text')) return '📝';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return '🗜️';
  return '📄';
}

interface MessageBubbleProps {
  message: Message;
  isDark: boolean;
  onDeleteMessage?: (messageId: string) => void;
  onExpandImage: (url: string) => void;
  showPipeline?: boolean; // ✅ Controlar quando exibir pipeline (apenas última mensagem do grupo)
}

// ============================================
// FUNÇÃO PARA DETECTAR E TORNAR LINKS CLICÁVEIS
// ✅ PROTEÇÃO CONTRA XSS: Apenas http/https são permitidos
// ============================================
function linkifyText(text: string, isSentMessage: boolean): React.ReactNode {
  // Regex para detectar URLs (http, https, www)
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/g;
  
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (!part) return null;
    
    // Se é uma URL
    if (part.match(urlRegex)) {
      let url = part;
      // Adicionar https:// se começar com www.
      if (part.startsWith('www.')) {
        url = `https://${part}`;
      }
      
      // ✅ SEGURANÇA: Validar protocolo antes de renderizar link
      try {
        const parsed = new URL(url);
        
        // ✅ APENAS http e https são permitidos
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return <span key={index}>{part}</span>; // Renderizar como texto normal
        }
        
        // ✅ SEGURANÇA: Validar que não é um domínio malicioso óbvio
        const suspiciousPatterns = [
          /javascript/i,
          /data:/i,
          /file:/i,
          /vbscript/i,
        ];
        
        if (suspiciousPatterns.some(pattern => pattern.test(url))) {
          return <span key={index}>{part}</span>;
        }
        
      } catch (error) {
        // URL inválida - renderizar como texto
        return <span key={index}>{part}</span>;
      }
      
      return (
        <a
          key={index}
          href={url}
          target="_blank"
          rel="noopener noreferrer" // ✅ SEGURANÇA: Prevenir window.opener exploit
          className={`underline hover:opacity-80 transition-opacity break-all ${
            isSentMessage ? 'text-white' : 'text-[#0169D9]'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    
    // Se é texto normal - renderizar diretamente (React já escapa HTML)
    return <span key={index}>{part}</span>;
  });
}

const MessageBubble = memo(({ message, isDark, onDeleteMessage, onExpandImage, showPipeline }: MessageBubbleProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isTextExpanded, setIsTextExpanded] = useState(false);
  
  // ✅ Carregar logs do pipeline se a mensagem tiver pipeline_id
  const { pipeline, loading: loadingPipeline } = usePipelineLogs(message.pipelineId);

  // Verificar se pode deletar: apenas mensagens enviadas com menos de 1 hora
  // ✅ Não permitir deletar se transcrição está pendente ou processando
  const isTranscribing = message.transcriptionStatus === 'pending' || message.transcriptionStatus === 'processing';
  const canDelete = message.type === 'sent' && message.createdAt && onDeleteMessage && !isTranscribing && (() => {
    const messageTime = new Date(message.createdAt).getTime();
    const now = Date.now();
    const timeDiff = now - messageTime;
    const ONE_HOUR = 60 * 60 * 1000;
    return timeDiff <= ONE_HOUR;
  })();

  const isDeleted = message.type === 'delete';

  // ✅ Detectar se mensagem é muito longa (mais de 500 caracteres)
  const isLongMessage = message.contentType === 'text' && message.text && message.text.length > 500;
  const shouldTruncate = isLongMessage && !isTextExpanded;
  
  // ✅ Texto truncado (primeiros 500 caracteres)
  const displayText = shouldTruncate ? message.text!.substring(0, 500) + '...' : message.text;

  return (
    <div
      className={`flex group ${message.type === 'sent' || isDeleted ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Ícone de deletar (lado esquerdo para mensagens enviadas) */}
      {canDelete && isHovered && !isDeleted && (
        <button
          onClick={() => onDeleteMessage && onDeleteMessage(message.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-500/10 mr-2 self-end mb-1"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-500" />
        </button>
      )}

      <div
        className={`max-w-[70%] min-w-0 rounded-lg overflow-hidden ${
          message.contentType === 'text' ? 'px-4 py-2' : 'p-1'
        } ${
          isDeleted
            ? isDark 
              ? 'bg-white/[0.05] text-white/50' 
              : 'bg-gray-100 text-gray-500'
            : message.type === 'sent'
            ? 'bg-[#0169D9] text-white'
            : isDark
            ? 'bg-white/[0.08] text-white'
            : 'bg-light-elevated text-text-primary-light'
        }`}
      >
        {isDeleted ? (
          // Mensagem deletada
          <div className="flex flex-col gap-1">
            {message.contentType === 'text' && message.text && (
              <p className="text-sm line-through opacity-60">{message.text}</p>
            )}
            {message.contentType === 'image' && (
              <p className="text-sm line-through opacity-60">📷 Imagem</p>
            )}
            {message.contentType === 'audio' && (
              <p className="text-sm line-through opacity-60">🎤 Áudio</p>
            )}
            {message.contentType === 'video' && (
              <p className="text-sm line-through opacity-60">🎬 Vídeo</p>
            )}
            {message.contentType === 'document' && (
              <p className="text-sm line-through opacity-60">📄 {message.fileName || 'Documento'}</p>
            )}
            <p className="text-xs italic opacity-70">Esta mensagem foi deletada</p>
          </div>
        ) : (
          <>
            {message.contentType === 'text' && message.text && (
              <div>
                <div className={`${isTextExpanded ? 'max-h-[400px] overflow-y-auto' : 'max-h-none'} overflow-x-hidden scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent hover:scrollbar-thumb-white/30`}>
                  <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">
                    {linkifyText(displayText || '', message.type === 'sent')}
                  </p>
                </div>
                {isLongMessage && (
                  <button
                    onClick={() => setIsTextExpanded(!isTextExpanded)}
                    className={`mt-2 text-xs underline hover:no-underline transition-opacity ${
                      message.type === 'sent'
                        ? 'text-white/80 hover:text-white'
                        : isDark
                        ? 'text-blue-400 hover:text-blue-300'
                        : 'text-blue-600 hover:text-blue-700'
                    }`}
                  >
                    {isTextExpanded ? '▲ Mostrar menos' : '▼ Mostrar mais'}
                  </button>
                )}
              </div>
            )}

            {message.contentType === 'image' && message.imageUrl && (
              <div className="w-full">
                <ImageWithFallback
                  src={message.imageUrl}
                  alt="Imagem enviada"
                  className="max-w-full h-auto rounded-2xl cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => onExpandImage(message.imageUrl!)}
                  loading="lazy"
                />
                {/* ✅ Exibir caption (texto) junto com a imagem */}
                {message.text && (
                  <div className={`mt-2 px-1 ${
                    message.type === 'sent'
                      ? 'text-white/90'
                      : isDark
                      ? 'text-white/80'
                      : 'text-text-primary-light'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">
                      {linkifyText(message.text, message.type === 'sent')}
                    </p>
                  </div>
                )}
                {/* ✅ Dropdown de Transcrição para Imagem */}
                <TranscriptionDropdown 
                  message={message} 
                  isDark={message.type === 'sent' ? true : isDark} 
                />
              </div>
            )}

            {message.contentType === 'audio' && message.audioUrl && (
              <div className="w-full min-w-0">
                <AudioPlayer
                  src={message.audioUrl}
                  duration={message.audioDuration}
                  isOwnMessage={message.type === 'sent'}
                  isDark={isDark}
                />
                {/* ✅ Dropdown de Transcrição para Áudio */}
                <TranscriptionDropdown
                  message={message}
                  isDark={message.type === 'sent' ? true : isDark}
                />
              </div>
            )}

            {/* ✅ Renderização de Vídeo */}
            {message.contentType === 'video' && message.mediaUrl && (
              <div className="w-full">
                <video
                  src={message.mediaUrl}
                  controls
                  className="max-w-full h-auto rounded-lg"
                  style={{ maxHeight: '300px' }}
                  preload="metadata"
                />
                {message.text && (
                  <p className="text-sm mt-2 px-2 whitespace-pre-wrap break-words">
                    {linkifyText(message.text, message.type === 'sent')}
                  </p>
                )}
              </div>
            )}

            {/* ✅ Renderização de Documento */}
            {message.contentType === 'document' && message.mediaUrl && (
              <div className="w-full">
                <button
                  onClick={async () => {
                    try {
                      // Fazer fetch do arquivo para evitar bloqueio de popup
                      const response = await fetch(message.mediaUrl!);
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = message.fileName || 'documento';
                      link.style.display = 'none';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(url);
                    } catch (error) {
                      // Fallback: abrir em nova aba se fetch falhar
                      window.open(message.mediaUrl!, '_blank');
                    }
                  }}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors w-full text-left ${
                    message.type === 'sent'
                      ? 'bg-white/10 hover:bg-white/20'
                      : isDark
                      ? 'bg-white/5 hover:bg-white/10'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <span className="text-2xl">{getDocumentIcon(message.mimeType)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {message.fileName || 'Documento'}
                    </p>
                    {message.fileSize && (
                      <p className={`text-xs ${
                        message.type === 'sent'
                          ? 'text-white/60'
                          : isDark ? 'text-white/40' : 'text-gray-500'
                      }`}>
                        {formatFileSize(message.fileSize)}
                      </p>
                    )}
                  </div>
                  <Download className={`w-5 h-5 ${
                    message.type === 'sent'
                      ? 'text-white/70'
                      : isDark ? 'text-white/50' : 'text-gray-500'
                  }`} />
                </button>
                {message.text && (
                  <p className="text-sm mt-2 px-1 whitespace-pre-wrap break-words">
                    {linkifyText(message.text, message.type === 'sent')}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        <div
          className={`flex items-center gap-2 justify-end mt-1 text-xs ${ 
            isDeleted
              ? isDark ? 'text-white/30' : 'text-gray-400'
              : message.type === 'sent'
              ? 'text-white/70'
              : isDark
              ? 'text-white/50'
              : 'text-text-secondary-light'
          }`}
        >
          {/* Timestamp e status - acima da pipeline */}
          <div className="flex items-center gap-1">
            <span>{message.timestamp}</span>
            {(message.type === 'sent' || isDeleted) && !isDeleted && (
              <>
                {message.status === 'sending' && (
                  <Clock className="w-3 h-3 animate-pulse" />
                )}
                {message.status === 'error' && (
                  <AlertCircle className="w-3 h-3 text-red-400" />
                )}
                {(!message.status || message.status === 'sent') && (
                  <>
                    {message.read ? (
                      <CheckCheck className="w-3 h-3" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* ✅ Pipeline Logs Viewer - abaixo do timestamp */}
        {!isDeleted && pipeline && showPipeline && (
          <div className="mt-1">
            <PipelineLogsViewer 
              pipeline={pipeline}
              defaultExpanded={false}
              isDark={message.type === 'sent' ? true : isDark}
              inline={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // ✅ Comparador customizado para garantir re-render quando message.type muda
  // Retorna true se props são iguais (não re-renderizar), false se diferentes (re-renderizar)
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.type === nextProps.message.type &&
    prevProps.message.transcriptionStatus === nextProps.message.transcriptionStatus &&
    prevProps.message.transcription === nextProps.message.transcription &&
    prevProps.isDark === nextProps.isDark &&
    prevProps.showPipeline === nextProps.showPipeline
  );
});

MessageBubble.displayName = 'MessageBubble';

export { MessageBubble };