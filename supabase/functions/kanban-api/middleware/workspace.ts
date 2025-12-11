// =============================================================================
// WORKSPACE MIDDLEWARE
// =============================================================================
// Valida acesso ao workspace usando token do usuário (respeita RLS)
// =============================================================================

import { Context, Next } from 'npm:hono@4';
import { createSupabaseClientWithAuth } from '../database/client.ts';

export async function workspace(c: Context, next: Next) {
  const workspaceId = c.req.param('workspaceId');
  const userId = c.get('userId');
  
  if (!workspaceId) {
    return c.json({ error: 'Missing workspaceId' }, 400);
  }
  
  // Validar formato UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(workspaceId)) {
    return c.json({ error: 'Invalid Workspace ID format' }, 400);
  }
  
  console.log(`[WORKSPACE] Verificando acesso: User ${userId} -> Workspace ${workspaceId}`);
  
  // IMPORTANTE: Usar token do usuário para respeitar RLS
  // A função antiga usa createSupabaseClientWithAuth para criar cliente com token do usuário
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  if (!accessToken) {
    return c.json({ error: 'Missing access token' }, 401);
  }
  
  const userClient = createSupabaseClientWithAuth(accessToken);
  
  try {
    // Verificar se usuário tem acesso ao workspace usando contexto do usuário
    const { data: member, error } = await userClient
      .from('workspace_members')
      .select('role, permissions')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('[WORKSPACE] Erro ao verificar acesso:', error);
      
      // Fallback: Verificar se usuário é owner do workspace
      if (error.code === '42501') {
        console.log('[WORKSPACE] Member check failed (42501), tentando verificar ownership...');
        const { data: workspace, error: wsError } = await userClient
          .from('workspaces')
          .select('owner_id')
          .eq('id', workspaceId)
          .maybeSingle();
        
        if (!wsError && workspace && workspace.owner_id === userId) {
          console.log(`[WORKSPACE] ✅ User ${userId} é owner do workspace`);
          c.set('workspaceId', workspaceId);
          c.set('workspaceRole', 'owner');
          await next();
          return;
        }
      }
      
      return c.json({ 
        error: 'Authorization check failed', 
        details: error.message 
      }, 500);
    }
    
    if (!member) {
      console.warn(`[WORKSPACE] ❌ Acesso negado: User ${userId} não está no Workspace ${workspaceId}`);
      return c.json({ error: 'Forbidden - No access to workspace' }, 403);
    }
    
    console.log(`[WORKSPACE] ✅ Acesso permitido: User ${userId} tem role ${member.role}`);
    
    // Armazenar workspace no contexto
    c.set('workspaceId', workspaceId);
    c.set('workspaceRole', member.role);
    
    await next();
  } catch (e) {
    console.error('[WORKSPACE] ❌ Erro inesperado:', e);
    return c.json({ error: 'Internal Server Error during workspace check' }, 500);
  }
}

