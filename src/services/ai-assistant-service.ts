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
    .select()
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
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching conversations:', error);
    return [];
  }

  return data;
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
}

export async function sendMessageStream(
  conversationId: string,
  message: string,
  workspaceId: string,
  onToken: (token: string) => void,
  onComplete: (sources?: SearchSource[]) => void,
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
  // RAG search flag
  useRag?: boolean,
  // Context info callback
  onContextInfo?: (info: ContextInfo) => void,
  // Summarization callback
  onSummarization?: (message: string) => void
): Promise<void> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  if (!token) {
    onError(new Error('Not authenticated'));
    return;
  }

  let searchStartTime: number | null = null;

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
        }),
        signal: abortSignal,
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    let finalSources: SearchSource[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.trim() && line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            onComplete(finalSources);
            continue;
          }

          try {
            const parsed = JSON.parse(data);

            // Handle different event types
            switch (parsed.type) {
              // Eventos de mídia - NÃO mostram no painel do Tavily
              // O processamento de mídia é mostrado inline no MessageBubble
              case 'media_processing':
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

              case 'done':
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
                break;

              default:
                // Fallback para formato antigo (compatibilidade)
                const tokenContent = parsed.choices?.[0]?.delta?.content;
                if (tokenContent) {
                  onToken(tokenContent);
                }
            }
          } catch (e) {
            console.error('Parse error:', e);
          }
        }
      }
    }
  } catch (error) {
    // Se foi abortado pelo usuário, não é um erro real
    if (error instanceof Error && error.name === 'AbortError') {
      onComplete(); // Finaliza normalmente sem erro
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
