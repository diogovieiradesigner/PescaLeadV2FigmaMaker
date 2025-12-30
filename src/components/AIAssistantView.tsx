import { useState, useEffect, useRef, useCallback, DragEvent } from 'react';
import { Theme } from '../hooks/useTheme';
import { MessageSquare, Plus, Settings, Sun, Moon, Menu, Database, Loader2, Check, Copy, ImageIcon } from 'lucide-react';
import { AIConversation, AIMessage, SearchStep, SearchSource, MediaAttachment, AIConfiguration } from '../types/ai-assistant';
import { useRagImport, useRagCount } from '../hooks/useAssistantRag';
import {
  getConversations,
  createConversation,
  deleteConversation,
  getMessages,
  sendMessageStream,
  deleteMessage,
  uploadMedia,
  updateConversationModel,
  getConfiguration,
  ContextInfo,
} from '../services/ai-assistant-service';
import { ChatMessageList } from './ai-assistant/ChatMessageList';
import { ChatInput } from './ai-assistant/ChatInput';
import { ConversationSidebar } from './ai-assistant/ConversationSidebar';
import { AIConfigModal } from './ai-assistant/AIConfigModal';
import { ModelSelector } from './ai-assistant/ModelSelector';
import { ProfileMenu } from './ProfileMenu';
import { toast } from 'sonner';
import { cn } from './ui/utils';

interface AIAssistantViewProps {
  theme: Theme;
  workspaceId: string;
  userId: string;
  onThemeToggle: () => void;
  onNavigateToSettings: () => void;
  onManageMembersClick?: () => void;
  onMobileMenuClick?: () => void;
  initialConversationId?: string | null;
  onConversationChange?: (conversationId: string | null) => void;
}

export function AIAssistantView({
  theme,
  workspaceId,
  userId,
  onThemeToggle,
  onNavigateToSettings,
  onManageMembersClick,
  onMobileMenuClick,
  initialConversationId,
  onConversationChange
}: AIAssistantViewProps) {
  const isDark = theme === 'dark';

  // State
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<AIConversation | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Web Search State
  const [searchSteps, setSearchSteps] = useState<SearchStep[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchSources, setSearchSources] = useState<SearchSource[]>([]);

  // Thinking/Reasoning State (para modelos como DeepSeek R1)
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingContent, setThinkingContent] = useState('');

  // Media Upload State
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // Configuration State
  const [config, setConfig] = useState<AIConfiguration | null>(null);

  // RAG State
  const [ragEnabled, setRagEnabled] = useState(false);
  const { count: ragDocCount, refresh: refreshRagCount } = useRagCount(workspaceId);
  const {
    isImporting,
    isImported,
    importConversation,
    checkImported
  } = useRagImport(workspaceId, selectedConversation?.id || null);

  // Context Usage State
  const [contextUsage, setContextUsage] = useState({
    usagePercent: 0,
    usedTokens: 0,
    maxTokens: 0,
  });

  // Drag and Drop State
  const [isDragging, setIsDragging] = useState(false);
  const [droppedImage, setDroppedImage] = useState<{ file: File; preview: string } | null>(null);
  const dragCounterRef = useRef(0);

  // Abort controller para cancelar streaming
  const abortControllerRef = useRef<AbortController | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Load conversations and config on mount
  useEffect(() => {
    if (workspaceId) {
      loadConversations(true); // true = selecionar conversa inicial da URL
      loadConfiguration();
    }
  }, [workspaceId]);

  const loadConfiguration = async () => {
    const configData = await getConfiguration(workspaceId);
    setConfig(configData);
  };

  // Load messages when conversation changes (but not during streaming to preserve optimistic updates)
  useEffect(() => {
    if (selectedConversation && !isStreaming) {
      loadMessages(selectedConversation.id);
    } else if (!selectedConversation) {
      setMessages([]);
    }
  }, [selectedConversation?.id]);

  // Auto-scroll to bottom on new messages (only if user hasn't scrolled up)
  useEffect(() => {
    if (shouldAutoScroll && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      // Scroll suave usando scrollTop em vez de scrollIntoView
      // Isso evita os "pulos" quando novos tokens chegam
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, streamingMessage, searchSteps, thinkingContent, shouldAutoScroll]);

  // Detectar se o usuário está no final do scroll
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Considera "no final" se estiver a menos de 100px do bottom
    const threshold = 100;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;

    setShouldAutoScroll(isAtBottom);
  }, []);

  // Reset auto-scroll when changing conversation or starting new message
  useEffect(() => {
    setShouldAutoScroll(true);
  }, [selectedConversation?.id]);

  const loadConversations = async (selectInitial = false) => {
    const data = await getConversations(workspaceId);
    setConversations(data);

    // Se temos um ID inicial da URL, selecionar essa conversa
    if (selectInitial && initialConversationId) {
      const initialConversation = data.find(c => c.id === initialConversationId);
      if (initialConversation) {
        setSelectedConversation(initialConversation);
        return;
      }
    }

    // Auto-select first conversation if none selected
    if (data.length > 0 && !selectedConversation) {
      const firstConversation = data[0];
      setSelectedConversation(firstConversation);
      // Atualizar URL para a primeira conversa
      onConversationChange?.(firstConversation.id);
    }
  };

  const loadMessages = async (conversationId: string) => {
    const data = await getMessages(conversationId);
    setMessages(data);
  };

  const handleNewConversation = async () => {
    const { conversation, error } = await createConversation({
      workspace_id: workspaceId,
      user_id: userId,
      title: 'Nova Conversa',
    });

    if (error) {
      toast.error('Erro ao criar conversa');
      return;
    }

    if (conversation) {
      setConversations(prev => [conversation, ...prev]);
      setSelectedConversation(conversation);
      setMessages([]);
      // Atualizar URL para a nova conversa
      onConversationChange?.(conversation.id);
      toast.success('Conversa criada!');
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await deleteConversation(conversationId);
      const remainingConversations = conversations.filter(c => c.id !== conversationId);
      setConversations(remainingConversations);

      if (selectedConversation?.id === conversationId) {
        // Selecionar próxima conversa ou limpar
        if (remainingConversations.length > 0) {
          const nextConversation = remainingConversations[0];
          setSelectedConversation(nextConversation);
          onConversationChange?.(nextConversation.id);
        } else {
          setSelectedConversation(null);
          setMessages([]);
          onConversationChange?.(null);
        }
      }

      toast.success('Conversa deletada');
    } catch (error) {
      toast.error('Erro ao deletar conversa');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      toast.success('Mensagem deletada');
    } catch (error) {
      toast.error('Erro ao deletar mensagem');
    }
  };

  const handleSelectConversation = (conversation: AIConversation | null) => {
    setSelectedConversation(conversation);
    // Atualizar URL para a conversa selecionada
    onConversationChange?.(conversation?.id || null);
  };

  const handleModelChange = async (modelId: string) => {
    if (!selectedConversation) return;

    try {
      const updated = await updateConversationModel(
        selectedConversation.id,
        modelId || null // String vazia = usar padrão
      );

      if (updated) {
        // Atualizar estado local
        setSelectedConversation(updated);
        setConversations(prev =>
          prev.map(c => c.id === updated.id ? updated : c)
        );
        toast.success(modelId ? 'Modelo alterado!' : 'Usando modelo padrão');
      }
    } catch (error) {
      console.error('Error updating model:', error);
      toast.error('Erro ao alterar modelo');
    }
  };

  const handleSendMessage = async (content: string, media?: MediaAttachment, useRag?: boolean) => {
    const hasContent = content.trim() || media;
    if (!hasContent || isStreaming || isUploadingMedia) return;

    let conversationToUse = selectedConversation;

    // Se não há conversa selecionada, criar automaticamente
    if (!conversationToUse) {
      const { conversation, error } = await createConversation({
        workspace_id: workspaceId,
        user_id: userId,
        title: 'Nova Conversa',
      });

      if (error || !conversation) {
        toast.error('Erro ao criar conversa');
        return;
      }

      conversationToUse = conversation;
      setConversations(prev => [conversation, ...prev]);
      setSelectedConversation(conversation);
      onConversationChange?.(conversation.id);
    }

    // Upload media if present
    let mediaUrl: string | undefined;
    let contentType: 'image' | 'audio' | undefined;

    if (media) {
      setIsUploadingMedia(true);
      try {
        const { url, error: uploadError } = await uploadMedia(
          media.file,
          workspaceId,
          media.type
        );

        if (uploadError || !url) {
          toast.error('Erro ao fazer upload do arquivo');
          setIsUploadingMedia(false);
          return;
        }

        mediaUrl = url;
        contentType = media.type;
      } catch (error) {
        console.error('Upload error:', error);
        toast.error('Erro ao fazer upload do arquivo');
        setIsUploadingMedia(false);
        return;
      }
      setIsUploadingMedia(false);
    }

    // Add user message to UI immediately (optimistic update)
    const userMessage: AIMessage = {
      id: crypto.randomUUID(),
      conversation_id: conversationToUse.id,
      role: 'user',
      content: content.trim() || (contentType === 'image' ? '[Imagem enviada]' : '[Áudio enviado]'),
      tokens_used: 0,
      created_at: new Date().toISOString(),
      media_url: mediaUrl,
      content_type: contentType,
      // Se tem mídia, começa com status 'pending' para mostrar o loading
      transcription_status: mediaUrl ? 'pending' : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);
    setShouldAutoScroll(true); // Ativar auto-scroll ao enviar nova mensagem
    setStreamingMessage('');
    setSearchSteps([]);
    setIsSearching(false);
    setSearchSources([]);
    setIsThinking(false);
    setThinkingContent('');

    // Criar AbortController para permitir cancelamento
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    await sendMessageStream(
      conversationToUse.id,
      content.trim(),
      workspaceId,
      // On token
      (token: string) => {
        setStreamingMessage(prev => prev + token);
      },
      // On complete
      async () => {
        setIsStreaming(false);
        setStreamingMessage('');
        setIsSearching(false);
        setIsThinking(false);

        // Reload messages to get persisted assistant message (sources e thinking_content vem do banco)
        await loadMessages(conversationToUse.id);

        // Reload conversations to update timestamp
        await loadConversations();
        // Clear search state after a delay
        setTimeout(() => {
          setSearchSteps([]);
          setSearchSources([]);
          setThinkingContent('');
        }, 500);
      },
      // On error
      (error: Error) => {
        console.error('Stream error:', error);
        setIsStreaming(false);
        setStreamingMessage('');
        setIsSearching(false);
        setIsThinking(false);
        setThinkingContent('');
        setSearchSteps([]);
        setSearchSources([]);
        toast.error('Erro ao enviar mensagem. Tente novamente.');
      },
      // On search step
      (step: SearchStep) => {
        setIsSearching(step.type !== 'complete');
        setSearchSteps(prev => {
          // Avoid duplicate steps
          const exists = prev.some(s => s.id === step.id);
          if (exists) return prev;
          return [...prev, step];
        });
      },
      // On search sources
      (sources: SearchSource[]) => {
        setSearchSources(sources);
      },
      // Media info
      mediaUrl,
      contentType,
      // Thinking callbacks
      () => {
        // On thinking start
        setIsThinking(true);
        setThinkingContent('');
      },
      (token: string) => {
        // On thinking token
        setThinkingContent(prev => prev + token);
      },
      () => {
        // On thinking end
        setIsThinking(false);
      },
      // On media transcribed - atualiza o status da mensagem do usuário
      (transcription: string) => {
        setMessages(prev => prev.map(msg => {
          // Atualiza a última mensagem do usuário que tem mídia
          if (msg.role === 'user' && msg.media_url && msg.transcription_status !== 'completed') {
            return {
              ...msg,
              transcription,
              transcription_status: 'completed' as const
            };
          }
          return msg;
        }));
      },
      // Abort signal
      abortController.signal,
      // Use RAG - passar o estado do toggle
      useRag,
      // Context info callback
      (info: ContextInfo) => {
        setContextUsage({
          usagePercent: Math.round(info.usagePercent),
          usedTokens: info.usedTokens,
          maxTokens: info.maxTokens,
        });
      },
      // Summarization callback
      (message: string) => {
        toast.info(message, {
          duration: 5000,
          icon: '📝',
        });
      }
    );

    // Limpar referência ao terminar
    abortControllerRef.current = null;
  };

  // Função para parar/cancelar o streaming
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setStreamingMessage('');
    setIsSearching(false);
    setIsThinking(false);
    setThinkingContent('');
    setSearchSteps([]);
    setSearchSources([]);
  };

  // Drag and Drop handlers
  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;

    // Verificar se tem arquivos sendo arrastados
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;

    // Só esconde quando realmente sai da área (counter = 0)
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Reset drag state
    dragCounterRef.current = 0;
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));

    if (imageFile) {
      // Criar preview da imagem
      const reader = new FileReader();
      reader.onloadend = () => {
        setDroppedImage({
          file: imageFile,
          preview: reader.result as string,
        });
      };
      reader.readAsDataURL(imageFile);
    } else if (files.length > 0) {
      toast.error('Por favor, arraste apenas imagens');
    }
  }, []);

  // Limpar imagem arrastada quando for usada
  const handleClearDroppedImage = useCallback(() => {
    setDroppedImage(null);
  }, []);

  // Função para copiar toda a conversa em Markdown
  const handleCopyConversation = async () => {
    if (!selectedConversation || messages.length === 0) return;

    try {
      const visibleMessages = messages.filter(m => m.role !== 'system');

      // Construir o Markdown
      let markdown = `# ${selectedConversation.title || 'Conversa'}\n\n`;
      markdown += `**Criada em:** ${new Date(selectedConversation.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}\n\n`;
      markdown += `**Total de mensagens:** ${visibleMessages.length}\n\n`;
      markdown += `---\n\n`;

      for (const msg of visibleMessages) {
        const dateTime = new Date(msg.created_at);
        const date = dateTime.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        const time = dateTime.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        });

        if (msg.role === 'user') {
          markdown += `### 👤 **USUÁRIO** — ${date} às ${time}\n\n`;
          markdown += `${msg.content}\n\n`;
        } else {
          markdown += `### 🤖 **ASSISTENTE IA** — ${date} às ${time}\n\n`;
          markdown += `${msg.content}\n\n`;

          // Adicionar fontes se houver
          if (msg.sources && msg.sources.length > 0) {
            markdown += `> **Fontes consultadas:**\n`;
            for (const source of msg.sources) {
              markdown += `> - [${source.title}](${source.url})\n`;
            }
            markdown += '\n';
          }
        }

        markdown += `---\n\n`;
      }

      await navigator.clipboard.writeText(markdown);
      toast.success('Conversa copiada em Markdown!');
    } catch (error) {
      console.error('Error copying conversation:', error);
      toast.error('Erro ao copiar conversa');
    }
  };

  return (
    <div className={`h-full flex ${isDark ? 'bg-true-black' : 'bg-light-bg'}`}>
      {/* Sidebar */}
      <ConversationSidebar
        conversations={conversations}
        selectedConversation={selectedConversation}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onConversationUpdated={(updatedConversation) => {
          // Update conversations list
          setConversations(prev =>
            prev.map(c => c.id === updatedConversation.id ? updatedConversation : c)
          );
          // Update selected conversation if it's the one being edited
          if (selectedConversation?.id === updatedConversation.id) {
            setSelectedConversation(updatedConversation);
          }
        }}
        theme={theme}
      />

      {/* Main Chat Area */}
      <div
        className="flex-1 flex flex-col relative"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drag Overlay */}
        {isDragging && (
          <div className={cn(
            "absolute inset-0 z-50 flex items-center justify-center pointer-events-none",
            isDark ? "bg-black/80" : "bg-white/90"
          )}>
            <div className={cn(
              "flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-dashed",
              isDark
                ? "border-[#0169D9] bg-[#0169D9]/10"
                : "border-[#0169D9] bg-[#0169D9]/5"
            )}>
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center",
                isDark ? "bg-[#0169D9]/20" : "bg-[#0169D9]/10"
              )}>
                <ImageIcon className="w-8 h-8 text-[#0169D9]" />
              </div>
              <div className="text-center">
                <p className={cn(
                  "text-lg font-medium",
                  isDark ? "text-white" : "text-gray-900"
                )}>
                  Solte a imagem aqui
                </p>
                <p className={cn(
                  "text-sm mt-1",
                  isDark ? "text-white/60" : "text-gray-500"
                )}>
                  A imagem será adicionada à sua mensagem
                </p>
              </div>
            </div>
          </div>
        )}
        {/* Header */}
        <header className={cn(
          "h-16 border-b flex items-center justify-between px-4 md:px-6 transition-colors",
          isDark
            ? "bg-black border-white/[0.08]"
            : "bg-white border-zinc-200"
        )}>
          {/* Left side: Mobile Menu + Title */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Mobile Menu Button */}
            {onMobileMenuClick && (
              <button
                onClick={onMobileMenuClick}
                className={cn(
                  "md:hidden h-9 w-9 rounded-lg transition-colors flex items-center justify-center",
                  isDark
                    ? "hover:bg-white/10 text-white/70 hover:text-white"
                    : "hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900"
                )}
                title="Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            {/* Title and Description */}
            <div className="flex-1 md:flex-none">
              <h1 className={cn("text-lg font-semibold", isDark ? "text-white" : "text-zinc-900")}>
                {selectedConversation?.title || 'Assistente IA'}
              </h1>
              <p className={cn("text-xs mt-0.5 hidden sm:block", isDark ? "text-zinc-400" : "text-zinc-600")}>
                Converse com a inteligência artificial
              </p>
            </div>
          </div>

          {/* Center/Right: Model Selector + Config + Import RAG */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Model Selector - só mostra quando há conversa selecionada */}
            {selectedConversation && (
              <div className="hidden md:block">
                <ModelSelector
                  selectedModelId={selectedConversation.model_id || null}
                  onModelChange={handleModelChange}
                  theme={theme}
                  defaultModelId={config?.model_id}
                />
              </div>
            )}

            {/* Config Button */}
            <button
              onClick={() => setShowConfigModal(true)}
              className={cn(
                "h-9 w-9 rounded-lg transition-colors flex items-center justify-center",
                isDark
                  ? "hover:bg-white/10 text-white/70 hover:text-white"
                  : "hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900"
              )}
              title="Configurações da IA"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Copy Conversation Button - só mostra quando há conversa selecionada com mensagens */}
            {selectedConversation && messages.length > 0 && (
              <button
                onClick={handleCopyConversation}
                className={cn(
                  "h-9 w-9 rounded-lg transition-colors flex items-center justify-center",
                  isDark
                    ? "hover:bg-white/10 text-white/70 hover:text-white"
                    : "hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900"
                )}
                title="Copiar conversa em Markdown"
              >
                <Copy className="w-4 h-4" />
              </button>
            )}

            {/* Import to RAG Button - só mostra quando há conversa selecionada com mensagens */}
            {selectedConversation && messages.length > 0 && (
              <button
                onClick={async () => {
                  await importConversation();
                  refreshRagCount();
                }}
                disabled={isImporting}
                className={cn(
                  "h-9 w-9 rounded-lg transition-colors flex items-center justify-center",
                  isImported
                    ? isDark
                      ? "bg-green-500/20 text-green-400"
                      : "bg-green-100 text-green-600"
                    : isDark
                      ? "hover:bg-white/10 text-white/70 hover:text-white"
                      : "hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900",
                  isImporting && "opacity-50 cursor-not-allowed"
                )}
                title={isImported ? "Conversa salva na base de conhecimento" : "Salvar conversa na base de conhecimento"}
              >
                {isImporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isImported ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Database className="w-4 h-4" />
                )}
              </button>
            )}

            {/* Theme Toggle */}
            <button
              onClick={onThemeToggle}
              className={cn(
                "h-9 w-9 rounded-lg transition-colors flex items-center justify-center",
                isDark
                  ? "hover:bg-white/10 text-white/70 hover:text-white"
                  : "hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900"
              )}
              title={isDark ? 'Alternar para modo claro' : 'Alternar para modo escuro'}
            >
              {isDark ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            {/* User Profile */}
            <ProfileMenu theme={theme} onNavigateToSettings={onNavigateToSettings} onManageMembersClick={onManageMembersClick} />
          </div>
        </header>

        {/* Content Area */}
        {(selectedConversation && messages.length > 0) || isStreaming ? (
          <>
            {/* Messages */}
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className={`flex-1 overflow-y-auto px-6 py-4 scroll-smooth scrollbar-thin ${isDark ? 'bg-true-black' : 'bg-light-bg'}`}
            >
              <ChatMessageList
                messages={messages}
                streamingMessage={streamingMessage}
                isStreaming={isStreaming}
                theme={theme}
                onDeleteMessage={handleDeleteMessage}
                searchSteps={searchSteps}
                isSearching={isSearching}
                searchSources={searchSources}
                isThinking={isThinking}
                thinkingContent={thinkingContent}
              />
              <div ref={messagesEndRef} />
            </div>

            {/* Input at bottom */}
            <ChatInput
              onSend={handleSendMessage}
              isStreaming={isStreaming}
              theme={theme}
              onStop={handleStopStreaming}
              ragEnabled={ragEnabled}
              onRagToggle={() => setRagEnabled(!ragEnabled)}
              hasRagDocuments={ragDocCount > 0}
              contextUsage={contextUsage}
              externalImage={droppedImage}
              onClearExternalImage={handleClearDroppedImage}
            />
          </>
        ) : (
          <>
            {/* Centered initial screen (estilo ChatGPT) */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 relative overflow-hidden">
              {/* Simple gradient background */}
              <div
                className="absolute inset-0"
                style={{
                  background: isDark
                    ? 'linear-gradient(135deg, rgba(1, 105, 217, 0.1) 0%, rgba(0, 0, 0, 0) 50%, rgba(0, 207, 250, 0.1) 100%)'
                    : 'linear-gradient(135deg, rgba(1, 105, 217, 0.05) 0%, rgba(255, 255, 255, 0) 50%, rgba(0, 207, 250, 0.05) 100%)'
                }}
              />

              {/* Content */}
              <div className="relative z-10 w-full flex flex-col items-center">
                <h1 className={`text-4xl font-semibold mb-12 text-center ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                  Como posso ajudar você hoje?
                </h1>

                {/* Centered input */}
                <div className="w-full max-w-3xl">
                  <ChatInput
                    onSend={handleSendMessage}
                    isStreaming={isStreaming}
                    theme={theme}
                    centered={true}
                    onStop={handleStopStreaming}
                    ragEnabled={ragEnabled}
                    onRagToggle={() => setRagEnabled(!ragEnabled)}
                    hasRagDocuments={ragDocCount > 0}
                    contextUsage={contextUsage}
                    externalImage={droppedImage}
                    onClearExternalImage={handleClearDroppedImage}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Config Modal */}
      <AIConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        workspaceId={workspaceId}
        theme={theme}
      />
    </div>
  );
}
