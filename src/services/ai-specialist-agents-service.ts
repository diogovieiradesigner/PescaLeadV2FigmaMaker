/**
 * AI Specialist Agents Service
 * Gerencia agentes especialistas na tabela ai_specialist_agents
 * (não mais na coluna JSONB)
 */

import { supabase } from '../utils/supabase/client';

export interface AISpecialistAgent {
  id: string;
  parent_agent_id: string;
  function_key: string;
  name: string;
  description: string;
  extra_prompt: string;
  type: 'inbound' | 'outbound' | 'custom';
  is_active: boolean;
  priority: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateSpecialistAgentData {
  parent_agent_id: string;
  function_key: string;
  name: string;
  description: string;
  extra_prompt: string;
  type: 'inbound' | 'outbound' | 'custom';
  is_active: boolean;
  priority: number;
}

export interface UpdateSpecialistAgentData {
  function_key?: string;
  name?: string;
  description?: string;
  extra_prompt?: string;
  type?: 'inbound' | 'outbound' | 'custom';
  is_active?: boolean;
  priority?: number;
}

/**
 * Gera function_key a partir do nome
 * Ex: "Especialista em Vendas" -> "especialista_em_vendas"
 */
export function generateFunctionKey(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]+/g, '_')      // Substitui caracteres especiais por _
    .replace(/^_+|_+$/g, '')          // Remove _ do início e fim
    .substring(0, 50);                // Limita tamanho
}

/**
 * Gera function_key único para um parent_agent_id
 * Se já existir, adiciona sufixo numérico (_2, _3, etc.)
 */
async function generateUniqueFunctionKey(
  parentAgentId: string, 
  name: string,
  excludeId?: string
): Promise<string> {
  const baseKey = generateFunctionKey(name);
  
  // Buscar todos os function_keys existentes para este parent_agent_id
  const { data: existing } = await supabase
    .from('ai_specialist_agents')
    .select('function_key, id')
    .eq('parent_agent_id', parentAgentId);
  
  if (!existing || existing.length === 0) {
    return baseKey;
  }
  
  // Filtrar o próprio agente (se estiver atualizando)
  const existingKeys = existing
    .filter(e => e.id !== excludeId)
    .map(e => e.function_key);
  
  // Se não há conflito, retornar base
  if (!existingKeys.includes(baseKey)) {
    return baseKey;
  }
  
  // Encontrar sufixo disponível
  let counter = 2;
  let candidateKey = `${baseKey}_${counter}`;
  
  while (existingKeys.includes(candidateKey) && counter < 100) {
    counter++;
    candidateKey = `${baseKey}_${counter}`;
  }
  
  return candidateKey;
}

/**
 * Buscar todos os especialistas de um agente pai
 */
export async function fetchSpecialistAgents(parentAgentId: string): Promise<AISpecialistAgent[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('User not authenticated. Please login.');
  }

  const { data, error } = await supabase
    .from('ai_specialist_agents')
    .select('*')
    .eq('parent_agent_id', parentAgentId)
    .order('priority', { ascending: true });

  if (error) {
    console.error('[AI-SPECIALIST-SERVICE] Error fetching specialists:', error);
    throw new Error(`Failed to fetch specialist agents: ${error.message}`);
  }

  return data || [];
}

/**
 * Criar novo especialista
 */
export async function createSpecialistAgent(
  agentData: CreateSpecialistAgentData
): Promise<AISpecialistAgent> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('User not authenticated. Please login.');
  }

  const { data, error } = await supabase
    .from('ai_specialist_agents')
    .insert(agentData)
    .select()
    .single();

  if (error) {
    console.error('[AI-SPECIALIST-SERVICE] Error creating specialist:', error);
    throw new Error(`Failed to create specialist agent: ${error.message}`);
  }

  return data;
}

/**
 * Atualizar especialista
 */
export async function updateSpecialistAgent(
  specialistId: string,
  updates: UpdateSpecialistAgentData
): Promise<AISpecialistAgent> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('User not authenticated. Please login.');
  }

  const { data, error } = await supabase
    .from('ai_specialist_agents')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', specialistId)
    .select()
    .single();

  if (error) {
    console.error('[AI-SPECIALIST-SERVICE] Error updating specialist:', error);
    throw new Error(`Failed to update specialist agent: ${error.message}`);
  }

  return data;
}

/**
 * Deletar especialista
 */
export async function deleteSpecialistAgent(specialistId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('User not authenticated. Please login.');
  }

  const { error } = await supabase
    .from('ai_specialist_agents')
    .delete()
    .eq('id', specialistId);

  if (error) {
    console.error('[AI-SPECIALIST-SERVICE] Error deleting specialist:', error);
    throw new Error(`Failed to delete specialist agent: ${error.message}`);
  }
}

/**
 * Sincronizar lista de especialistas (diff inteligente)
 * - Deleta os que não estão mais na lista
 * - Insere novos
 * - Atualiza existentes
 */
export async function syncSpecialistAgents(
  parentAgentId: string,
  specialists: AISpecialistAgent[]
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('User not authenticated. Please login.');
  }


  // 1. Buscar especialistas existentes no banco
  const existing = await fetchSpecialistAgents(parentAgentId);
  const existingIds = new Set(existing.map(s => s.id));
  const newIds = new Set(specialists.map(s => s.id).filter(id => !id.startsWith('temp-')));


  // 2. Identificar operações
  const toDelete = existing.filter(s => !newIds.has(s.id));
  const toInsert = specialists.filter(s => s.id.startsWith('temp-') || !existingIds.has(s.id));
  const toUpdate = specialists.filter(s => !s.id.startsWith('temp-') && existingIds.has(s.id));


  // 3. Deletar removidos
  for (const spec of toDelete) {
    await deleteSpecialistAgent(spec.id);
  }

  // 4. Inserir novos
  for (const spec of toInsert) {
    
    // Garantir function_key único
    let functionKey = spec.function_key || await generateUniqueFunctionKey(parentAgentId, spec.name);
    
    await createSpecialistAgent({
      parent_agent_id: parentAgentId,
      function_key: functionKey,
      name: spec.name,
      description: spec.description,
      extra_prompt: spec.extra_prompt,
      type: spec.type,
      is_active: spec.is_active,
      priority: spec.priority,
    });
  }

  // 5. Atualizar modificados
  for (const spec of toUpdate) {
    
    // Garantir function_key único
    let functionKey = spec.function_key || await generateUniqueFunctionKey(parentAgentId, spec.name, spec.id);
    
    await updateSpecialistAgent(spec.id, {
      function_key: functionKey,
      name: spec.name,
      description: spec.description,
      extra_prompt: spec.extra_prompt,
      type: spec.type,
      is_active: spec.is_active,
      priority: spec.priority,
    });
  }

}