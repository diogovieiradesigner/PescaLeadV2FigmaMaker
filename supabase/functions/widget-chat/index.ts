import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-widget-token",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Gerar token simples para validação (não é segurança crítica, só dificulta uso indevido)
function generateWidgetToken(slug: string): string {
  const secret = Deno.env.get("WIDGET_SECRET") || "pesca-lead-widget-2024";
  const data = `${slug}-${secret}`;
  // Simple hash - não é criptograficamente seguro, mas suficiente para dificultar abuso
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function validateWidgetToken(slug: string, token: string): boolean {
  return generateWidgetToken(slug) === token;
}

// Gerar o script do widget
function generateWidgetScript(config: any) {
  const {
    slug,
    token,
    chatTitle,
    chatSubtitle,
    welcomeMessage,
    primaryColor = '#0169D9',
    position = 'right',
    buttonIcon = 'chat',
    buttonText = '',
    buttonIconUrl = '',
    avatarIconUrl = '',
    apiUrl
  } = config;

  return `
(function() {
  // Configurações do Widget - IDs internos não são expostos
  const WIDGET_CONFIG = {
    slug: "${slug}",
    token: "${token}",
    chatTitle: "${chatTitle || 'Assistente Virtual'}",
    chatSubtitle: "${chatSubtitle || ''}",
    welcomeMessage: ${welcomeMessage ? `"${welcomeMessage.replace(/"/g, '\\"')}"` : 'null'},
    primaryColor: "${primaryColor}",
    position: "${position}",
    buttonIcon: "${buttonIcon}",
    buttonText: "${buttonText}",
    buttonIconUrl: "${buttonIconUrl}",
    avatarIconUrl: "${avatarIconUrl}",
    apiUrl: "${apiUrl}"
  };

  // Estilos do Widget
  const styles = \`
    @keyframes pcw-fadeIn {
      from { opacity: 0; transform: translateY(20px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes pcw-fadeOut {
      from { opacity: 1; transform: translateY(0) scale(1); }
      to { opacity: 0; transform: translateY(20px) scale(0.95); }
    }
    @keyframes pcw-bounce {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-5px); }
    }
    @keyframes pcw-pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }

    #pcw-container * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    }

    #pcw-button {
      position: fixed;
      bottom: 24px;
      \${WIDGET_CONFIG.position}: 24px;
      width: \${WIDGET_CONFIG.buttonText ? 'auto' : '60px'};
      height: 60px;
      padding: \${WIDGET_CONFIG.buttonText ? '0 20px' : '0'};
      border-radius: \${WIDGET_CONFIG.buttonText ? '30px' : '50%'};
      background: \${WIDGET_CONFIG.buttonIconUrl ? 'transparent' : 'linear-gradient(135deg, ' + WIDGET_CONFIG.primaryColor + ', ' + WIDGET_CONFIG.primaryColor + 'dd)'};
      border: none;
      cursor: pointer;
      box-shadow: \${WIDGET_CONFIG.buttonIconUrl ? '0 4px 15px rgba(0,0,0,0.25)' : '0 4px 20px ' + WIDGET_CONFIG.primaryColor + '40, 0 2px 10px rgba(0,0,0,0.15)'};
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      z-index: 999998;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
    }

    #pcw-button:hover {
      transform: scale(1.08);
      box-shadow: \${WIDGET_CONFIG.buttonIconUrl ? '0 6px 20px rgba(0,0,0,0.3)' : '0 6px 25px ' + WIDGET_CONFIG.primaryColor + '50, 0 4px 15px rgba(0,0,0,0.2)'};
    }

    #pcw-button:active {
      transform: scale(0.95);
    }

    #pcw-button svg {
      width: 28px;
      height: 28px;
      fill: white;
      transition: transform 0.3s ease;
    }

    #pcw-button:hover svg {
      transform: rotate(-10deg);
    }

    #pcw-button img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }

    #pcw-button:hover img {
      transform: scale(1.05);
    }

    #pcw-button span {
      color: white;
      font-weight: 600;
      font-size: 15px;
      white-space: nowrap;
    }

    #pcw-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      width: 20px;
      height: 20px;
      background: #ef4444;
      border-radius: 50%;
      display: none;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      color: white;
      border: 2px solid white;
      animation: pcw-pulse 2s infinite;
    }

    #pcw-chat {
      position: fixed;
      bottom: 100px;
      \${WIDGET_CONFIG.position}: 24px;
      width: 380px;
      height: 550px;
      max-height: calc(100vh - 140px);
      background: #111;
      border-radius: 20px;
      box-shadow: 0 10px 50px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08);
      display: none;
      flex-direction: column;
      overflow: hidden;
      z-index: 999999;
      animation: pcw-fadeIn 0.3s ease forwards;
    }

    #pcw-chat.pcw-closing {
      animation: pcw-fadeOut 0.2s ease forwards;
    }

    @media (max-width: 440px) {
      #pcw-chat {
        width: calc(100vw - 20px);
        height: calc(100vh - 100px);
        max-height: calc(100vh - 100px);
        bottom: 90px;
        \${WIDGET_CONFIG.position}: 10px;
        border-radius: 16px;
      }
      #pcw-button {
        bottom: 16px;
        \${WIDGET_CONFIG.position}: 16px;
      }
    }

    #pcw-header {
      background: linear-gradient(135deg, #1a1a1a, #222);
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }

    #pcw-header-avatar {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, \${WIDGET_CONFIG.primaryColor}, \${WIDGET_CONFIG.primaryColor}cc);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      box-shadow: 0 4px 12px \${WIDGET_CONFIG.primaryColor}30;
    }

    #pcw-header-avatar svg {
      width: 24px;
      height: 24px;
      fill: white;
    }

    #pcw-header-avatar img {
      width: 100%;
      height: 100%;
      border-radius: 12px;
      object-fit: cover;
    }

    #pcw-header-avatar::after {
      content: '';
      position: absolute;
      bottom: -2px;
      right: -2px;
      width: 14px;
      height: 14px;
      background: #22c55e;
      border-radius: 50%;
      border: 3px solid #1a1a1a;
    }

    #pcw-header-info {
      flex: 1;
    }

    #pcw-header-title {
      color: white;
      font-weight: 600;
      font-size: 16px;
      margin: 0 0 2px;
    }

    #pcw-header-status {
      color: #22c55e;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    #pcw-header-status::before {
      content: '';
      width: 6px;
      height: 6px;
      background: #22c55e;
      border-radius: 50%;
      animation: pcw-pulse 2s infinite;
    }

    #pcw-close {
      width: 36px;
      height: 36px;
      background: rgba(255,255,255,0.08);
      border: none;
      border-radius: 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    #pcw-close:hover {
      background: rgba(255,255,255,0.15);
    }

    #pcw-close svg {
      width: 20px;
      height: 20px;
      stroke: rgba(255,255,255,0.7);
      stroke-width: 2;
      fill: none;
    }

    #pcw-messages {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 100%);
    }

    #pcw-messages::-webkit-scrollbar {
      width: 6px;
    }

    #pcw-messages::-webkit-scrollbar-track {
      background: transparent;
    }

    #pcw-messages::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.15);
      border-radius: 3px;
    }

    .pcw-message {
      max-width: 85%;
      animation: pcw-fadeIn 0.3s ease;
    }

    .pcw-message-sent {
      align-self: flex-end;
    }

    .pcw-message-received {
      align-self: flex-start;
    }

    .pcw-message-bubble {
      padding: 12px 16px;
      border-radius: 18px;
      font-size: 14px;
      line-height: 1.5;
      word-wrap: break-word;
    }

    .pcw-message-sent .pcw-message-bubble {
      background: linear-gradient(135deg, \${WIDGET_CONFIG.primaryColor}, \${WIDGET_CONFIG.primaryColor}dd);
      color: white;
      border-bottom-right-radius: 6px;
      box-shadow: 0 2px 10px \${WIDGET_CONFIG.primaryColor}30;
    }

    .pcw-message-received .pcw-message-bubble {
      background: #222;
      color: rgba(255,255,255,0.9);
      border-bottom-left-radius: 6px;
      border: 1px solid rgba(255,255,255,0.05);
    }

    .pcw-message-time {
      font-size: 10px;
      color: rgba(255,255,255,0.3);
      margin-top: 4px;
      padding: 0 4px;
    }

    .pcw-message-sent .pcw-message-time {
      text-align: right;
    }

    .pcw-typing {
      display: flex;
      gap: 4px;
      padding: 16px;
    }

    .pcw-typing span {
      width: 8px;
      height: 8px;
      background: rgba(255,255,255,0.4);
      border-radius: 50%;
      animation: pcw-bounce 1.4s infinite;
    }

    .pcw-typing span:nth-child(2) { animation-delay: 0.2s; }
    .pcw-typing span:nth-child(3) { animation-delay: 0.4s; }

    #pcw-input-area {
      padding: 16px 20px;
      background: #1a1a1a;
      border-top: 1px solid rgba(255,255,255,0.08);
      display: flex;
      gap: 12px;
      align-items: flex-end;
    }

    #pcw-input {
      flex: 1;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 24px;
      padding: 12px 18px;
      color: white;
      font-size: 14px;
      outline: none;
      resize: none;
      max-height: 120px;
      line-height: 1.4;
      transition: all 0.2s ease;
    }

    #pcw-input::placeholder {
      color: rgba(255,255,255,0.35);
    }

    #pcw-input:focus {
      border-color: \${WIDGET_CONFIG.primaryColor}80;
      box-shadow: 0 0 0 3px \${WIDGET_CONFIG.primaryColor}20;
    }

    #pcw-send {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, \${WIDGET_CONFIG.primaryColor}, \${WIDGET_CONFIG.primaryColor}dd);
      border: none;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      box-shadow: 0 2px 10px \${WIDGET_CONFIG.primaryColor}30;
    }

    #pcw-send:hover:not(:disabled) {
      transform: scale(1.08);
      box-shadow: 0 4px 15px \${WIDGET_CONFIG.primaryColor}40;
    }

    #pcw-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    #pcw-send svg {
      width: 20px;
      height: 20px;
      fill: white;
      margin-left: 2px;
    }

    #pcw-powered {
      text-align: center;
      padding: 8px;
      font-size: 10px;
      color: rgba(255,255,255,0.2);
      background: #111;
    }

    #pcw-powered a {
      color: rgba(255,255,255,0.3);
      text-decoration: none;
    }

    #pcw-powered a:hover {
      color: rgba(255,255,255,0.5);
    }
  \`;

  // HTML do Widget
  const html = \`
    <div id="pcw-container">
      <button id="pcw-button" aria-label="Abrir chat">
        \${WIDGET_CONFIG.buttonIconUrl ?
          '<img id="pcw-icon-custom" src="' + WIDGET_CONFIG.buttonIconUrl + '" alt="Chat" />' :
          '<svg id="pcw-icon-chat" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/><path d="M7 9h10v2H7zm0-3h10v2H7zm0 6h7v2H7z"/></svg>'
        }
        <svg id="pcw-icon-whatsapp" viewBox="0 0 24 24" style="display:\${WIDGET_CONFIG.buttonIconUrl ? 'none' : (WIDGET_CONFIG.buttonIcon === 'whatsapp' ? 'block' : 'none')}">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        \${WIDGET_CONFIG.buttonText ? '<span>' + WIDGET_CONFIG.buttonText + '</span>' : ''}
        <div id="pcw-badge">1</div>
      </button>

      <div id="pcw-chat">
        <div id="pcw-header">
          <div id="pcw-header-avatar">
            \${WIDGET_CONFIG.avatarIconUrl ?
              '<img src="' + WIDGET_CONFIG.avatarIconUrl + '" alt="Avatar" />' :
              '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>'
            }
          </div>
          <div id="pcw-header-info">
            <h3 id="pcw-header-title">\${WIDGET_CONFIG.chatTitle}</h3>
            <div id="pcw-header-status">Online agora</div>
          </div>
          <button id="pcw-close" aria-label="Fechar chat">
            <svg viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div id="pcw-messages"></div>

        <div id="pcw-input-area">
          <textarea id="pcw-input" placeholder="Digite sua mensagem..." rows="1"></textarea>
          <button id="pcw-send" aria-label="Enviar mensagem">
            <svg viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>

        <div id="pcw-powered">
          Powered by <a href="#">AI Assistant</a>
        </div>
      </div>
    </div>
  \`;

  // Widget Class
  class PescaLeadWidget {
    constructor() {
      this.isOpen = false;
      this.isLoading = false;
      this.messages = [];
      this.conversationId = null;
      this.sessionId = this.getOrCreateSessionId();
      this.init();
    }

    getOrCreateSessionId() {
      let sessionId = localStorage.getItem('pcw-session-' + WIDGET_CONFIG.linkId);
      if (!sessionId) {
        sessionId = 'pcw-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('pcw-session-' + WIDGET_CONFIG.linkId, sessionId);
      }
      return sessionId;
    }

    init() {
      // Inject styles
      const styleEl = document.createElement('style');
      styleEl.textContent = styles;
      document.head.appendChild(styleEl);

      // Inject HTML
      const container = document.createElement('div');
      container.innerHTML = html;
      document.body.appendChild(container.firstElementChild);

      // Setup elements
      this.button = document.getElementById('pcw-button');
      this.chat = document.getElementById('pcw-chat');
      this.messagesEl = document.getElementById('pcw-messages');
      this.input = document.getElementById('pcw-input');
      this.sendBtn = document.getElementById('pcw-send');
      this.closeBtn = document.getElementById('pcw-close');
      this.badge = document.getElementById('pcw-badge');

      // Icon setup - só configura SVGs se não tiver ícone customizado
      if (!WIDGET_CONFIG.buttonIconUrl) {
        const chatIcon = document.getElementById('pcw-icon-chat');
        const whatsappIcon = document.getElementById('pcw-icon-whatsapp');
        if (WIDGET_CONFIG.buttonIcon === 'whatsapp') {
          if (chatIcon) chatIcon.style.display = 'none';
          if (whatsappIcon) whatsappIcon.style.display = 'block';
        }
      }

      // Event listeners
      this.button.addEventListener('click', () => this.toggle());
      this.closeBtn.addEventListener('click', () => this.close());
      this.sendBtn.addEventListener('click', () => this.sendMessage());
      this.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
      this.input.addEventListener('input', () => this.autoResize());

      // Welcome message
      if (WIDGET_CONFIG.welcomeMessage) {
        this.addMessage(WIDGET_CONFIG.welcomeMessage, 'received');
      }
    }

    toggle() {
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    }

    open() {
      this.isOpen = true;
      this.chat.style.display = 'flex';
      this.badge.style.display = 'none';
      setTimeout(() => this.input.focus(), 300);
    }

    close() {
      this.chat.classList.add('pcw-closing');
      setTimeout(() => {
        this.chat.style.display = 'none';
        this.chat.classList.remove('pcw-closing');
        this.isOpen = false;
      }, 200);
    }

    autoResize() {
      this.input.style.height = 'auto';
      this.input.style.height = Math.min(this.input.scrollHeight, 120) + 'px';
    }

    addMessage(text, type) {
      const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const msgEl = document.createElement('div');
      msgEl.className = 'pcw-message pcw-message-' + type;
      msgEl.innerHTML = \`
        <div class="pcw-message-bubble">\${this.escapeHtml(text)}</div>
        <div class="pcw-message-time">\${time}</div>
      \`;
      this.messagesEl.appendChild(msgEl);
      this.scrollToBottom();
      return msgEl;
    }

    showTyping() {
      const typingEl = document.createElement('div');
      typingEl.id = 'pcw-typing';
      typingEl.className = 'pcw-message pcw-message-received';
      typingEl.innerHTML = \`
        <div class="pcw-message-bubble pcw-typing">
          <span></span><span></span><span></span>
        </div>
      \`;
      this.messagesEl.appendChild(typingEl);
      this.scrollToBottom();
    }

    hideTyping() {
      const typingEl = document.getElementById('pcw-typing');
      if (typingEl) typingEl.remove();
    }

    scrollToBottom() {
      this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    }

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML.replace(/\\n/g, '<br>');
    }

    async sendMessage() {
      const text = this.input.value.trim();
      if (!text || this.isLoading) return;

      this.input.value = '';
      this.input.style.height = 'auto';
      this.isLoading = true;
      this.sendBtn.disabled = true;

      this.addMessage(text, 'sent');
      this.showTyping();

      try {
        // Usa a própria edge function como proxy - não expõe IDs internos
        const response = await fetch(WIDGET_CONFIG.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Widget-Token': WIDGET_CONFIG.token
          },
          body: JSON.stringify({
            slug: WIDGET_CONFIG.slug,
            message: text,
            conversationId: this.conversationId,
            sessionId: this.sessionId
          })
        });

        const data = await response.json();
        this.hideTyping();

        if (data.success && data.reply) {
          this.addMessage(data.reply, 'received');
          if (data.conversationId) {
            this.conversationId = data.conversationId;
          }
        } else {
          this.addMessage(data.error || 'Desculpe, ocorreu um erro. Tente novamente.', 'received');
        }
      } catch (error) {
        console.error('Widget error:', error);
        this.hideTyping();
        this.addMessage('Erro de conexão. Tente novamente.', 'received');
      } finally {
        this.isLoading = false;
        this.sendBtn.disabled = false;
      }
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new PescaLeadWidget());
  } else {
    new PescaLeadWidget();
  }
})();
`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // POST = proxy para enviar mensagem (não expõe IDs)
  if (req.method === "POST") {
    try {
      const body = await req.json();
      const { slug, message, conversationId, sessionId } = body;
      const token = req.headers.get("X-Widget-Token");

      console.log("[widget-chat] POST message:", { slug, hasMessage: !!message, conversationId });

      if (!slug || !message) {
        return new Response(
          JSON.stringify({ success: false, error: "Parâmetros inválidos" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validar token
      if (!token || !validateWidgetToken(slug, token)) {
        console.error("[widget-chat] Invalid token for slug:", slug);
        return new Response(
          JSON.stringify({ success: false, error: "Token inválido" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Buscar link pelo slug
      const { data: link, error: linkError } = await supabase
        .from("ai_public_chat_links")
        .select("id, agent_id, workspace_id, is_active")
        .eq("public_slug", slug)
        .eq("is_active", true)
        .single();

      if (linkError || !link) {
        return new Response(
          JSON.stringify({ success: false, error: "Widget não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Chamar ai-public-chat com os IDs internos (servidor para servidor)
      const aiPublicChatUrl = `${supabaseUrl}/functions/v1/ai-public-chat`;
      const response = await fetch(aiPublicChatUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({
          linkId: link.id,
          agentId: link.agent_id,
          workspaceId: link.workspace_id,
          message,
          conversationId,
          sessionId
        })
      });

      const result = await response.json();
      return new Response(JSON.stringify(result), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } catch (error: any) {
      console.error("[widget-chat] POST error:", error);
      return new Response(
        JSON.stringify({ success: false, error: "Erro interno" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  // GET = retorna o script do widget
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");

    if (!slug) {
      return new Response(
        JSON.stringify({ error: "Slug parameter required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[widget-chat] GET script for slug:", slug);

    // Buscar configuração do link
    const { data: link, error: linkError } = await supabase
      .from("ai_public_chat_links")
      .select(`
        id,
        agent_id,
        workspace_id,
        public_slug,
        chat_title,
        chat_subtitle,
        welcome_message,
        widget_config,
        widget_button_icon_url,
        widget_avatar_icon_url,
        is_active
      `)
      .eq("public_slug", slug)
      .eq("is_active", true)
      .single();

    if (linkError || !link) {
      console.error("[widget-chat] Link not found:", linkError);
      return new Response(
        JSON.stringify({ error: "Widget not found or inactive" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar nome do agente se não tiver título personalizado
    let chatTitle = link.chat_title;
    if (!chatTitle) {
      const { data: agent } = await supabase
        .from("ai_agents")
        .select("name")
        .eq("id", link.agent_id)
        .single();
      chatTitle = agent?.name || "Assistente Virtual";
    }

    // Gerar token para este slug
    const token = generateWidgetToken(slug);

    // Configurações do widget (pode ser customizado no banco)
    const widgetConfig = link.widget_config || {};

    const config = {
      slug: link.public_slug,
      token,
      chatTitle,
      chatSubtitle: link.chat_subtitle || widgetConfig.subtitle || "",
      welcomeMessage: link.welcome_message,
      primaryColor: widgetConfig.primaryColor || "#0169D9",
      position: widgetConfig.position || "right",
      buttonIcon: widgetConfig.buttonIcon || "chat",
      buttonText: widgetConfig.buttonText || "",
      buttonIconUrl: link.widget_button_icon_url || "",
      avatarIconUrl: link.widget_avatar_icon_url || "",
      apiUrl: `${supabaseUrl}/functions/v1/widget-chat`
    };

    const script = generateWidgetScript(config);

    return new Response(script, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=300" // Cache por 5 minutos
      }
    });

  } catch (error: any) {
    console.error("[widget-chat] GET error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
