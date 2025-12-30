/**
 * Utilitário para limpar agentes duplicados
 * 
 * Execute via console do navegador:
 * import('./utils/cleanup-duplicate-agents').then(m => m.cleanupDuplicateAgents())
 */

import { createClient } from './supabase/client';

export async function cleanupDuplicateAgents() {
  const supabase = createClient();

  try {
    // Buscar workspace do usuário
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ Usuário não autenticado');
      return;
    }

    const { data: memberData } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single();

    if (!memberData) {
      console.error('❌ Workspace não encontrado');
      return;
    }

    const workspaceId = memberData.workspace_id;

    // Buscar todos os agentes deste workspace
    const { data: agents, error: fetchError } = await supabase
      .from('ai_agents')
      .select('id, name, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('❌ Erro ao buscar agentes:', fetchError);
      return;
    }

    if (!agents || agents.length === 0) {
      return;
    }

    console.table(agents);

    if (agents.length === 1) {
      return;
    }

    // Manter apenas o primeiro (mais antigo)
    const keepAgent = agents[0];
    const duplicates = agents.slice(1);

    
    duplicates.forEach((dup, index) => {
    });

    const confirmation = confirm(
      `⚠️ CONFIRMAÇÃO NECESSÁRIA\n\n` +
      `Você está prestes a DELETAR ${duplicates.length} agente(s) duplicado(s).\n\n` +
      `MANTER: ${keepAgent.name} (${keepAgent.created_at})\n` +
      `DELETAR: ${duplicates.length} duplicado(s)\n\n` +
      `Esta ação NÃO pode ser desfeita!\n\n` +
      `Deseja continuar?`
    );

    if (!confirmation) {
      return;
    }

    // Deletar duplicados
    const idsToDelete = duplicates.map(d => d.id);

    const { error: deleteError } = await supabase
      .from('ai_agents')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      console.error('❌ Erro ao deletar duplicados:', deleteError);
      return;
    }

    
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

// Função auxiliar para listar agentes sem deletar
export async function listAgents() {
  const supabase = createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ Usuário não autenticado');
      return;
    }

    const { data: memberData } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single();

    if (!memberData) {
      console.error('❌ Workspace não encontrado');
      return;
    }

    const { data: agents } = await supabase
      .from('ai_agents')
      .select('id, name, created_at, is_active')
      .eq('workspace_id', memberData.workspace_id)
      .order('created_at', { ascending: true });

    console.table(agents);

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}
