/**
 * AI Agent Attendants Service
 * Gerencia atendentes vinculados a agentes de IA
 */

import { supabase } from '../utils/supabase/client';

export interface AIAgentAttendant {
  id: string;
  agent_id: string;
  user_id: string;
  trigger_conditions: string;
  message_to_attendant: string;
  message_to_customer: string;
  created_at: string;
  updated_at: string;
}

export interface AttendantConfig {
  user_id: string;
  trigger_conditions: string;
  message_to_attendant: string;
  message_to_customer: string;
}

/**
 * Buscar atendentes vinculados a um agente
 */
export async function fetchAgentAttendants(agentId: string): Promise<AIAgentAttendant[]> {
  const { data, error } = await supabase
    .from('ai_agent_attendants')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[AI-AGENT-ATTENDANTS] Error fetching:', error);
    throw new Error(`Failed to fetch agent attendants: ${error.message}`);
  }

  return data || [];
}

/**
 * Atualizar atendentes de um agente (substituir todos)
 */
export async function updateAgentAttendants(
  agentId: string,
  attendants: AttendantConfig[]
): Promise<void> {
  
  // 1. Deletar todas as relações existentes
  const { error: deleteError } = await supabase
    .from('ai_agent_attendants')
    .delete()
    .eq('agent_id', agentId);

  if (deleteError) {
    console.error('[AI-AGENT-ATTENDANTS] Error deleting:', deleteError);
    throw new Error(`Failed to delete agent attendants: ${deleteError.message}`);
  }

  // 2. Inserir novos atendentes
  if (attendants.length > 0) {
    const records = attendants.map(att => ({
      agent_id: agentId,
      ...att,
    }));

    const { error: insertError } = await supabase
      .from('ai_agent_attendants')
      .insert(records);

    if (insertError) {
      console.error('[AI-AGENT-ATTENDANTS] Error inserting:', insertError);
      throw new Error(`Failed to insert agent attendants: ${insertError.message}`);
    }
  }
}

/**
 * Adicionar um atendente
 */
export async function addAgentAttendant(
  agentId: string,
  config: AttendantConfig
): Promise<AIAgentAttendant> {
  const { data, error } = await supabase
    .from('ai_agent_attendants')
    .insert({
      agent_id: agentId,
      ...config,
    })
    .select()
    .single();

  if (error) {
    console.error('[AI-AGENT-ATTENDANTS] Error adding:', error);
    throw new Error(`Failed to add agent attendant: ${error.message}`);
  }

  return data;
}

/**
 * Remover um atendente
 */
export async function removeAgentAttendant(attendantId: string): Promise<void> {
  const { error } = await supabase
    .from('ai_agent_attendants')
    .delete()
    .eq('id', attendantId);

  if (error) {
    console.error('[AI-AGENT-ATTENDANTS] Error removing:', error);
    throw new Error(`Failed to remove agent attendant: ${error.message}`);
  }
}

/**
 * Atualizar configuração de um atendente
 */
export async function updateAttendantConfig(
  attendantId: string,
  config: Partial<AttendantConfig>
): Promise<AIAgentAttendant> {
  const { data, error } = await supabase
    .from('ai_agent_attendants')
    .update({
      ...config,
      updated_at: new Date().toISOString(),
    })
    .eq('id', attendantId)
    .select()
    .single();

  if (error) {
    console.error('[AI-AGENT-ATTENDANTS] Error updating:', error);
    throw new Error(`Failed to update attendant config: ${error.message}`);
  }

  return data;
}