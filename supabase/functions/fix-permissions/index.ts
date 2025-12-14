import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Conectar diretamente ao PostgreSQL via REST
    // O service_role key tem acesso postgres admin
    const results: string[] = [];

    // Lista de SQLs para executar
    const sqls = [
      "GRANT ALL ON ai_public_chat_links TO service_role",
      "GRANT ALL ON ai_public_chat_conversations TO service_role",
      "GRANT SELECT, INSERT, UPDATE, DELETE ON ai_public_chat_links TO authenticated",
      "GRANT SELECT, INSERT, UPDATE, DELETE ON ai_public_chat_conversations TO authenticated",
      "GRANT SELECT ON ai_public_chat_links TO anon",
      "GRANT SELECT ON ai_public_chat_conversations TO anon"
    ];

    // Usar a função create_exec_sql_function para criar uma função temporária
    const createFuncSql = `
      CREATE OR REPLACE FUNCTION temp_exec_sql(sql_text TEXT)
      RETURNS TEXT
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql_text;
        RETURN 'OK';
      END;
      $$;
      GRANT EXECUTE ON FUNCTION temp_exec_sql(TEXT) TO service_role;
    `;

    // Vamos tentar uma abordagem diferente - usar postgres functions
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: {
        schema: 'public'
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });

    // Primeiro, vamos verificar as tabelas existentes
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .like('table_name', 'ai_public%');

    results.push(`Tables check: ${tablesError ? tablesError.message : JSON.stringify(tables)}`);

    // Vamos tentar criar a função via RPC se possível
    // Usar o endpoint postgres direto
    const pgRestUrl = `${supabaseUrl}/rest/v1/`;

    // Tentar uma query simples para verificar se temos acesso
    const { data: testData, error: testError } = await supabase
      .rpc('get_service_role_test', {});

    results.push(`RPC test: ${testError ? testError.message : 'OK'}`);

    // Por ora, retornar instruções para o usuário
    return new Response(
      JSON.stringify({
        success: false,
        message: "Por favor, execute o seguinte SQL no Supabase SQL Editor:",
        sql: sqls.join(';\n') + ';',
        url: `https://supabase.com/dashboard/project/nlbcwaxkeaddfocigwuk/sql/new`,
        debug: results
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[fix-permissions] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
