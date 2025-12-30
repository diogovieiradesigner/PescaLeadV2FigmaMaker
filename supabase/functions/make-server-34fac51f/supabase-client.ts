/**
 * Supabase Client Singleton
 * 
 * Cria uma única instância do Supabase client que é reutilizada
 * em todas as requisições, evitando desperdício de recursos.
 * 
 * BENEFÍCIOS:
 * - Reduz uso de memória
 * - Evita esgotamento de pool de conexões
 * - Melhora performance
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

// Singleton instance
let supabaseServiceInstance: any = null;
let supabaseAnonInstance: any = null;

/**
 * Retorna o Supabase client com SERVICE_ROLE_KEY (admin)
 * Usa singleton para evitar criar múltiplos clients
 */
export function getSupabaseServiceClient() {
  if (!supabaseServiceInstance) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    }

    console.log('🔑 [Supabase] Creating service client...');

    supabaseServiceInstance = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      },
      db: {
        schema: 'public'
      }
    });

    console.log('✅ [Supabase] Service client singleton created with SERVICE_ROLE_KEY');
  }

  return supabaseServiceInstance;
}

/**
 * Retorna o Supabase client com ANON_KEY (público)
 * Usa singleton para evitar criar múltiplos clients
 */
export function getSupabaseAnonClient() {
  if (!supabaseAnonInstance) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !anonKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
    }

    supabaseAnonInstance = createClient(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });

    console.log('✅ [Supabase] Anon client singleton created');
  }

  return supabaseAnonInstance;
}

/**
 * Cria um client temporário com auth headers customizados
 * Use apenas quando precisar de um client com token de usuário específico
 */
export function createSupabaseClientWithAuth(accessToken: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !anonKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
  }

  return createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
}
