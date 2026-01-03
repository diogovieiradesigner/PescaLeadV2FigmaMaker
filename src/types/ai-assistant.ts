// ============================================================================
// AI Assistant Types
// ============================================================================

// Forward declaration para evitar referência circular
export interface AICustomAgentBasic {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface AIConversation {
  id: string;
  workspace_id: string;
  user_id: string;
  title: string;
  model_id?: string; // ID do modelo personalizado para esta conversa (null = usar padrão)
  agent_id?: string; // ID do agente personalizado usado nesta conversa
  created_at: string;
  updated_at: string;
  // Join com ai_custom_agents (opcional, apenas dados básicos para exibição)
  agent?: AICustomAgentBasic;
}

// Definido antes de AIMessage para evitar erro de referência
export interface SearchSource {
  title: string;
  url: string;
  content?: string;
  score?: number;
  favicon?: string;
}

// MCP Tool Call (persiste no banco como JSONB array)
export interface McpToolCallRecord {
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

// Data Tool Call (persiste no banco como JSONB array)
// Simplificado: apenas 2 tools - get_schema e execute_query
export type DataToolName =
  | 'get_schema'
  | 'execute_query';

export interface DataToolCallRecord {
  id: string;
  tool_name: DataToolName;
  arguments: Record<string, unknown>;
  status: 'completed' | 'failed';
  result?: {
    data_count?: number;
    query_executed?: string;
    error?: string;
  };
  execution_time_ms?: number;
}

// Dados de geração de imagem (salvos na coluna image_generation_data)
export interface ImageGenerationData {
  mode: 'text-to-image' | 'image-to-image';
  prompt: string;
  negative_prompt?: string;
  style?: string;
  width: number;
  height: number;
  guidance_scale: number;
  num_inference_steps: number;
  seed?: number;
  strength?: number; // Apenas para img2img
  generation_time_ms?: number;
  model_id?: string; // ID do modelo: 'flux-schnell', 'flux-dev', 'sdxl', 'dreamshaper', 'hunyuan', etc.
  model?: string; // ID técnico do modelo para API
  model_name?: string; // Nome amigável do modelo para exibição
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
  // Search sources (persiste no banco como JSONB)
  sources?: SearchSource[];
  // Thinking/Reasoning content (para modelos como DeepSeek R1)
  thinking_content?: string;
  // RAG indicators (persiste no banco como BOOLEAN)
  used_workspace_rag?: boolean; // Indica se usou RAG do workspace (conversas anteriores)
  used_agent_rag?: boolean; // Indica se usou RAG do agente (documentos)
  used_web_search?: boolean; // Indica se usou busca na web
  // Media analysis source: 'native' = modelo multimodal Chutes, 'gemini' = API Gemini
  media_analysis_source?: 'native' | 'gemini';
  // MCP Tool Calls (persiste no banco como JSONB array)
  mcp_tool_calls?: McpToolCallRecord[];
  // Image generation data (para mensagens de imagem gerada)
  image_generation_data?: ImageGenerationData;
  // Data Tool Calls (persiste no banco como JSONB array)
  data_tool_calls?: DataToolCallRecord[];
  used_data_tools?: boolean;
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
  data_tools_enabled: boolean; // Habilita Data Tools para consultas ao banco de dados
  created_at: string;
  updated_at: string;
}

// Input types for creating/updating
export interface CreateConversationInput {
  workspace_id: string;
  user_id: string;
  title?: string;
  agent_id?: string; // ID do agente personalizado a usar
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
  data_tools_enabled?: boolean;
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

// ============================================================================
// Custom Agents Types (AI Agents personalizados)
// ============================================================================

export interface AICustomAgent {
  id: string;
  workspace_id: string;
  user_id: string;
  name: string;
  description?: string;
  icon: string; // lucide icon name
  color: string; // hex color
  system_prompt: string;
  model_id?: string;
  temperature?: number;
  web_search_enabled: boolean;
  is_public: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAgentInput {
  workspace_id: string;
  user_id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  system_prompt: string;
  model_id?: string;
  temperature?: number;
  web_search_enabled?: boolean;
  is_public?: boolean;
}

export interface UpdateAgentInput {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  system_prompt?: string;
  model_id?: string;
  temperature?: number;
  web_search_enabled?: boolean;
  is_public?: boolean;
}

// Lista de ícones disponíveis para agentes
export const AGENT_ICONS = [
  'bot',
  'brain',
  'sparkles',
  'zap',
  'rocket',
  'lightbulb',
  'code',
  'pencil',
  'book-open',
  'graduation-cap',
  'briefcase',
  'calculator',
  'chart-bar',
  'globe',
  'heart',
  'message-circle',
  'search',
  'shield',
  'star',
  'target',
  'terminal',
  'user',
  'users',
  'wand-2',
] as const;

// Lista de cores disponíveis para agentes
export const AGENT_COLORS = [
  '#0169D9', // Azul (padrão)
  '#10B981', // Verde
  '#F59E0B', // Amarelo
  '#EF4444', // Vermelho
  '#8B5CF6', // Roxo
  '#EC4899', // Rosa
  '#06B6D4', // Ciano
  '#F97316', // Laranja
  '#6366F1', // Índigo
  '#14B8A6', // Teal
] as const;

// ============================================================================
// Data Tools SSE Events (SQL Tool Nativa para Assistente de IA)
// ============================================================================

/**
 * Evento SSE: Data Tool sendo chamada
 */
export interface SSEDataToolCallEvent {
  type: 'data_tool_call';
  tool_name: DataToolName;
  arguments: Record<string, unknown>;
}

/**
 * Evento SSE: Resultado da Data Tool
 */
export interface SSEDataToolResultEvent {
  type: 'data_tool_result';
  tool_name: DataToolName;
  success: boolean;
  data_count?: number;
  rows_affected?: number;
  error?: string;
  execution_time_ms?: number;
}
