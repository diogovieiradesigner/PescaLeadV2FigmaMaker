import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  DATA_TOOL_DEFINITIONS,
  executeDataTool,
  formatToolResultForLLM,
  DataToolCallResult,
} from './data-tools.ts';

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
  use_rag?: boolean; // Quando true, busca no RAG do workspace (conversas anteriores)
  use_agent_rag?: boolean; // Quando true, busca no RAG do agente (documentos)
  use_web_search?: boolean; // Quando true, força busca na internet via Tavily
}

interface TranscriptionResult {
  transcription: string;
  status: 'completed' | 'failed' | 'timeout';
  source?: 'native' | 'gemini'; // 'native' = modelo Chutes multimodal, 'gemini' = API Gemini
}

interface ChutesModelInfo {
  id: string;
  context_length?: number;
  max_model_len?: number;
  max_output_length?: number;
  quantization?: string;
  input_modalities?: string[]; // ['text', 'image'] para modelos multimodais
}

// Cache de modelos para evitar chamadas repetidas à API
let modelsCache: ChutesModelInfo[] | null = null;
let modelsCacheTimestamp: number | null = null;
const MODELS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Verifica se o modelo suporta imagens nativamente
function modelSupportsImages(modelInfo: ChutesModelInfo | null): boolean {
  return modelInfo?.input_modalities?.includes('image') ?? false;
}

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

    // Atualizar cache (agora inclui input_modalities para suporte multimodal)
    modelsCache = data.data.map((m: any) => ({
      id: m.id,
      context_length: m.context_length,
      max_model_len: m.max_model_len,
      max_output_length: m.max_output_length,
      quantization: m.quantization,
      input_modalities: m.input_modalities, // ['text', 'image'] para modelos multimodais
    }));
    modelsCacheTimestamp = Date.now();

    return modelsCache.find(m => m.id === modelId) || null;
  } catch (error) {
    console.error('Error fetching model info:', error);
    return null;
  }
}

// Limites da API da Chutes.ai para max_completion_tokens
const CHUTES_API_LIMITS = {
  NON_STREAMING: 8192,   // Máximo para stream: false
  STREAMING: 65536,      // Máximo para stream: true
};

// Lista de modelos "Thinking" que são muito lentos para chamadas não-streaming
// Esses modelos podem demorar muito para responder e causar timeout no Edge Function
const SLOW_THINKING_MODELS = [
  'Thinking',           // Qualquer modelo com "Thinking" no nome
  'DeepSeek-R1',        // Modelos DeepSeek R1 são lentos
  'o1-',                // OpenAI o1 models
  'o3-',                // OpenAI o3 models
];

// Modelo rápido para detecção de tool calls
// Usa a versão Instruct mais recente (2507) com TEE para melhor performance em tool calling
const FAST_TOOL_DETECTION_MODEL = 'Qwen/Qwen3-235B-A22B-Instruct-2507-TEE';

// Verifica se o modelo é um "Thinking model" lento
function isSlowThinkingModel(modelId: string): boolean {
  return SLOW_THINKING_MODELS.some(pattern => modelId.includes(pattern));
}

// Calcula max_tokens ideal baseado no modelo
function calculateMaxTokens(
  modelInfo: ChutesModelInfo,
  estimatedInputTokens: number,
  isStreaming: boolean = true // Por padrão assume streaming (limite maior)
): number {
  // Pegar context length e max output do modelo (API é a fonte da verdade)
  const contextLength = modelInfo.context_length || modelInfo.max_model_len || 32768;
  const modelMaxOutput = modelInfo.max_output_length || 8192; // Fallback conservador

  // Margem de segurança MUITO maior (40% do input + 2000 fixo)
  // A estimativa chars/3 ainda pode errar em até 30%
  const safetyMargin = Math.max(2000, Math.floor(estimatedInputTokens * 0.4));

  // Espaço disponível = contexto total - tokens de input estimados - margem
  // Isso garante que input + output <= context_length
  const availableForOutput = contextLength - estimatedInputTokens - safetyMargin;

  // Se o modelo tem max_output_length == context_length, é um bug na API
  // Nesse caso, limitamos o output a no máximo 40% do contexto (mais conservador)
  const effectiveMaxOutput = modelMaxOutput >= contextLength
    ? Math.floor(contextLength * 0.4)
    : Math.min(modelMaxOutput, Math.floor(contextLength * 0.5));

  // Usar o menor entre: espaço disponível no contexto e limite efetivo de output
  // Mínimo de 1024 tokens, máximo de effectiveMaxOutput
  const maxTokens = Math.min(
    Math.max(availableForOutput, 1024),
    effectiveMaxOutput
  );

  // Limite absoluto: nunca pedir mais que context - input estimado - margem mínima
  const absoluteMax = Math.max(1024, contextLength - estimatedInputTokens - 2000);
  let finalMaxTokens = Math.min(maxTokens, absoluteMax);

  // CRÍTICO: Aplicar limite da API da Chutes.ai
  // A API rejeita requests com max_completion_tokens maior que esses limites
  const apiLimit = isStreaming ? CHUTES_API_LIMITS.STREAMING : CHUTES_API_LIMITS.NON_STREAMING;
  finalMaxTokens = Math.min(finalMaxTokens, apiLimit);

  console.log(`[Model ${modelInfo.id}] context=${contextLength}, modelMax=${modelMaxOutput}, effectiveMax=${effectiveMaxOutput}, input~${estimatedInputTokens}, margin=${safetyMargin}, available=${availableForOutput}, absoluteMax=${absoluteMax}, apiLimit=${apiLimit}(${isStreaming ? 'streaming' : 'non-streaming'}), final=${finalMaxTokens}`);

  return finalMaxTokens;
}

// Estima tokens de forma mais conservadora (chars/3 em vez de chars/4)
// Tokenizers reais geralmente geram mais tokens que a estimativa otimista
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3);
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

// ============================================================================
// MCP TOOL CALLING TYPES AND FUNCTIONS
// ============================================================================

interface McpTool {
  server_id: string;
  server_name: string;
  tool_name: string;
  description?: string;
  input_schema?: Record<string, unknown>;
}

interface McpToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface McpToolResult {
  tool_call_id: string;
  role: 'tool';
  content: string;
}

// Helper para normalizar tool call IDs para APIs que exigem 9 caracteres alfanuméricos
// Alguns provedores (como Chutes/DeepSeek) exigem IDs com exatamente 9 caracteres
function normalizeToolCallId(originalId: string): string {
  // Se já tem 9 caracteres alfanuméricos, retorna como está
  if (/^[a-zA-Z0-9]{9}$/.test(originalId)) {
    return originalId;
  }

  // Caso contrário, gera um hash simples de 9 caracteres baseado no ID original
  // Isso garante que o mesmo ID original sempre gere o mesmo ID normalizado
  let hash = 0;
  for (let i = 0; i < originalId.length; i++) {
    const char = originalId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Converte para base36 (0-9, a-z) e pega 9 caracteres
  const base36 = Math.abs(hash).toString(36);
  const padded = base36.padStart(9, '0').slice(0, 9);

  return padded;
}

// Helper para fazer fetch com retry automático em caso de 429 (rate limit)
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3,
  initialDelayMs: number = 2000
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Se não for 429, retorna a resposta (mesmo que seja erro)
      if (response.status !== 429) {
        return response;
      }

      // É 429, vamos fazer retry
      const retryAfter = response.headers.get('Retry-After');
      const delayMs = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : initialDelayMs * Math.pow(2, attempt); // Exponential backoff

      console.log(`[fetchWithRetry] Rate limited (429), attempt ${attempt + 1}/${maxRetries}, waiting ${delayMs}ms...`);

      // Aguardar antes do próximo retry
      await new Promise(resolve => setTimeout(resolve, delayMs));

    } catch (error) {
      lastError = error as Error;
      console.error(`[fetchWithRetry] Network error on attempt ${attempt + 1}:`, error);

      // Para erros de rede, também fazer retry com backoff
      if (attempt < maxRetries - 1) {
        const delayMs = initialDelayMs * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  // Se chegou aqui, todas as tentativas falharam
  throw lastError || new Error('All retry attempts failed due to rate limiting');
}

// Carrega ferramentas MCP habilitadas do workspace
async function loadEnabledMcpTools(
  workspaceId: string,
  authToken: string
): Promise<McpTool[]> {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/mcp-manager`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        action: 'get_enabled_tools',
        workspace_id: workspaceId,
      }),
    });

    if (!response.ok) {
      console.error('[MCP] Error loading tools:', response.status);
      return [];
    }

    const data = await response.json();
    console.log('[MCP] Loaded tools:', data.tools?.length || 0);
    return data.tools || [];
  } catch (error) {
    console.error('[MCP] Error loading enabled tools:', error);
    return [];
  }
}

// Converte ferramentas MCP para formato OpenAI tools
function convertMcpToolsToOpenAI(tools: McpTool[]): Array<{
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}> {
  return tools.map((tool) => {
    // Formato: mcp_{server_id_short}_{tool_name}
    const cleanServerId = tool.server_id.replace(/-/g, '').slice(0, 8);
    const cleanToolName = tool.tool_name.replace(/[^a-zA-Z0-9_]/g, '_');
    const formattedName = `mcp_${cleanServerId}_${cleanToolName}`;

    return {
      type: 'function' as const,
      function: {
        name: formattedName,
        description: `[${tool.server_name}] ${tool.description || tool.tool_name}`,
        parameters: tool.input_schema || {
          type: 'object',
          properties: {},
        },
      },
    };
  });
}

// Extrai server_id e tool_name de um nome formatado
function parseMcpToolName(formattedName: string): { serverId: string; toolName: string } | null {
  const match = formattedName.match(/^mcp_([a-f0-9]+)_(.+)$/);
  if (!match) return null;
  return {
    serverId: match[1],
    toolName: match[2],
  };
}

// Encontra o server_id completo a partir do prefixo
function findFullServerId(shortId: string, tools: McpTool[]): string | null {
  for (const tool of tools) {
    const cleanId = tool.server_id.replace(/-/g, '').slice(0, 8);
    if (cleanId === shortId) {
      return tool.server_id;
    }
  }
  return null;
}

// Verifica se há ferramentas MCP relevantes para a pergunta do usuário
// Isso é usado para decidir se devemos pular a busca web e deixar o LLM usar MCP
function checkMcpToolsRelevance(userMessage: string, tools: McpTool[]): boolean {
  if (!userMessage || tools.length === 0) return false;

  const messageLower = userMessage.toLowerCase();

  // Palavras-chave que indicam que a pergunta é sobre recursos externos
  // Mapeadas para nomes de servidores MCP comuns
  // IMPORTANTE: Usar keywords específicos que indicam claramente o serviço
  // Evitar keywords genéricos que podem dar false positives
  const serverKeywords: Record<string, string[]> = {
    // GitHub - apenas keywords específicos do GitHub
    'github': ['github', 'repositório', 'repository', 'pull request', 'commit', 'branch', 'fork', 'gist'],
    // Notion
    'notion': ['notion', 'notion page', 'notion database'],
    // Slack
    'slack': ['slack', 'slack channel', 'slack message'],
    // Google
    'google': ['google drive', 'google docs', 'google sheets', 'google calendar'],
    // Salesforce
    'salesforce': ['salesforce', 'opportunity', 'salesforce lead'],
    // Linear
    'linear': ['linear', 'linear issue', 'linear project'],
    // Jira
    'jira': ['jira', 'jira ticket', 'jira sprint'],
    // REMOVIDO: Keywords genéricos que causavam false positives
    // 'generic': ['liste', 'busque', 'procure', 'encontre', 'mostre', 'list', 'search', 'find', 'show', 'get'],
  };

  // Verificar se a mensagem contém palavras-chave relacionadas aos servidores MCP disponíveis
  for (const tool of tools) {
    const serverNameLower = tool.server_name.toLowerCase();
    const toolNameLower = tool.tool_name.toLowerCase();
    const descriptionLower = (tool.description || '').toLowerCase();

    // Verificar correspondência direta com nome do servidor
    for (const [serverType, keywords] of Object.entries(serverKeywords)) {
      // Se o servidor MCP corresponde ao tipo
      if (serverNameLower.includes(serverType) || toolNameLower.includes(serverType)) {
        // Verificar se a mensagem contém alguma palavra-chave desse tipo
        for (const keyword of keywords) {
          if (messageLower.includes(keyword)) {
            console.log(`[MCP] Found relevant tool: ${tool.tool_name} for keyword: ${keyword}`);
            return true;
          }
        }
      }
    }

    // NOTA: Removida a lógica de match genérico com palavras do nome/descrição da ferramenta
    // Essa lógica causava muitos false positives (ex: "extraia" matchando com "get_me")
    // Agora só usamos keywords explícitos definidos acima
  }

  return false;
}

// Executa uma ferramenta MCP
async function executeMcpTool(
  serverId: string,
  toolName: string,
  args: Record<string, unknown>,
  authToken: string,
  conversationId?: string,
  messageId?: string
): Promise<{ success: boolean; result?: unknown; error?: string; execution_time_ms?: number }> {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const startTime = Date.now();

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/mcp-manager`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        action: 'execute_tool',
        server_id: serverId,
        tool_name: toolName,
        arguments: args,
        conversation_id: conversationId,
        message_id: messageId,
      }),
    });

    const executionTime = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      console.error('[MCP] Tool execution error:', errorData);
      return {
        success: false,
        error: errorData.error || `HTTP ${response.status}`,
        execution_time_ms: executionTime,
      };
    }

    const data = await response.json();
    console.log('[MCP] Tool executed successfully:', toolName, 'in', executionTime, 'ms');

    return {
      success: true,
      result: data.result,
      execution_time_ms: executionTime,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('[MCP] Tool execution exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      execution_time_ms: executionTime,
    };
  }
}

// Processa tool calls do LLM e retorna resultados
// Record de uma MCP tool call executada (para persistir no banco)
interface ExecutedMcpToolCall {
  id: string;
  server_id: string;
  server_name: string;
  tool_name: string;
  arguments: Record<string, unknown>;
  status: 'completed' | 'failed';
  result?: unknown;
  error?: string;
  execution_time_ms?: number;
}

// Record de uma Data Tool call executada (para persistir no banco)
interface ExecutedDataToolCall {
  id: string;
  tool_name: string;
  arguments: Record<string, unknown>;
  status: 'completed' | 'failed';
  result?: unknown;
  error?: string;
  execution_time_ms?: number;
}

interface ProcessMcpToolCallsResult {
  toolResults: McpToolResult[];
  executedCalls: ExecutedMcpToolCall[];
}

interface ProcessDataToolCallsResult {
  toolResults: McpToolResult[];
  executedCalls: ExecutedDataToolCall[];
}

// Lista de nomes de Data Tools para identificação
// Simplificado: apenas 2 tools (get_schema e execute_query)
const DATA_TOOL_NAMES = [
  'get_schema',
  'execute_query',
];

// Verifica se uma tool call é uma Data Tool
function isDataToolCall(toolName: string): boolean {
  return DATA_TOOL_NAMES.includes(toolName);
}

async function processMcpToolCalls(
  toolCalls: McpToolCall[],
  mcpTools: McpTool[],
  authToken: string,
  conversationId: string,
  controller: ReadableStreamDefaultController
): Promise<ProcessMcpToolCallsResult> {
  const results: McpToolResult[] = [];
  const executedCalls: ExecutedMcpToolCall[] = [];
  const MAX_TOOL_CALLS = 10; // Limite de segurança

  // Limitar número de tool calls
  const limitedToolCalls = toolCalls.slice(0, MAX_TOOL_CALLS);

  for (const toolCall of limitedToolCalls) {
    const parsed = parseMcpToolName(toolCall.function.name);

    if (!parsed) {
      console.warn('[MCP] Could not parse tool name:', toolCall.function.name);
      results.push({
        tool_call_id: normalizeToolCallId(toolCall.id),
        role: 'tool',
        content: JSON.stringify({ error: 'Invalid MCP tool name format' }),
      });
      continue;
    }

    // Encontrar server_id completo
    const fullServerId = findFullServerId(parsed.serverId, mcpTools);
    if (!fullServerId) {
      console.warn('[MCP] Could not find server for id prefix:', parsed.serverId);
      results.push({
        tool_call_id: normalizeToolCallId(toolCall.id),
        role: 'tool',
        content: JSON.stringify({ error: 'MCP server not found' }),
      });
      continue;
    }

    // Encontrar nome do servidor
    const serverInfo = mcpTools.find(t => t.server_id === fullServerId);
    const serverName = serverInfo?.server_name || 'MCP Server';

    // Parse arguments
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(toolCall.function.arguments || '{}');
    } catch (e) {
      console.error('[MCP] Error parsing tool arguments:', e);
    }

    // Emitir evento SSE de início
    console.log('[MCP] Emitting mcp_tool_call SSE event:', { server_name: serverName, tool_name: parsed.toolName });
    sendSSE(controller, {
      type: 'mcp_tool_call',
      server_id: fullServerId,
      server_name: serverName,
      tool_name: parsed.toolName,
      arguments: args,
    });

    // Executar ferramenta
    const execResult = await executeMcpTool(
      fullServerId,
      parsed.toolName,
      args,
      authToken,
      conversationId
    );

    // Emitir evento SSE de resultado
    console.log('[MCP] Emitting mcp_tool_result SSE event:', { server_name: serverName, tool_name: parsed.toolName, success: execResult.success });
    sendSSE(controller, {
      type: 'mcp_tool_result',
      server_id: fullServerId,
      server_name: serverName,
      tool_name: parsed.toolName,
      success: execResult.success,
      result: execResult.result,
      error: execResult.error,
      execution_time_ms: execResult.execution_time_ms,
    });

    // Salvar para persistência no banco
    executedCalls.push({
      id: toolCall.id,
      server_id: fullServerId,
      server_name: serverName,
      tool_name: parsed.toolName,
      arguments: args,
      status: execResult.success ? 'completed' : 'failed',
      result: execResult.result,
      error: execResult.error,
      execution_time_ms: execResult.execution_time_ms,
    });

    // Adicionar resultado para continuar conversa
    results.push({
      tool_call_id: normalizeToolCallId(toolCall.id),
      role: 'tool',
      content: JSON.stringify(execResult.success ? execResult.result : { error: execResult.error }),
    });
  }

  return { toolResults: results, executedCalls };
}

// Processa Data Tool calls (ferramentas internas do workspace)
async function processDataToolCalls(
  toolCalls: McpToolCall[],
  supabaseClient: ReturnType<typeof createClient>,
  workspaceId: string,
  userId: string,
  conversationId: string,
  controller: ReadableStreamDefaultController
): Promise<ProcessDataToolCallsResult> {
  const results: McpToolResult[] = [];
  const executedCalls: ExecutedDataToolCall[] = [];
  const MAX_TOOL_CALLS = 10;

  const limitedToolCalls = toolCalls.slice(0, MAX_TOOL_CALLS);

  for (const toolCall of limitedToolCalls) {
    const toolName = toolCall.function.name;

    // Parse arguments
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(toolCall.function.arguments || '{}');
    } catch (e) {
      console.error('[Data Tools] Error parsing tool arguments:', e);
    }

    // Emitir evento SSE de início
    console.log('[Data Tools] Emitting data_tool_call SSE event:', { tool_name: toolName });
    sendSSE(controller, {
      type: 'data_tool_call',
      tool_name: toolName,
      arguments: args,
    });

    // Executar ferramenta
    const execResult = await executeDataTool(
      supabaseClient,
      workspaceId,
      userId,
      toolName,
      args,
      conversationId
    );

    // Emitir evento SSE de resultado
    console.log('[Data Tools] Emitting data_tool_result SSE event:', { tool_name: toolName, success: execResult.success });
    sendSSE(controller, {
      type: 'data_tool_result',
      tool_name: toolName,
      success: execResult.success,
      data_count: execResult.count,
      error: execResult.error,
      execution_time_ms: execResult.executionTimeMs,
    });

    // Salvar para persistência
    executedCalls.push({
      id: toolCall.id,
      tool_name: toolName,
      arguments: args,
      status: execResult.success ? 'completed' : 'failed',
      result: execResult.data,
      error: execResult.error,
      execution_time_ms: execResult.executionTimeMs,
    });

    // Formatar resultado para o LLM
    const formattedResult = formatToolResultForLLM(toolName, execResult);

    // Adicionar resultado para continuar conversa
    results.push({
      tool_call_id: normalizeToolCallId(toolCall.id),
      role: 'tool',
      content: formattedResult,
    });
  }

  return { toolResults: results, executedCalls };
}

// Processa todas as tool calls (MCP + Data Tools)
async function processAllToolCalls(
  toolCalls: McpToolCall[],
  mcpTools: McpTool[],
  supabaseClient: ReturnType<typeof createClient>,
  workspaceId: string,
  userId: string,
  authToken: string,
  conversationId: string,
  controller: ReadableStreamDefaultController,
  dataToolsEnabled: boolean
): Promise<{
  toolResults: McpToolResult[];
  executedMcpCalls: ExecutedMcpToolCall[];
  executedDataCalls: ExecutedDataToolCall[];
}> {
  // Separar tool calls por tipo
  const mcpToolCalls: McpToolCall[] = [];
  const dataToolCalls: McpToolCall[] = [];

  for (const toolCall of toolCalls) {
    if (dataToolsEnabled && isDataToolCall(toolCall.function.name)) {
      dataToolCalls.push(toolCall);
    } else {
      mcpToolCalls.push(toolCall);
    }
  }

  let allResults: McpToolResult[] = [];
  let executedMcpCalls: ExecutedMcpToolCall[] = [];
  let executedDataCalls: ExecutedDataToolCall[] = [];

  // Processar Data Tool calls
  if (dataToolCalls.length > 0) {
    console.log('[Tool Processing] Processing', dataToolCalls.length, 'Data Tool call(s)');
    const dataResult = await processDataToolCalls(
      dataToolCalls,
      supabaseClient,
      workspaceId,
      userId,
      conversationId,
      controller
    );
    allResults = [...allResults, ...dataResult.toolResults];
    executedDataCalls = dataResult.executedCalls;
  }

  // Processar MCP Tool calls
  if (mcpToolCalls.length > 0) {
    console.log('[Tool Processing] Processing', mcpToolCalls.length, 'MCP Tool call(s)');
    const mcpResult = await processMcpToolCalls(
      mcpToolCalls,
      mcpTools,
      authToken,
      conversationId,
      controller
    );
    allResults = [...allResults, ...mcpResult.toolResults];
    executedMcpCalls = mcpResult.executedCalls;
  }

  return { toolResults: allResults, executedMcpCalls, executedDataCalls };
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
      // Primeiro, tentar extrair JSON diretamente (pode estar antes ou depois do <think>)
      const jsonMatch = content.match(/\{[^{}]*"needs_search"[^{}]*\}/);
      if (jsonMatch) {
        const decision = JSON.parse(jsonMatch[0]);
        return {
          needs_search: decision.needs_search === true,
          search_query: decision.search_query || message,
        };
      }

      // Fallback: limpar tags e tentar novamente
      let cleanContent = content
        .replace(/```json\n?|\n?```/g, '')
        .replace(/<think>[\s\S]*?<\/think>/g, '') // Remove blocos <think>...</think>
        .replace(/<think>[\s\S]*/g, '') // Remove <think> sem fechamento (no final)
        .trim();

      // Extrair qualquer JSON restante
      const fallbackMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (fallbackMatch) {
        cleanContent = fallbackMatch[0];
      }

      const decision = JSON.parse(cleanContent);
      return {
        needs_search: decision.needs_search === true,
        search_query: decision.search_query || message,
      };
    } catch (e) {
      // Se não conseguiu parsear, assume que não precisa buscar
      console.warn('Could not parse search decision, defaulting to no search. Content preview:', content.substring(0, 100));
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

// Função para buscar no RAG do agente (documentos)
async function searchAgentRag(
  agentId: string,
  query: string,
  authToken: string
): Promise<RagSearchResult | null> {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-rag-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        agent_id: agentId,
        query: query,
      }),
    });

    if (!response.ok) {
      console.error('Agent RAG search failed:', response.status);
      return null;
    }

    const result = await response.json();
    console.log('[searchAgentRag] Result:', {
      success: result.success,
      hasResponse: !!result.response,
      sourcesCount: result.sources?.length || 0,
    });

    if (result.success) {
      return {
        success: true,
        query: result.query,
        response: result.response,
        sources: result.sources || [],
        context: result.response,
      };
    }
    return null;
  } catch (error) {
    console.error('Agent RAG search error:', error);
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
  console.log('[transcribeAudioInline] Starting transcription for:', audioUrl);

  // Download do áudio
  const audioResponse = await fetch(audioUrl);
  if (!audioResponse.ok) {
    throw new Error(`Falha ao baixar áudio: ${audioResponse.status}`);
  }
  const audioBlob = await audioResponse.blob();
  console.log('[transcribeAudioInline] Audio blob size:', audioBlob.size, 'type:', audioBlob.type);

  // Determine file extension based on mime type
  let fileExtension = 'ogg';
  if (audioBlob.type.includes('webm')) {
    fileExtension = 'webm';
  } else if (audioBlob.type.includes('mp3') || audioBlob.type.includes('mpeg')) {
    fileExtension = 'mp3';
  } else if (audioBlob.type.includes('wav')) {
    fileExtension = 'wav';
  }

  const formData = new FormData();
  formData.append('file', audioBlob, `audio.${fileExtension}`);
  formData.append('model', 'whisper-large-v3');
  formData.append('language', 'pt');
  formData.append('response_format', 'json');

  console.log('[transcribeAudioInline] Sending to Groq with file extension:', fileExtension);

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    },
    body: formData
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[transcribeAudioInline] Groq transcription error:', error);
    throw new Error(`Falha na transcrição: ${response.status}`);
  }

  const result = await response.json();
  console.log('[transcribeAudioInline] Groq response:', JSON.stringify(result));
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
    const { conversation_id, message, workspace_id, media_url, content_type, use_rag, use_agent_rag, use_web_search, action }: ChatRequest & { action?: string } = await req.json();

    // Handle get_context action - returns context usage without sending a message
    if (action === 'get_context' && conversation_id && workspace_id) {
      console.log('[get_context] Starting for conversation:', conversation_id, 'workspace:', workspace_id);

      // Buscar config do workspace (tabela é ai_configuration, singular)
      const { data: config, error: configError } = await supabaseClient
        .from('ai_configuration')
        .select('model_id, system_message')
        .eq('workspace_id', workspace_id)
        .single();

      // Se não houver config, usar valores padrão
      const effectiveConfig = config || {
        model_id: 'deepseek-ai/DeepSeek-R1-0528',
        system_message: 'Você é um assistente útil.'
      };

      if (configError && configError.code !== 'PGRST116') {
        console.error('[get_context] Config error:', configError);
      }

      console.log('[get_context] Using config:', effectiveConfig.model_id);

      // Buscar conversa para pegar modelo e agente
      const { data: conversation } = await supabaseClient
        .from('ai_conversations')
        .select('model_id, agent_id')
        .eq('id', conversation_id)
        .single();

      // Buscar agente se houver
      let agentModelId: string | undefined;
      if (conversation?.agent_id) {
        const { data: agent } = await supabaseClient
          .from('ai_custom_agents')
          .select('model_id')
          .eq('id', conversation.agent_id)
          .single();
        agentModelId = agent?.model_id;
      }

      const effectiveModelId = conversation?.model_id || agentModelId || effectiveConfig.model_id;
      const modelInfo = await getModelInfo(effectiveModelId);
      const contextLength = modelInfo?.context_length || modelInfo?.max_model_len || 32768;

      // Estimar tokens do sistema
      const systemMessageTokens = estimateTokens(effectiveConfig.system_message);

      // Carregar histórico para calcular tokens usados
      const historyResult = await loadHistoryWithSlidingWindow(
        supabaseClient,
        conversation_id,
        modelInfo,
        systemMessageTokens,
        0 // sem mensagem atual
      );

      return new Response(JSON.stringify({
        context_length: contextLength,
        used_tokens: historyResult.contextInfo.usedTokens,
        max_tokens: historyResult.contextInfo.maxTokens,
        usage_percent: Math.round(historyResult.contextInfo.usagePercent * 100),
        needs_summarization: historyResult.contextInfo.needsSummarization,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle force_compact action - deletes old messages keeping only a summary
    if (action === 'force_compact' && conversation_id && workspace_id) {
      console.log('[force_compact] Starting for conversation:', conversation_id);

      // Buscar config do workspace
      const { data: config } = await supabaseClient
        .from('ai_configuration')
        .select('model_id, system_message')
        .eq('workspace_id', workspace_id)
        .single();

      const effectiveConfig = config || {
        model_id: 'deepseek-ai/DeepSeek-R1-0528',
        system_message: 'Você é um assistente útil.'
      };

      // Buscar todas as mensagens da conversa
      const { data: allMessages, error: messagesError } = await supabaseClient
        .from('ai_messages')
        .select('id, role, content, created_at')
        .eq('conversation_id', conversation_id)
        .neq('role', 'system')
        .order('created_at', { ascending: true });

      if (messagesError || !allMessages || allMessages.length === 0) {
        return new Response(JSON.stringify({
          error: 'No messages to compact',
          compacted: false
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`[force_compact] Found ${allMessages.length} messages to summarize`);

      // Se tem menos de 4 mensagens, não vale a pena compactar
      if (allMessages.length < 4) {
        return new Response(JSON.stringify({
          error: 'Too few messages to compact (minimum 4)',
          compacted: false,
          message_count: allMessages.length
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Preparar contexto para sumarização
      const conversationText = allMessages.map(m =>
        `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`
      ).join('\n\n');

      // Gerar sumário usando a API do Chutes
      const summaryPrompt = `Você é um assistente especializado em criar resumos concisos de conversas.

Analise a seguinte conversa e crie um resumo estruturado que preserve:
1. Os tópicos principais discutidos
2. Decisões importantes tomadas
3. Informações técnicas relevantes (nomes, códigos, configurações)
4. Contexto necessário para continuar a conversa

Conversa:
${conversationText}

Crie um resumo em formato markdown, organizado por tópicos. Seja conciso mas preserve informações críticas.`;

      try {
        const summaryResponse = await fetch('https://llm.chutes.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('CHUTES_API_KEY')}`,
          },
          body: JSON.stringify({
            model: effectiveConfig.model_id,
            messages: [
              { role: 'system', content: 'Você é um assistente que cria resumos precisos e úteis.' },
              { role: 'user', content: summaryPrompt }
            ],
            max_tokens: 2000,
            temperature: 0.3,
          }),
        });

        if (!summaryResponse.ok) {
          throw new Error(`Summary API error: ${summaryResponse.statusText}`);
        }

        const summaryData = await summaryResponse.json();
        let summary = summaryData.choices?.[0]?.message?.content || '';

        // Limpar tags <think> se existirem
        summary = summary.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

        console.log(`[force_compact] Generated summary with ${summary.length} chars`);

        // Deletar todas as mensagens antigas
        const messageIds = allMessages.map(m => m.id);
        const { error: deleteError } = await supabaseClient
          .from('ai_messages')
          .delete()
          .in('id', messageIds);

        if (deleteError) {
          throw new Error(`Delete error: ${deleteError.message}`);
        }

        console.log(`[force_compact] Deleted ${messageIds.length} messages`);

        // Inserir mensagem de sistema com o resumo
        const summaryMessage = {
          conversation_id,
          role: 'assistant',
          content: `📋 **Resumo da conversa anterior:**\n\n${summary}\n\n---\n*Este é um resumo automático. A conversa anterior foi compactada para liberar espaço no contexto.*`,
          tokens_used: 0,
        };

        const { error: insertError } = await supabaseClient
          .from('ai_messages')
          .insert(summaryMessage);

        if (insertError) {
          throw new Error(`Insert error: ${insertError.message}`);
        }

        console.log('[force_compact] Inserted summary message');

        return new Response(JSON.stringify({
          compacted: true,
          messages_deleted: messageIds.length,
          summary_length: summary.length,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      } catch (error) {
        console.error('[force_compact] Error:', error);
        return new Response(JSON.stringify({
          error: error.message,
          compacted: false
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

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

    // Fetch conversation to get custom model_id and agent_id if set
    const { data: conversation } = await supabaseClient
      .from('ai_conversations')
      .select('model_id, agent_id')
      .eq('id', conversation_id)
      .single();

    console.log(`[ai-assistant-chat] Conversation data:`, JSON.stringify(conversation));

    // Fetch agent data if conversation has an agent_id
    let agentData: {
      name: string;
      system_prompt: string;
      model_id?: string;
      temperature?: number;
      web_search_enabled: boolean;
    } | null = null;

    if (conversation?.agent_id) {
      console.log(`[ai-assistant-chat] Fetching agent with id: ${conversation.agent_id}`);
      const { data: agent, error: agentError } = await supabaseClient
        .from('ai_custom_agents')
        .select('name, system_prompt, model_id, temperature, web_search_enabled')
        .eq('id', conversation.agent_id)
        .single();

      if (agentError) {
        console.error(`[ai-assistant-chat] Error fetching agent:`, agentError);
      }

      if (agent) {
        agentData = agent;
        console.log(`[ai-assistant-chat] Using custom agent: ${agent.name}, system_prompt: ${agent.system_prompt?.substring(0, 100)}...`);
      }
    } else {
      console.log(`[ai-assistant-chat] No agent_id in conversation`);
    }

    // Use conversation model if set, then agent model, otherwise use config default
    const effectiveModelId = conversation?.model_id || agentData?.model_id || config.model_id;

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
        let usedMcpTools = false; // Track if MCP tools were used

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

          // FASE 0: Processar mídia se presente
        // Verifica se o modelo suporta imagens nativamente (multimodal)
        // Se sim, pula a transcrição via Gemini e envia direto para o modelo
        let useNativeMultimodal = false;
        let nativeImageUrl = '';

          if (media_url && content_type && insertedMessage?.id) {
            // Verifica se é imagem E o modelo suporta multimodal nativo
            const supportsNativeImages = content_type === 'image' && modelSupportsImages(modelInfo);

            if (supportsNativeImages) {
              // Modelo suporta imagens nativamente - não precisa transcrever via Gemini
              console.log(`[ai-assistant-chat] Model ${effectiveModelId} supports native multimodal - skipping Gemini transcription`);
              useNativeMultimodal = true;
              nativeImageUrl = media_url;

              // Emitir evento informando que usará análise nativa
              sendSSE(controller, {
                type: 'media_processing',
                content_type: content_type,
                status: 'processing',
                source: 'native', // Indica que é processamento nativo do modelo
              });

              // Atualizar status no banco
              await serviceClient
                .from('ai_messages')
                .update({
                  transcription_status: 'native_multimodal',
                  transcription: '[Análise via modelo multimodal nativo]'
                })
                .eq('id', insertedMessage.id);

              // Emitir evento de conclusão
              sendSSE(controller, {
                type: 'media_processing',
                content_type: content_type,
                status: 'completed',
                source: 'native',
              });
            } else {
              // Modelo NÃO suporta imagens nativamente - usar Gemini para transcrição
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

              // Emitir evento indicando que usou Gemini
              sendSSE(controller, {
                type: 'media_transcription_source',
                source: 'gemini',
              });
            }
          }

          // FASE 0.5: Buscar no RAG se habilitado (workspace ou agente)
          let ragContext = '';
          let ragSources: Array<{ content: string; title: string; uri: string }> = [];
          let agentRagContext = '';
          let agentRagSources: Array<{ content: string; title: string; uri: string }> = [];

          const authToken = req.headers.get('Authorization')?.replace('Bearer ', '') || '';

          // Busca no RAG do workspace (conversas anteriores)
          if (use_rag && message) {
            // Emitir evento de busca RAG
            sendSSE(controller, {
              type: 'rag_search_start',
              query: message,
            });

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

          // Busca no RAG do agente (documentos)
          if (use_agent_rag && message && conversation?.agent_id) {
            console.log('[ai-assistant-chat] Starting agent RAG search for agent:', conversation.agent_id);

            // Emitir evento de busca RAG do agente
            sendSSE(controller, {
              type: 'agent_rag_search_start',
              query: message,
              agent_id: conversation.agent_id,
            });

            const agentRagResult = await searchAgentRag(conversation.agent_id, message, authToken);

            if (agentRagResult) {
              agentRagContext = agentRagResult.context || agentRagResult.response;
              agentRagSources = agentRagResult.sources || [];

              console.log('[ai-assistant-chat] Agent RAG result received:', {
                hasContext: !!agentRagContext,
                contextLength: agentRagContext?.length,
                sourcesCount: agentRagSources.length,
              });

              // Emitir evento de conclusão do RAG do agente
              sendSSE(controller, {
                type: 'agent_rag_search_complete',
                has_results: agentRagSources.length > 0 || !!agentRagContext,
                sources_count: agentRagSources.length,
              });
            } else {
              console.log('[ai-assistant-chat] Agent RAG search returned null');
              sendSSE(controller, {
                type: 'agent_rag_search_complete',
                has_results: false,
                sources_count: 0,
              });
            }
          }

          // FASE 0.8: Carregar ferramentas MCP do workspace ANTES da decisão de busca
          // Isso permite que a decisão de busca considere as ferramentas MCP disponíveis
          let mcpTools: McpTool[] = [];
          let openAiTools: Array<{ type: 'function'; function: { name: string; description: string; parameters: Record<string, unknown> } }> = [];
          let dataToolsEnabled = config.data_tools_enabled === true;

          try {
            mcpTools = await loadEnabledMcpTools(workspace_id, authToken);

            if (mcpTools.length > 0) {
              openAiTools = convertMcpToolsToOpenAI(mcpTools);
              console.log('[MCP] Loaded', mcpTools.length, 'tools,', openAiTools.length, 'converted');
            }
          } catch (mcpError) {
            console.error('[MCP] Error loading tools:', mcpError);
            // Continuar sem MCP tools
          }

          // FASE 0.9: Adicionar Data Tools se habilitadas
          // Data Tools permitem que a IA consulte e atualize dados do workspace (leads, conversas, etc.)
          // IMPORTANTE: Data Tools são adicionadas PRIMEIRO para ter prioridade na lista
          if (dataToolsEnabled) {
            console.log('[Data Tools] Enabled for workspace, adding to available tools');
            // Adicionar Data Tools NO INÍCIO do array para prioridade
            openAiTools = [...DATA_TOOL_DEFINITIONS as typeof openAiTools, ...openAiTools];
            console.log('[Data Tools] Total tools available:', openAiTools.length);
          }

          // FASE 1: Decidir se precisa buscar
          // Se use_web_search está ativo (botão manual), força a busca
          // Se há ferramentas MCP relevantes, NÃO buscar na web (deixar o LLM usar MCP)
          // Caso contrário, usa a decisão automática da IA
          let searchDecision: { needs_search: boolean; search_query?: string };

          // Verificar se há ferramentas MCP que podem responder à pergunta
          const hasMcpToolsForQuery = mcpTools.length > 0 && checkMcpToolsRelevance(message, mcpTools);

          if (use_web_search) {
            // Busca manual ativada pelo usuário - usar a mensagem como query de busca
            console.log('[ai-assistant-chat] Web search manually enabled by user');
            searchDecision = {
              needs_search: true,
              search_query: message, // Usar a mensagem do usuário diretamente
            };
          } else {
            // Busca web desabilitada por padrão - só ativa manualmente
            // Data Tools e MCP Tools são suficientes para consultas do workspace
            console.log('[ai-assistant-chat] Web search not enabled, skipping (Data Tools and MCP available)');
            searchDecision = { needs_search: false };
          }

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
          // Construir system message combinando master prompt + agent prompt
          let systemMessage = config.system_message;

          // Se houver agente personalizado, adicionar seu prompt ao sistema
          if (agentData?.system_prompt) {
            systemMessage = `${config.system_message}

## Instruções do Agente Personalizado: ${agentData.name}

${agentData.system_prompt}`;
            console.log(`[ai-assistant-chat] Combined system message with agent prompt (${agentData.name}). Full system message length: ${systemMessage.length}`);
          } else {
            console.log(`[ai-assistant-chat] No agent prompt to combine. agentData:`, agentData ? 'exists but no system_prompt' : 'null');
          }

          // Injetar contexto do RAG do workspace se houver
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

          // Injetar contexto do RAG do agente se houver
          if (agentRagContext) {
            console.log('[ai-assistant-chat] Injecting Agent RAG context into system message, length:', agentRagContext.length);

            // Truncar contexto se muito grande (máx 8000 chars para evitar estourar tokens)
            const truncatedAgentContext = agentRagContext.length > 8000
              ? agentRagContext.slice(0, 8000) + '\n\n[... contexto truncado ...]'
              : agentRagContext;

            systemMessage += `\n\n## Base de Conhecimento do Agente

O usuário solicitou consultar a base de conhecimento do agente. Aqui estão as informações relevantes encontradas na base de conhecimento:

### Informações Relevantes:
${truncatedAgentContext}

IMPORTANTE:
- Use estas informações da base de conhecimento para fundamentar sua resposta
- NÃO mencione referências de documentos como [D1], [D2], etc. na resposta
- NÃO diga "de acordo com o documento X" ou similar
- Apenas entregue a informação de forma natural e direta
- Você pode mencionar que a informação vem da base de conhecimento do agente se apropriado
- Se a informação não estiver disponível, indique que não encontrou na base de conhecimento
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

          // FASE 2.5: Adicionar instruções sobre Data Tools ao system message (PRIORIDADE ALTA)
          // Data Tools são SEMPRE preferíveis às MCP tools para dados do workspace Pesca Lead
          if (dataToolsEnabled) {
            systemMessage += `\n\n## ⭐ FERRAMENTAS DE DADOS DO PESCA LEAD

Você tem acesso a ferramentas para consultar dados REAIS do CRM/Pipeline deste workspace.

**Ferramentas disponíveis:**
1. **get_schema** - Retorna estrutura do banco (tabelas e colunas disponíveis)
2. **execute_query** - Executa SQL SELECT e retorna dados REAIS

**⚠️ FLUXO OBRIGATÓRIO (SIGA À RISCA):**
1. SEMPRE chame get_schema PRIMEIRO para ver as tabelas/colunas
2. Use APENAS as colunas que existem no schema retornado
3. Use {{WORKSPACE}} como placeholder para workspace_id
4. ESPERE o resultado da query ANTES de responder
5. Se der erro na query, tente corrigir e executar novamente

**Regras técnicas:**
- Apenas SELECT permitido
- Sempre inclua: WHERE workspace_id = {{WORKSPACE}}
- Máximo 100 registros por consulta

## ⛔⛔⛔ REGRA CRÍTICA - PROIBIÇÃO ABSOLUTA DE INVENTAR DADOS ⛔⛔⛔

**VOCÊ ESTÁ ABSOLUTAMENTE PROIBIDO DE:**
- ❌ Inventar nomes de campanhas (ex: "Campanha A", "Campanha B")
- ❌ Inventar nomes de funis, leads, ou qualquer dado
- ❌ Criar números fictícios (ex: "150 leads", "20% conversão")
- ❌ Supor dados que não vieram da consulta SQL
- ❌ Preencher tabelas com dados de exemplo
- ❌ Mostrar QUALQUER dado que não veio diretamente do resultado da query

**SE A QUERY FALHAR OU RETORNAR VAZIO, VOCÊ DEVE:**
- ✅ Dizer honestamente: "Não encontrei dados de campanhas no seu workspace"
- ✅ Dizer: "A consulta não retornou resultados"
- ✅ Perguntar: "Você tem campanhas cadastradas? Não encontrei nenhuma."
- ✅ NUNCA criar dados fictícios para "ajudar" o usuário

**VERIFICAÇÃO OBRIGATÓRIA:**
Antes de mostrar QUALQUER dado ao usuário, pergunte-se:
"Este dado veio EXATAMENTE do resultado da minha query SQL?"
- Se SIM → pode mostrar
- Se NÃO → NÃO MOSTRE, diga que não encontrou

**Linguagem natural:**
- "No seu Pesca Lead, encontrei X campanhas: [DADOS REAIS DA QUERY]"
- "Não encontrei campanhas cadastradas no seu workspace"
- "A consulta retornou os seguintes resultados: [DADOS REAIS]"`;
          }

          // FASE 2.6: Adicionar instruções sobre MCP tools ao system message
          // (As ferramentas já foram carregadas na FASE 0.8)
          if (mcpTools.length > 0) {
            // Adicionar instruções sobre MCP tools ao system message
            systemMessage += `\n\n## Ferramentas MCP Externas

Você tem acesso às seguintes ferramentas externas (MCP) para buscar informações de serviços específicos:

${mcpTools.map(t => `- **${t.tool_name}** (${t.server_name}): ${t.description || 'Sem descrição'}`).join('\n')}

QUANDO USAR estas ferramentas:
- Use APENAS quando o usuário EXPLICITAMENTE pedir dados de um serviço externo (ex: "busque no GitHub", "liste issues do repositório", "mostre meus commits")
- Use quando precisar de dados em tempo real de APIs externas que não estão na conversa
- Use ferramentas SQL (execute_sql) quando o usuário quiser consultar **outro banco de dados** que não seja o Pesca Lead

QUANDO NÃO USAR estas ferramentas:
- NÃO use para tarefas de análise de texto, imagens ou conteúdo já presente na conversa
- NÃO use para gerar prompts, resumir conteúdo, ou responder perguntas gerais
- NÃO use se você já tem todas as informações necessárias para responder
- NÃO use a ferramenta GitHub apenas porque a palavra "extrair" ou "buscar" aparece na mensagem

Em caso de dúvida, responda diretamente SEM usar ferramentas. Só use MCP quando for absolutamente necessário acessar dados externos.`;
          }

          // FASE 2.7: Adicionar regra de desambiguação quando ambos estão disponíveis
          if (dataToolsEnabled && mcpTools.some(t => t.tool_name.toLowerCase().includes('sql') || t.tool_name.toLowerCase().includes('query'))) {
            systemMessage += `\n\n## ⚠️ REGRA DE DESAMBIGUAÇÃO (MUITO IMPORTANTE!)

Você tem acesso a DOIS tipos de ferramentas para dados:
1. **Data Tools do Pesca Lead** (search_leads, get_pipeline_stats, etc.) - para dados do CRM/Pipeline DESTE workspace
2. **Ferramentas SQL via MCP** (execute_sql, etc.) - para acessar OUTROS bancos de dados externos

**QUANDO HOUVER DÚVIDA sobre qual usar, SEMPRE PERGUNTE ao usuário:**

Exemplo de pergunta:
"Você quer consultar os dados do **Pesca Lead** (seus leads, pipeline, conversas) ou de um **banco de dados externo** conectado via MCP?"

**REGRAS:**
- Se o usuário mencionar "leads", "pipeline", "kanban", "funil", "conversas" SEM mencionar um banco externo → Use as **Data Tools do Pesca Lead**
- Se o usuário mencionar explicitamente um banco externo, projeto Supabase, ou usar termos como "no meu outro banco" → Use **execute_sql via MCP**
- Se não estiver claro → **PERGUNTE antes de executar qualquer ferramenta**`;
          }

          // Build user content with media transcription if present
          // Para modelos multimodais nativos, usamos formato OpenAI com array de content
          // Para outros modelos, usamos a transcrição do Gemini como texto
          let userContent: string | Array<{ type: string; text?: string; image_url?: { url: string } }> = message || '';

          if (useNativeMultimodal && nativeImageUrl) {
            // Formato multimodal nativo (OpenAI-compatible)
            // O modelo receberá a imagem diretamente
            const textContent = message
              ? `🖼️ [IMAGEM ENVIADA - Análise Nativa]\n\n${message}`
              : '🖼️ [IMAGEM ENVIADA - Análise Nativa]\n\nAnalise esta imagem detalhadamente.';

            userContent = [
              { type: 'text', text: textContent },
              { type: 'image_url', image_url: { url: nativeImageUrl } }
            ];

            console.log('[ai-assistant-chat] Using native multimodal format with image URL');
          } else if (mediaTranscription) {
            // Formato texto com transcrição do Gemini
            const mediaPrefix = content_type === 'image'
              ? '🖼️ [IMAGEM ENVIADA]\n\n**Análise da imagem (via Gemini):**\n'
              : '🎤 [ÁUDIO ENVIADO]\n\n**Transcrição do áudio:**\n';

            userContent = mediaPrefix + mediaTranscription + (message ? `\n\n**Mensagem adicional:** ${message}` : '');
          }

          // Build messages array for Chutes API
          const messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [
            { role: 'system', content: systemMessage },
            ...(history || []),
            { role: 'user', content: userContent },
          ];

          // modelInfo já foi buscado anteriormente, reusar

          // Estimar tokens de input (lidando com conteúdo multimodal)
          const inputText = messages.map(m => {
            if (typeof m.content === 'string') {
              return m.content;
            }
            // Para conteúdo multimodal (array), extrair apenas texto
            // Imagens são estimadas em ~1000 tokens
            if (Array.isArray(m.content)) {
              let text = '';
              let hasImage = false;
              for (const part of m.content) {
                if (part.type === 'text' && part.text) {
                  text += part.text;
                } else if (part.type === 'image_url') {
                  hasImage = true;
                }
              }
              // Adicionar estimativa para imagem (Chutes processa como ~1000 tokens)
              return text + (hasImage ? ' [IMAGE:~1000tokens]' : '');
            }
            return '';
          }).join('\n');
          const estimatedInputTokens = estimateTokens(inputText) + (useNativeMultimodal ? 1000 : 0);

          // Calcular max_tokens baseado no modelo (usa API como fonte da verdade)
          // Criar dois limites: um para non-streaming (8192) e outro para streaming (65536)
          const dynamicMaxTokensNonStreaming = modelInfo
            ? calculateMaxTokens(modelInfo, estimatedInputTokens, false)
            : 4096; // Fallback mínimo se API falhar
          const dynamicMaxTokensStreaming = modelInfo
            ? calculateMaxTokens(modelInfo, estimatedInputTokens, true)
            : 4096;

          // Use agent temperature if defined, otherwise use config default
          const effectiveTemperature = agentData?.temperature ?? config.temperature;

          // ============================================================================
          // TOOL CALLING LOOP
          // Processa tool calls em loop até não haver mais ou atingir limite
          // ============================================================================
          const MAX_TOOL_ITERATIONS = 5;
          let currentMessages = [...messages];
          let iteration = 0;
          let finalResponse: Response | null = null;
          let hasPendingToolCalls = false;
          // Acumular todas as tool calls executadas para salvar na mensagem
          const allExecutedMcpCalls: ExecutedMcpToolCall[] = [];
          const allExecutedDataCalls: ExecutedDataToolCall[] = [];

          // ESTRATÉGIA: Sempre usar modelo rápido (Qwen3-235B) para detecção de tools
          // Isso garante resposta rápida na análise inicial, evitando timeouts
          // O modelo selecionado pelo usuário é usado apenas para a resposta final (streaming)
          const toolDetectionModel = FAST_TOOL_DETECTION_MODEL;

          if (openAiTools.length > 0) {
            console.log(`[MCP] Using ${toolDetectionModel} for tool detection, final response will use ${effectiveModelId}`);
          }

          while (iteration < MAX_TOOL_ITERATIONS) {
            iteration++;
            console.log(`[MCP] Tool calling iteration ${iteration}/${MAX_TOOL_ITERATIONS}`);

            // Construir payload base para detecção de tool calls
            // Usa modelo rápido para detecção se o modelo principal é lento
            const requestPayload: Record<string, unknown> = {
              model: toolDetectionModel, // Usa modelo rápido para tool detection
              messages: currentMessages,
              temperature: effectiveTemperature,
            };

            // Adicionar tools se houver e for a primeira iteração ou ainda há tool calls pendentes
            if (openAiTools.length > 0) {
              requestPayload.tools = openAiTools;
              requestPayload.tool_choice = 'auto';
            }

            // Primeira chamada: sem streaming para detectar tool calls
            // Subsequentes: também sem streaming para processar tools
            // Última: com streaming para resposta final
            if (iteration === 1 && openAiTools.length > 0) {
              // Primeira chamada sem streaming para detectar tool calls (com retry para 429)
              const response = await fetchWithRetry('https://llm.chutes.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get('CHUTES_API_KEY')}`,
                },
                body: JSON.stringify({
                  ...requestPayload,
                  max_tokens: dynamicMaxTokensNonStreaming,
                  stream: false,
                }),
              }, 3, 2000); // 3 retries, 2s initial delay

              if (!response.ok) {
                const errorText = await response.text();
                console.error('Chutes API error (non-streaming):', response.status, errorText);
                throw new Error(`Chutes API error: ${response.statusText}`);
              }

              const data = await response.json();
              const choice = data.choices?.[0];
              const toolCalls = choice?.message?.tool_calls as McpToolCall[] | undefined;

              if (toolCalls && toolCalls.length > 0) {
                console.log(`[MCP] LLM requested ${toolCalls.length} tool call(s)`);
                hasPendingToolCalls = true;
                usedMcpTools = true; // Mark that MCP tools were used

                // Normalizar IDs das tool_calls para compatibilidade com APIs que exigem 9 caracteres
                const normalizedToolCalls = toolCalls.map(tc => ({
                  ...tc,
                  id: normalizeToolCallId(tc.id),
                }));

                // Adicionar mensagem do assistente com tool_calls
                currentMessages.push({
                  role: 'assistant',
                  content: choice.message.content || null,
                  tool_calls: normalizedToolCalls,
                });

                // Processar tool calls (MCP + Data Tools)
                const { toolResults, executedMcpCalls, executedDataCalls } = await processAllToolCalls(
                  toolCalls,
                  mcpTools,
                  supabaseClient,
                  workspace_id,
                  user.id,
                  authToken,
                  conversation_id,
                  controller,
                  dataToolsEnabled
                );

                // Acumular para salvar na mensagem
                allExecutedMcpCalls.push(...executedMcpCalls);
                allExecutedDataCalls.push(...executedDataCalls);

                // Adicionar resultados das tools
                for (const result of toolResults) {
                  currentMessages.push(result);
                }

                // Continuar loop para próxima iteração
                continue;
              } else {
                // Sem tool calls, usar resposta diretamente (precisa fazer streaming)
                console.log('[Tools] No tool calls, proceeding to streaming response');
                hasPendingToolCalls = false;
                // Sair do loop para fazer chamada com streaming
                break;
              }
            } else if (hasPendingToolCalls && openAiTools.length > 0) {
              // Iteração subsequente após tool calls
              const response = await fetchWithRetry('https://llm.chutes.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get('CHUTES_API_KEY')}`,
                },
                body: JSON.stringify({
                  ...requestPayload,
                  max_tokens: dynamicMaxTokensNonStreaming,
                  stream: false,
                }),
              }, 3, 2000);

              if (!response.ok) {
                const errorText = await response.text();
                console.error('Chutes API error (tool iteration):', response.status, errorText);
                throw new Error(`Chutes API error: ${response.statusText}`);
              }

              const data = await response.json();
              const choice = data.choices?.[0];
              const toolCalls = choice?.message?.tool_calls as McpToolCall[] | undefined;

              if (toolCalls && toolCalls.length > 0) {
                console.log(`[Tools] LLM requested ${toolCalls.length} more tool call(s)`);
                usedMcpTools = true; // Mark that tools were used

                // Normalizar IDs das tool_calls para compatibilidade com APIs que exigem 9 caracteres
                const normalizedToolCalls = toolCalls.map(tc => ({
                  ...tc,
                  id: normalizeToolCallId(tc.id),
                }));

                // Adicionar mensagem do assistente com tool_calls
                currentMessages.push({
                  role: 'assistant',
                  content: choice.message.content || null,
                  tool_calls: normalizedToolCalls,
                });

                // Processar tool calls (MCP + Data Tools)
                const { toolResults, executedMcpCalls, executedDataCalls } = await processAllToolCalls(
                  toolCalls,
                  mcpTools,
                  supabaseClient,
                  workspace_id,
                  user.id,
                  authToken,
                  conversation_id,
                  controller,
                  dataToolsEnabled
                );

                // Acumular para salvar na mensagem
                allExecutedMcpCalls.push(...executedMcpCalls);
                allExecutedDataCalls.push(...executedDataCalls);

                // Adicionar resultados das tools
                for (const result of toolResults) {
                  currentMessages.push(result);
                }

                // Continuar loop
                continue;
              } else {
                // Sem mais tool calls, sair do loop
                console.log('[Tools] No more tool calls, proceeding to streaming response');
                hasPendingToolCalls = false;
                break;
              }
            } else {
              // Sem tools ou primeira iteração sem tools
              break;
            }
          }

          if (iteration >= MAX_TOOL_ITERATIONS && hasPendingToolCalls) {
            console.warn('[MCP] Reached max tool iterations, forcing final response');
          }

          // ============================================================================
          // STREAMING RESPONSE FINAL
          // Agora faz a chamada final com streaming
          // ============================================================================

          // Se o modelo final é diferente do modelo de tools, converter mensagens de tool
          // para um formato que o modelo final entenda
          let messagesForStreaming = currentMessages;
          const finalModelSupportTools = toolDetectionModel === effectiveModelId;

          if (!finalModelSupportTools && (usedMcpTools || allExecutedDataCalls.length > 0)) {
            console.log('[Tools] Converting tool messages for non-tool-supporting model');

            // Coletar todos os dados de tools para usar como contexto
            const toolResults: string[] = [];
            messagesForStreaming = [];

            // Extrair system message e mensagens normais, coletar dados de tools
            for (const msg of currentMessages) {
              if (msg.role === 'tool') {
                toolResults.push(msg.content);
              } else if (msg.role === 'assistant' && msg.tool_calls) {
                // Ignorar mensagens de tool_calls
                continue;
              } else if (msg.role === 'system') {
                messagesForStreaming.push(msg);
              }
              // Ignorar user/assistant intermediários - vamos reconstruir
            }

            // Construir mensagem final combinando dados + pergunta
            if (toolResults.length > 0) {
              const toolDataContext = toolResults.join('\n\n---\n\n');

              // Adicionar uma mensagem user com contexto interno + pergunta
              messagesForStreaming.push({
                role: 'user',
                content: `[CONTEXTO INTERNO - use para responder mas NÃO repita esses dados raw]

${toolDataContext}

---

PERGUNTA DO USUÁRIO: ${message}

Responda de forma natural e conversacional. Apresente os números e informações encontradas de forma clara, sem mencionar "dados acima" ou "consulta SQL".`,
              });
            } else {
              // Sem dados de tools, só adicionar a pergunta
              messagesForStreaming.push({
                role: 'user',
                content: message,
              });
            }

            console.log(`[Tools] Converted ${currentMessages.length} messages to ${messagesForStreaming.length} messages`);
            console.log(`[Tools] Message roles: ${messagesForStreaming.map(m => m.role).join(' -> ')}`);
          }

          const finalPayload: Record<string, unknown> = {
            model: effectiveModelId,
            messages: messagesForStreaming,
            stream: true,
            max_tokens: dynamicMaxTokensStreaming,
            temperature: effectiveTemperature,
          };

          // Não incluir tools na chamada final para evitar mais tool calls
          // (já processamos todos os necessários)

          // Call Chutes.ai API with streaming (com retry para rate limit)
          const chutesResponse = await fetchWithRetry('https://llm.chutes.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('CHUTES_API_KEY')}`,
            },
            body: JSON.stringify(finalPayload),
          }, 3, 2000);

          if (!chutesResponse.ok) {
            const errorText = await chutesResponse.text();
            console.error('Chutes API error:', chutesResponse.status, errorText);
            throw new Error(`Chutes API error: ${chutesResponse.statusText}`);
          }

          console.log('[ai-assistant-chat] Chutes API response OK, starting stream...');

          const reader = chutesResponse.body?.getReader();
          const decoder = new TextDecoder();
          let assistantMessage = '';
          let thinkingContent = '';
          let isInsideThink = false;
          let thinkingStarted = false;
          let buffer = ''; // Buffer para lidar com tags parciais
          let chunkCount = 0;

          if (!reader) {
            console.error('[ai-assistant-chat] No reader available from Chutes response');
            controller.close();
            return;
          }

          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log(`[ai-assistant-chat] Stream done. Total chunks: ${chunkCount}, message length: ${assistantMessage.length}`);
              break;
            }

            chunkCount++;
            const chunk = decoder.decode(value);

            // Log do chunk raw para debug (primeiros 2)
            if (chunkCount <= 2) {
              console.log(`[ai-assistant-chat] Raw chunk ${chunkCount}:`, chunk.substring(0, 300));
            }

            const lines = chunk.split('\n');
            let dataLinesCount = 0;

            for (const line of lines) {
              if (line.trim() && line.startsWith('data: ')) {
                dataLinesCount++;
                const data = line.slice(6);
                if (data === '[DONE]') {
                  console.log('[ai-assistant-chat] Received [DONE] marker');
                  continue;
                }

                try {
                  const parsed = JSON.parse(data);

                  // Log estrutura do parsed para debug
                  if (chunkCount <= 2 && dataLinesCount <= 2) {
                    console.log(`[ai-assistant-chat] Parsed data (chunk ${chunkCount}, line ${dataLinesCount}):`, JSON.stringify(parsed).substring(0, 500));
                  }

                  const token = parsed.choices?.[0]?.delta?.content;

                  // Log se não há token mas há choices
                  if (!token && parsed.choices?.length > 0 && chunkCount <= 2) {
                    console.log(`[ai-assistant-chat] No token but has choices. Delta:`, JSON.stringify(parsed.choices[0]?.delta));
                  }

                  if (token) {
                    // Adicionar token ao buffer
                    buffer += token;

                    // Log primeiro token para debug
                    if (assistantMessage.length === 0 && buffer.length > 0) {
                      console.log('[ai-assistant-chat] First token received:', token.substring(0, 50));
                    }

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
            console.log('[ai-assistant-chat] Processing remaining buffer:', buffer.substring(0, 100));
            if (isInsideThink) {
              thinkingContent += buffer;
              sendSSE(controller, { type: 'thinking_token', content: buffer });
              sendSSE(controller, { type: 'thinking_end' });
            } else {
              assistantMessage += buffer;
              sendSSE(controller, { type: 'token', content: buffer });
            }
          }

          console.log('[ai-assistant-chat] Final message length:', assistantMessage.length, 'Thinking length:', thinkingContent.length);

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
              // Salvar indicadores de uso de recursos
              used_workspace_rag: !!ragContext,
              used_agent_rag: !!agentRagContext,
              used_web_search: searchSources.length > 0,
              used_mcp_tools: usedMcpTools,
            };

            // Persistir sources como JSONB se houver
            if (searchSources.length > 0) {
              assistantMessageData.sources = searchSources;
            }

            // Persistir MCP tool calls como JSONB se houver
            if (allExecutedMcpCalls.length > 0) {
              assistantMessageData.mcp_tool_calls = allExecutedMcpCalls;
              console.log(`[ai-assistant-chat] Saving ${allExecutedMcpCalls.length} MCP tool calls to message`);
            }

            // Persistir Data Tool calls como JSONB se houver
            if (allExecutedDataCalls.length > 0) {
              assistantMessageData.data_tool_calls = allExecutedDataCalls;
              assistantMessageData.used_data_tools = true;
              console.log(`[ai-assistant-chat] Saving ${allExecutedDataCalls.length} Data Tool calls to message`);
            }

            await supabaseClient.from('ai_messages').insert(assistantMessageData);
          }

          // Send done signal with RAG indicators
          sendSSE(controller, {
            type: 'done',
            sources: searchSources,
            // Indicadores de quais recursos foram usados
            used_workspace_rag: !!ragContext,
            used_agent_rag: !!agentRagContext,
            used_web_search: searchSources.length > 0,
            used_mcp_tools: usedMcpTools,
            used_data_tools: allExecutedDataCalls.length > 0,
            // Incluir tool calls para persistência no frontend
            mcp_tool_calls: allExecutedMcpCalls.length > 0 ? allExecutedMcpCalls : undefined,
            data_tool_calls: allExecutedDataCalls.length > 0 ? allExecutedDataCalls : undefined,
          });
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
