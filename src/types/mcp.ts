// ============================================================================
// MCP (Model Context Protocol) Types
// ============================================================================

/**
 * Configuração de um servidor MCP
 */
export interface McpServerConfig {
  id: string;
  workspace_id: string;
  user_id: string;
  name: string;
  description?: string;
  icon: string;
  server_url: string;
  transport_type: 'http' | 'sse';
  auth_type: 'none' | 'bearer' | 'api_key' | 'oauth2';
  auth_header_name: string;
  is_enabled: boolean;
  is_public: boolean;
  capabilities: McpCapabilities;
  last_sync_at?: string;
  sync_error?: string;
  created_at: string;
  updated_at: string;
  tools?: McpTool[];
}

/**
 * Capabilities retornadas pelo MCP server
 */
export interface McpCapabilities {
  tools?: McpToolDefinition[];
  resources?: McpResource[];
  prompts?: McpPrompt[];
}

/**
 * Definição de uma ferramenta MCP (do servidor)
 */
export interface McpToolDefinition {
  name: string;
  description?: string;
  inputSchema?: {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Ferramenta MCP armazenada no banco
 */
export interface McpTool {
  id: string;
  mcp_server_id: string;
  tool_name: string;
  description?: string;
  input_schema?: Record<string, unknown>;
  is_enabled: boolean;
  created_at: string;
}

/**
 * Recurso MCP (para futuro)
 */
export interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

/**
 * Prompt MCP (para futuro)
 */
export interface McpPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

/**
 * Log de execução de ferramenta
 */
export interface McpToolExecution {
  id: string;
  conversation_id?: string;
  message_id?: string;
  mcp_server_id?: string;
  user_id: string;
  tool_name: string;
  input_data?: Record<string, unknown>;
  output_data?: Record<string, unknown>;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  error_message?: string;
  execution_time_ms?: number;
  created_at: string;
}

// ============================================================================
// Formulários e Inputs
// ============================================================================

/**
 * Dados para criar um novo servidor MCP
 */
export interface CreateMcpServerInput {
  workspace_id: string;
  name: string;
  description?: string;
  icon?: string;
  server_url: string;
  transport_type?: 'http' | 'sse';
  auth_type?: 'none' | 'bearer' | 'api_key' | 'oauth2';
  auth_token?: string;
  auth_header_name?: string;
  is_public?: boolean;
}

/**
 * Dados para atualizar um servidor MCP
 */
export interface UpdateMcpServerInput {
  name?: string;
  description?: string;
  icon?: string;
  server_url?: string;
  transport_type?: 'http' | 'sse';
  auth_type?: 'none' | 'bearer' | 'api_key' | 'oauth2';
  auth_token?: string;
  auth_header_name?: string;
  is_enabled?: boolean;
  is_public?: boolean;
}

// ============================================================================
// Respostas da API
// ============================================================================

/**
 * Resultado do teste de conexão
 */
export interface TestConnectionResult {
  success: boolean;
  latency_ms?: number;
  protocol_version?: string;
  tools_count?: number;
  tools?: McpToolDefinition[];
  error?: string;
}

/**
 * Resultado da execução de uma ferramenta
 */
export interface ExecuteToolResult {
  success: boolean;
  result?: unknown;
  execution_time_ms?: number;
  error?: string;
}

/**
 * Ferramenta habilitada para uso no chat
 */
export interface EnabledTool {
  server_id: string;
  server_name: string;
  tool_name: string;
  description?: string;
  input_schema?: Record<string, unknown>;
}

// ============================================================================
// Eventos SSE
// ============================================================================

/**
 * Evento SSE: LLM decidiu chamar uma ferramenta
 */
export interface McpToolCallEvent {
  type: 'mcp_tool_call';
  server_id: string;
  server_name: string;
  tool_name: string;
  arguments: Record<string, unknown>;
}

/**
 * Evento SSE: Resultado da execução da ferramenta
 */
export interface McpToolResultEvent {
  type: 'mcp_tool_result';
  server_id: string;
  server_name: string;
  tool_name: string;
  success: boolean;
  result?: unknown;
  error?: string;
  execution_time_ms?: number;
}

/**
 * Evento SSE: Erro na execução
 */
export interface McpToolErrorEvent {
  type: 'mcp_tool_error';
  server_id: string;
  tool_name: string;
  error: string;
}

/**
 * Union de todos os eventos MCP
 */
export type McpEvent = McpToolCallEvent | McpToolResultEvent | McpToolErrorEvent;

// ============================================================================
// Estado do Hook
// ============================================================================

/**
 * Estado do hook useMcpServers
 */
export interface McpServersState {
  servers: McpServerConfig[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Ações do hook useMcpServers
 */
export interface McpServersActions {
  refresh: () => Promise<void>;
  addServer: (input: CreateMcpServerInput) => Promise<McpServerConfig>;
  updateServer: (serverId: string, input: UpdateMcpServerInput) => Promise<McpServerConfig>;
  deleteServer: (serverId: string) => Promise<void>;
  syncServer: (serverId: string) => Promise<McpServerConfig>;
  testConnection: (serverUrl: string, authType?: string, authToken?: string) => Promise<TestConnectionResult>;
  toggleServer: (serverId: string, enabled: boolean) => Promise<void>;
}
