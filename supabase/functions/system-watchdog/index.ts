import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Obter extrações travadas
    const { data: stuckExtractions, error: stuckError } = await supabase.rpc('get_stuck_extractions', {
      p_minutes_inactive: 15
    });

    if (stuckError) throw stuckError;

    const results = [];

    if (stuckExtractions && stuckExtractions.length > 0) {
      console.log(`🐶 Watchdog: ${stuckExtractions.length} extrações travadas encontradas.`);
    } else {
      console.log(`🐶 Watchdog: Nenhuma extração travada encontrada.`);
    }

    for (const run of stuckExtractions || []) {
      console.log(`🐶 Watchdog: Analisando run travado ${run.id} (${run.search_term} - ${run.location})`);
      
      // Log do watchdog
      await supabase.from('watchdog_logs').insert({
        run_id: run.id,
        action_type: 'analyze',
        reason: 'stuck_detected',
        details: { last_activity: run.progress_data?.last_activity_at }
      });

      // 3. Verificar histórico de bairros
      // Tentar pegar search_term_base do progress_data
      const searchTerm = run.progress_data?.search_term_base || run.search_term;

      const { data: history } = await supabase.rpc('get_location_search_history', {
        p_workspace_id: run.workspace_id,
        p_search_term: searchTerm
      });

      // Filtrar bairros ativos (não esgotados e não suspeitos)
      const activeNeighborhoods = history?.filter((h: any) => !h.exhausted && !h.suspect) || [];
      
      if (activeNeighborhoods.length > 0) {
        // Recuperação: Re-enfileirar próxima página do primeiro bairro ativo
        const target = activeNeighborhoods[0];
        
        console.log(`🐶 Watchdog: Tentando recuperar bairro ${target.location_formatted}`);
        
        // Chamar RPC para montar payload
        const { data: payload, error: payloadError } = await supabase.rpc('re_enqueue_next_page', {
          p_run_id: run.id,
          p_workspace_id: run.workspace_id,
          p_search_term: searchTerm,
          p_location_formatted: target.location_formatted
        });

        if (payload && !payloadError) {
          // Enviar para a fila PGMQ
           const { error: queueError } = await supabase.rpc('send_watchdog_message', {
              p_queue_name: 'google_maps_queue',
              p_message: payload
           });
           
           if (queueError) {
             console.error('🐶 Watchdog: Erro ao enviar mensagem para fila:', queueError);
             results.push({ run_id: run.id, error: queueError.message });
           } else {
             console.log('🐶 Watchdog: Mensagem re-enfileirada com sucesso');
             // Atualizar heartbeat
             await supabase.rpc('heartbeat_extraction', { p_run_id: run.id });
             results.push({ run_id: run.id, action: 're_enqueued', target: target.location_formatted });
           }
        } else {
           console.error('🐶 Watchdog: Erro ao montar payload:', payloadError);
           results.push({ run_id: run.id, error: payloadError?.message });
        }
      } else {
        // Se não há bairros ativos
        // Verificar se pode expandir mais (has_more_neighborhoods)
        const hasMore = run.progress_data?.has_more_neighborhoods;
        const currentRound = run.progress_data?.current_ai_round || 1;
        const maxRounds = 10; 
        
        if (hasMore && currentRound < maxRounds) {
           console.log(`🐶 Watchdog: Bairros esgotados, mas pode expandir. TODO: Disparar expansão.`);
           // Atualizar heartbeat para tentar disparar trigger ou logar que precisa de ação manual por enquanto
           await supabase.rpc('heartbeat_extraction', { p_run_id: run.id });
           results.push({ run_id: run.id, action: 'needs_expansion', details: 'Trigger expansion logic needed' });
        } else {
           console.log(`🐶 Watchdog: Nada a fazer. Deveria finalizar.`);
           // Forçar finalização via update de status se tudo esgotado
           // Mas cuidado para não finalizar prematuramente.
           // Se last_activity > 15 min, sem bairros ativos, sem IA -> Pode finalizar.
           
           // await supabase.from('lead_extraction_runs').update({ status: 'completed', finished_at: new Date().toISOString() }).eq('id', run.id);
           // results.push({ run_id: run.id, action: 'force_finalize' });
           
           // Por segurança, apenas logar.
           results.push({ run_id: run.id, action: 'should_finalize' });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, processed: stuckExtractions?.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
