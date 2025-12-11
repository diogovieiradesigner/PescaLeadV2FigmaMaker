/**
 * Campaign Generate Report Edge Function
 * 
 * Gera relatórios diários de métricas das campanhas.
 * Executado via CRON às 23:59.
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { report_date } = await req.json().catch(() => ({}));
    const targetDate = report_date || new Date().toISOString().split('T')[0];

    console.log(`[Report] Generating report for ${targetDate}`);

    // Buscar todas as runs do dia
    const { data: runs, error: runsError } = await supabase
      .from('campaign_runs')
      .select(`
        *,
        campaign_configs!inner(workspace_id)
      `)
      .eq('run_date', targetDate);

    if (runsError) {
      console.error('[Report] Error fetching runs:', runsError);
      throw runsError;
    }

    if (!runs || runs.length === 0) {
      console.log('[Report] No runs found for this date');
      return new Response(JSON.stringify({ message: 'No runs to report' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Report] Found ${runs.length} runs to report`);

    let reportsGenerated = 0;

    for (const run of runs) {
      try {
        // Buscar métricas das mensagens
        const { data: messages } = await supabase
          .from('campaign_messages')
          .select('status, ai_tokens_used, replied_at')
          .eq('run_id', run.id);

        const sentCount = messages?.filter(m => m.status === 'sent' || m.status === 'replied').length || 0;
        const failedCount = messages?.filter(m => m.status === 'failed').length || 0;
        const repliedCount = messages?.filter(m => m.status === 'replied').length || 0;
        const totalTokens = messages?.reduce((sum, m) => sum + (m.ai_tokens_used || 0), 0) || 0;

        // Calcular taxas
        const responseRate = sentCount > 0 ? (repliedCount / sentCount * 100) : 0;
        const conversionRate = run.leads_total > 0 ? (sentCount / run.leads_total * 100) : 0;

        // Estimar custo (aproximado - Claude 3 Haiku)
        const estimatedCost = (totalTokens / 1000) * 0.00025; // $0.25 per 1M tokens

        // Upsert relatório
        const { error: upsertError } = await supabase
          .from('campaign_whatsapp_reports')
          .upsert({
            config_id: run.config_id,
            workspace_id: run.campaign_configs.workspace_id,
            report_date: targetDate,
            messages_sent: sentCount,
            messages_failed: failedCount,
            responses_received: repliedCount,
            response_rate: responseRate,
            leads_converted: sentCount,
            conversion_rate: conversionRate,
            total_tokens_used: totalTokens,
            estimated_cost: estimatedCost,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'config_id,report_date'
          });

        if (upsertError) {
          console.error(`[Report] Error upserting report for run ${run.id}:`, upsertError);
          continue;
        }

        console.log(`[Report] Generated report for config ${run.config_id}: ${sentCount} sent, ${repliedCount} replied`);
        reportsGenerated++;

      } catch (err) {
        console.error(`[Report] Error processing run ${run.id}:`, err);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      date: targetDate,
      runs_processed: runs.length,
      reports_generated: reportsGenerated
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[Report] Fatal error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});