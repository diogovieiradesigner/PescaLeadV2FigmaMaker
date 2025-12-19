// Script para corrigir a função get_next_page_for_instagram_query
// Adiciona SECURITY DEFINER para bypassar RLS

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dfbxsmetjxdcoiwryhxr.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não definida!');
  console.log('Execute assim: SUPABASE_SERVICE_ROLE_KEY="sua_key" node fix_get_next_page.mjs');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const sql = `
-- Recriar a função COM SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_next_page_for_instagram_query(
  p_workspace_id UUID,
  p_query_hash TEXT,
  p_query TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_page INTEGER;
  v_exhausted_queries JSONB;
BEGIN
  -- Verificar se a query está na lista de esgotadas
  SELECT exhausted_queries INTO v_exhausted_queries
  FROM instagram_search_progress
  WHERE workspace_id = p_workspace_id AND query_hash = p_query_hash;

  -- Se a query está marcada como esgotada, retornar -1
  IF v_exhausted_queries IS NOT NULL AND v_exhausted_queries ? p_query THEN
    RETURN -1;
  END IF;

  -- Buscar última página processada para esta query
  SELECT (last_page_by_query->>p_query)::INTEGER INTO v_last_page
  FROM instagram_search_progress
  WHERE workspace_id = p_workspace_id AND query_hash = p_query_hash;

  -- Se não tem registro, retornar 1 (primeira página)
  IF v_last_page IS NULL THEN
    RETURN 1;
  END IF;

  -- Retornar próxima página (última + 1)
  RETURN v_last_page + 1;
END;
$$;
`;

async function main() {
  console.log('🔧 Corrigindo função get_next_page_for_instagram_query...');

  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    // Tentar via REST API diretamente
    console.log('⚠️ RPC não disponível, tentando via SQL direto...');

    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ sql_query: sql }),
    });

    if (!response.ok) {
      console.error('❌ Erro:', await response.text());
      console.log('\n📋 Por favor, execute o SQL manualmente no Dashboard do Supabase:');
      console.log('\n' + sql);
      process.exit(1);
    }

    console.log('✅ Função corrigida com sucesso!');
  } else {
    console.log('✅ Função corrigida com sucesso!');
  }
}

main().catch(console.error);
