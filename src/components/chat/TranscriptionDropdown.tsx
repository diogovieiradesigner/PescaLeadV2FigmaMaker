import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Mic, Image as ImageIcon, Video, Clock } from 'lucide-react';
import { Message, TranscriptionStatus } from '../../types/chat';

interface TranscriptionDropdownProps {
  message: Message;
  isDark?: boolean;
}

export const TranscriptionDropdown: React.FC<TranscriptionDropdownProps> = ({ 
  message, 
  isDark = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Só mostrar para tipos de mídia que podem ter transcrição
  const mediaTypes = ['audio', 'image', 'video'];
  if (!mediaTypes.includes(message.contentType)) {
    return null;
  }

  // Estados de loading/erro
  if (message.transcriptionStatus === 'pending' || message.transcriptionStatus === 'processing') {
    return (
      <div className={`flex items-center gap-1.5 text-[10px] mt-2 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
        <div className="animate-pulse">⏳</div>
        <span>Transcrevendo...</span>
      </div>
    );
  }

  if (message.transcriptionStatus === 'failed') {
    return (
      <div className={`flex items-center gap-1.5 text-[10px] mt-2 ${isDark ? 'text-red-400/70' : 'text-red-600/70'}`}>
        <span>❌</span>
        <span>Falha na transcrição</span>
      </div>
    );
  }

  // Não mostrar se não tem transcrição completa
  if (!message.transcription || message.transcriptionStatus !== 'completed') {
    return null;
  }

  // Ícone baseado no tipo de mídia
  const getIcon = () => {
    switch (message.contentType) {
      case 'audio':
        return <Mic className="h-3 w-3" />;
      case 'image':
        return <ImageIcon className="h-3 w-3" />;
      case 'video':
        return <Video className="h-3 w-3" />;
      default:
        return <Mic className="h-3 w-3" />;
    }
  };

  // Label baseado no tipo
  const getLabel = () => {
    switch (message.contentType) {
      case 'audio':
        return 'transcrição';
      case 'image':
        return 'descrição';
      case 'video':
        return 'análise';
      default:
        return 'transcrição';
    }
  };

  return (
    <div className="mt-2">
      {/* Toggle Button - Minimalista */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 text-[10px] ${
          isDark 
            ? 'text-gray-500 hover:text-gray-400' 
            : 'text-gray-600 hover:text-gray-700'
        } transition-colors`}
      >
        {getIcon()}
        {isOpen ? (
          <>
            <ChevronUp className="h-3 w-3" />
            <span>Ocultar {getLabel()}</span>
          </>
        ) : (
          <>
            <ChevronDown className="h-3 w-3" />
            <span>Ver {getLabel()}</span>
          </>
        )}
      </button>

      {/* Conteúdo Expandido */}
      {isOpen && (
        <div 
          className={`mt-2 p-3 rounded-lg text-xs border ${
            isDark 
              ? 'bg-black/40 border-white/10' 
              : 'bg-gray-100 border-gray-300'
          }`}
        >
          {/* Transcrição */}
          <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} whitespace-pre-wrap leading-relaxed`}>
            {message.transcription}
          </p>
          
          {/* Metadata (provider e timestamp) */}
          {(message.transcriptionProvider || message.transcribedAt) && (
            <div className={`mt-2 pt-2 flex items-center gap-2 text-[10px] ${
              isDark 
                ? 'border-t border-white/10 text-gray-500' 
                : 'border-t border-gray-300 text-gray-600'
            }`}>
              {message.transcriptionProvider && (
                <span className={isDark ? 'text-blue-400' : 'text-blue-600'}>
                  📍 {message.transcriptionProvider}
                </span>
              )}
              {message.transcribedAt && (
                <>
                  {message.transcriptionProvider && <span>•</span>}
                  <span className="flex items-center gap-1">
                    <Clock size={9} />
                    {new Date(message.transcribedAt).toLocaleTimeString('pt-BR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
