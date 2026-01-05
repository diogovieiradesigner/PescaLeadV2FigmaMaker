/**
 * AI Custom Agents Service
 * Gerencia agentes de IA personalizados (similar aos GPTs do ChatGPT)
 */

import { supabase } from '../utils/supabase/client';
import type {
  AICustomAgent,
  CreateAgentInput,
  UpdateAgentInput,
} from '../types/ai-assistant';

// ============================================================================
// Agents CRUD
// ============================================================================

/**
 * Lista todos os agentes disponíveis para o usuário
 * Inclui agentes próprios e agentes públicos do workspace
 */
export async function getAgents(workspaceId: string): Promise<AICustomAgent[]> {
  const { data, error } = await supabase
    .from('ai_custom_agents')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('usage_count', { ascending: false });

  if (error) {
    console.error('[AI Agents] Error fetching agents:', error);
    return [];
  }

  return data || [];
}

/**
 * Busca um agente específico por ID
 */
export async function getAgent(agentId: string): Promise<AICustomAgent | null> {
  const { data, error } = await supabase
    .from('ai_custom_agents')
    .select('*')
    .eq('id', agentId)
    .single();

  if (error) {
    console.error('[AI Agents] Error fetching agent:', error);
    return null;
  }

  return data;
}

/**
 * Cria um novo agente personalizado
 */
export async function createAgent(
  input: CreateAgentInput
): Promise<{ agent: AICustomAgent | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('ai_custom_agents')
    .insert({
      workspace_id: input.workspace_id,
      user_id: input.user_id,
      name: input.name,
      description: input.description || null,
      icon: input.icon || 'bot',
      color: input.color || '#0169D9',
      system_prompt: input.system_prompt,
      model_id: input.model_id || null,
      temperature: input.temperature || null,
      web_search_enabled: input.web_search_enabled || false,
      is_public: input.is_public || false,
    })
    .select()
    .single();

  if (error) {
    console.error('[AI Agents] Error creating agent:', error);
    return { agent: null, error };
  }

  return { agent: data, error: null };
}

/**
 * Atualiza um agente existente
 */
export async function updateAgent(
  agentId: string,
  input: UpdateAgentInput
): Promise<{ agent: AICustomAgent | null; error: Error | null }> {
  const updateData: Record<string, unknown> = {};

  // Só inclui campos que foram passados
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.icon !== undefined) updateData.icon = input.icon;
  if (input.color !== undefined) updateData.color = input.color;
  if (input.system_prompt !== undefined) updateData.system_prompt = input.system_prompt;
  if (input.model_id !== undefined) updateData.model_id = input.model_id || null;
  if (input.temperature !== undefined) updateData.temperature = input.temperature;
  if (input.web_search_enabled !== undefined) updateData.web_search_enabled = input.web_search_enabled;
  if (input.is_public !== undefined) updateData.is_public = input.is_public;

  const { data, error } = await supabase
    .from('ai_custom_agents')
    .update(updateData)
    .eq('id', agentId)
    .select()
    .single();

  if (error) {
    console.error('[AI Agents] Error updating agent:', error);
    return { agent: null, error };
  }

  return { agent: data, error: null };
}

/**
 * Deleta um agente
 */
export async function deleteAgent(agentId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('ai_custom_agents')
    .delete()
    .eq('id', agentId);

  if (error) {
    console.error('[AI Agents] Error deleting agent:', error);
    return { error };
  }

  return { error: null };
}

/**
 * Incrementa o contador de uso de um agente
 */
export async function incrementAgentUsage(agentId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_agent_usage', {
    p_agent_id: agentId,
  });

  if (error) {
    console.error('[AI Agents] Error incrementing usage:', error);
  }
}

/**
 * Duplica um agente existente
 */
export async function duplicateAgent(
  agentId: string,
  userId: string,
  newName?: string
): Promise<{ agent: AICustomAgent | null; error: Error | null }> {
  // Buscar agente original
  const original = await getAgent(agentId);
  if (!original) {
    return { agent: null, error: new Error('Agente não encontrado') };
  }

  // Criar cópia
  return createAgent({
    workspace_id: original.workspace_id,
    user_id: userId,
    name: newName || `${original.name} (cópia)`,
    description: original.description,
    icon: original.icon,
    color: original.color,
    system_prompt: original.system_prompt,
    model_id: original.model_id,
    temperature: original.temperature,
    web_search_enabled: original.web_search_enabled,
    is_public: false, // Cópias começam como privadas
  });
}
