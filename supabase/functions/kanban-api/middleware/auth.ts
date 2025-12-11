// =============================================================================
// AUTH MIDDLEWARE
// =============================================================================
// Valida autenticação do usuário
// =============================================================================

import { Context, Next } from 'npm:hono@4';
import { getSupabase } from '../database/client.ts';

export async function auth(c: Context, next: Next) {
  const path = c.req.path;
  console.log('[AUTH] Verificando autenticação para:', path);
  
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[AUTH] ❌ Token ausente');
    return c.json({ error: 'Unauthorized - Missing token' }, 401);
  }
  
  const token = authHeader.substring(7);
  const supabase = getSupabase();
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.log('[AUTH] ❌ Token inválido:', error?.message);
      return c.json({ error: 'Unauthorized - Invalid token' }, 401);
    }
    
    console.log('[AUTH] ✅ Usuário autenticado:', user.id);
    
    // Armazenar user no contexto
    c.set('user', user);
    c.set('userId', user.id);
    
    await next();
  } catch (error) {
    console.error('[AUTH] ❌ Erro na autenticação:', error);
    return c.json({ error: 'Unauthorized - Auth error' }, 401);
  }
}

