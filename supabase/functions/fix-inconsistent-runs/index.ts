import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔧 [FIX INCONSISTENT RUNS] Iniciando correção de runs inconsistentes...');

    // Executar função SQL para corrigir runs inconsistentes
    const { data, error } = await supabase.rpc('fix_runs_with_inconsistent_status');

    if (error) {
      console.error('❌ [FIX INCONSISTENT RUNS] Erro ao executar função:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message,
          details: error 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Processar resultados
    const results = data || [];
    const fixedRuns = results.filter((r: any) => r.fixed === true);
    const totalFixed = fixedRuns.length;

    console.log(`✅ [FIX INCONSISTENT RUNS] Correção concluída: ${totalFixed} run(s) corrigida(s)`);

    if (totalFixed > 0) {
      console.log('📋 [FIX INCONSISTENT RUNS] Runs corrigidas:');
      fixedRuns.forEach((run: any) => {
        console.log(`  - ${run.run_name} (${run.run_id}): ${run.reason}`);
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        total_checked: results.length,
        total_fixed: totalFixed,
        fixed_runs: fixedRuns.map((r: any) => ({
          run_id: r.run_id,
          run_name: r.run_name,
          old_status: r.old_status,
          reason: r.reason
        })),
        message: totalFixed > 0 
          ? `${totalFixed} run(s) corrigida(s) com sucesso`
          : 'Nenhuma run inconsistente encontrada'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ [FIX INCONSISTENT RUNS] Erro inesperado:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        details: error 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

