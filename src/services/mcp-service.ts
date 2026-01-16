/**
 * MCP (Model Context Protocol) Service
 * Gerencia servidores MCP e ferramentas
 */

import { SUPABASE_URL } from '../utils/api-config';
import { supabase } from '../utils/supabase/client';
import type {
  McpServerConfig,
  CreateMcpServerInput,
  UpdateMcpServerInput,
  TestConnectionResult,
  ExecuteToolResult,
  EnabledTool,
} from '../types/mcp';

const MCP_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/mcp-manager`;

/**
 * Chama a Edge Function do MCP Manager
 */
async function callMcpFunction<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(MCP_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ action, ...params }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  return data as T;
}

// ============================================================================
// Server Management
// ============================================================================

/**
 * Lista todos os servidores MCP do workspace
 */
export async function listMcpServers(workspaceId: string): Promise<McpServerConfig[]> {
  const result = await callMcpFunction<{ servers: McpServerConfig[] }>('list_servers', {
    workspace_id: workspaceId,
  });
  return result.servers;
}

/**
 * Cria um novo servidor MCP
 */
export async function createMcpServer(input: CreateMcpServerInput): Promise<McpServerConfig> {
  const result = await callMcpFunction<{ server: McpServerConfig }>('create_server', input);
  return result.server;
}

/**
 * Atualiza um servidor MCP
 */
export async function updateMcpServer(
  serverId: string,
  input: UpdateMcpServerInput
): Promise<McpServerConfig> {
  const result = await callMcpFunction<{ server: McpServerConfig }>('update_server', {
    server_id: serverId,
    ...input,
  });
  return result.server;
}

/**
 * Deleta um servidor MCP
 */
export async function deleteMcpServer(serverId: string): Promise<void> {
  await callMcpFunction<{ success: boolean }>('delete_server', {
    server_id: serverId,
  });
}

/**
 * Sincroniza as capabilities de um servidor MCP
 */
export async function syncMcpServer(serverId: string): Promise<McpServerConfig> {
  const result = await callMcpFunction<{ server: McpServerConfig }>('sync_capabilities', {
    server_id: serverId,
  });
  return result.server;
}

/**
 * Testa a conexão com um servidor MCP
 */
export async function testMcpConnection(
  serverUrl: string,
  authType?: string,
  authToken?: string,
  authHeaderName?: string
): Promise<TestConnectionResult> {
  return callMcpFunction<TestConnectionResult>('test_connection', {
    server_url: serverUrl,
    auth_type: authType || 'none',
    auth_token: authToken,
    auth_header_name: authHeaderName,
  });
}

/**
 * Ativa/desativa um servidor MCP
 */
export async function toggleMcpServer(serverId: string, enabled: boolean): Promise<McpServerConfig> {
  return updateMcpServer(serverId, { is_enabled: enabled });
}

// ============================================================================
// Tool Execution
// ============================================================================

/**
 * Executa uma ferramenta MCP
 */
export async function executeMcpTool(
  serverId: string,
  toolName: string,
  args: Record<string, unknown>,
  conversationId?: string,
  messageId?: string
): Promise<ExecuteToolResult> {
  return callMcpFunction<ExecuteToolResult>('execute_tool', {
    server_id: serverId,
    tool_name: toolName,
    arguments: args,
    conversation_id: conversationId,
    message_id: messageId,
  });
}

/**
 * Lista todas as ferramentas habilitadas do workspace
 */
export async function getEnabledTools(workspaceId: string): Promise<EnabledTool[]> {
  const result = await callMcpFunction<{ tools: EnabledTool[] }>('get_enabled_tools', {
    workspace_id: workspaceId,
  });
  return result.tools;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Formata o nome da ferramenta para o LLM
 * Formato: mcp_{server_id}_{tool_name}
 */
export function formatToolName(serverId: string, toolName: string): string {
  // Remove caracteres especiais do server_id (mantém apenas alfanuméricos)
  const cleanServerId = serverId.replace(/-/g, '').slice(0, 8);
  // Remove caracteres especiais do tool_name
  const cleanToolName = toolName.replace(/[^a-zA-Z0-9_]/g, '_');
  return `mcp_${cleanServerId}_${cleanToolName}`;
}

/**
 * Extrai server_id e tool_name de um nome formatado
 */
export function parseToolName(formattedName: string): { serverId: string; toolName: string } | null {
  const match = formattedName.match(/^mcp_([a-f0-9]+)_(.+)$/);
  if (!match) return null;
  return {
    serverId: match[1],
    toolName: match[2],
  };
}

/**
 * Converte ferramentas MCP para formato OpenAI tools
 */
export function convertToOpenAITools(tools: EnabledTool[]): Array<{
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}> {
  return tools.map((tool) => ({
    type: 'function' as const,
    function: {
      name: formatToolName(tool.server_id, tool.tool_name),
      description: `[${tool.server_name}] ${tool.description || tool.tool_name}`,
      parameters: tool.input_schema || {
        type: 'object',
        properties: {},
      },
    },
  }));
}
