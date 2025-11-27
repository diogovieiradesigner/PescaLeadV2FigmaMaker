import React, { memo, useState } from 'react';
import { Clock, AlertCircle, Check, CheckCheck, Trash2 } from 'lucide-react';
import { Message } from '../../types/chat';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { AudioPlayer } from './AudioPlayer';

interface MessageBubbleProps {
  message: Message;
  isDark: boolean;
  onDeleteMessage?: (messageId: string) => void;
  onExpandImage: (url: string) => void;
}

const MessageBubble = memo(({ message, isDark, onDeleteMessage, onExpandImage }: MessageBubbleProps) => {
  const [isHovered, setIsHovered] = useState(false);

  // Verificar se pode deletar: apenas mensagens enviadas com menos de 1 hora
  const canDelete = message.type === 'sent' && message.createdAt && onDeleteMessage && (() => {
    const messageTime = new Date(message.createdAt).getTime();
    const now = Date.now();
    const timeDiff = now - messageTime;
    const ONE_HOUR = 60 * 60 * 1000;
    return timeDiff <= ONE_HOUR;
  })();

  const isDeleted = message.type === 'delete';

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
          title="Deletar mensagem (até 1 hora)"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-500" />
        </button>
      )}

      <div
        className={`max-w-[70%] rounded-lg ${
          message.contentType === 'text' ? 'px-4 py-2' : 'p-1'
        } ${
          isDeleted
            ? isDark 
              ? 'bg-white/[0.05] text-white/50' 
              : 'bg-gray-100 text-gray-500'
            : message.type === 'sent'
            ? 'bg-[#0169D9] text-white'
            : isDark
            ? 'bg-elevated text-white'
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
            <p className="text-xs italic opacity-70">Esta mensagem foi deletada</p>
          </div>
        ) : (
          <>
            {message.contentType === 'text' && message.text && (
              <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
            )}

            {message.contentType === 'image' && message.imageUrl && (
              <div>
                <ImageWithFallback
                  src={message.imageUrl}
                  alt="Imagem enviada"
                  className="max-w-full h-auto rounded-2xl cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => onExpandImage(message.imageUrl!)}
                  loading="lazy"
                />
              </div>
            )}

            {message.contentType === 'audio' && message.audioUrl && (
              <AudioPlayer 
                src={message.audioUrl}
                duration={message.audioDuration}
                isOwnMessage={message.type === 'sent'}
                isDark={isDark}
              />
            )}
          </>
        )}

        <div
          className={`flex items-center gap-1 justify-end mt-1 text-xs ${
            isDeleted
              ? isDark ? 'text-white/30' : 'text-gray-400'
              : message.type === 'sent'
              ? 'text-white/70'
              : isDark
              ? 'text-white/50'
              : 'text-text-secondary-light'
          }`}
        >
          <span>{message.timestamp}</span>
          {(message.type === 'sent' || isDeleted) && !isDeleted && (
            <>
              {message.status === 'sending' && (
                <Clock className="w-3 h-3 animate-pulse" title="Enviando..." />
              )}
              {message.status === 'error' && (
                <AlertCircle className="w-3 h-3 text-red-400" title="Erro ao enviar" />
              )}
              {(!message.status || message.status === 'sent') && (
                <>
                  {message.read ? (
                    <CheckCheck className="w-3 h-3" title="Lida" />
                  ) : (
                    <Check className="w-3 h-3" title="Enviada" />
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';

export { MessageBubble };
