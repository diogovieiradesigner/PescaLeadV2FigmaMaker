/**
 * Serviço para gerenciar relação entre Agentes de IA e Inboxes
 */

import { createClient } from '../utils/supabase/client';

const supabase = createClient();

export interface AIAgentInbox {
  id: string;
  agent_id: string;
  inbox_id: string;
  is_active: boolean;
  created_at: string;
}

/**
 * Buscar inboxes vinculadas a um agente
 */
export async function fetchAgentInboxes(agentId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('ai_agent_inboxes')
    .select('inbox_id')
    .eq('agent_id', agentId)
    .eq('is_active', true);

  if (error) {
    console.error('[AI-AGENT-INBOXES] Error fetching:', error);
    throw new Error(`Failed to fetch agent inboxes: ${error.message}`);
  }

  return (data || []).map(item => item.inbox_id);
}

/**
 * Atualizar inboxes de um agente (substituir todas)
 */
export async function updateAgentInboxes(
  agentId: string,
  inboxIds: string[]
): Promise<void> {
  // 1. Deletar todas as relações existentes
  const { error: deleteError } = await supabase
    .from('ai_agent_inboxes')
    .delete()
    .eq('agent_id', agentId);

  if (deleteError) {
    console.error('[AI-AGENT-INBOXES] Error deleting:', deleteError);
    throw new Error(`Failed to delete agent inboxes: ${deleteError.message}`);
  }

  // 2. Inserir novas relações
  if (inboxIds.length > 0) {
    const records = inboxIds.map(inbox_id => ({
      agent_id: agentId,
      inbox_id,
      is_active: true,
    }));

    const { error: insertError } = await supabase
      .from('ai_agent_inboxes')
      .insert(records);

    if (insertError) {
      console.error('[AI-AGENT-INBOXES] Error inserting:', insertError);
      throw new Error(`Failed to insert agent inboxes: ${insertError.message}`);
    }
  }
}

/**
 * Verificar se uma inbox já está sendo usada por outro agente ativo
 */
export async function isInboxOccupied(
  inboxId: string,
  excludeAgentId?: string
): Promise<boolean> {
  let query = supabase
    .from('ai_agent_inboxes')
    .select('agent_id, ai_agents!inner(is_active)')
    .eq('inbox_id', inboxId)
    .eq('is_active', true)
    .eq('ai_agents.is_active', true);

  if (excludeAgentId) {
    query = query.neq('agent_id', excludeAgentId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[AI-AGENT-INBOXES] Error checking occupation:', error);
    return false;
  }

  return (data || []).length > 0;
}
