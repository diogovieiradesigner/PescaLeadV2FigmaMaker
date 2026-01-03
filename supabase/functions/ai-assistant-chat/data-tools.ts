/**
 * AI Data Tools - SQL Dinâmico Seguro
 *
 * Arquitetura Simplificada:
 * - 2 tools apenas: get_schema e execute_query
 * - IA gera SQL SELECT, backend valida e executa
 * - Segurança via validação (só SELECT, tabelas permitidas, workspace_id obrigatório)
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================
// Types
// ============================================

export interface DataToolCallResult {
  success: boolean;
  data?: unknown;
  error?: string;
  count?: number;
  executionTimeMs?: number;
  queryExecuted?: string;
}

// ============================================
// Tool Definitions for LLM - Apenas 2 tools!
// ============================================

export const DATA_TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'get_schema',
      description: `MUST call this FIRST before execute_query. Returns all table columns and types. Never assume column names - always check schema first.`,
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'execute_query',
      description: `Execute SQL SELECT query. REQUIRES get_schema first.

CRITICAL RULES:
1. ALWAYS use exactly {{WORKSPACE}} as placeholder (will be replaced automatically)
2. Only use columns from get_schema
3. Only SELECT allowed

Example: SELECT name FROM funnels WHERE workspace_id = {{WORKSPACE}}`,
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'SQL query with {{WORKSPACE}} placeholder for workspace_id filter',
          },
        },
        required: ['query'],
      },
    },
  },
];

// ============================================
// Sanitize for Audit Log
// ============================================

const SENSITIVE_PATTERNS = /\b(phone|email|cpf|cnpj|password|token|secret)\b/gi;

export function sanitizeForAudit(params: unknown): unknown {
  if (typeof params !== 'object' || params === null) return params;

  if (typeof params === 'string') {
    return params.replace(SENSITIVE_PATTERNS, '***');
  }

  if (Array.isArray(params)) {
    return params.map(item => sanitizeForAudit(item));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (typeof value === 'string' && value.length > 200) {
      // Truncate long values (like SQL queries) in logs
      sanitized[key] = value.substring(0, 200) + '...';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForAudit(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// ============================================
// Tool Executor - Apenas 2 cases!
// ============================================

export async function executeDataTool(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
  toolName: string,
  args: Record<string, unknown>,
  conversationId?: string
): Promise<DataToolCallResult> {
  const startTime = Date.now();

  try {
    let result: { data: unknown; error: unknown };

    switch (toolName) {
      case 'get_schema': {
        result = await supabase.rpc('ai_get_database_schema', {
          p_workspace_id: workspaceId,
        });
        break;
      }

      case 'execute_query': {
        const query = args.query as string;
        const limit = typeof args.limit === 'number' ? Math.min(Math.max(args.limit, 1), 100) : 100;

        if (!query || typeof query !== 'string') {
          return { success: false, error: 'Query is required and must be a string' };
        }

        result = await supabase.rpc('ai_execute_query', {
          p_workspace_id: workspaceId,
          p_query: query,
          p_limit: limit,
        });
        break;
      }

      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }

    const executionTimeMs = Date.now() - startTime;

    // Check for RPC error
    if (result.error) {
      console.error(`[Data Tool ${toolName}] RPC Error:`, JSON.stringify(result.error));
      return {
        success: false,
        error: `Database error: ${result.error.message || JSON.stringify(result.error)}`,
        executionTimeMs,
      };
    }

    // Check for application-level error in response
    const data = result.data as Record<string, unknown>;
    console.log(`[Data Tool ${toolName}] Response data:`, JSON.stringify(data).substring(0, 500));

    if (data && data.error) {
      console.error(`[Data Tool ${toolName}] Application error:`, data.error);
      return {
        success: false,
        error: data.error as string,
        executionTimeMs,
      };
    }

    if (data && data.success === false) {
      console.error(`[Data Tool ${toolName}] Query failed:`, data.error);
      return {
        success: false,
        error: (data.error as string) || 'Query failed',
        executionTimeMs,
      };
    }

    // Log to audit (async, don't wait)
    logToolUsage(
      supabase,
      workspaceId,
      userId,
      toolName,
      sanitizeForAudit(args),
      { success: true, count: data?.count },
      executionTimeMs,
      conversationId
    ).catch(err => console.error('[Audit Log Error]:', err));

    return {
      success: true,
      data: data,
      count: typeof data?.count === 'number' ? data.count : undefined,
      queryExecuted: typeof data?.query_executed === 'string' ? data.query_executed : undefined,
      executionTimeMs,
    };
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;
    console.error(`[Data Tool ${toolName}] Error:`, error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      executionTimeMs,
    };
  }
}

// ============================================
// Audit Logging
// ============================================

async function logToolUsage(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
  toolName: string,
  parameters: unknown,
  resultSummary: unknown,
  executionTimeMs: number,
  conversationId?: string
): Promise<void> {
  try {
    await supabase.from('ai_tool_audit_log').insert({
      workspace_id: workspaceId,
      user_id: userId,
      conversation_id: conversationId || null,
      tool_name: toolName,
      parameters: parameters,
      result_summary: resultSummary,
      execution_time_ms: executionTimeMs,
    });
  } catch (error) {
    console.error('[Audit Log] Failed to write:', error);
  }
}

// ============================================
// Format Tool Result for LLM
// ============================================

export function formatToolResultForLLM(toolName: string, result: DataToolCallResult): string {
  if (!result.success) {
    return `Error: ${result.error}`;
  }

  const data = result.data as Record<string, unknown>;

  switch (toolName) {
    case 'get_schema': {
      // Formatar schema de forma clara e legível
      const schema = data?.schema as Record<string, Array<{ column: string; type: string }>>;
      if (!schema) {
        return `Database Schema:\n${JSON.stringify(data, null, 2)}`;
      }

      // Criar formato legível: tabela -> lista de colunas
      let output = 'AVAILABLE TABLES AND COLUMNS:\n\n';
      for (const [tableName, columns] of Object.entries(schema)) {
        const columnNames = columns.map(c => c.column).join(', ');
        output += `${tableName}: ${columnNames}\n`;
      }

      // Adicionar relacionamentos e dicas importantes
      output += `

IMPORTANT:
- All IDs are UUID, NEVER use integers like funnel_id = 1
- ALWAYS use {{WORKSPACE}} placeholder for workspace_id filter
- "primeiro funil" = funnel with earliest created_at

RELATIONSHIPS:
- leads.column_id -> funnel_columns.id
- funnel_columns.funnel_id -> funnels.id

QUERY EXAMPLES (copy and adapt):

1. List funnels:
   SELECT name, created_at FROM funnels WHERE workspace_id = {{WORKSPACE}} ORDER BY created_at

2. Count leads per funnel:
   SELECT f.name, COUNT(l.id) as total
   FROM funnels f
   LEFT JOIN funnel_columns fc ON fc.funnel_id = f.id
   LEFT JOIN leads l ON l.column_id = fc.id
   WHERE f.workspace_id = {{WORKSPACE}}
   GROUP BY f.id, f.name

3. First funnel leads count:
   SELECT f.name, COUNT(l.id) as total
   FROM funnels f
   JOIN funnel_columns fc ON fc.funnel_id = f.id
   JOIN leads l ON l.column_id = fc.id
   WHERE f.workspace_id = {{WORKSPACE}}
   GROUP BY f.id, f.name
   ORDER BY f.created_at ASC LIMIT 1`;
      return output;
    }

    case 'execute_query': {
      const queryData = data?.data as unknown[];
      const count = data?.count as number;
      const queryExecuted = data?.query_executed as string;

      if (!queryData || queryData.length === 0) {
        return `⚠️ QUERY RETURNED ZERO RESULTS - NO DATA FOUND

The query executed successfully but returned NO DATA.
Executed: ${queryExecuted || 'N/A'}

IMPORTANT: You MUST tell the user that no data was found.
DO NOT invent or fabricate any data. Simply say "Não encontrei dados" or similar.`;
      }

      return `✅ Query Results (${count} rows) - REAL DATA FROM DATABASE:
${JSON.stringify(queryData, null, 2)}

Executed: ${queryExecuted || 'N/A'}

IMPORTANT: Only use the data above in your response. Do not add, invent, or fabricate any additional data.`;
    }

    default:
      return JSON.stringify(data, null, 2);
  }
}
