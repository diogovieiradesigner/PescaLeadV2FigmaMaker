// ============================================================================
// AI Assistant Types
// ============================================================================

export interface AIConversation {
  id: string;
  workspace_id: string;
  user_id: string;
  title: string;
  model_id?: string; // ID do modelo personalizado para esta conversa (null = usar padrão)
  created_at: string;
  updated_at: string;
}

// Definido antes de AIMessage para evitar erro de referência
export interface SearchSource {
  title: string;
  url: string;
  content?: string;
  score?: number;
  favicon?: string;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  tokens_used: number;
  created_at: string;
  // Media fields
  media_url?: string;
  content_type?: 'image' | 'audio' | 'video';
  transcription?: string;
  transcription_status?: 'pending' | 'processing' | 'completed' | 'failed' | 'disabled';
  // Search sources (apenas em memória, não persiste no banco)
  sources?: SearchSource[];
  // Thinking/Reasoning content (para modelos como DeepSeek R1)
  thinking_content?: string;
}

// ============================================================================
// Media Types
// ============================================================================

export type MediaContentType = 'image' | 'audio';

export interface MediaAttachment {
  file: File | Blob;
  type: MediaContentType;
  preview?: string; // Data URL for image preview
}

export interface AIConfiguration {
  id: string;
  workspace_id: string;
  model_id: string;
  system_message: string;
  temperature: number;
  max_tokens: number;
  created_at: string;
  updated_at: string;
}

// Input types for creating/updating
export interface CreateConversationInput {
  workspace_id: string;
  user_id: string;
  title?: string;
}

export interface CreateMessageInput {
  conversation_id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  tokens_used?: number;
}

export interface UpdateConfigurationInput {
  model_id?: string;
  system_message?: string;
  temperature?: number;
  max_tokens?: number;
}

// Chutes.ai API types - Estrutura completa da API
export interface ChutesModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  root?: string;
  parent?: string | null;
  quantization?: string; // bf16, fp8, int4, etc
  max_model_len?: number;
  context_length?: number;
  max_output_length?: number;
  input_modalities?: string[]; // ["text"], ["text", "image"], etc
  output_modalities?: string[];
  supported_features?: string[]; // ["json_mode", "tools", "structured_outputs", "reasoning", "vision"]
  confidential_compute?: boolean; // TEE
  supported_sampling_parameters?: string[];
  price?: {
    input: { tao: number; usd: number };
    output: { tao: number; usd: number };
  };
  pricing?: {
    prompt: number; // USD per 1M tokens
    completion: number;
  };
  chute_id?: string;
}

export interface ChutesModelsResponse {
  object: string;
  data: ChutesModel[];
}

// Modelo enriquecido com metadata de capacidades
export type ModelCapability = 'vision' | 'coding' | 'reasoning' | 'general' | 'tools';
export type ModelProvider = 'deepseek' | 'qwen' | 'mistral' | 'meta' | 'google' | 'nous' | 'microsoft' | 'other';

export interface EnrichedModel {
  id: string;
  name: string; // Nome amigável
  provider: ModelProvider;
  capabilities: ModelCapability[];
  contextLength: number; // Tamanho do contexto em tokens (da API)
  maxOutputLength?: number; // Máximo de tokens de saída
  quantization?: string; // bf16, fp8, int4
  speed?: 'fast' | 'medium' | 'slow'; // Velocidade relativa
  description?: string;
  pricing?: {
    input: number; // USD per 1M tokens
    output: number;
  };
  supportedFeatures?: string[]; // Features da API
  hasVision?: boolean; // Suporta imagens
  hasTEE?: boolean; // Computação confidencial
}

export interface StreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      content?: string;
      role?: string;
    };
    finish_reason: string | null;
  }>;
}

// ============================================================================
// Web Search Types (Tavily Integration)
// ============================================================================

// SearchSource já definido acima (antes de AIMessage)

export interface SearchStep {
  id: string;
  type: 'thinking' | 'searching' | 'tool_call' | 'tool_response' | 'analyzing' | 'complete';
  message: string;
  timestamp: Date;
  duration?: number; // em segundos
  details?: {
    query?: string;
    resultsCount?: number;
    sources?: SearchSource[];
    toolId?: string;
  };
}

export interface SearchProgress {
  isSearching: boolean;
  steps: SearchStep[];
  totalDuration?: number;
  sources: SearchSource[];
}

// SSE Event Types from backend
export type SSEEventType =
  | 'thinking'
  | 'thinking_start'
  | 'thinking_token'
  | 'thinking_end'
  | 'search_decision'
  | 'tavily_tool_call'
  | 'tavily_tool_response'
  | 'tavily_content'
  | 'token'
  | 'done';

export interface SSEThinkingEvent {
  type: 'thinking';
  content: string;
}

// Novos eventos para Reasoning/Thinking de modelos como DeepSeek R1
export interface SSEThinkingStartEvent {
  type: 'thinking_start';
}

export interface SSEThinkingTokenEvent {
  type: 'thinking_token';
  content: string;
}

export interface SSEThinkingEndEvent {
  type: 'thinking_end';
}

export interface SSESearchDecisionEvent {
  type: 'search_decision';
  needs_search: boolean;
  query?: string;
}

export interface SSETavilyToolCallEvent {
  type: 'tavily_tool_call';
  tool: string;
  tool_id: string;
  query: string;
}

export interface SSETavilyToolResponseEvent {
  type: 'tavily_tool_response';
  tool_id: string;
  status: 'completed' | 'failed';
}

export interface SSETavilyContentEvent {
  type: 'tavily_content';
  content: string;
  sources: SearchSource[];
}

export interface SSETokenEvent {
  type: 'token';
  content: string;
}

export interface SSEDoneEvent {
  type: 'done';
}

export type SSEEvent =
  | SSEThinkingEvent
  | SSEThinkingStartEvent
  | SSEThinkingTokenEvent
  | SSEThinkingEndEvent
  | SSESearchDecisionEvent
  | SSETavilyToolCallEvent
  | SSETavilyToolResponseEvent
  | SSETavilyContentEvent
  | SSETokenEvent
  | SSEDoneEvent;

// ============================================================================
// RAG Types (AI Assistant Knowledge Base)
// ============================================================================

export interface AssistantRagStore {
  id: string;
  workspace_id: string;
  external_store_id: string | null;
  total_documents: number;
  created_at: string;
  updated_at: string;
}

export interface AssistantRagDocument {
  id: string;
  store_id: string;
  conversation_id: string;
  external_file_id: string | null;
  title: string;
  message_count: number;
  imported_at: string;
  updated_at: string;
  // Join com ai_conversations
  conversation?: {
    title: string;
    created_at: string;
  };
}

export interface RagSearchResult {
  success: boolean;
  query: string;
  response: string;
  sources: Array<{
    content: string;
    title: string;
    uri: string;
  }>;
  context: string;
}
