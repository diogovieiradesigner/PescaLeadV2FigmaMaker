import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  conversation_id: string;
  message: string;
  workspace_id: string;
  media_url?: string;
  content_type?: 'image' | 'audio';
  use_rag?: boolean; // Quando true, busca no RAG antes de responder
}

interface TranscriptionResult {
  transcription: string;
  status: 'completed' | 'failed' | 'timeout';
}

interface ChutesModelInfo {
  id: string;
  context_length?: number;
  max_model_len?: number;
  max_output_length?: number;
  quantization?: string;
}

// Cache de modelos para evitar chamadas repetidas à API
let modelsCache: ChutesModelInfo[] | null = null;
let modelsCacheTimestamp: number | null = null;
const MODELS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Função para buscar informações do modelo da API Chutes
async function getModelInfo(modelId: string): Promise<ChutesModelInfo | null> {
  try {
    // Verificar cache
    if (modelsCache && modelsCacheTimestamp && Date.now() - modelsCacheTimestamp < MODELS_CACHE_DURATION) {
      const cached = modelsCache.find(m => m.id === modelId);
      if (cached) return cached;
    }

    // Buscar lista de modelos
    const response = await fetch('https://llm.chutes.ai/v1/models');
    if (!response.ok) {
      console.error('Error fetching models:', response.status);
      return null;
    }

    const data = await response.json();
    if (!data.data || !Array.isArray(data.data)) {
      return null;
    }

    // Atualizar cache
    modelsCache = data.data.map((m: any) => ({
      id: m.id,
      context_length: m.context_length,
      max_model_len: m.max_model_len,
      max_output_length: m.max_output_length,
      quantization: m.quantization,
    }));
    modelsCacheTimestamp = Date.now();

    return modelsCache.find(m => m.id === modelId) || null;
  } catch (error) {
    console.error('Error fetching model info:', error);
    return null;
  }
}

// Calcula max_tokens ideal baseado no modelo
function calculateMaxTokens(
  modelInfo: ChutesModelInfo,
  estimatedInputTokens: number
): number {
  // Pegar context length do modelo (API é a fonte da verdade)
  const contextLength = modelInfo.context_length || modelInfo.max_model_len || 32768;

  // max_output_length do modelo (se disponível)
  const modelMaxOutput = modelInfo.max_output_length || Math.floor(contextLength * 0.5);

  // Espaço disponível = contexto total - tokens de input estimados - margem de segurança
  const safetyMargin = 100;
  const availableForOutput = contextLength - estimatedInputTokens - safetyMargin;

  // Usar o menor entre: output disponível e max do modelo
  const maxTokens = Math.min(
    Math.max(availableForOutput, 1024), // Mínimo 1024 tokens de output
    modelMaxOutput
  );

  console.log(`[Model ${modelInfo.id}] context=${contextLength}, maxOutput=${modelMaxOutput}, input~${estimatedInputTokens}, final=${maxTokens}`);

  return maxTokens;
}

// Estima tokens de forma simples (chars/4)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Constantes para gerenciamento de contexto
const CONTEXT_USAGE_THRESHOLD = 0.85; // 85% do contexto para histórico
const SUMMARY_CONTEXT_RATIO = 0.30; // Após sumarização, sumário ocupa 30% do espaço

// Interface para informações de contexto
interface ContextInfo {
  usedTokens: number;
  maxTokens: number;
  usagePercent: number;
  needsSummarization: boolean;
}

// Interface para histórico com sumário
interface HistoryWithSummary {
  messages: Array<{ role: string; content: string }>;
  summary: string | null;
  contextInfo: ContextInfo;
}

// Prompt para sumarização de contexto
const SUMMARIZATION_PROMPT = `Você é um assistente especializado em criar resumos concisos de conversas.

Sua tarefa é resumir a conversa abaixo mantendo:
1. Os pontos principais discutidos
2. Decisões importantes tomadas
3. Informações técnicas relevantes
4. Contexto necessário para continuar a conversa

IMPORTANTE:
- Seja conciso mas completo
- Mantenha nomes, números e dados específicos
- Priorize as informações mais recentes
- Use formato de bullet points quando apropriado
- O resumo será usado como contexto para continuar a conversa

Responda APENAS com o resumo, sem introduções ou explicações.`;

// Função para sumarizar histórico usando a IA
async function summarizeHistory(
  messages: Array<{ role: string; content: string }>,
  modelId: string,
  maxSummaryTokens: number
): Promise<string> {
  const conversationText = messages
    .map(m => `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`)
    .join('\n\n');

  try {
    const response = await fetch('https://llm.chutes.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('CHUTES_API_KEY')}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: SUMMARIZATION_PROMPT },
          { role: 'user', content: `Resuma a seguinte conversa:\n\n${conversationText}` }
        ],
        max_tokens: maxSummaryTokens,
        temperature: 0.3, // Baixa temperatura para resumos mais precisos
      }),
    });

    if (!response.ok) {
      console.error('Error summarizing history:', response.status);
      return '';
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error) {
    console.error('Error in summarizeHistory:', error);
    return '';
  }
}

// Função para carregar histórico com sliding window dinâmica
async function loadHistoryWithSlidingWindow(
  supabaseClient: any,
  conversationId: string,
  modelInfo: ChutesModelInfo | null,
  systemMessageTokens: number,
  currentMessageTokens: number
): Promise<HistoryWithSummary> {
  const contextLength = modelInfo?.context_length || modelInfo?.max_model_len || 32768;
  const maxHistoryTokens = Math.floor(contextLength * CONTEXT_USAGE_THRESHOLD) - systemMessageTokens - currentMessageTokens;

  // Buscar todas as mensagens da conversa (não apenas 10)
  const { data: allMessages } = await supabaseClient
    .from('ai_messages')
    .select('role, content, created_at')
    .eq('conversation_id', conversationId)
    .neq('role', 'system') // Não incluir mensagens de sistema do banco
    .order('created_at', { ascending: false }); // Mais recentes primeiro

  if (!allMessages || allMessages.length === 0) {
    return {
      messages: [],
      summary: null,
      contextInfo: {
        usedTokens: 0,
        maxTokens: maxHistoryTokens,
        usagePercent: 0,
        needsSummarization: false,
      }
    };
  }

  // Calcular tokens de cada mensagem e selecionar até atingir o limite
  const selectedMessages: Array<{ role: string; content: string }> = [];
  let totalTokens = 0;

  for (const msg of allMessages) {
    const msgTokens = estimateTokens(msg.content);

    if (totalTokens + msgTokens > maxHistoryTokens) {
      break; // Atingiu o limite
    }

    selectedMessages.unshift({ role: msg.role, content: msg.content }); // Adiciona no início (ordem cronológica)
    totalTokens += msgTokens;
  }

  const usagePercent = totalTokens / maxHistoryTokens;
  const needsSummarization = usagePercent >= CONTEXT_USAGE_THRESHOLD && allMessages.length > selectedMessages.length;

  return {
    messages: selectedMessages,
    summary: null, // Será preenchido se necessário
    contextInfo: {
      usedTokens: totalTokens,
      maxTokens: maxHistoryTokens,
      usagePercent: Math.min(usagePercent, 1),
      needsSummarization,
    }
  };
}

interface SearchSource {
  title: string;
  url: string;
  content?: string;
  score?: number;
}

// Prompt para decidir se precisa buscar na internet
// IMPORTANTE: Ser CONSERVADOR - buscar apenas quando REALMENTE necessário
const SEARCH_DECISION_PROMPT = `Você é um assistente que decide se uma pergunta REALMENTE requer busca na internet.
SEJA MUITO CONSERVADOR - só busque quando for ABSOLUTAMENTE necessário.

Responda APENAS com JSON válido (sem markdown, sem texto extra):
{"needs_search": true, "search_query": "query otimizada em português"}
ou
{"needs_search": false}

🔴 NÃO BUSQUE (needs_search: false) - A MAIORIA DAS PERGUNTAS:
- Saudações: "oi", "olá", "bom dia", "como vai", "tudo bem"
- Conhecimento geral: matemática, ciências, história, geografia, física, química
- Programação/código: qualquer pergunta técnica de desenvolvimento, bugs, algoritmos
- Tarefas criativas: escrever textos, traduzir, resumir, criar conteúdo
- Perguntas conceituais ou filosóficas
- Dúvidas sobre como fazer algo (receitas, tutoriais, explicações)
- Definições e conceitos estáveis
- Perguntas sobre você mesmo (IA, assistente)
- Qualquer coisa que você SABE responder bem com seu conhecimento

🟢 BUSQUE (needs_search: true) - APENAS CASOS ESPECÍFICOS:
- Notícias/eventos que aconteceram APÓS janeiro de 2025
- Preços ATUAIS e específicos de produtos (ex: "quanto custa iPhone 15 hoje")
- Cotações em tempo real: dólar, bitcoin, ações
- Resultados de jogos/esportes que acabaram de acontecer
- Clima ATUAL de uma cidade específica
- Lançamentos muito recentes (últimos dias/semanas)

⚠️ REGRA DE OURO: Na dúvida, NÃO BUSQUE. A busca deve ser EXCEÇÃO, não regra.
Se você consegue responder razoavelmente bem sem busca, NÃO busque.

Pergunta do usuário: `;

// Função para buscar no Tavily com streaming
async function* searchTavilyStreaming(
  query: string,
  controller: ReadableStreamDefaultController
): AsyncGenerator<{ type: string; data: any }> {
  const TAVILY_API_KEY = Deno.env.get('TAVILY_API_KEY');

  if (!TAVILY_API_KEY) {
    console.error('TAVILY_API_KEY not configured');
    return;
  }

  const startTime = Date.now();

  try {
    // Usar a Search API padrão do Tavily (mais estável que Research)
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: query,
        search_depth: 'advanced',
        include_answer: true,
        include_raw_content: false,
        max_results: 5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Tavily API error:', response.status, errorText);
      yield { type: 'error', data: { message: 'Erro na busca' } };
      return;
    }

    const data = await response.json();
    const duration = (Date.now() - startTime) / 1000;

    // Extrair fontes
    const sources: SearchSource[] = (data.results || []).map((r: any) => ({
      title: r.title || '',
      url: r.url || '',
      content: r.content?.slice(0, 200) || '',
      score: r.score || 0,
    }));

    // Emitir evento de conclusão
    yield {
      type: 'tavily_content',
      data: {
        answer: data.answer || '',
        sources,
        duration,
        query,
      },
    };
  } catch (error) {
    console.error('Tavily search error:', error);
    yield { type: 'error', data: { message: 'Erro ao buscar na internet' } };
  }
}

// Função para decidir se precisa buscar
async function decideSearch(
  message: string,
  modelId: string
): Promise<{ needs_search: boolean; search_query?: string }> {
  try {
    const response = await fetch('https://llm.chutes.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('CHUTES_API_KEY')}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'user', content: SEARCH_DECISION_PROMPT + message }
        ],
        max_tokens: 150,
        temperature: 0.1, // Baixa temperatura para resposta mais determinística
      }),
    });

    if (!response.ok) {
      console.error('Search decision API error:', response.status);
      return { needs_search: false };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Tentar parsear JSON da resposta
    try {
      // Limpar possível markdown
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      const decision = JSON.parse(cleanContent);
      return {
        needs_search: decision.needs_search === true,
        search_query: decision.search_query || message,
      };
    } catch (e) {
      console.error('Failed to parse search decision:', content);
      return { needs_search: false };
    }
  } catch (error) {
    console.error('Search decision error:', error);
    return { needs_search: false };
  }
}

// Helper para enviar evento SSE
function sendSSE(controller: ReadableStreamDefaultController, event: object) {
  const data = JSON.stringify(event);
  controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
}

// Interface para resultado do RAG
interface RagSearchResult {
  success: boolean;
  query: string;
  response: string;
  sources: Array<{ content: string; title: string; uri: string }>;
  context: string;
}

// Função para buscar no RAG do workspace
async function searchRag(
  workspaceId: string,
  query: string,
  authToken: string
): Promise<RagSearchResult | null> {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-assistant-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        action: 'search',
        workspace_id: workspaceId,
        query: query,
      }),
    });

    if (!response.ok) {
      console.error('RAG search failed:', response.status);
      return null;
    }

    const result: RagSearchResult = await response.json();
    return result.success ? result : null;
  } catch (error) {
    console.error('RAG search error:', error);
    return null;
  }
}

// Configuração padrão para transcrição inline
const DEFAULT_IMAGE_PROMPT = `Analise esta imagem em português. Responda de forma clara e concisa:

**TIPO:** [screenshot | documento | foto | outro]

**TEXTO VISÍVEL:**
[Transcreva todo texto que aparece. Se não houver texto, escreva "Nenhum texto visível"]

**DESCRIÇÃO:**
[Descreva o conteúdo em 2-3 frases]`;

// Helper para converter ArrayBuffer para base64 sem estourar a pilha
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192; // Processar em chunks para evitar stack overflow

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }

  return btoa(binary);
}

// Função para descrever imagem usando Gemini Flash (inline, sem fila)
async function describeImageInline(imageUrl: string, apiKey: string): Promise<string> {
  // Baixar a imagem e converter para base64
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Falha ao baixar imagem: ${imageResponse.status}`);
  }

  const imageBuffer = await imageResponse.arrayBuffer();
  const base64Image = arrayBufferToBase64(imageBuffer);
  const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: DEFAULT_IMAGE_PROMPT },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Image
            }
          }
        ]
      }],
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.5
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Gemini vision error:', error);
    throw new Error(`Falha ao analisar imagem: ${response.status}`);
  }

  const result = await response.json();
  return result.candidates?.[0]?.content?.parts?.[0]?.text || '[Imagem sem descrição]';
}

// Função para transcrever áudio usando Groq (inline, sem fila)
async function transcribeAudioInline(audioUrl: string, apiKey: string): Promise<string> {
  // Download do áudio
  const audioResponse = await fetch(audioUrl);
  if (!audioResponse.ok) {
    throw new Error(`Falha ao baixar áudio: ${audioResponse.status}`);
  }
  const audioBlob = await audioResponse.blob();

  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.ogg');
  formData.append('model', 'whisper-large-v3');
  formData.append('language', 'pt');
  formData.append('response_format', 'json');

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    },
    body: formData
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Groq transcription error:', error);
    throw new Error(`Falha na transcrição: ${response.status}`);
  }

  const result = await response.json();
  return result.text || '[Áudio sem transcrição]';
}

// Função para processar mídia INLINE (sem fila) - muito mais rápido
async function processMediaTranscription(
  supabaseClient: any,
  messageId: string,
  conversationId: string,
  mediaUrl: string,
  contentType: 'image' | 'audio',
  controller: ReadableStreamDefaultController,
  apiKeys: { gemini?: string; groq?: string }
): Promise<TranscriptionResult> {
  try {
    // Emitir evento de processamento
    sendSSE(controller, {
      type: 'media_processing',
      content_type: contentType,
      status: 'processing'
    });

    // Atualizar status no banco
    await supabaseClient
      .from('ai_messages')
      .update({ transcription_status: 'processing' })
      .eq('id', messageId);

    let transcription: string;

    // Processar mídia diretamente (sem fila)
    if (contentType === 'image') {
      if (!apiKeys.gemini) {
        throw new Error('GEMINI_API_KEY não configurada no Vault');
      }
      console.log('Processing image inline with Gemini:', mediaUrl);
      transcription = await describeImageInline(mediaUrl, apiKeys.gemini);
    } else {
      if (!apiKeys.groq) {
        throw new Error('GROQ_API_KEY não configurada no Vault');
      }
      console.log('Processing audio inline:', mediaUrl);
      transcription = await transcribeAudioInline(mediaUrl, apiKeys.groq);
    }

    // Salvar transcrição no banco
    await supabaseClient
      .from('ai_messages')
      .update({
        transcription,
        transcription_status: 'completed'
      })
      .eq('id', messageId);

    // Emitir evento de transcrição concluída
    sendSSE(controller, {
      type: 'media_transcribed',
      content_type: contentType,
      transcription
    });

    console.log(`Transcription completed for ${contentType}:`, transcription.slice(0, 100));

    return {
      transcription,
      status: 'completed'
    };

  } catch (error: any) {
    console.error('Error processing media:', error);

    const errorMessage = contentType === 'image'
      ? `[Não foi possível analisar a imagem: ${error.message}]`
      : `[Não foi possível transcrever o áudio: ${error.message}]`;

    // Salvar erro no banco
    await supabaseClient
      .from('ai_messages')
      .update({
        transcription: errorMessage,
        transcription_status: 'failed'
      })
      .eq('id', messageId);

    return {
      transcription: errorMessage,
      status: 'failed'
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user authentication
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request
    const { conversation_id, message, workspace_id, media_url, content_type, use_rag }: ChatRequest = await req.json();

    // Service client para operações que precisam de permissão admin (bypass RLS)
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar API keys do Vault (usando service_role para acessar decrypted_secrets)
    let mediaApiKeys: { gemini?: string; groq?: string } = {};
    if (media_url && content_type) {
      const { data: secrets } = await serviceClient
        .from('decrypted_secrets')
        .select('name, decrypted_secret')
        .in('name', ['GROQ_API_KEY', 'GEMINI_API_KEY', 'groq_api_key', 'gemini_api_key']);

      if (secrets) {
        mediaApiKeys.groq = secrets.find(s => s.name === 'GROQ_API_KEY' || s.name === 'groq_api_key')?.decrypted_secret;
        mediaApiKeys.gemini = secrets.find(s => s.name === 'GEMINI_API_KEY' || s.name === 'gemini_api_key')?.decrypted_secret;
      }
      console.log('[ai-assistant-chat] API Keys found: Groq=' + !!mediaApiKeys.groq + ', Gemini=' + !!mediaApiKeys.gemini);
    }

    // Fetch workspace AI configuration
    const { data: config, error: configError } = await supabaseClient
      .from('ai_configuration')
      .select('*')
      .eq('workspace_id', workspace_id)
      .single();

    if (configError || !config) {
      return new Response(JSON.stringify({ error: 'Configuration not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch conversation to get custom model_id if set
    const { data: conversation } = await supabaseClient
      .from('ai_conversations')
      .select('model_id')
      .eq('id', conversation_id)
      .single();

    // Use conversation model if set, otherwise use config default
    const effectiveModelId = conversation?.model_id || config.model_id;

    // Buscar informações do modelo antes de carregar histórico
    const modelInfo = await getModelInfo(effectiveModelId);
    const contextLength = modelInfo?.context_length || modelInfo?.max_model_len || 32768;

    // Estimar tokens do sistema e mensagem atual
    const systemMessageTokens = estimateTokens(config.system_message);
    const currentMessageTokens = estimateTokens(message || '');

    // Carregar histórico com sliding window dinâmica (85% do contexto)
    const historyResult = await loadHistoryWithSlidingWindow(
      supabaseClient,
      conversation_id,
      modelInfo,
      systemMessageTokens,
      currentMessageTokens
    );

    const history = historyResult.messages;
    const contextInfo = historyResult.contextInfo;

    console.log(`[Context] Model: ${effectiveModelId}, Context: ${contextLength}, Used: ${contextInfo.usedTokens}/${contextInfo.maxTokens} (${Math.round(contextInfo.usagePercent * 100)}%)`);

    // Verificar se precisa sumarizar (atingiu 85% e há mensagens não incluídas)
    let summarizationMessage: string | null = null;

    if (contextInfo.needsSummarization) {
      console.log('[Context] Threshold reached, triggering summarization...');

      // Buscar TODAS as mensagens para sumarizar
      const { data: allMessagesForSummary } = await supabaseClient
        .from('ai_messages')
        .select('role, content')
        .eq('conversation_id', conversation_id)
        .neq('role', 'system')
        .order('created_at', { ascending: true });

      if (allMessagesForSummary && allMessagesForSummary.length > 0) {
        // Sumarizar usando 30% do espaço de contexto
        const maxSummaryTokens = Math.floor(contextInfo.maxTokens * SUMMARY_CONTEXT_RATIO);

        const summary = await summarizeHistory(
          allMessagesForSummary,
          effectiveModelId,
          maxSummaryTokens
        );

        if (summary) {
          // Criar mensagem de sistema com o sumário
          summarizationMessage = `📝 **Contexto Resumido**\n\nDevido ao tamanho da conversa, o histórico foi automaticamente resumido para manter a continuidade:\n\n${summary}\n\n---\n*As mensagens mais recentes foram preservadas integralmente.*`;

          // Salvar o sumário como mensagem de sistema no banco
          await supabaseClient
            .from('ai_messages')
            .insert({
              conversation_id,
              role: 'system',
              content: summarizationMessage,
              tokens_used: 0,
            });

          console.log('[Context] Summary created and saved, length:', summary.length);
        }
      }
    }

    // Save user message to database (with media fields if present)
    const userMessageData: any = {
      conversation_id,
      role: 'user',
      content: message || (content_type === 'image' ? '[Imagem enviada]' : '[Áudio enviado]'),
      tokens_used: 0,
    };

    // Add media fields if present
    if (media_url && content_type) {
      userMessageData.media_url = media_url;
      userMessageData.content_type = content_type;
      userMessageData.transcription_status = 'pending';
    }

    const { data: insertedMessage, error: insertError } = await supabaseClient
      .from('ai_messages')
      .insert(userMessageData)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting user message:', insertError);
    }

    // Create ReadableStream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        let searchContext = '';
        let searchSources: SearchSource[] = [];
        let mediaTranscription = '';

        try {
          // Enviar informações de contexto no início
          sendSSE(controller, {
            type: 'context_info',
            context_length: contextLength,
            used_tokens: contextInfo.usedTokens,
            max_tokens: contextInfo.maxTokens,
            usage_percent: Math.round(contextInfo.usagePercent * 100),
            needs_summarization: contextInfo.needsSummarization,
          });

          // Enviar mensagem de sumarização se foi criada
          if (summarizationMessage) {
            sendSSE(controller, {
              type: 'summarization',
              message: summarizationMessage,
            });
          }

          // FASE 0: Processar mídia se presente (usa serviceClient para bypass RLS)
          if (media_url && content_type && insertedMessage?.id) {
            const transcriptionResult = await processMediaTranscription(
              serviceClient,
              insertedMessage.id,
              conversation_id,
              media_url,
              content_type,
              controller,
              mediaApiKeys
            );

            mediaTranscription = transcriptionResult.transcription;
          }

          // FASE 0.5: Buscar no RAG se habilitado
          let ragContext = '';
          let ragSources: Array<{ content: string; title: string; uri: string }> = [];

          if (use_rag && message) {
            // Emitir evento de busca RAG
            sendSSE(controller, {
              type: 'rag_search_start',
              query: message,
            });

            const authToken = req.headers.get('Authorization')?.replace('Bearer ', '') || '';
            const ragResult = await searchRag(workspace_id, message, authToken);

            if (ragResult) {
              ragContext = ragResult.context || ragResult.response;
              ragSources = ragResult.sources || [];

              console.log('[ai-assistant-chat] RAG result received:', {
                hasContext: !!ragContext,
                contextLength: ragContext?.length,
                sourcesCount: ragSources.length,
              });

              // Emitir evento de conclusão do RAG
              sendSSE(controller, {
                type: 'rag_search_complete',
                has_results: ragSources.length > 0 || !!ragContext,
                sources_count: ragSources.length,
              });
            } else {
              console.log('[ai-assistant-chat] RAG search returned null');
              sendSSE(controller, {
                type: 'rag_search_complete',
                has_results: false,
                sources_count: 0,
              });
            }
          }

          // FASE 1: Decidir se precisa buscar (silenciosamente)
          // Só mostramos eventos de busca se REALMENTE precisar buscar
          const searchDecision = await decideSearch(message, effectiveModelId);

          // FASE 2: Se precisa buscar, usar Tavily
          if (searchDecision.needs_search && searchDecision.search_query) {
            // Só agora enviamos eventos de busca para o frontend
            sendSSE(controller, {
              type: 'search_decision',
              needs_search: true,
              query: searchDecision.search_query,
            });

            sendSSE(controller, {
              type: 'tavily_tool_call',
              tool: 'web_search',
              tool_id: `search_${Date.now()}`,
              query: searchDecision.search_query,
            });

            // Buscar no Tavily
            for await (const event of searchTavilyStreaming(searchDecision.search_query, controller)) {
              if (event.type === 'tavily_content') {
                searchContext = event.data.answer || '';
                searchSources = event.data.sources || [];

                sendSSE(controller, {
                  type: 'tavily_tool_response',
                  tool_id: `search_${Date.now()}`,
                  status: 'completed',
                  duration: event.data.duration,
                });

                sendSSE(controller, {
                  type: 'tavily_content',
                  content: searchContext,
                  sources: searchSources,
                });
              } else if (event.type === 'error') {
                sendSSE(controller, {
                  type: 'tavily_tool_response',
                  tool_id: `search_${Date.now()}`,
                  status: 'failed',
                });
              }
            }
          }

          // FASE 3: Gerar resposta final com contexto da busca e/ou RAG
          let systemMessage = config.system_message;

          // Injetar contexto do RAG se houver
          if (ragContext) {
            console.log('[ai-assistant-chat] Injecting RAG context into system message, length:', ragContext.length);

            // Truncar contexto se muito grande (máx 8000 chars para evitar estourar tokens)
            const truncatedContext = ragContext.length > 8000
              ? ragContext.slice(0, 8000) + '\n\n[... contexto truncado ...]'
              : ragContext;

            const ragSourcesText = ragSources.length > 0
              ? ragSources.map((s, i) => `[R${i + 1}] ${s.title}`).join('\n')
              : 'Conversas anteriores do workspace';

            systemMessage += `\n\n## Conhecimento de Conversas Anteriores

O usuário solicitou consultar a base de conhecimento de conversas anteriores. Aqui está o contexto relevante encontrado:

### Contexto Relevante:
${truncatedContext}

### Conversas Consultadas:
${ragSourcesText}

IMPORTANTE:
- Use este contexto para enriquecer sua resposta
- Se a pergunta for sobre algo discutido anteriormente, baseie-se neste contexto
- Mantenha a formatação Markdown nas suas respostas`;
          }

          // Injetar contexto de busca na web se houver
          if (searchContext && searchSources.length > 0) {
            const sourcesText = searchSources
              .map((s, i) => `[${i + 1}] ${s.title}: ${s.url}`)
              .join('\n');

            systemMessage += `\n\n## Informações da Busca na Internet

O usuário fez uma pergunta que requer informações atualizadas. Aqui está o resultado da busca:

### Resumo da Busca:
${searchContext}

### Fontes:
${sourcesText}

IMPORTANTE:
- Use estas informações para responder de forma precisa e atualizada
- Cite as fontes quando apropriado usando [número]
- Mantenha a formatação Markdown nas suas respostas`;
          }

          // Build user content with media transcription if present
          let userContent = message || '';
          if (mediaTranscription) {
            const mediaPrefix = content_type === 'image'
              ? '🖼️ [IMAGEM ENVIADA]\n\n**Análise da imagem:**\n'
              : '🎤 [ÁUDIO ENVIADO]\n\n**Transcrição do áudio:**\n';

            userContent = mediaPrefix + mediaTranscription + (message ? `\n\n**Mensagem adicional:** ${message}` : '');
          }

          // Build messages array for Chutes API
          const messages = [
            { role: 'system', content: systemMessage },
            ...(history || []),
            { role: 'user', content: userContent },
          ];

          // modelInfo já foi buscado anteriormente, reusar

          // Estimar tokens de input
          const inputText = messages.map(m => m.content).join('\n');
          const estimatedInputTokens = estimateTokens(inputText);

          // Calcular max_tokens baseado no modelo (usa API como fonte da verdade)
          const dynamicMaxTokens = modelInfo
            ? calculateMaxTokens(modelInfo, estimatedInputTokens)
            : 4096; // Fallback mínimo se API falhar

          // Call Chutes.ai API with streaming
          const chutesResponse = await fetch('https://llm.chutes.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('CHUTES_API_KEY')}`,
            },
            body: JSON.stringify({
              model: effectiveModelId, // Usa modelo da conversa ou padrão
              messages,
              stream: true,
              max_tokens: dynamicMaxTokens,
              temperature: config.temperature,
            }),
          });

          if (!chutesResponse.ok) {
            const errorText = await chutesResponse.text();
            console.error('Chutes API error:', chutesResponse.status, errorText);
            throw new Error(`Chutes API error: ${chutesResponse.statusText}`);
          }

          const reader = chutesResponse.body?.getReader();
          const decoder = new TextDecoder();
          let assistantMessage = '';
          let thinkingContent = '';
          let isInsideThink = false;
          let thinkingStarted = false;
          let buffer = ''; // Buffer para lidar com tags parciais

          if (!reader) {
            controller.close();
            return;
          }

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.trim() && line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  const token = parsed.choices[0]?.delta?.content;

                  if (token) {
                    // Adicionar token ao buffer
                    buffer += token;

                    // Processar buffer para detectar tags <think>
                    while (buffer.length > 0) {
                      if (!isInsideThink) {
                        // Procurar por <think>
                        const thinkStart = buffer.indexOf('<think>');
                        if (thinkStart !== -1) {
                          // Enviar conteúdo antes da tag como token normal
                          const beforeThink = buffer.slice(0, thinkStart);
                          if (beforeThink) {
                            assistantMessage += beforeThink;
                            sendSSE(controller, { type: 'token', content: beforeThink });
                          }

                          // Entrar no modo thinking
                          isInsideThink = true;
                          if (!thinkingStarted) {
                            thinkingStarted = true;
                            sendSSE(controller, { type: 'thinking_start' });
                          }
                          buffer = buffer.slice(thinkStart + 7); // Remove '<think>'
                        } else if (buffer.includes('<')) {
                          // Pode ser início de tag, manter no buffer
                          const lastLt = buffer.lastIndexOf('<');
                          const safeContent = buffer.slice(0, lastLt);
                          if (safeContent) {
                            assistantMessage += safeContent;
                            sendSSE(controller, { type: 'token', content: safeContent });
                          }
                          buffer = buffer.slice(lastLt);
                          break; // Aguardar mais dados
                        } else {
                          // Sem tags, enviar tudo
                          assistantMessage += buffer;
                          sendSSE(controller, { type: 'token', content: buffer });
                          buffer = '';
                        }
                      } else {
                        // Estamos dentro de <think>, procurar por </think>
                        const thinkEnd = buffer.indexOf('</think>');
                        if (thinkEnd !== -1) {
                          // Enviar conteúdo thinking
                          const thinkText = buffer.slice(0, thinkEnd);
                          if (thinkText) {
                            thinkingContent += thinkText;
                            sendSSE(controller, { type: 'thinking_token', content: thinkText });
                          }

                          // Sair do modo thinking
                          isInsideThink = false;
                          sendSSE(controller, { type: 'thinking_end' });
                          buffer = buffer.slice(thinkEnd + 8); // Remove '</think>'
                        } else if (buffer.includes('<')) {
                          // Pode ser início de </think>, manter no buffer
                          const lastLt = buffer.lastIndexOf('<');
                          const safeContent = buffer.slice(0, lastLt);
                          if (safeContent) {
                            thinkingContent += safeContent;
                            sendSSE(controller, { type: 'thinking_token', content: safeContent });
                          }
                          buffer = buffer.slice(lastLt);
                          break; // Aguardar mais dados
                        } else {
                          // Sem tags de fechamento, enviar tudo como thinking
                          thinkingContent += buffer;
                          sendSSE(controller, { type: 'thinking_token', content: buffer });
                          buffer = '';
                        }
                      }
                    }
                  }
                } catch (e) {
                  console.error('Parse error:', e);
                }
              }
            }
          }

          // Processar qualquer conteúdo restante no buffer
          if (buffer) {
            if (isInsideThink) {
              thinkingContent += buffer;
              sendSSE(controller, { type: 'thinking_token', content: buffer });
              sendSSE(controller, { type: 'thinking_end' });
            } else {
              assistantMessage += buffer;
              sendSSE(controller, { type: 'token', content: buffer });
            }
          }

          // Save assistant's complete message to database (with sources if available)
          // Nota: Salvamos apenas a resposta final, não o thinking
          if (assistantMessage) {
            const assistantMessageData: any = {
              conversation_id,
              role: 'assistant',
              content: assistantMessage,
              tokens_used: 0,
              // Salvar thinking_content se houver
              ...(thinkingContent && { thinking_content: thinkingContent }),
            };

            // Persistir sources como JSONB se houver
            if (searchSources.length > 0) {
              assistantMessageData.sources = searchSources;
            }

            await supabaseClient.from('ai_messages').insert(assistantMessageData);
          }

          // Send done signal
          sendSSE(controller, { type: 'done', sources: searchSources });
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
