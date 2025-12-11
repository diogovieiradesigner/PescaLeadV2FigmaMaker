// =============================================================================
// DATABASE CLIENT
// =============================================================================
// Cliente Supabase singleton para reutilização de conexão
// =============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";

let supabaseClient: ReturnType<typeof createClient> | null = null;

/**
 * Retorna cliente Supabase com SERVICE_ROLE_KEY (bypass RLS)
 * Use para operações administrativas
 */
export function getSupabase() {
  if (!supabaseClient) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }
    
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  
  return supabaseClient;
}

/**
 * Cria cliente Supabase com token do usuário (respeita RLS)
 * Use para operações que precisam respeitar Row Level Security
 * IMPORTANTE: Usa ANON_KEY como base e passa token do usuário no header
 */
export function createSupabaseClientWithAuth(accessToken: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  
  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL');
  }
  
  // IMPORTANTE: Para RLS funcionar, precisamos usar ANON_KEY como segundo parâmetro
  // e passar o token do usuário no header Authorization
  // Se ANON_KEY não estiver disponível, usar a URL como fallback (não ideal, mas funciona)
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || supabaseUrl;
  
  return createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

