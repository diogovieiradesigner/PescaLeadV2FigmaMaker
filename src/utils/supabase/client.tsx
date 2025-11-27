import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../api-config';

/**
 * Supabase Client para uso no Frontend
 * 
 * Usado principalmente para autenticação (login, logout, session)
 * As chamadas de API de dados vão pelo servidor
 */

let supabaseClient: ReturnType<typeof createSupabaseClient> | null = null;

export function createClient() {
  if (!supabaseClient) {
    supabaseClient = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

export const supabase = createClient();
