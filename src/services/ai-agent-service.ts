/**
 * AI Agent Service
 * Gerencia agentes de IA (criação, leitura, atualização, exclusão)
 * Lógica de negócio centralizada
 */

import { supabase } from '../utils/supabase/client';

export interface AIAgent {
  id: string;
  workspace_id: string;
  name: string;
  api_key_encrypted: string;
  model: string;
  is_active: boolean;
  default_attendant_type: 'ai' | 'human';
  system_prompt: string;
  orchestrator_enabled: boolean;
  crm_auto_update: boolean;
  crm_update_prompt: string | null;
  behavior_config: BehaviorConfig;
  created_at: string;
  updated_at: string;
}

/**
 * @deprecated Este tipo não é mais usado. Os especialistas agora são salvos
 * na tabela ai_specialist_agents. Use AISpecialistAgent de ai-specialist-agents-service.ts
 */
export interface SpecialistAgent {
  id: string;
  name: string;
  description: string;
  function_key: string;
  extra_prompt: string;
  is_active: boolean;
  priority: number;
  type: 'inbound' | 'outbound' | 'custom';
}

export interface BehaviorConfig {
  timing: {
    debounce_seconds: number;
  };
  transcription: {
    audio_enabled: boolean;
    image_enabled: boolean;
  };
  working_hours: {
    mode: '24h' | 'business' | 'night_only' | 'weekends' | 'night_weekends' | 'custom';
    schedule?: any; // Para modo custom
  };
  response: {
    split_long_messages: boolean;
  };
}

export interface CreateAIAgentData {
  workspace_id: string;
  name: string;
  api_key_encrypted: string;
  model: string;
  is_active: boolean;
  default_attendant_type: 'ai' | 'human';
  system_prompt: string;
  orchestrator_enabled?: boolean;
  crm_auto_update?: boolean;
  crm_update_prompt?: string | null;
  behavior_config?: Partial<BehaviorConfig>;
}

export interface UpdateAIAgentData {
  name?: string;
  api_key_encrypted?: string;
  model?: string;
  is_active?: boolean;
  default_attendant_type?: 'ai' | 'human';
  system_prompt?: string;
  orchestrator_enabled?: boolean;
  crm_auto_update?: boolean;
  crm_update_prompt?: string | null;
  behavior_config?: Partial<BehaviorConfig>;
}

// Configuração padrão do behavior_config
export const DEFAULT_BEHAVIOR_CONFIG: BehaviorConfig = {
  timing: {
    debounce_seconds: 15,
  },
  transcription: {
    audio_enabled: true,
    image_enabled: true,
  },
  working_hours: {
    mode: '24h',
  },
  response: {
    split_long_messages: false,
  },
};

/**
 * Buscar todos os agentes de um workspace
 */
export async function fetchAIAgents(workspaceId: string): Promise<AIAgent[]> {
  // Verificar se há usuário autenticado
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('User not authenticated. Please login.');
  }

  const { data, error } = await supabase
    .from('ai_agents')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[AI-AGENT-SERVICE] Error fetching agents:', error);
    throw new Error(`Failed to fetch AI agents: ${error.message}`);
  }

  return data || [];
}

/**
 * Buscar um agente específico
 */
export async function fetchAIAgent(agentId: string): Promise<AIAgent | null> {
  // Verificar se há usuário autenticado
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('User not authenticated. Please login.');
  }

  const { data, error } = await supabase
    .from('ai_agents')
    .select('*')
    .eq('id', agentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('[AI-AGENT-SERVICE] Error fetching agent:', error);
    throw new Error(`Failed to fetch AI agent: ${error.message}`);
  }

  return data;
}

/**
 * Criar novo agente de IA
 */
export async function createAIAgent(agentData: CreateAIAgentData): Promise<AIAgent> {
  // Verificar se há usuário autenticado
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('User not authenticated. Please login.');
  }

  // Merge behavior_config com valores padrão
  const behavior_config = {
    ...DEFAULT_BEHAVIOR_CONFIG,
    ...agentData.behavior_config,
    timing: {
      ...DEFAULT_BEHAVIOR_CONFIG.timing,
      ...agentData.behavior_config?.timing,
    },
    transcription: {
      ...DEFAULT_BEHAVIOR_CONFIG.transcription,
      ...agentData.behavior_config?.transcription,
    },
    working_hours: {
      ...DEFAULT_BEHAVIOR_CONFIG.working_hours,
      ...agentData.behavior_config?.working_hours,
    },
    response: {
      ...DEFAULT_BEHAVIOR_CONFIG.response,
      ...agentData.behavior_config?.response,
    },
  };

  const { data, error } = await supabase
    .from('ai_agents')
    .insert({
      ...agentData,
      behavior_config,
    })
    .select()
    .single();

  if (error) {
    console.error('[AI-AGENT-SERVICE] Error creating agent:', error);
    throw new Error(`Failed to create AI agent: ${error.message}`);
  }

  return data;
}

/**
 * Atualizar agente de IA
 */
export async function updateAIAgent(
  agentId: string,
  updates: UpdateAIAgentData
): Promise<AIAgent> {
  // Verificar se há usuário autenticado
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('User not authenticated. Please login.');
  }

  // Se tiver behavior_config, fazer merge com o existente
  let finalUpdates = { ...updates };

  if (updates.behavior_config) {
    // Buscar configuração atual
    const currentAgent = await fetchAIAgent(agentId);
    if (currentAgent) {
      finalUpdates.behavior_config = {
        ...currentAgent.behavior_config,
        ...updates.behavior_config,
        timing: {
          ...currentAgent.behavior_config.timing,
          ...updates.behavior_config.timing,
        },
        transcription: {
          ...currentAgent.behavior_config.transcription,
          ...updates.behavior_config.transcription,
        },
        working_hours: {
          ...currentAgent.behavior_config.working_hours,
          ...updates.behavior_config.working_hours,
        },
        response: {
          ...currentAgent.behavior_config.response,
          ...updates.behavior_config.response,
        },
      };
    }
  }

  const { data, error } = await supabase
    .from('ai_agents')
    .update({
      ...finalUpdates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', agentId)
    .select()
    .single();

  if (error) {
    console.error('[AI-AGENT-SERVICE] Error updating agent:', error);
    throw new Error(`Failed to update AI agent: ${error.message}`);
  }

  return data;
}

/**
 * Deletar agente de IA
 */
export async function deleteAIAgent(agentId: string): Promise<void> {
  // Verificar se há usuário autenticado
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('User not authenticated. Please login.');
  }

  const { error } = await supabase
    .from('ai_agents')
    .delete()
    .eq('id', agentId);

  if (error) {
    console.error('[AI-AGENT-SERVICE] Error deleting agent:', error);
    throw new Error(`Failed to delete AI agent: ${error.message}`);
  }
}

/**
 * Mascarar API Key (mostrar apenas últimos 4 caracteres)
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) return '••••••••';
  return '••••••••' + apiKey.slice(-4);
}