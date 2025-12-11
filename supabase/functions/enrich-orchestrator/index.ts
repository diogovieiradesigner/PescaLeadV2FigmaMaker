import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * ENRICH ORCHESTRATOR
 * Orquestra todo o processo de enriquecimento de forma inteligente:
 * 1. Identifica leads pendentes
 * 2. Normaliza dados (trigger automático)
 * 3. Enriquece WhatsApp (se tem telefone)
 * 4. Enriquece WHOIS (se tem domínio .br)
 * 5. Extrai CNPJ do WHOIS
 * 6. Enriquece CNPJ (se tem CNPJ válido)
 * 7. Reconsolida tudo
 */

interface EnrichmentStats {
  total_processed: number;
  whatsapp_enriched: number;
  whois_enriched: number;
  cnpj_extracted: number;
  cnpj_enriched: number;
  errors: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { workspace_ids, batch_size = 20 } = await req.json();
    
    console.log('🎯 [ORCHESTRATOR] Starting enrichment orchestration');
    console.log(`Workspaces: ${workspace_ids?.length || 'all'}`);
    console.log(`Batch size: ${batch_size}`);

    const stats: EnrichmentStats = {
      total_processed: 0,
      whatsapp_enriched: 0,
      whois_enriched: 0,
      cnpj_extracted: 0,
      cnpj_enriched: 0,
      errors: 0,
    };

    // Se workspace_ids não foi fornecido, buscar workspaces com leads pendentes
    let workspacesToProcess: string[];
    
    if (workspace_ids && workspace_ids.length > 0) {
      workspacesToProcess = workspace_ids;
    } else {
      // Buscar workspaces com leads pendentes de enriquecimento
      const { data: workspaces, error } = await supabase
        .from('lead_extraction_staging')
        .select('workspace_id')
        .or('whois_enriched.is.false,cnpj_enriched.is.false')
        .limit(10);  // Máximo 10 workspaces por execução
      
      if (error) throw error;
      
      workspacesToProcess = [...new Set(workspaces?.map(w => w.workspace_id) || [])];
    }

    if (workspacesToProcess.length === 0) {
      console.log('✅ [ORCHESTRATOR] No workspaces to process');
      return new Response(JSON.stringify({
        success: true,
        message: 'No pending leads to enrich',
        stats,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📋 [ORCHESTRATOR] Processing ${workspacesToProcess.length} workspaces`);

    // Processar cada workspace
    for (const workspaceId of workspacesToProcess) {
      try {
        console.log(`\n🔄 [WORKSPACE ${workspaceId}] Starting enrichment`);

        // ===================================================================
        // FASE 1: ENRIQUECER WHATSAPP (telefones normalizados)
        // ===================================================================
        console.log('📞 [PHASE 1] WhatsApp enrichment');
        
        const { data: phoneLeads } = await supabase
          .from('lead_extraction_staging')
          .select('id')
          .eq('workspace_id', workspaceId)
          .not('phone_normalized', 'is', null)
          .is('whatsapp_valid', null)
          .limit(batch_size);

        if (phoneLeads && phoneLeads.length > 0) {
          console.log(`  └─ Found ${phoneLeads.length} leads with phone`);
          
          const whatsappResponse = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/enrich-whatsapp`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                workspace_id: workspaceId,
                batch_size: batch_size,
              }),
            }
          );

          if (whatsappResponse.ok) {
            const whatsappResult = await whatsappResponse.json();
            stats.whatsapp_enriched += whatsappResult.whatsapp || 0;
            console.log(`  ✅ Enriched ${whatsappResult.whatsapp || 0} WhatsApp`);
          } else {
            console.error(`  ❌ WhatsApp enrichment failed: ${whatsappResponse.status}`);
            stats.errors++;
          }
        } else {
          console.log('  ⏭️  No leads pending WhatsApp enrichment');
        }

        // ===================================================================
        // FASE 2: ENRIQUECER WHOIS (domínios .br)
        // ===================================================================
        console.log('🌐 [PHASE 2] WHOIS enrichment');
        
        const { data: domainLeads } = await supabase
          .from('lead_extraction_staging')
          .select('id, domain')
          .eq('workspace_id', workspaceId)
          .not('domain', 'is', null)
          .is('whois_enriched', false)
          .limit(batch_size);

        // Filtrar apenas domínios .br
        const brDomainLeads = domainLeads?.filter(l => 
          l.domain?.endsWith('.br')
        ) || [];

        if (brDomainLeads.length > 0) {
          console.log(`  └─ Found ${brDomainLeads.length} .br domains`);
          
          const whoisResponse = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/enrich-whois`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                workspace_id: workspaceId,
                batch_size: Math.min(batch_size, 10),  // WHOIS mais lento
              }),
            }
          );

          if (whoisResponse.ok) {
            const whoisResult = await whoisResponse.json();
            stats.whois_enriched += whoisResult.enriched || 0;
            console.log(`  ✅ Enriched ${whoisResult.enriched || 0} WHOIS`);
          } else {
            console.error(`  ❌ WHOIS enrichment failed: ${whoisResponse.status}`);
            stats.errors++;
          }

          // Aguardar 2s após WHOIS (API pode ser lenta)
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          console.log('  ⏭️  No .br domains pending WHOIS enrichment');
        }

        // ===================================================================
        // FASE 3: EXTRAIR CNPJ DO WHOIS
        // ===================================================================
        console.log('🔍 [PHASE 3] Extract CNPJ from WHOIS');
        
        const { data: extractResult, error: extractError } = await supabase
          .rpc('extract_cnpj_from_whois_smart', {
            p_workspace_id: workspaceId,
          });

        if (!extractError && extractResult) {
          stats.cnpj_extracted += extractResult;
          console.log(`  ✅ Extracted ${extractResult} CNPJs from WHOIS`);
        } else {
          console.log('  ⏭️  No CNPJs to extract from WHOIS');
        }

        // ===================================================================
        // FASE 4: ENRIQUECER CNPJ (CNPJs normalizados)
        // ===================================================================
        console.log('🏢 [PHASE 4] CNPJ enrichment');
        
        const { data: cnpjLeads } = await supabase
          .from('lead_extraction_staging')
          .select('id, cnpj_normalized')
          .eq('workspace_id', workspaceId)
          .not('cnpj_normalized', 'is', null)
          .is('cnpj_enriched', false)
          .limit(batch_size);

        if (cnpjLeads && cnpjLeads.length > 0) {
          console.log(`  └─ Found ${cnpjLeads.length} leads with CNPJ`);
          
          const cnpjResponse = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/enrich-cnpj`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                workspace_id: workspaceId,
                batch_size: Math.min(batch_size, 10),  // CNPJ tem rate limit
              }),
            }
          );

          if (cnpjResponse.ok) {
            const cnpjResult = await cnpjResponse.json();
            stats.cnpj_enriched += cnpjResult.enriched || 0;
            console.log(`  ✅ Enriched ${cnpjResult.enriched || 0} CNPJs`);
          } else {
            console.error(`  ❌ CNPJ enrichment failed: ${cnpjResponse.status}`);
            stats.errors++;
          }

          // Aguardar 3s após CNPJ (rate limit)
          await new Promise(resolve => setTimeout(resolve, 3000));
        } else {
          console.log('  ⏭️  No CNPJs pending enrichment');
        }

        stats.total_processed++;
        console.log(`✅ [WORKSPACE ${workspaceId}] Completed`);

      } catch (workspaceError) {
        console.error(`❌ [WORKSPACE ${workspaceId}] Error:`, workspaceError);
        stats.errors++;
      }
    }

    console.log('\n🎉 [ORCHESTRATOR] Enrichment completed');
    console.log('📊 Stats:', stats);

    return new Response(JSON.stringify({
      success: true,
      stats,
      message: `Processed ${stats.total_processed} workspaces`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ [ORCHESTRATOR] Fatal error:', error);
    return new Response(JSON.stringify({
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
