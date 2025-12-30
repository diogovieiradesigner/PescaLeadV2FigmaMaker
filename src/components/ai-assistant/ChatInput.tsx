import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, StopCircle, Paperclip, Mic, X, BookOpen, ArrowUp } from 'lucide-react';
import { Theme } from '../../hooks/useTheme';
import { MediaAttachment, MediaContentType } from '../../types/ai-assistant';
import { ContextUsageIndicator } from './ContextUsageIndicator';

interface ContextUsageInfo {
  usagePercent: number;
  usedTokens: number;
  maxTokens: number;
}

interface ExternalImage {
  file: File;
  preview: string;
}

interface ChatInputProps {
  onSend: (message: string, media?: MediaAttachment, useRag?: boolean) => void;
  isStreaming: boolean;
  theme: Theme;
  disabled?: boolean;
  centered?: boolean;
  onStop?: () => void;
  // RAG props
  ragEnabled?: boolean;
  onRagToggle?: () => void;
  hasRagDocuments?: boolean;
  // Context usage props
  contextUsage?: ContextUsageInfo;
  // External image (from drag and drop)
  externalImage?: ExternalImage | null;
  onClearExternalImage?: () => void;
}

export function ChatInput({
  onSend,
  isStreaming,
  theme,
  disabled = false,
  centered = false,
  onStop,
  ragEnabled = false,
  onRagToggle,
  hasRagDocuments = false,
  contextUsage,
  externalImage,
  onClearExternalImage,
}: ChatInputProps) {
  const isDark = theme === 'dark';
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Media state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 200);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [input]);

  // Handle external image (from drag and drop)
  useEffect(() => {
    if (externalImage) {
      // Se já tem áudio gravado, limpar
      if (audioBlob) {
        clearAudio();
      }
      setSelectedImage(externalImage.file);
      setImagePreview(externalImage.preview);
      // Focar no textarea para o usuário poder digitar
      textareaRef.current?.focus();
    }
  }, [externalImage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const handleSend = () => {
    const hasContent = input.trim() || selectedImage || audioBlob;
    if (!hasContent || isStreaming || disabled) return;

    let media: MediaAttachment | undefined;

    if (selectedImage) {
      media = {
        file: selectedImage,
        type: 'image',
        preview: imagePreview || undefined,
      };
    } else if (audioBlob) {
      media = {
        file: audioBlob,
        type: 'audio',
      };
    }

    onSend(input.trim(), media, ragEnabled);
    setInput('');
    clearImage();
    clearAudio();

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Image handling
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    // Limpar também a imagem externa se houver
    onClearExternalImage?.();
  };

  // Audio recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100); // Collect data every 100ms
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Não foi possível acessar o microfone. Verifique as permissões.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    setIsRecording(false);
  };

  const clearAudio = () => {
    setAudioBlob(null);
    setRecordingTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const hasMedia = selectedImage || audioBlob;
  const canSend = (input.trim() || hasMedia) && !isStreaming && !disabled && !isRecording;

  return (
    <div className={`px-4 pb-4 pt-2 ${
      !centered && (isDark ? 'bg-true-black' : 'bg-white')
    }`}>
      <div className="max-w-3xl mx-auto">
        {/* Main Input Container */}
        <div className={`rounded-2xl border overflow-hidden transition-all ${
          isDark
            ? 'bg-white/[0.03] border-white/[0.08] focus-within:border-white/[0.15]'
            : 'bg-gray-50 border-gray-200 focus-within:border-gray-300'
        }`}>
          {/* Attachments Preview Area */}
          {(imagePreview || audioBlob || isRecording) && (
            <div className={`px-4 pt-3 pb-2 border-b ${
              isDark ? 'border-white/[0.06]' : 'border-gray-200'
            }`}>
              {/* Image Preview */}
              {imagePreview && (
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-20 w-auto object-cover rounded-lg"
                  />
                  <button
                    onClick={clearImage}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Audio Preview */}
              {audioBlob && !isRecording && (
                <div className={`flex items-center gap-3 p-2.5 rounded-lg ${
                  isDark ? 'bg-white/[0.05]' : 'bg-white'
                }`}>
                  <div className="w-8 h-8 rounded-full bg-[#0169D9] flex items-center justify-center">
                    <Mic className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Áudio gravado
                    </p>
                  </div>
                  <button
                    onClick={clearAudio}
                    className={`p-1.5 rounded-lg ${
                      isDark ? 'hover:bg-white/10 text-white/50' : 'hover:bg-gray-100 text-gray-500'
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Recording Indicator */}
              {isRecording && (
                <div className={`flex items-center gap-3 p-2.5 rounded-lg ${
                  isDark ? 'bg-red-500/10' : 'bg-red-50'
                }`}>
                  <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
                    <Mic className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                      Gravando... {formatTime(recordingTime)}
                    </p>
                  </div>
                  <button
                    onClick={stopRecording}
                    className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium"
                  >
                    Parar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Text Input Area - Full Width */}
          <div className="px-4 py-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isRecording
                  ? 'Gravando áudio...'
                  : isStreaming
                    ? 'Aguarde a resposta...'
                    : hasMedia
                      ? 'Adicione uma mensagem (opcional)...'
                      : 'Pergunte qualquer coisa...'
              }
              disabled={isStreaming || disabled || isRecording}
              rows={1}
              className={`w-full resize-none outline-none bg-transparent text-[15px] leading-relaxed ${
                isDark ? 'text-white placeholder:text-white/40' : 'text-gray-900 placeholder:text-gray-400'
              }`}
              style={{ minHeight: '24px', maxHeight: '200px' }}
            />
          </div>

          {/* Bottom Toolbar */}
          <div className={`px-3 py-2 flex items-center justify-between border-t ${
            isDark ? 'border-white/[0.06]' : 'border-gray-100'
          }`}>
            {/* Left Side - Tools */}
            <div className="flex items-center gap-1">
              {/* Hidden file input */}
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Attach Image Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming || disabled || isRecording || !!audioBlob}
                className={`p-2 rounded-lg transition-all ${
                  isStreaming || disabled || isRecording || audioBlob
                    ? isDark
                      ? 'text-white/20 cursor-not-allowed'
                      : 'text-gray-300 cursor-not-allowed'
                    : isDark
                      ? 'text-white/50 hover:text-white hover:bg-white/[0.08]'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title="Anexar imagem"
              >
                <Paperclip className="w-[18px] h-[18px]" />
              </button>

              {/* Mic Button */}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isStreaming || disabled || !!selectedImage}
                className={`p-2 rounded-lg transition-all ${
                  isStreaming || disabled || selectedImage
                    ? isDark
                      ? 'text-white/20 cursor-not-allowed'
                      : 'text-gray-300 cursor-not-allowed'
                    : isRecording
                      ? 'text-red-500 bg-red-500/10'
                      : isDark
                        ? 'text-white/50 hover:text-white hover:bg-white/[0.08]'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title={isRecording ? 'Parar gravação' : 'Gravar áudio'}
              >
                {isRecording ? (
                  <StopCircle className="w-[18px] h-[18px]" />
                ) : (
                  <Mic className="w-[18px] h-[18px]" />
                )}
              </button>

              {/* RAG Toggle Button */}
              {onRagToggle && (
                <button
                  onClick={onRagToggle}
                  disabled={isStreaming || disabled || isRecording || !hasRagDocuments}
                  className={`p-2 rounded-lg transition-all ${
                    isStreaming || disabled || isRecording || !hasRagDocuments
                      ? isDark
                        ? 'text-white/20 cursor-not-allowed'
                        : 'text-gray-300 cursor-not-allowed'
                      : ragEnabled
                        ? 'text-[#0169D9] bg-[#0169D9]/10'
                        : isDark
                          ? 'text-white/50 hover:text-white hover:bg-white/[0.08]'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                  title={
                    !hasRagDocuments
                      ? 'Nenhuma conversa salva na base de conhecimento'
                      : ragEnabled
                        ? 'Desativar consulta ao histórico'
                        : 'Consultar histórico de conversas'
                  }
                >
                  <BookOpen className="w-[18px] h-[18px]" />
                </button>
              )}

              {/* Divider */}
              {contextUsage && contextUsage.usedTokens > 0 && (
                <div className={`w-px h-5 mx-1 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
              )}

              {/* Context Usage Indicator */}
              {contextUsage && contextUsage.usedTokens > 0 && (
                <ContextUsageIndicator
                  usagePercent={contextUsage.usagePercent}
                  usedTokens={contextUsage.usedTokens}
                  maxTokens={contextUsage.maxTokens}
                  theme={theme}
                />
              )}
            </div>

            {/* Right Side - Send/Stop Button */}
            <div className="flex items-center gap-2">
              {/* Keyboard hint */}
              {!isStreaming && canSend && (
                <span className={`text-xs hidden sm:block ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                  Enter para enviar
                </span>
              )}

              {isStreaming ? (
                <button
                  onClick={onStop}
                  className="p-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-all"
                  title="Parar resposta"
                >
                  <StopCircle className="w-[18px] h-[18px]" />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!canSend}
                  className={`p-2 rounded-lg transition-all ${
                    !canSend
                      ? isDark
                        ? 'bg-white/[0.05] text-white/20 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                      : 'bg-[#0169D9] hover:bg-[#0159c9] text-white'
                  }`}
                  title="Enviar (Enter)"
                >
                  <ArrowUp className="w-[18px] h-[18px]" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer Text */}
        <p className={`text-[11px] mt-2 text-center ${
          isDark ? 'text-white/25' : 'text-gray-400'
        }`}>
          Assistente IA pode cometer erros. Considere verificar informações importantes.
        </p>
      </div>
    </div>
  );
}
