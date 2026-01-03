import { supabase } from '../utils/supabase/client';
import { SUPABASE_URL } from '../utils/api-config';
import type {
  AIConversation,
  AIMessage,
  AIConfiguration,
  CreateConversationInput,
  CreateMessageInput,
  UpdateConfigurationInput,
  ChutesModelsResponse,
  ChutesModel,
  SSEEvent,
  SearchSource,
  SearchStep,
  MediaContentType,
  DataToolName,
} from '../types/ai-assistant';

// ============================================================================
// Conversations
// ============================================================================

export async function createConversation(
  input: CreateConversationInput
): Promise<{ conversation: AIConversation | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .insert(input)
    .select(`
      *,
      agent:ai_custom_agents(id, name, color)
    `)
    .single();

  if (error) {
    console.error('Error creating conversation:', error);
    return { conversation: null, error };
  }

  return { conversation: data, error: null };
}

export async function getConversations(
  workspaceId: string
): Promise<AIConversation[]> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select(`
      *,
      agent:ai_custom_agents(id, name, color)
    `)
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching conversations:', error);
    return [];
  }

  return data;
}

/**
 * Busca conversas que contenham o termo no título OU nas mensagens
 * Retorna IDs das conversas encontradas
 */
export async function searchConversations(
  workspaceId: string,
  searchTerm: string,
  limit: number = 100
): Promise<{ conversationIds: string[]; error: Error | null }> {
  try {
    // Busca no título das conversas
    const { data: titleMatches, error: titleError } = await supabase
      .from('ai_conversations')
      .select('id')
      .eq('workspace_id', workspaceId)
      .ilike('title', `%${searchTerm}%`)
      .limit(limit);

    if (titleError) {
      console.error('[AI Service] Error searching by title:', titleError);
      throw titleError;
    }

    // Busca no conteúdo das mensagens
    const { data: messageMatches, error: messageError } = await supabase
      .from('ai_messages')
      .select('conversation_id, ai_conversations!inner(workspace_id)')
      .eq('ai_conversations.workspace_id', workspaceId)
      .ilike('content', `%${searchTerm}%`)
      .limit(limit);

    if (messageError) {
      console.error('[AI Service] Error searching by messages:', messageError);
      throw messageError;
    }

    // Combina IDs únicos de ambas as buscas
    const allIds = new Set<string>([
      ...(titleMatches?.map(t => t.id) || []),
      ...(messageMatches?.map(m => m.conversation_id) || [])
    ]);

    return { conversationIds: Array.from(allIds), error: null };
  } catch (error) {
    console.error('[AI Service] Search error:', error);
    return { conversationIds: [], error: error as Error };
  }
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const { error } = await supabase
    .from('ai_conversations')
    .delete()
    .eq('id', conversationId);

  if (error) {
    console.error('Error deleting conversation:', error);
    throw error;
  }
}

export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<void> {
  const { error } = await supabase
    .from('ai_conversations')
    .update({ title })
    .eq('id', conversationId);

  if (error) {
    console.error('Error updating conversation title:', error);
    throw error;
  }
}

export async function updateConversationModel(
  conversationId: string,
  modelId: string | null
): Promise<AIConversation | null> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .update({ model_id: modelId || null })
    .eq('id', conversationId)
    .select()
    .single();

  if (error) {
    console.error('Error updating conversation model:', error);
    throw error;
  }

  return data;
}

// ============================================================================
// Messages
// ============================================================================

export async function deleteMessage(messageId: string): Promise<void> {
  const { error } = await supabase
    .from('ai_messages')
    .delete()
    .eq('id', messageId);

  if (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
}

export async function getMessages(
  conversationId: string
): Promise<AIMessage[]> {
  const { data, error } = await supabase
    .from('ai_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }

  return data;
}

export async function createMessage(
  input: CreateMessageInput
): Promise<{ message: AIMessage | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('ai_messages')
    .insert(input)
    .select()
    .single();

  if (error) {
    console.error('Error creating message:', error);
    return { message: null, error };
  }

  return { message: data, error: null };
}

// ============================================================================
// Streaming Chat with Web Search Support
// ============================================================================

// Interface para informações de contexto
export interface ContextInfo {
  usagePercent: number;
  usedTokens: number;
  maxTokens: number;
  contextLength: number;
  needsSummarization: boolean;
}

// Indicadores de recursos usados na resposta
export interface UsageIndicators {
  usedWorkspaceRag: boolean;
  usedAgentRag: boolean;
  usedWebSearch: boolean;
  // Indica a fonte de análise de mídia: 'native' = modelo multimodal, 'gemini' = API Gemini
  mediaAnalysisSource?: 'native' | 'gemini';
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (sources?: SearchSource[]) => void;
  onError: (error: Error) => void;
  onSearchStep?: (step: SearchStep) => void;
  onSearchSources?: (sources: SearchSource[]) => void;
  // Thinking callbacks (para modelos com raciocínio como DeepSeek R1)
  onThinkingStart?: () => void;
  onThinkingToken?: (token: string) => void;
  onThinkingEnd?: () => void;
  // Media transcription callback
  onMediaTranscribed?: (transcription: string) => void;
  // Context info callback
  onContextInfo?: (info: ContextInfo) => void;
  // Summarization callback
  onSummarization?: (message: string) => void;
  // MCP tool callbacks
  onMcpToolCall?: (data: {
    server_id: string;
    server_name: string;
    tool_name: string;
    arguments: Record<string, unknown>;
  }) => void;
  onMcpToolResult?: (data: {
    server_id: string;
    server_name: string;
    tool_name: string;
    success: boolean;
    result?: unknown;
    error?: string;
    execution_time_ms?: number;
  }) => void;
  // Data Tool callbacks (SQL Tool Nativa)
  onDataToolCall?: (data: {
    tool_name: DataToolName;
    arguments: Record<string, unknown>;
  }) => void;
  onDataToolResult?: (data: {
    tool_name: DataToolName;
    success: boolean;
    data_count?: number;
    rows_affected?: number;
    error?: string;
    execution_time_ms?: number;
  }) => void;
}

// Busca o uso de contexto de uma conversa sem enviar mensagem
export async function getContextUsage(
  conversationId: string,
  workspaceId: string
): Promise<ContextInfo | null> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  if (!token) {
    console.error('Not authenticated');
    return null;
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/ai-assistant-chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'get_context',
          conversation_id: conversationId,
          workspace_id: workspaceId,
        }),
      }
    );

    if (!response.ok) {
      console.error('Error fetching context usage:', response.status);
      return null;
    }

    const data = await response.json();
    return {
      usagePercent: data.usage_percent || 0,
      usedTokens: data.used_tokens || 0,
      maxTokens: data.max_tokens || 0,
      contextLength: data.context_length || 0,
      needsSummarization: data.needs_summarization || false,
    };
  } catch (error) {
    console.error('Error fetching context usage:', error);
    return null;
  }
}

// Força a compactação do contexto de uma conversa
export async function forceCompactContext(
  conversationId: string,
  workspaceId: string
): Promise<{ compacted: boolean; messagesDeleted?: number; error?: string }> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  if (!token) {
    console.error('Not authenticated');
    return { compacted: false, error: 'Not authenticated' };
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/ai-assistant-chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'force_compact',
          conversation_id: conversationId,
          workspace_id: workspaceId,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return { compacted: false, error: data.error || 'Unknown error' };
    }

    return {
      compacted: data.compacted,
      messagesDeleted: data.messages_deleted,
    };
  } catch (error) {
    console.error('Error forcing context compact:', error);
    return { compacted: false, error: String(error) };
  }
}

export async function sendMessageStream(
  conversationId: string,
  message: string,
  workspaceId: string,
  onToken: (token: string) => void,
  onComplete: (finalMessage?: string) => void,
  onError: (error: Error) => void,
  onSearchStep?: (step: SearchStep) => void,
  onSearchSources?: (sources: SearchSource[]) => void,
  mediaUrl?: string,
  contentType?: 'image' | 'audio',
  // Thinking callbacks
  onThinkingStart?: () => void,
  onThinkingToken?: (token: string) => void,
  onThinkingEnd?: () => void,
  // Media transcription callback
  onMediaTranscribed?: (transcription: string) => void,
  // Abort signal para cancelar o stream
  abortSignal?: AbortSignal,
  // RAG search flag (workspace conversations)
  useRag?: boolean,
  // Context info callback
  onContextInfo?: (info: ContextInfo) => void,
  // Summarization callback
  onSummarization?: (message: string) => void,
  // Agent RAG search flag (agent documents)
  useAgentRag?: boolean,
  // Usage indicators callback (quais recursos foram usados)
  onUsageIndicators?: (indicators: UsageIndicators) => void,
  // Web search flag (busca na internet via Tavily)
  useWebSearch?: boolean,
  // MCP tool callbacks
  onMcpToolCall?: (data: {
    server_id: string;
    server_name: string;
    tool_name: string;
    arguments: Record<string, unknown>;
  }) => void,
  onMcpToolResult?: (data: {
    server_id: string;
    server_name: string;
    tool_name: string;
    success: boolean;
    result?: unknown;
    error?: string;
    execution_time_ms?: number;
  }) => void,
  // Data Tool callbacks (SQL Tool Nativa)
  onDataToolCall?: (data: {
    tool_name: DataToolName;
    arguments: Record<string, unknown>;
  }) => void,
  onDataToolResult?: (data: {
    tool_name: DataToolName;
    success: boolean;
    data_count?: number;
    rows_affected?: number;
    error?: string;
    execution_time_ms?: number;
  }) => void
): Promise<void> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  if (!token) {
    onError(new Error('Not authenticated'));
    return;
  }

  let searchStartTime: number | null = null;
  let accumulatedMessage = ''; // Mensagem completa acumulada
  let pendingUsageIndicators: UsageIndicators | null = null; // Indicadores de uso aguardando processamento

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/ai-assistant-chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          message,
          workspace_id: workspaceId,
          media_url: mediaUrl,
          content_type: contentType,
          use_rag: useRag,
          use_agent_rag: useAgentRag,
          use_web_search: useWebSearch,
        }),
        signal: abortSignal,
      }
    );

    if (!response.ok) {
      // Tentar ler o corpo do erro para mais detalhes
      let errorDetails = '';
      try {
        const errorBody = await response.text();
        const parsed = JSON.parse(errorBody);
        errorDetails = parsed.error || parsed.message || errorBody;
      } catch {
        errorDetails = response.statusText;
      }
      console.error(`[ai-assistant-service] API error: ${response.status}`, errorDetails);
      throw new Error(`Erro ${response.status}: ${errorDetails}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    let finalSources: SearchSource[] = [];
    let buffer = ''; // Buffer para chunks incompletos

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Adiciona o novo chunk ao buffer
      buffer += decoder.decode(value, { stream: true });

      // Processa linhas completas (terminadas com \n)
      const lines = buffer.split('\n');
      // Mantém a última linha no buffer (pode estar incompleta)
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() && line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            console.log('[SSE [DONE]] pendingUsageIndicators:', pendingUsageIndicators);
            // Chamar callback de indicadores se houver
            if (onUsageIndicators && pendingUsageIndicators) {
              console.log('[SSE [DONE]] Calling onUsageIndicators with:', pendingUsageIndicators);
              onUsageIndicators(pendingUsageIndicators);
            }
            onComplete(accumulatedMessage || undefined);
            continue;
          }

          try {
            const parsed = JSON.parse(data);

            // Handle different event types
            switch (parsed.type) {
              // Eventos de mídia - captura a fonte de análise (native ou gemini)
              // O processamento de mídia é mostrado inline no MessageBubble
              case 'media_processing':
                // Captura a fonte de análise de mídia quando o status é 'completed'
                if (parsed.source && parsed.status === 'completed') {
                  // Inicializa pendingUsageIndicators se necessário
                  if (!pendingUsageIndicators) {
                    pendingUsageIndicators = {
                      usedWorkspaceRag: false,
                      usedAgentRag: false,
                      usedWebSearch: false,
                    };
                  }
                  pendingUsageIndicators.mediaAnalysisSource = parsed.source;
                  console.log('[SSE media_processing] Set mediaAnalysisSource:', parsed.source);
                }
                break;

              case 'media_transcription_source':
                // Evento específico para indicar fonte de transcrição (gemini)
                if (parsed.source) {
                  if (!pendingUsageIndicators) {
                    pendingUsageIndicators = {
                      usedWorkspaceRag: false,
                      usedAgentRag: false,
                      usedWebSearch: false,
                    };
                  }
                  pendingUsageIndicators.mediaAnalysisSource = parsed.source;
                  console.log('[SSE media_transcription_source] Set mediaAnalysisSource:', parsed.source);
                }
                break;

              case 'media_transcribed':
                if (onMediaTranscribed && parsed.transcription) {
                  onMediaTranscribed(parsed.transcription);
                }
                break;

              // Evento de decisão de busca - só mostra se REALMENTE vai buscar
              case 'search_decision':
                if (onSearchStep && parsed.needs_search) {
                  searchStartTime = Date.now();
                  onSearchStep({
                    id: `decision_${Date.now()}`,
                    type: 'thinking',
                    message: 'Buscando informações atualizadas...',
                    timestamp: new Date(),
                    details: { query: parsed.query },
                  });
                }
                break;

              case 'tavily_tool_call':
                if (onSearchStep) {
                  onSearchStep({
                    id: parsed.tool_id || `tool_call_${Date.now()}`,
                    type: 'tool_call',
                    message: `Pesquisando: "${parsed.query}"`,
                    timestamp: new Date(),
                    details: {
                      query: parsed.query,
                      toolId: parsed.tool_id,
                    },
                  });
                }
                break;

              case 'tavily_tool_response':
                if (onSearchStep) {
                  const duration = searchStartTime ? (Date.now() - searchStartTime) / 1000 : 0;
                  onSearchStep({
                    id: parsed.tool_id || `tool_response_${Date.now()}`,
                    type: 'tool_response',
                    message: parsed.status === 'completed' ? 'Busca concluída' : 'Erro na busca',
                    timestamp: new Date(),
                    duration: parsed.duration || duration,
                  });
                  searchStartTime = Date.now();
                }
                break;

              case 'tavily_content':
                if (onSearchStep) {
                  onSearchStep({
                    id: `analyzing_${Date.now()}`,
                    type: 'analyzing',
                    message: `Analisando ${parsed.sources?.length || 0} resultados`,
                    timestamp: new Date(),
                    details: {
                      resultsCount: parsed.sources?.length || 0,
                      sources: parsed.sources,
                    },
                  });
                }
                if (onSearchSources && parsed.sources) {
                  finalSources = parsed.sources;
                  onSearchSources(parsed.sources);
                }
                break;

              case 'token':
                if (parsed.content) {
                  accumulatedMessage += parsed.content;
                  onToken(parsed.content);
                }
                break;

              // Eventos de Thinking/Reasoning (DeepSeek R1, Qwen3 Thinking, etc.)
              case 'thinking_start':
                if (onThinkingStart) {
                  onThinkingStart();
                }
                break;

              case 'thinking_token':
                if (onThinkingToken && parsed.content) {
                  onThinkingToken(parsed.content);
                }
                break;

              case 'thinking_end':
                if (onThinkingEnd) {
                  onThinkingEnd();
                }
                break;

              // Context info event
              case 'context_info':
                if (onContextInfo) {
                  onContextInfo({
                    usagePercent: parsed.usage_percent || 0,
                    usedTokens: parsed.used_tokens || 0,
                    maxTokens: parsed.max_tokens || 0,
                    contextLength: parsed.context_length || 0,
                    needsSummarization: parsed.needs_summarization || false,
                  });
                }
                break;

              // Summarization event
              case 'summarization':
                if (onSummarization && parsed.message) {
                  onSummarization(parsed.message);
                }
                break;

              // MCP tool events
              case 'mcp_tool_call':
                console.log('[SSE mcp_tool_call] Received:', parsed);
                if (onMcpToolCall) {
                  console.log('[SSE mcp_tool_call] Calling onMcpToolCall callback');
                  onMcpToolCall({
                    server_id: parsed.server_id,
                    server_name: parsed.server_name,
                    tool_name: parsed.tool_name,
                    arguments: parsed.arguments || {},
                  });
                } else {
                  console.log('[SSE mcp_tool_call] No callback provided');
                }
                break;

              case 'mcp_tool_result':
                console.log('[SSE mcp_tool_result] Received:', parsed);
                if (onMcpToolResult) {
                  console.log('[SSE mcp_tool_result] Calling onMcpToolResult callback');
                  onMcpToolResult({
                    server_id: parsed.server_id,
                    server_name: parsed.server_name,
                    tool_name: parsed.tool_name,
                    success: parsed.success || false,
                    result: parsed.result,
                    error: parsed.error,
                    execution_time_ms: parsed.execution_time_ms,
                  });
                } else {
                  console.log('[SSE mcp_tool_result] No callback provided');
                }
                break;

              // Data Tool events (SQL Tool Nativa)
              case 'data_tool_call':
                console.log('[SSE data_tool_call] Received:', parsed);
                if (onDataToolCall) {
                  console.log('[SSE data_tool_call] Calling onDataToolCall callback');
                  onDataToolCall({
                    tool_name: parsed.tool_name,
                    arguments: parsed.arguments || {},
                  });
                } else {
                  console.log('[SSE data_tool_call] No callback provided');
                }
                break;

              case 'data_tool_result':
                console.log('[SSE data_tool_result] Received:', parsed);
                if (onDataToolResult) {
                  console.log('[SSE data_tool_result] Calling onDataToolResult callback');
                  onDataToolResult({
                    tool_name: parsed.tool_name,
                    success: parsed.success || false,
                    data_count: parsed.data_count,
                    rows_affected: parsed.rows_affected,
                    error: parsed.error,
                    execution_time_ms: parsed.execution_time_ms,
                  });
                } else {
                  console.log('[SSE data_tool_result] No callback provided');
                }
                break;

              case 'done':
                console.log('[SSE done event] Raw parsed:', JSON.stringify(parsed));
                if (parsed.sources) {
                  finalSources = parsed.sources;
                }
                // Só envia evento de complete se houve busca (tem sources)
                if (onSearchStep && finalSources.length > 0) {
                  onSearchStep({
                    id: `complete_${Date.now()}`,
                    type: 'complete',
                    message: 'Busca concluída',
                    timestamp: new Date(),
                  });
                }
                // Armazena indicadores de uso para serem processados no [DONE]
                // Isso garante que os indicadores estejam disponíveis antes de onComplete
                pendingUsageIndicators = {
                  usedWorkspaceRag: parsed.used_workspace_rag || false,
                  usedAgentRag: parsed.used_agent_rag || false,
                  usedWebSearch: parsed.used_web_search || false,
                };
                console.log('[SSE done event] pendingUsageIndicators:', pendingUsageIndicators);
                break;

              default:
                // Fallback para formato antigo (compatibilidade)
                const tokenContent = parsed.choices?.[0]?.delta?.content;
                if (tokenContent) {
                  accumulatedMessage += tokenContent;
                  onToken(tokenContent);
                }
            }
          } catch (e) {
            // Ignora erros de parse silenciosamente - pode ser um chunk intermediário
            // que será completado no próximo read
            if (process.env.NODE_ENV === 'development') {
              console.debug('[SSE] Parse error (may be incomplete chunk):', data.substring(0, 50));
            }
          }
        }
      }
    }

    // Processa qualquer dado restante no buffer
    if (buffer.trim() && buffer.startsWith('data: ')) {
      const data = buffer.slice(6);
      if (data !== '[DONE]') {
        try {
          const parsed = JSON.parse(data);
          const tokenContent = parsed.choices?.[0]?.delta?.content;
          if (tokenContent) {
            accumulatedMessage += tokenContent;
            onToken(tokenContent);
          }
        } catch {
          // Ignora - buffer incompleto no final
        }
      }
    }

  } catch (error) {
    // Se foi abortado pelo usuário, não é um erro real
    if (error instanceof Error && error.name === 'AbortError') {
      onComplete(accumulatedMessage || undefined); // Passa a mensagem acumulada mesmo ao abortar
      return;
    }
    console.error('Stream error:', error);
    onError(error as Error);
  }
}

// ============================================================================
// Configuration
// ============================================================================

export async function getConfiguration(
  workspaceId: string
): Promise<AIConfiguration | null> {
  const { data, error } = await supabase
    .from('ai_configuration')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single();

  if (error) {
    console.error('Error fetching configuration:', error);
    return null;
  }

  return data;
}

export async function updateConfiguration(
  workspaceId: string,
  input: UpdateConfigurationInput
): Promise<{ config: AIConfiguration | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('ai_configuration')
    .update(input)
    .eq('workspace_id', workspaceId)
    .select()
    .single();

  if (error) {
    console.error('Error updating configuration:', error);
    return { config: null, error };
  }

  return { config: data, error: null };
}

// ============================================================================
// Media Upload
// ============================================================================

export async function uploadMedia(
  file: File | Blob,
  workspaceId: string,
  contentType: MediaContentType
): Promise<{ url: string | null; error: Error | null }> {
  try {
    const ext = contentType === 'image'
      ? (file instanceof File ? file.name.split('.').pop() || 'jpg' : 'jpg')
      : 'webm';
    const path = `${workspaceId}/${crypto.randomUUID()}.${ext}`;

    const mimeType = contentType === 'image'
      ? (file instanceof File ? file.type : 'image/jpeg')
      : 'audio/webm';

    const { error: uploadError } = await supabase.storage
      .from('ai-assistant-media')
      .upload(path, file, {
        contentType: mimeType,
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Error uploading media:', uploadError);
      return { url: null, error: uploadError };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('ai-assistant-media')
      .getPublicUrl(path);

    return { url: publicUrl, error: null };
  } catch (error) {
    console.error('Upload media error:', error);
    return { url: null, error: error as Error };
  }
}

// ============================================================================
// Available Models (Dynamic from Chutes.ai)
// ============================================================================

let cachedModels: ChutesModel[] | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export async function getAvailableModels(): Promise<ChutesModel[]> {
  // Retornar cache se ainda válido
  if (cachedModels && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedModels;
  }

  // Sempre buscar da API - sem fallback
  const response = await fetch('https://llm.chutes.ai/v1/models');

  if (!response.ok) {
    throw new Error(`Erro ao buscar modelos: ${response.statusText}`);
  }

  const data: ChutesModelsResponse = await response.json();

  if (!data.data || !Array.isArray(data.data)) {
    throw new Error('Resposta inválida da API de modelos');
  }

  // Atualizar cache
  cachedModels = data.data;
  cacheTimestamp = Date.now();

  return data.data;
}

// ============================================================================
// Image Generation
// ============================================================================

export interface ImageGenerationConfig {
  mode: 'text-to-image' | 'image-to-image';
  prompt: string;
  negative_prompt?: string;
  style?: 'logo' | 'realistic' | 'photography' | 'digital_art' | 'anime' | 'painting' | '3d_render';
  width: number;
  height: number;
  num_inference_steps: number;
  seed?: number;
  // Modelo de IA - ID do modelo (e.g. 'flux-schnell', 'dreamshaper', 'hunyuan')
  model_id?: string;
  // Para img2img
  reference_image?: File;
  strength?: number;
}

export interface ImageGenerationResult {
  success: boolean;
  message_id?: string;
  image_url?: string;
  generation_time_ms?: number;
  error?: string;
}

const AI_IMAGE_GENERATION_URL = `${SUPABASE_URL}/functions/v1/ai-image-generation`;

export async function generateImage(
  conversationId: string,
  workspaceId: string,
  config: ImageGenerationConfig
): Promise<ImageGenerationResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    let body: Record<string, unknown>;

    if (config.mode === 'image-to-image' && config.reference_image) {
      // Converter imagem de referência para base64
      const base64 = await fileToBase64(config.reference_image);

      body = {
        mode: config.mode,
        conversation_id: conversationId,
        workspace_id: workspaceId,
        prompt: config.prompt,
        negative_prompt: config.negative_prompt,
        style: config.style,
        width: config.width,
        height: config.height,
        num_inference_steps: config.num_inference_steps,
        seed: config.seed,
        model_id: config.model_id,
        strength: config.strength ?? 0.7,
        reference_image_base64: base64,
        reference_image_type: config.reference_image.type,
      };
    } else {
      body = {
        mode: config.mode,
        conversation_id: conversationId,
        workspace_id: workspaceId,
        prompt: config.prompt,
        negative_prompt: config.negative_prompt,
        style: config.style,
        width: config.width,
        height: config.height,
        num_inference_steps: config.num_inference_steps,
        seed: config.seed,
        model_id: config.model_id,
      };
    }

    const response = await fetch(AI_IMAGE_GENERATION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (!result.success) {
      return { success: false, error: result.error || 'Erro ao gerar imagem' };
    }

    return {
      success: true,
      message_id: result.message_id,
      image_url: result.image_url,
      generation_time_ms: result.generation_time_ms,
    };
  } catch (error) {
    console.error('[generateImage] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

// Helper para converter File para base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove o prefixo "data:xxx;base64,"
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ============================================================================
// Realtime Subscriptions (opcional para MVP)
// ============================================================================

export function subscribeToConversation(
  conversationId: string,
  onMessage: (message: AIMessage) => void
) {
  const subscription = supabase
    .channel(`conversation:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'ai_messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onMessage(payload.new as AIMessage);
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}
