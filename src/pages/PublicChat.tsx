import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Bot, User, KeyRound, MessageCircle, Loader2, RotateCcw, Sparkles } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';

interface Message {
  id: string;
  type: 'sent' | 'received';
  text: string;
  timestamp: Date;
  isLoading?: boolean;
}

interface ChatConfig {
  linkId: string;
  agentId: string;
  workspaceId: string;
  chatTitle: string;
  chatSubtitle?: string;
  welcomeMessage?: string;
}

// Tela de acesso com código
function AccessScreen({
  slug,
  onAccessGranted
}: {
  slug: string;
  onAccessGranted: (config: ChatConfig) => void;
}) {
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleCodeChange = (index: number, value: string) => {
    const newValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (newValue.length <= 1) {
      const newCode = accessCode.split('');
      newCode[index] = newValue;
      setAccessCode(newCode.join(''));

      // Auto-focus próximo input
      if (newValue && index < 2) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !accessCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (accessCode.length !== 3) {
      setError('Digite a senha de 3 caracteres');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: rpcError } = await supabase
        .rpc('validate_public_chat_access', {
          p_slug: slug,
          p_access_code: accessCode
        });

      if (rpcError) throw rpcError;

      if (!data?.success) {
        setError(data?.error || 'Senha incorreta');
        return;
      }

      // Salvar sessão no localStorage
      const sessionId = `public-chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(`chat-session-${slug}`, sessionId);

      onAccessGranted({
        linkId: data.link_id,
        agentId: data.agent_id,
        workspaceId: data.workspace_id,
        chatTitle: data.chat_title,
        chatSubtitle: data.chat_subtitle,
        welcomeMessage: data.welcome_message
      });
    } catch (err: any) {
      console.error('Error validating access:', err);
      setError('Erro ao conectar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#111] to-[#0a0a0a] flex items-center justify-center p-4">
      {/* Background decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0169D9]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative bg-[#1C1C1E]/90 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-8 max-w-md w-full shadow-2xl">
        {/* Gradiente decorativo no topo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-[#0169D9] to-transparent rounded-full" />

        <div className="text-center mb-8">
          <div className="relative w-20 h-20 mx-auto mb-5">
            <div className="absolute inset-0 bg-[#0169D9]/20 rounded-2xl rotate-6" />
            <div className="absolute inset-0 bg-[#0169D9]/30 rounded-2xl -rotate-6" />
            <div className="relative w-full h-full bg-gradient-to-br from-[#0169D9] to-[#0169D9]/80 rounded-2xl flex items-center justify-center shadow-lg shadow-[#0169D9]/20">
              <KeyRound className="w-9 h-9 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Chat de Atendimento</h1>
          <p className="text-white/50 text-sm">Digite a senha de 3 caracteres para acessar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Label da senha */}
          <div className="text-center">
            <span className="text-white/30 text-xs uppercase tracking-widest font-medium">Senha de Acesso</span>
          </div>

          <div className="flex justify-center gap-4">
            {[0, 1, 2].map((index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                maxLength={1}
                value={accessCode[index] || ''}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-16 h-16 text-center text-2xl font-bold bg-black/40 border-2 border-white/10 rounded-xl text-white focus:border-[#0169D9] focus:ring-4 focus:ring-[#0169D9]/20 outline-none transition-all uppercase placeholder-white/20 hover:border-white/20"
                placeholder="•"
              />
            ))}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm text-center animate-shake">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || accessCode.length !== 3}
            className="w-full py-3.5 bg-gradient-to-r from-[#0169D9] to-[#0169D9]/90 hover:from-[#0169D9]/90 hover:to-[#0169D9] disabled:from-white/5 disabled:to-white/5 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#0169D9]/20 disabled:shadow-none"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <MessageCircle className="w-5 h-5" />
                Entrar no Chat
              </>
            )}
          </button>
        </form>

        {/* Powered by */}
        <div className="mt-8 pt-6 border-t border-white/[0.05] text-center">
          <p className="text-white/20 text-xs flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3" />
            Powered by AI Assistant
          </p>
        </div>
      </div>
    </div>
  );
}

// Componente principal do chat
function ChatInterface({ config, onReset }: { config: ChatConfig; onReset: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll para o fim das mensagens
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Mensagem de boas-vindas
  useEffect(() => {
    if (config.welcomeMessage) {
      setMessages([{
        id: 'welcome',
        type: 'received',
        text: config.welcomeMessage,
        timestamp: new Date()
      }]);
    }
  }, [config.welcomeMessage]);

  const handleResetChat = () => {
    // Limpar sessão do localStorage
    const slug = window.location.hash.split('/').pop();
    if (slug) {
      localStorage.removeItem(`chat-session-${slug}`);
    }
    // Voltar para tela de acesso
    onReset();
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'sent',
      text: inputText.trim(),
      timestamp: new Date()
    };

    const loadingMessage: Message = {
      id: `loading-${Date.now()}`,
      type: 'received',
      text: '',
      timestamp: new Date(),
      isLoading: true
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const sessionId = localStorage.getItem(`chat-session-${window.location.pathname.split('/').pop()}`);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/ai-public-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            linkId: config.linkId,
            agentId: config.agentId,
            workspaceId: config.workspaceId,
            message: userMessage.text,
            conversationId,
            sessionId
          })
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erro ao processar mensagem');
      }

      // Salvar conversationId para próximas mensagens
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      // Atualizar mensagem de loading com resposta
      setMessages(prev => prev.map(msg =>
        msg.isLoading
          ? { ...msg, text: data.reply || 'Mensagem recebida.', isLoading: false }
          : msg
      ));
    } catch (err: any) {
      console.error('Error sending message:', err);
      setMessages(prev => prev.map(msg =>
        msg.isLoading
          ? { ...msg, text: 'Desculpe, ocorreu um erro. Tente novamente.', isLoading: false }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#111] to-[#0a0a0a] flex items-center justify-center p-4">
      {/* Background decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-[#0169D9]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative bg-[#1C1C1E]/90 backdrop-blur-xl border border-white/[0.08] rounded-3xl w-full max-w-2xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-[#1C1C1E] to-[#2C2C2E] border-b border-white/[0.08] p-4">
          {/* Linha decorativa */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#0169D9]/30 to-transparent" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-[#0169D9] to-[#0169D9]/70 rounded-xl flex items-center justify-center shadow-lg shadow-[#0169D9]/20">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                {/* Indicador online */}
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#1C1C1E]" />
              </div>
              <div>
                <h1 className="text-white font-semibold text-lg">{config.chatTitle}</h1>
                {config.chatSubtitle ? (
                  <p className="text-white/40 text-sm">{config.chatSubtitle}</p>
                ) : (
                  <p className="text-green-400/80 text-xs flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    Online agora
                  </p>
                )}
              </div>
            </div>

            {/* Botão de reiniciar chat */}
            <button
              onClick={handleResetChat}
              className="p-2.5 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-all group"
              title="Reiniciar conversa"
            >
              <RotateCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4 bg-gradient-to-b from-black/40 to-black/60">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-16 h-16 bg-[#0169D9]/10 rounded-2xl flex items-center justify-center mb-4">
                <MessageCircle className="w-8 h-8 text-[#0169D9]/50" />
              </div>
              <p className="text-white/30 text-sm">Envie uma mensagem para iniciar a conversa</p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'sent' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
            >
              <div className={`flex items-end gap-2 max-w-[85%] ${message.type === 'sent' ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  message.type === 'sent'
                    ? 'bg-[#0169D9]/20'
                    : 'bg-gradient-to-br from-white/10 to-white/5'
                }`}>
                  {message.type === 'sent'
                    ? <User className="w-4 h-4 text-[#0169D9]" />
                    : <Bot className="w-4 h-4 text-white/60" />
                  }
                </div>

                {/* Bolha da mensagem */}
                <div className="flex flex-col gap-1">
                  <div className={`rounded-2xl px-4 py-3 ${
                    message.type === 'sent'
                      ? 'bg-gradient-to-br from-[#0169D9] to-[#0157b8] text-white rounded-br-md shadow-lg shadow-[#0169D9]/20'
                      : 'bg-[#2C2C2E] text-white/90 rounded-bl-md border border-white/[0.05]'
                  }`}>
                    {message.isLoading ? (
                      <div className="flex items-center gap-1.5 py-1 px-2">
                        <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{message.text}</p>
                    )}
                  </div>
                  {/* Timestamp */}
                  {!message.isLoading && (
                    <span className={`text-[10px] text-white/20 px-1 ${message.type === 'sent' ? 'text-right' : 'text-left'}`}>
                      {formatTime(message.timestamp)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="relative border-t border-white/[0.08] p-4 bg-[#1C1C1E]">
          {/* Linha decorativa */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#0169D9]/20 to-transparent" />

          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua mensagem..."
                disabled={isLoading}
                className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:border-[#0169D9]/50 focus:ring-2 focus:ring-[#0169D9]/20 outline-none transition-all disabled:opacity-50 pr-12"
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !inputText.trim()}
              className="p-3.5 bg-gradient-to-r from-[#0169D9] to-[#0169D9]/90 hover:from-[#0169D9]/90 hover:to-[#0169D9] disabled:from-white/5 disabled:to-white/5 disabled:cursor-not-allowed rounded-xl text-white transition-all shadow-lg shadow-[#0169D9]/20 disabled:shadow-none"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Powered by */}
          <div className="mt-3 text-center">
            <p className="text-white/15 text-[10px] flex items-center justify-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              Powered by AI Assistant
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Página principal
export function PublicChat({ slug }: { slug: string }) {
  const [chatConfig, setChatConfig] = useState<ChatConfig | null>(null);

  const handleReset = () => {
    setChatConfig(null);
  };

  if (!slug) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#111] to-[#0a0a0a] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Link inválido</h1>
          <p className="text-white/40">O link que você acessou não é válido.</p>
        </div>
      </div>
    );
  }

  if (!chatConfig) {
    return <AccessScreen slug={slug} onAccessGranted={setChatConfig} />;
  }

  return <ChatInterface config={chatConfig} onReset={handleReset} />;
}

export default PublicChat;
