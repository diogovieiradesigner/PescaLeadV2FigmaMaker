import { useState, useRef, useEffect } from 'react';
import { Send, Phone, Video, MoreVertical, Check, CheckCheck, Smile, Mic, Image as ImageIcon, Play, X } from 'lucide-react';
import { Theme } from '../../hooks/useTheme';
import { Conversation, Message } from '../../types/chat';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface ChatAreaProps {
  conversation: Conversation | null;
  theme: Theme;
  onSendMessage: (message: Omit<Message, 'id' | 'timestamp' | 'type'>) => void;
}

const COMMON_EMOJIS = ['😀', '😊', '😂', '❤️', '👍', '🙏', '🎉', '✅', '👏', '🔥', '💯', '🤝', '✨', '💪', '🎯'];

export function ChatArea({ conversation, theme, onSendMessage }: ChatAreaProps) {
  const [messageText, setMessageText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiContainerRef = useRef<HTMLDivElement>(null);
  
  const isDark = theme === 'dark';

  // Auto scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiContainerRef.current &&
        !emojiContainerRef.current.contains(event.target as Node) &&
        showEmojiPicker
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

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

  const handleSend = () => {
    if (imagePreview) {
      onSendMessage({
        contentType: 'image',
        imageUrl: imagePreview,
        read: false,
      });
      setImagePreview(null);
    } else if (messageText.trim()) {
      onSendMessage({
        text: messageText,
        contentType: 'text',
        read: false,
      });
      setMessageText('');
    }
    setShowEmojiPicker(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setMessageText((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        onSendMessage({
          contentType: 'audio',
          audioUrl,
          audioDuration: recordingTime,
          read: false,
        });

        stream.getTracks().forEach(track => track.stop());
        setRecordingTime(0);
      };

      mediaRecorder.start();
      setIsRecording(true);

      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      // Silently handle microphone permission denial
      // Create a mock audio message for demonstration purposes
      const mockAudioUrl = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
      
      // Simulate recording for 3 seconds
      setIsRecording(true);
      let mockTime = 0;
      
      const mockInterval = window.setInterval(() => {
        mockTime++;
        setRecordingTime(mockTime);
        
        if (mockTime >= 3) {
          clearInterval(mockInterval);
          setIsRecording(false);
          
          onSendMessage({
            contentType: 'audio',
            audioUrl: mockAudioUrl,
            audioDuration: 3,
            read: false,
          });
          
          setRecordingTime(0);
        }
      }, 1000);
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
      className={`flex-1 flex flex-col transition-colors ${
        isDark ? 'bg-true-black' : 'bg-light-bg'
      }`}
    >
      {/* Header */}
      <div
        className={`px-6 py-3 border-b flex items-center justify-between ${
          isDark ? 'border-white/[0.08]' : 'border-border-light'
        }`}
      >
        <div className="flex items-center gap-3">
          <img
            src={conversation.avatar}
            alt={conversation.contactName}
            className="w-10 h-10 rounded-full object-cover"
          />
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
                {conversation.contactPhone}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                Aguardando
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            className={`p-2 rounded-lg transition-colors ${
              isDark
                ? 'hover:bg-white/[0.05] text-white/50'
                : 'hover:bg-light-elevated text-text-secondary-light'
            }`}
          >
            <Phone className="w-5 h-5" />
          </button>
          <button
            className={`p-2 rounded-lg transition-colors ${
              isDark
                ? 'hover:bg-white/[0.05] text-white/50'
                : 'hover:bg-light-elevated text-text-secondary-light'
            }`}
          >
            <Video className="w-5 h-5" />
          </button>
          <button
            className={`p-2 rounded-lg transition-colors ${
              isDark
                ? 'hover:bg-white/[0.05] text-white/50'
                : 'hover:bg-light-elevated text-text-secondary-light'
            }`}
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div 
        className={`flex-1 overflow-y-auto px-6 py-4 space-y-4 relative ${
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

        {conversation.messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'sent' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg ${
                message.contentType === 'text' ? 'px-4 py-2' : 'p-1'
              } ${
                message.type === 'sent'
                  ? 'bg-green-600 text-white'
                  : isDark
                  ? 'bg-elevated text-white'
                  : 'bg-light-elevated text-text-primary-light'
              }`}
            >
              {message.contentType === 'text' && message.text && (
                <p className="text-sm">{message.text}</p>
              )}

              {message.contentType === 'image' && message.imageUrl && (
                <div>
                  <ImageWithFallback
                    src={message.imageUrl}
                    alt="Imagem enviada"
                    className="max-w-full h-auto rounded"
                  />
                </div>
              )}

              {message.contentType === 'audio' && message.audioUrl && (
                <div className="flex items-center gap-2 px-3 py-2">
                  <button className="p-1 rounded-full bg-white/20">
                    <Play className="w-4 h-4" />
                  </button>
                  <div className="flex-1 h-1 bg-white/20 rounded">
                    <div className="h-full w-0 bg-white rounded" />
                  </div>
                  <span className="text-xs">
                    {formatTime(message.audioDuration || 0)}
                  </span>
                </div>
              )}

              <div
                className={`flex items-center gap-1 justify-end mt-1 text-xs ${
                  message.type === 'sent'
                    ? 'text-white/70'
                    : isDark
                    ? 'text-white/50'
                    : 'text-text-secondary-light'
                }`}
              >
                <span>{message.timestamp}</span>
                {message.type === 'sent' && (
                  <>
                    {message.read ? (
                      <CheckCheck className="w-3 h-3" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        className={`px-6 py-4 border-t ${
          isDark ? 'border-white/[0.08]' : 'border-border-light'
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
              className="text-sm px-3 py-1 rounded bg-green-600 hover:bg-green-700 transition-colors text-white"
            >
              Enviar
            </button>
          </div>
        )}

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div 
            className={`mb-3 p-3 rounded-lg border ${
              isDark ? 'bg-elevated border-white/[0.08]' : 'bg-light-elevated border-border-light'
            }`}
          >
            <div className="flex flex-wrap gap-2">
              {COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiClick(emoji)}
                  className="text-2xl p-2 rounded hover:bg-white/[0.05] transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-end gap-2" ref={emojiContainerRef}>
          {/* Emoji Button */}
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-2 rounded-lg transition-colors ${
              isDark
                ? 'hover:bg-white/[0.05] text-white/50'
                : 'hover:bg-light-elevated text-text-secondary-light'
            }`}
          >
            <Smile className="w-5 h-5" />
          </button>

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
            onKeyPress={handleKeyPress}
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
              className="p-2 rounded-lg transition-colors bg-green-600 hover:bg-green-700 text-white"
            >
              <Send className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-2 rounded-lg transition-colors ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
