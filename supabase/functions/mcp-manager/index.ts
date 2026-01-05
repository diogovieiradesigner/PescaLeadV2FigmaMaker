import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// MCP Protocol version
const MCP_PROTOCOL_VERSION = "2024-11-05";

interface McpServerConfig {
  id: string;
  workspace_id: string;
  user_id: string;
  name: string;
  description?: string;
  icon: string;
  server_url: string;
  transport_type: "http" | "sse";
  auth_type: "none" | "bearer" | "api_key" | "oauth2";
  auth_token_encrypted?: string;
  auth_header_name: string;
  is_enabled: boolean;
  is_public: boolean;
  capabilities: Record<string, unknown>;
  last_sync_at?: string;
  sync_error?: string;
}

interface McpTool {
  id: string;
  mcp_server_id: string;
  tool_name: string;
  description?: string;
  input_schema?: Record<string, unknown>;
  is_enabled: boolean;
}

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// Build auth headers based on server configuration
function buildAuthHeaders(server: McpServerConfig): Headers {
  const headers = new Headers({
    "Content-Type": "application/json",
  });

  if (server.auth_type === "none" || !server.auth_token_encrypted) {
    return headers;
  }

  const token = server.auth_token_encrypted; // In production, decrypt this

  switch (server.auth_type) {
    case "bearer":
      headers.set(server.auth_header_name || "Authorization", `Bearer ${token}`);
      break;
    case "api_key":
      headers.set(server.auth_header_name || "X-API-Key", token);
      break;
    case "oauth2":
      headers.set(server.auth_header_name || "Authorization", `Bearer ${token}`);
      break;
  }

  return headers;
}

// Send JSON-RPC notification to MCP server (no id, no response expected)
async function sendMcpNotification(
  serverUrl: string,
  headers: Headers,
  method: string,
  params?: Record<string, unknown>
): Promise<void> {
  // Notificações JSON-RPC NÃO têm "id" - isso é importante!
  const notification = {
    jsonrpc: "2.0",
    method,
    params,
  };

  headers.set("Accept", "application/json, text/event-stream");

  console.log(`[MCP] Sending notification ${method} to ${serverUrl}`);

  const response = await fetch(serverUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(notification),
  });

  // Notificações podem retornar 202 Accepted ou 200 OK sem corpo
  console.log(`[MCP] Notification response status: ${response.status}`);

  if (!response.ok && response.status !== 202) {
    const errorText = await response.text().catch(() => response.statusText);
    console.error(`[MCP] Notification error: ${errorText}`);
    throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
  }
}

// Send JSON-RPC request to MCP server
// Returns both the response and any session ID from headers
async function sendMcpRequest(
  serverUrl: string,
  headers: Headers,
  method: string,
  params?: Record<string, unknown>,
  sessionId?: string
): Promise<JsonRpcResponse & { _sessionId?: string }> {
  const request: JsonRpcRequest = {
    jsonrpc: "2.0",
    id: Date.now(),
    method,
    params,
  };

  // Adicionar headers obrigatórios do protocolo MCP
  headers.set("Accept", "application/json, text/event-stream");

  // Adicionar session ID se fornecido (requerido pelo Supabase MCP)
  if (sessionId) {
    headers.set("Mcp-Session-Id", sessionId);
  }

  console.log(`[MCP] Sending ${method} to ${serverUrl}${sessionId ? ` (session: ${sessionId.slice(0, 8)}...)` : ''}`);

  const response = await fetch(serverUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(request),
  });

  // Log response status
  console.log(`[MCP] Response status: ${response.status}`);

  // Capturar session ID da resposta (se houver)
  const responseSessionId = response.headers.get("Mcp-Session-Id");
  if (responseSessionId) {
    console.log(`[MCP] Got session ID: ${responseSessionId.slice(0, 8)}...`);
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    console.error(`[MCP] Error response: ${errorText}`);
    throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
  }

  // Verificar se a resposta é SSE ou JSON
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("text/event-stream")) {
    // Parse SSE response - pegar primeiro evento com dados JSON
    const text = await response.text();
    console.log(`[MCP] SSE Response: ${text.substring(0, 500)}`);

    // Extrair JSON do SSE (formato: "data: {...}\n\n")
    const lines = text.split("\n");
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const jsonStr = line.substring(6);
        if (jsonStr && jsonStr !== "[DONE]") {
          try {
            const parsed = JSON.parse(jsonStr);
            return { ...parsed, _sessionId: responseSessionId || undefined };
          } catch (e) {
            console.error("[MCP] Failed to parse SSE data:", jsonStr);
          }
        }
      }
    }
    throw new Error("No valid JSON found in SSE response");
  }

  const jsonResponse = await response.json();
  return { ...jsonResponse, _sessionId: responseSessionId || undefined };
}

// Initialize MCP session
// Returns session ID for stateful MCP servers (like Supabase)
async function initializeMcpSession(
  serverUrl: string,
  headers: Headers
): Promise<{ success: boolean; capabilities?: Record<string, unknown>; sessionId?: string; error?: string }> {
  try {
    const response = await sendMcpRequest(serverUrl, headers, "initialize", {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {
        tools: {},
      },
      clientInfo: {
        name: "PescaLead",
        version: "1.0.0",
      },
    });

    if (response.error) {
      return { success: false, error: response.error.message };
    }

    // Capturar session ID (se houver)
    const sessionId = response._sessionId;

    // Send initialized notification (sem id!) - usando session ID se disponível
    const notifHeaders = new Headers(headers);
    if (sessionId) {
      notifHeaders.set("Mcp-Session-Id", sessionId);
    }
    await sendMcpNotification(serverUrl, notifHeaders, "notifications/initialized", {});

    return {
      success: true,
      capabilities: response.result as Record<string, unknown>,
      sessionId,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// List tools from MCP server
async function listMcpTools(
  serverUrl: string,
  headers: Headers,
  sessionId?: string
): Promise<{ success: boolean; tools?: unknown[]; error?: string }> {
  try {
    const response = await sendMcpRequest(serverUrl, headers, "tools/list", {}, sessionId);

    if (response.error) {
      return { success: false, error: response.error.message };
    }

    const result = response.result as { tools?: unknown[] };
    return { success: true, tools: result.tools || [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Test connection to MCP server
async function testConnection(
  serverUrl: string,
  authType: string,
  authToken?: string,
  authHeaderName?: string
): Promise<{
  success: boolean;
  latency_ms?: number;
  protocol_version?: string;
  tools_count?: number;
  tools?: unknown[];
  error?: string;
}> {
  const startTime = Date.now();

  // Build headers
  const headers = new Headers({
    "Content-Type": "application/json",
  });

  if (authType !== "none" && authToken) {
    switch (authType) {
      case "bearer":
        headers.set(authHeaderName || "Authorization", `Bearer ${authToken}`);
        break;
      case "api_key":
        headers.set(authHeaderName || "X-API-Key", authToken);
        break;
      case "oauth2":
        headers.set(authHeaderName || "Authorization", `Bearer ${authToken}`);
        break;
    }
  }

  // Try to initialize
  const initResult = await initializeMcpSession(serverUrl, headers);
  if (!initResult.success) {
    return { success: false, error: initResult.error };
  }

  // List tools - usando session ID se disponível (requerido pelo Supabase MCP)
  const toolsResult = await listMcpTools(serverUrl, headers, initResult.sessionId);
  if (!toolsResult.success) {
    return { success: false, error: toolsResult.error };
  }

  const latency = Date.now() - startTime;

  return {
    success: true,
    latency_ms: latency,
    protocol_version: MCP_PROTOCOL_VERSION,
    tools_count: toolsResult.tools?.length || 0,
    tools: toolsResult.tools,
  };
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Invalid user token");
    }

    // Parse request body
    const { action, ...params } = await req.json();

    let result: unknown;

    switch (action) {
      // ========================================================================
      // LIST SERVERS
      // ========================================================================
      case "list_servers": {
        const { workspace_id } = params;

        if (!workspace_id) {
          throw new Error("workspace_id is required");
        }

        // Get servers (own + public from workspace)
        const { data: servers, error } = await supabase
          .from("mcp_server_configurations")
          .select(`
            *,
            tools:mcp_tools(*)
          `)
          .or(`user_id.eq.${user.id},and(is_public.eq.true,workspace_id.eq.${workspace_id})`)
          .eq("workspace_id", workspace_id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        result = { servers: servers || [] };
        break;
      }

      // ========================================================================
      // CREATE SERVER
      // ========================================================================
      case "create_server": {
        const {
          workspace_id,
          name,
          description,
          icon,
          server_url,
          transport_type,
          auth_type,
          auth_token,
          auth_header_name,
          is_public,
        } = params;

        if (!workspace_id || !name || !server_url) {
          throw new Error("workspace_id, name, and server_url are required");
        }

        // Test connection first
        const testResult = await testConnection(
          server_url,
          auth_type || "none",
          auth_token,
          auth_header_name
        );

        if (!testResult.success) {
          throw new Error(`Connection failed: ${testResult.error}`);
        }

        // Create server configuration
        const { data: server, error: createError } = await supabase
          .from("mcp_server_configurations")
          .insert({
            workspace_id,
            user_id: user.id,
            name,
            description,
            icon: icon || "plug",
            server_url,
            transport_type: transport_type || "http",
            auth_type: auth_type || "none",
            auth_token_encrypted: auth_token, // In production, encrypt this
            auth_header_name: auth_header_name || "Authorization",
            is_enabled: true,
            is_public: is_public || false,
            capabilities: { tools: testResult.tools },
            last_sync_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (createError) throw createError;

        // Save tools
        if (testResult.tools && testResult.tools.length > 0) {
          const toolsToInsert = testResult.tools.map((tool: any) => ({
            mcp_server_id: server.id,
            tool_name: tool.name,
            description: tool.description,
            input_schema: tool.inputSchema,
            is_enabled: true,
          }));

          await supabase.from("mcp_tools").insert(toolsToInsert);
        }

        // Fetch server with tools
        const { data: serverWithTools } = await supabase
          .from("mcp_server_configurations")
          .select(`*, tools:mcp_tools(*)`)
          .eq("id", server.id)
          .single();

        result = { server: serverWithTools };
        break;
      }

      // ========================================================================
      // UPDATE SERVER
      // ========================================================================
      case "update_server": {
        const { server_id, ...updates } = params;

        if (!server_id) {
          throw new Error("server_id is required");
        }

        // Only allow updating own servers
        const { data: existing } = await supabase
          .from("mcp_server_configurations")
          .select("id")
          .eq("id", server_id)
          .eq("user_id", user.id)
          .single();

        if (!existing) {
          throw new Error("Server not found or not authorized");
        }

        // Filter allowed fields
        const allowedFields = [
          "name",
          "description",
          "icon",
          "server_url",
          "transport_type",
          "auth_type",
          "auth_token_encrypted",
          "auth_header_name",
          "is_enabled",
          "is_public",
        ];

        const updateData: Record<string, unknown> = {};
        for (const field of allowedFields) {
          if (field in updates) {
            // Handle auth_token -> auth_token_encrypted
            if (field === "auth_token_encrypted" && "auth_token" in updates) {
              updateData.auth_token_encrypted = updates.auth_token;
            } else {
              updateData[field] = updates[field];
            }
          }
        }

        const { data: server, error } = await supabase
          .from("mcp_server_configurations")
          .update(updateData)
          .eq("id", server_id)
          .select(`*, tools:mcp_tools(*)`)
          .single();

        if (error) throw error;

        result = { server };
        break;
      }

      // ========================================================================
      // DELETE SERVER
      // ========================================================================
      case "delete_server": {
        const { server_id } = params;

        if (!server_id) {
          throw new Error("server_id is required");
        }

        // Only allow deleting own servers
        const { error } = await supabase
          .from("mcp_server_configurations")
          .delete()
          .eq("id", server_id)
          .eq("user_id", user.id);

        if (error) throw error;

        result = { success: true };
        break;
      }

      // ========================================================================
      // SYNC CAPABILITIES
      // ========================================================================
      case "sync_capabilities": {
        const { server_id } = params;

        if (!server_id) {
          throw new Error("server_id is required");
        }

        // Get server config
        const { data: server, error: fetchError } = await supabase
          .from("mcp_server_configurations")
          .select("*")
          .eq("id", server_id)
          .eq("user_id", user.id)
          .single();

        if (fetchError || !server) {
          throw new Error("Server not found or not authorized");
        }

        // Build headers and test connection
        const headers = buildAuthHeaders(server);
        const initResult = await initializeMcpSession(server.server_url, headers);

        if (!initResult.success) {
          // Update with error
          await supabase
            .from("mcp_server_configurations")
            .update({
              sync_error: initResult.error,
              last_sync_at: new Date().toISOString(),
            })
            .eq("id", server_id);

          throw new Error(`Sync failed: ${initResult.error}`);
        }

        // List tools - usando session ID se disponível (requerido pelo Supabase MCP)
        const toolsResult = await listMcpTools(server.server_url, headers, initResult.sessionId);

        if (!toolsResult.success) {
          await supabase
            .from("mcp_server_configurations")
            .update({
              sync_error: toolsResult.error,
              last_sync_at: new Date().toISOString(),
            })
            .eq("id", server_id);

          throw new Error(`Failed to list tools: ${toolsResult.error}`);
        }

        // Update server capabilities
        await supabase
          .from("mcp_server_configurations")
          .update({
            capabilities: { tools: toolsResult.tools },
            sync_error: null,
            last_sync_at: new Date().toISOString(),
          })
          .eq("id", server_id);

        // Delete old tools and insert new ones
        await supabase.from("mcp_tools").delete().eq("mcp_server_id", server_id);

        if (toolsResult.tools && toolsResult.tools.length > 0) {
          const toolsToInsert = toolsResult.tools.map((tool: any) => ({
            mcp_server_id: server_id,
            tool_name: tool.name,
            description: tool.description,
            input_schema: tool.inputSchema,
            is_enabled: true,
          }));

          await supabase.from("mcp_tools").insert(toolsToInsert);
        }

        // Fetch updated server
        const { data: updatedServer } = await supabase
          .from("mcp_server_configurations")
          .select(`*, tools:mcp_tools(*)`)
          .eq("id", server_id)
          .single();

        result = { server: updatedServer };
        break;
      }

      // ========================================================================
      // TEST CONNECTION
      // ========================================================================
      case "test_connection": {
        const { server_url, auth_type, auth_token, auth_header_name } = params;

        if (!server_url) {
          throw new Error("server_url is required");
        }

        const testResult = await testConnection(
          server_url,
          auth_type || "none",
          auth_token,
          auth_header_name
        );

        result = testResult;
        break;
      }

      // ========================================================================
      // EXECUTE TOOL (chamado pelo ai-assistant-chat)
      // ========================================================================
      case "execute_tool": {
        const { server_id, tool_name, arguments: toolArgs, conversation_id, message_id } = params;

        if (!server_id || !tool_name) {
          throw new Error("server_id and tool_name are required");
        }

        const startTime = Date.now();

        // Get server config
        const { data: server, error: fetchError } = await supabase
          .from("mcp_server_configurations")
          .select("*")
          .eq("id", server_id)
          .or(`user_id.eq.${user.id},is_public.eq.true`)
          .single();

        if (fetchError || !server) {
          throw new Error("Server not found or not authorized");
        }

        // Create execution record
        const { data: execution, error: execError } = await supabase
          .from("mcp_tool_executions")
          .insert({
            conversation_id,
            message_id,
            mcp_server_id: server_id,
            user_id: user.id,
            tool_name,
            input_data: toolArgs,
            status: "executing",
          })
          .select()
          .single();

        if (execError) throw execError;

        try {
          // Build headers
          const headers = buildAuthHeaders(server);

          // Initialize session first (required by stateful MCP servers like Supabase)
          const initResult = await initializeMcpSession(server.server_url, headers);
          if (!initResult.success) {
            throw new Error(`Failed to initialize MCP session: ${initResult.error}`);
          }

          // Call tool with session ID
          const response = await sendMcpRequest(
            server.server_url,
            headers,
            "tools/call",
            {
              name: tool_name,
              arguments: toolArgs || {},
            },
            initResult.sessionId // Pass session ID for stateful MCP servers
          );

          const executionTime = Date.now() - startTime;

          if (response.error) {
            // Update execution with error
            await supabase
              .from("mcp_tool_executions")
              .update({
                status: "failed",
                error_message: response.error.message,
                execution_time_ms: executionTime,
              })
              .eq("id", execution.id);

            throw new Error(response.error.message);
          }

          // Update execution with success
          await supabase
            .from("mcp_tool_executions")
            .update({
              status: "completed",
              output_data: response.result,
              execution_time_ms: executionTime,
            })
            .eq("id", execution.id);

          result = {
            success: true,
            result: response.result,
            execution_time_ms: executionTime,
          };
        } catch (error) {
          const executionTime = Date.now() - startTime;

          await supabase
            .from("mcp_tool_executions")
            .update({
              status: "failed",
              error_message: error.message,
              execution_time_ms: executionTime,
            })
            .eq("id", execution.id);

          throw error;
        }
        break;
      }

      // ========================================================================
      // GET ENABLED TOOLS (para ai-assistant-chat carregar tools)
      // ========================================================================
      case "get_enabled_tools": {
        const { workspace_id } = params;

        if (!workspace_id) {
          throw new Error("workspace_id is required");
        }

        // Get all enabled tools from enabled servers
        const { data: servers, error } = await supabase
          .from("mcp_server_configurations")
          .select(`
            id,
            name,
            server_url,
            auth_type,
            auth_token_encrypted,
            auth_header_name,
            tools:mcp_tools(*)
          `)
          .eq("workspace_id", workspace_id)
          .eq("is_enabled", true)
          .or(`user_id.eq.${user.id},is_public.eq.true`);

        if (error) throw error;

        // Flatten tools with server info
        const tools: Array<{
          server_id: string;
          server_name: string;
          tool_name: string;
          description?: string;
          input_schema?: Record<string, unknown>;
        }> = [];

        for (const server of servers || []) {
          for (const tool of (server.tools as McpTool[]) || []) {
            if (tool.is_enabled) {
              tools.push({
                server_id: server.id,
                server_name: server.name,
                tool_name: tool.tool_name,
                description: tool.description,
                input_schema: tool.input_schema,
              });
            }
          }
        }

        result = { tools };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[mcp-manager] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
