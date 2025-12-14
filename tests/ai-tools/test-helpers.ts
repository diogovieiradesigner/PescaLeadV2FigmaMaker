/**
 * Helpers para os Testes das AI Tools
 */

import { CONFIG, TestResult, TestContext } from './test-config.ts';

/**
 * Chama a Edge Function de processamento de IA
 */
export async function callAIFunction(
  ctx: TestContext,
  userMessage: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const startTime = Date.now();

  try {
    const response = await fetch(CONFIG.EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
        'apikey': CONFIG.SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        conversation_id: ctx.conversationId,
        message: userMessage,
        lead_id: ctx.leadId,
        workspace_id: ctx.workspaceId,
        agent_id: ctx.agentId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
        data,
      };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Verifica se uma tool foi chamada na resposta
 */
export function wasToolCalled(response: any, toolName: string): boolean {
  if (!response || !response.tool_calls) return false;
  return response.tool_calls.some((tc: any) => tc.name === toolName);
}

/**
 * Extrai resultado de uma tool específica
 */
export function getToolResult(response: any, toolName: string): any {
  if (!response || !response.tool_results) return null;
  const result = response.tool_results.find((tr: any) => tr.tool === toolName);
  return result?.result || null;
}

/**
 * Cria resultado de teste de sucesso
 */
export function createSuccessResult(
  id: string,
  name: string,
  category: string,
  duration: number,
  message: string = 'Teste passou',
  details?: Record<string, unknown>
): TestResult {
  return {
    id,
    name,
    category,
    passed: true,
    message,
    duration,
    details,
  };
}

/**
 * Cria resultado de teste de falha
 */
export function createFailureResult(
  id: string,
  name: string,
  category: string,
  duration: number,
  message: string,
  error?: string,
  details?: Record<string, unknown>
): TestResult {
  return {
    id,
    name,
    category,
    passed: false,
    message,
    duration,
    error,
    details,
  };
}

/**
 * Aguarda um tempo específico
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Formata data para YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Formata hora para HH:MM
 */
export function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

/**
 * Obtém data de amanhã
 */
export function getTomorrow(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
}

/**
 * Obtém próxima segunda-feira
 */
export function getNextMonday(): Date {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

/**
 * Obtém data de ontem
 */
export function getYesterday(): Date {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday;
}

/**
 * Verifica se é dia de semana (seg-sex)
 */
export function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

/**
 * Encontra próximo dia útil
 */
export function getNextWeekday(): Date {
  let date = new Date();
  date.setDate(date.getDate() + 1);
  while (!isWeekday(date)) {
    date.setDate(date.getDate() + 1);
  }
  return date;
}

/**
 * Verifica status da conversa no banco
 */
export async function getConversationStatus(ctx: TestContext): Promise<string | null> {
  const { data } = await ctx.supabase
    .from('conversations')
    .select('status')
    .eq('id', ctx.conversationId)
    .single();
  return data?.status || null;
}

/**
 * Verifica sessão AI no banco
 */
export async function getSessionStatus(ctx: TestContext): Promise<string | null> {
  const { data } = await ctx.supabase
    .from('ai_conversation_sessions')
    .select('status')
    .eq('id', ctx.sessionId)
    .single();
  return data?.status || null;
}

/**
 * Verifica se lead foi atualizado
 */
export async function getLeadData(ctx: TestContext): Promise<any> {
  const { data } = await ctx.supabase
    .from('leads')
    .select('*')
    .eq('id', ctx.leadId)
    .single();
  return data;
}

/**
 * Busca eventos do calendário do lead
 */
export async function getLeadCalendarEvents(ctx: TestContext): Promise<any[]> {
  const { data } = await ctx.supabase
    .from('calendar_events')
    .select('*')
    .eq('lead_id', ctx.leadId)
    .order('created_at', { ascending: false });
  return data || [];
}

/**
 * Verifica se conversa foi transferida
 */
export async function getConversationDetails(ctx: TestContext): Promise<any> {
  const { data } = await ctx.supabase
    .from('conversations')
    .select('*')
    .eq('id', ctx.conversationId)
    .single();
  return data;
}
