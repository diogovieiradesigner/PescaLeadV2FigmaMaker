import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ===========================
// CONFIGURAÇÕES
// ===========================
const MAX_BATCHES_PER_EXECUTION = 10; // Processar até 10 batches por execução
const DEFAULT_BATCH_SIZE = 100; // Leads por batch

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    console.log('🚀 [COLUMN-LEADS-MIGRATION-QUEUE] Iniciando processamento da fila...');

    const { data: batchSizeParam } = await req.json().catch(() => ({}));
    const batchSize = batchSizeParam?.batch_size || DEFAULT_BATCH_SIZE;

    let totalProcessed = 0;
    let totalMoved = 0;
    const results: any[] = [];

    // Processar múltiplos batches
    for (let i = 0; i < MAX_BATCHES_PER_EXECUTION; i++) {
      console.log(`\n📦 [BATCH ${i + 1}/${MAX_BATCHES_PER_EXECUTION}] Processando...`);

      const { data: batchResult, error: batchError } = await supabase.rpc(
        'process_column_leads_migration_batch',
        { p_batch_size: batchSize }
      );

      if (batchError) {
        console.error(`❌ [BATCH ${i + 1}] Erro:`, batchError);
        results.push({
          batch: i + 1,
          error: batchError.message,
          success: false
        });
        break; // Parar em caso de erro
      }

      // A função retorna JSONB diretamente, não array
      if (!batchResult || (typeof batchResult === 'object' && batchResult.message === 'Nenhuma mensagem na fila')) {
        console.log(`✅ [BATCH ${i + 1}] Nenhuma mensagem na fila`);
        break; // Fila vazia, parar
      }

      const result = batchResult;
      totalProcessed++;
      totalMoved += result.leads_moved || 0;

      console.log(`  📊 Coluna: ${result.source_column_title} → ${result.target_column_title}`);
      console.log(`  ✅ Leads movidos: ${result.leads_moved}`);
      console.log(`  ⏳ Leads restantes: ${result.leads_remaining}`);
      console.log(`  💬 Status: ${result.message || 'Sucesso'}`);

      results.push({
        batch: i + 1,
        message_id: result.message_id,
        source_column_id: result.source_column_id,
        source_column_title: result.source_column_title,
        target_column_id: result.target_column_id,
        target_column_title: result.target_column_title,
        leads_moved: result.leads_moved,
        leads_remaining: result.leads_remaining,
        total_leads: result.total_leads,
        success: result.success,
        message: result.message
      });

      // Se não há mais leads restantes, parar
      if (result.leads_remaining === 0) {
        console.log(`✅ [BATCH ${i + 1}] Movimentação concluída!`);
        break;
      }

      // Pequeno delay entre batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      batches_processed: totalProcessed,
      total_leads_moved: totalMoved,
      results: results,
      message: totalProcessed > 0
        ? `Processados ${totalProcessed} batch(es), ${totalMoved} leads movidos`
        : 'Nenhuma mensagem na fila'
    };

    console.log(`\n🎉 [COLUMN-LEADS-MIGRATION-QUEUE] Concluído!`);
    console.log(`   Batches processados: ${totalProcessed}`);
    console.log(`   Total de leads movidos: ${totalMoved}`);

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ [COLUMN-LEADS-MIGRATION-QUEUE] Erro fatal:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

