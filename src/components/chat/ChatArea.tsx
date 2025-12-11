import { Send, ImageIcon, Mic, X, Clock, Check, CheckCheck, AlertCircle, Trash2, CheckCircle } from 'lucide-react';
import { Theme } from '../../hooks/useTheme';
import { Conversation, Message } from '../../types/chat';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { ChatActionsMenu } from './ChatActionsMenu';
import { AudioPlayer } from './AudioPlayer';
import { MessageBubble } from './MessageBubble';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ============================================
// 📅 Componente de Separador de Data (estilo WhatsApp)
// ============================================
function DateSeparator({ date, isDark }: { date: string; isDark: boolean }) {
  return (
    <div className="flex items-center justify-center my-4">
      <div className={`px-3 py-1 rounded-lg text-xs ${
        isDark
          ? 'bg-white/[0.08] text-white/60'
          : 'bg-gray-200 text-gray-600'
      }`}>
        {date}
      </div>
    </div>
  );
}

// ============================================
// 🔧 Função para formatar data como "Hoje", "Ontem", ou "DD/MM/YYYY"
// ============================================
function formatDateLabel(dateString: string): string {
  const messageDate = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Normalizar para comparar apenas datas (sem hora)
  const messageDateOnly = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

  if (messageDateOnly.getTime() === todayOnly.getTime()) {
    return 'Hoje';
  } else if (messageDateOnly.getTime() === yesterdayOnly.getTime()) {
    return 'Ontem';
  } else {
    return messageDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
}

// ============================================
// 🔧 Função para extrair chave de data (YYYY-MM-DD) de uma mensagem
// ============================================
function getDateKey(dateString: string): string {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

interface ChatAreaProps {
  conversation: Conversation | null;
  theme: Theme;
  onSendMessage: (message: Omit<Message, 'id' | 'timestamp' | 'type'>) => void;
  onMarkAsResolved: () => void;
  onClearHistory: () => void;
  onDeleteConversation: () => void;
  onNavigateToPipeline?: (leadId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
}

export function ChatArea({ conversation, theme, onSendMessage, onMarkAsResolved, onClearHistory, onDeleteConversation, onNavigateToPipeline, onDeleteMessage }: ChatAreaProps) {
  const [messageText, setMessageText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null); // ✅ Estado para imagem expandida
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<number | null>(null);
  const recordingTimeRef = useRef<number>(0); // ✅ Ref para capturar o tempo real
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isFirstRenderRef = useRef<boolean>(true); // ✅ Detectar primeira renderização
  const lastScrolledMessagesCountRef = useRef<number>(0); // ✅ OTIMIZAÇÃO: Rastrear count de mensagens
  
  const isDark = theme === 'dark';

  const handleExpandImage = useCallback((url: string) => {
    setExpandedImage(url);
  }, []);

  // ✅ OTIMIZAÇÃO: Auto scroll apenas quando há novas mensagens
  useEffect(() => {
    const currentCount = conversation?.messages.length || 0;
    
    // Só fazer scroll se:
    // 1. É a primeira renderização, OU
    // 2. O número de mensagens mudou
    if (isFirstRenderRef.current || currentCount !== lastScrolledMessagesCountRef.current) {
      if (isFirstRenderRef.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        isFirstRenderRef.current = false;
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
      
      lastScrolledMessagesCountRef.current = currentCount;
    }
  }, [conversation?.messages.length]); // ✅ Depender apenas do length, não do array inteiro

  // ✅ Resetar flag quando trocar de conversa
  useEffect(() => {
    isFirstRenderRef.current = true;
  }, [conversation?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  // ✅ Fechar modal de imagem expandida com ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && expandedImage) {
        setExpandedImage(null);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [expandedImage]);

  if (!conversation) {
    return (
      <div
        className={`flex-1 flex items-center justify-center ${
          isDark ? 'bg-true-black' : 'bg-light-bg'
        }`}
      >
        <div className="text-center">
          <div
            className={`w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center ${
              isDark ? 'bg-white/[0.05]' : 'bg-light-elevated'
            }`}
          >
            <Send
              className={`w-12 h-12 ${
                isDark ? 'text-white/30' : 'text-text-secondary-light'
              }`}
            />
          </div>
          <p
            className={`text-sm ${
              isDark ? 'text-white/50' : 'text-text-secondary-light'
            }`}
          >
            Selecione uma conversa para começar
          </p>
        </div>
      </div>
    );
  }

  const handleSend = async () => {
    if (isSending) return; // Prevenir duplo envio

    try {
      setIsSending(true);

      if (imagePreview) {
        // ✅ Limpar preview imediatamente (otimistic UI)
        const imageToSend = imagePreview;
        setImagePreview(null);
        
        await onSendMessage({
          contentType: 'image',
          imageUrl: imageToSend,
          read: false,
        });
      } else if (messageText.trim()) {
        // ✅ Limpar input imediatamente (otimistic UI)
        const textToSend = messageText.trim();
        setMessageText('');
        
        await onSendMessage({
          text: textToSend,
          contentType: 'text',
          read: false,
        });
      }
    } catch (error) {
      console.error('[ChatArea] Error sending message:', error);
      // Opcionalmente, mostrar uma notificação de erro ao usuário
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // ✅ Permitir atalhos do sistema (Ctrl+A, Cmd+A, Ctrl+C, etc)
    if (e.metaKey || e.ctrlKey) {
      return; // Não interferir com atalhos do sistema
    }
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startRecording = async () => {
    try {
      // ✅ Verificar permissão do microfone primeiro
      console.log('[ChatArea] Requesting microphone permission...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      console.log('[ChatArea] Microphone permission granted!');
      
      // ✅ Tentar gravar em OGG (WhatsApp compatível), se não suportar usa WEBM
      let mimeType = 'audio/ogg; codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm; codecs=opus';
        console.log('[ChatArea] Browser does not support audio/ogg, using audio/webm');
      } else {
        console.log('[ChatArea] Recording in audio/ogg format');
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        // ✅ Usar a ref para pegar o tempo real de gravação
        const actualDuration = recordingTimeRef.current;
        
        // ✅ Converter blob para base64 COM prefixo data URI completo
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          
          console.log('[ChatArea] Audio captured:', {
            originalSize: audioBlob.size,
            mimeType: audioBlob.type,
            base64Length: base64Audio.length,
            base64Prefix: base64Audio.substring(0, 50),
            duration: actualDuration,
            recordingTimeState: recordingTime,
            recordingTimeRef: recordingTimeRef.current
          });
          
          // ⚠️ IMPORTANTE: Garantir que a duração seja pelo menos 1 segundo
          const finalDuration = Math.max(actualDuration, 1);
          
          console.log('🎤 [ChatArea] ==========================================');
          console.log('🎤 [ChatArea] SENDING AUDIO MESSAGE');
          console.log('🎤 [ChatArea] ==========================================');
          console.log('   Final Duration:', finalDuration);
          console.log('   Final Duration Type:', typeof finalDuration);
          console.log('   Actual Duration:', actualDuration);
          console.log('   Recording Time State:', recordingTime);
          console.log('   Recording Time Ref:', recordingTimeRef.current);
          console.log('🎤 [ChatArea] ==========================================');
          
          onSendMessage({
            contentType: 'audio',
            audioUrl: base64Audio, // ✅ Enviar com prefixo completo data:audio/webm;base64,...
            audioDuration: finalDuration,
            read: false,
          });
        };

        stream.getTracks().forEach(track => track.stop());
        setRecordingTime(0);
        recordingTimeRef.current = 0; // ✅ Resetar ref
      };

      mediaRecorder.start();
      setIsRecording(true);

      recordingIntervalRef.current = window.setInterval(() => {
        recordingTimeRef.current += 1; // ✅ Atualizar ref
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('[ChatArea] Failed to start recording:', error);
      setIsRecording(false);
      
      // ✅ Feedback específico baseado no tipo de erro
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        console.warn('[ChatArea] ⚠️ Microfone bloqueado pelo usuário');
        // Mostrar toast se disponível, senão alert
        if (typeof window !== 'undefined' && (window as any).showToast) {
          (window as any).showToast('Permissão do microfone negada. Por favor, permita o acesso ao microfone nas configurações do navegador.', 'error');
        } else {
          alert('🎤 Permissão Negada\n\nPara enviar áudios, você precisa permitir o acesso ao microfone.\n\nClique no ícone de cadeado/informação na barra de endereço e permita o microfone.');
        }
      } else if (error.name === 'NotFoundError') {
        console.error('[ChatArea] ⚠️ Nenhum microfone encontrado');
        alert('🎤 Microfone não encontrado\n\nNenhum dispositivo de áudio foi detectado no seu sistema.');
      } else {
        console.error('[ChatArea] ⚠️ Erro desconhecido ao acessar microfone:', error);
        alert(`Erro ao acessar o microfone: ${error.message}`);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingTime(0);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      audioChunksRef.current = [];
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));

    if (imageFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(imageFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={`flex flex-col h-full min-h-0 w-full transition-colors ${
        isDark ? 'bg-true-black' : 'bg-light-bg'
      }`}
    >
      {/* Header */}
      <div
        className={`px-6 py-3 border-b flex items-center justify-between h-[85px] ${
          isDark ? 'border-white/[0.08]' : 'border-border-light'
        }`}
      >
        <div className="flex items-center gap-3">
          <div>
            <h3 className={isDark ? 'text-white' : 'text-text-primary-light'}>
              {conversation.contactName}
            </h3>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs ${
                  isDark ? 'text-white/50' : 'text-text-secondary-light'
                }`}
              >
                {conversation.contactPhone?.includes('@g.us') 
                  ? 'Grupo' 
                  : (() => {
                      const phone = conversation.contactPhone?.split('@')[0] || '';
                      const digits = phone.replace(/\D/g, '');
                      
                      // Formato brasileiro: +55 (XX) XXXXX-XXXX ou +55 (XX) XXXX-XXXX
                      if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
                        const ddd = digits.slice(2, 4);
                        const number = digits.slice(4);
                        if (number.length === 9) {
                          return `+55 (${ddd}) ${number.slice(0, 5)}-${number.slice(5)}`;
                        } else if (number.length === 8) {
                          return `+55 (${ddd}) ${number.slice(0, 4)}-${number.slice(4)}`;
                        }
                      }
                      
                      // Outros países ou formato genérico
                      return phone.startsWith('+') ? phone : `+${digits}`;
                    })()
                }
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Quick Action: Mark as Resolved */}
          {conversation.status !== 'resolved' && (
            <button
              onClick={onMarkAsResolved}
              title="Marcar como Resolvido"
              className="flex items-center gap-2 p-2 sm:px-3 sm:py-2 rounded-lg transition-colors bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">Resolvido</span>
            </button>
          )}

          {/* Actions Menu (3 dots) */}
          <ChatActionsMenu
            theme={theme}
            hasLead={!!conversation.leadId} // ✅ Só mostra "Perfil completo" se tiver leadId
            onViewInPipeline={() => {
              if (conversation.leadId && onNavigateToPipeline) {
                onNavigateToPipeline(conversation.leadId);
              }
            }}
            onClearHistory={onClearHistory}
            onDeleteConversation={onDeleteConversation}
          />
        </div>
      </div>

      {/* Messages */}
      <div 
        className={`flex-1 overflow-y-auto scrollbar-thin px-6 py-4 space-y-4 relative ${
          isDragging ? 'ring-2 ring-[#0169D9] ring-inset' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0169D9]/10 z-10 pointer-events-none">
            <div className={`text-center p-8 rounded-lg ${
              isDark ? 'bg-elevated' : 'bg-light-elevated'
            }`}>
              <ImageIcon className="w-16 h-16 mx-auto mb-2 text-[#0169D9]" />
              <p className={isDark ? 'text-white' : 'text-text-primary-light'}>
                Solte a imagem aqui
              </p>
            </div>
          </div>
        )}

        {conversation.messages.map((message, index) => {
          // ✅ Verificar se esta mensagem é a última do grupo com o mesmo pipelineId
          const isLastInPipelineGroup = message.pipelineId ? 
            index === conversation.messages.length - 1 || 
            conversation.messages[index + 1]?.pipelineId !== message.pipelineId
            : true;
          
          return (
            <MessageBubble
              key={message.id}
              message={message}
              isDark={isDark}
              onDeleteMessage={onDeleteMessage}
              onExpandImage={handleExpandImage}
              showPipeline={isLastInPipelineGroup}
            />
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        className={`px-6 py-4 border-t ${
          isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'border-border-light'
        }`}
      >
        {/* Image Preview */}
        {imagePreview && (
          <div className={`mb-3 p-3 rounded-lg border ${
            isDark ? 'bg-elevated border-white/[0.08]' : 'bg-light-elevated border-border-light'
          }`}>
            <div className="flex items-start gap-3">
              <ImageWithFallback
                src={imagePreview}
                alt="Preview"
                className="w-20 h-20 object-cover rounded"
              />
              <button
                onClick={() => setImagePreview(null)}
                className={`ml-auto p-1 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-white/[0.05] text-white/50' : 'hover:bg-light-elevated-hover text-text-secondary-light'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Recording State */}
        {isRecording && (
          <div className={`mb-3 p-3 rounded-lg border flex items-center gap-3 ${
            isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-500/5 border-red-500/20'
          }`}>
            <div className="flex items-center gap-2 flex-1">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className={`text-sm ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                Gravando... {formatTime(recordingTime)}
              </span>
            </div>
            <button
              onClick={cancelRecording}
              className="text-sm px-3 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={stopRecording}
              className="text-sm px-3 py-1 rounded bg-[#0169D9] hover:bg-[#0169D9]/90 transition-colors text-white"
            >
              Enviar
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Image Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`p-2 rounded-lg transition-colors ${
              isDark
                ? 'hover:bg-white/[0.05] text-white/50'
                : 'hover:bg-light-elevated text-text-secondary-light'
            }`}
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Text Input */}
          <input
            type="text"
            placeholder="Digite uma mensagem..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isRecording}
            className={`flex-1 border px-4 py-2 rounded-lg transition-all focus:outline-none focus:border-[#0169D9] ${
              isDark
                ? 'bg-elevated border-white/[0.08] text-white placeholder-white/40'
                : 'bg-light-elevated border-border-light text-text-primary-light placeholder-text-secondary-light'
            }`}
          />

          {/* Voice/Send Button */}
          {messageText.trim() || imagePreview ? (
            <button
              onClick={handleSend}
              className="p-2 rounded-lg transition-colors bg-[#0169D9] hover:bg-[#0169D9]/90 text-white"
            >
              <Send className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-2 rounded-lg transition-colors ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-[#0169D9] hover:bg-[#0169D9]/90 text-white'
              }`}
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* ✅ Modal de Imagem Expandida */}
      {expandedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setExpandedImage(null)}
        >
          <button
            onClick={() => setExpandedImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
            aria-label="Fechar"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <div 
            className="max-w-[90vw] max-h-[90vh] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <ImageWithFallback
              src={expandedImage}
              alt="Imagem expandida"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}