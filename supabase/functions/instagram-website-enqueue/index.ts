// =============================================================================
// EDGE FUNCTION: instagram-website-enqueue (CRON)
// =============================================================================
// Enfileira websites de perfis do Instagram para scraping
// Roda a cada 1 minuto via cron job
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import {
  isValidBusinessWebsite,
  categorizeUrl,
  extractWhatsAppFromUrl,
  normalizeUrl,
} from '../_shared/website-validator.ts';

const BATCH_SIZE = 100; // Processa até 100 perfis por execução

function createSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * Cria log de extração
 */
async function createLog(
  supabase: any,
  runId: string,
  stepNumber: number,
  stepName: string,
  level: string,
  message: string,
  details?: any
) {
  try {
    await supabase.rpc('create_extraction_log_v2', {
      p_run_id: runId,
      p_step_number: stepNumber,
      p_step_name: stepName,
      p_level: level,
      p_message: message,
      p_source: 'instagram',
      p_phase: 'scraping',
      p_details: details || {}
    });
  } catch (error) {
    console.error('[LOG ERROR]', error);
  }
}

Deno.serve(async (req) => {
  const supabase = createSupabaseClient();

  try {
    console.log('\n=== INSTAGRAM-WEBSITE-ENQUEUE: START ===');

    // Buscar perfis pendentes com lock pessimista
    const { data: profiles, error: profilesError } = await supabase
      .rpc('get_pending_instagram_websites_locked', {
        p_limit: BATCH_SIZE
      });

    if (profilesError) {
      console.error('Erro ao buscar perfis:', profilesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profiles', details: profilesError }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!profiles || profiles.length === 0) {
      console.log('Nenhum perfil pendente encontrado');
      return new Response(
        JSON.stringify({ success: true, message: 'No profiles to process', processed: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processando ${profiles.length} perfis...`);

    // Contadores
    let validSites = 0;
    let skippedSites = 0;
    let whatsappExtracted = 0;
    const categoryCounts: Record<string, number> = {
      social: 0,
      aggregator: 0,
      communication: 0,
      invalid: 0,
    };

    // Agrupar por run_id para logs
    const runIds = new Set(profiles.map((p: any) => p.run_id));

    // Processar cada perfil
    for (const profile of profiles) {
      const { id, external_url, run_id, workspace_id, whatsapp_from_bio } = profile;

      // Normalizar URL
      const normalizedUrl = normalizeUrl(external_url);

      // Validar e categorizar
      const isValid = isValidBusinessWebsite(normalizedUrl);
      const category = categorizeUrl(normalizedUrl);

      console.log(`[${id}] ${external_url} → category=${category}, valid=${isValid}`);

      // CASO 1: Communication (wa.me) - Extrair WhatsApp e skip
      if (category === 'communication') {
        const whatsappNumber = extractWhatsAppFromUrl(normalizedUrl);

        const updateData: any = {
          website_scraping_status: 'skipped',
          website_scraping_enriched: true,
          website_category: 'communication',
          updated_at: new Date().toISOString()
        };

        if (whatsappNumber) {
          updateData.website_scraping_error = 'WhatsApp URL - número extraído';
          // Se perfil ainda não tem whatsapp, adicionar
          if (!whatsapp_from_bio) {
            updateData.whatsapp_from_bio = whatsappNumber;
            whatsappExtracted++;
            console.log(`  ✅ WhatsApp extraído: ${whatsappNumber}`);
          }
        } else {
          updateData.website_scraping_error = 'WhatsApp URL - número não extraído';
        }

        updateData.processing_status = 'completed'; // Libera para migração

        await supabase
          .from('instagram_enriched_profiles')
          .update(updateData)
          .eq('id', id);

        skippedSites++;
        categoryCounts.communication++;
        continue;
      }

      // CASO 2: Social/Aggregator/Invalid - Skip direto
      if (!isValid) {
        await supabase
          .from('instagram_enriched_profiles')
          .update({
            website_scraping_status: 'skipped',
            website_scraping_enriched: true,
            website_category: category,
            website_scraping_error: `URL categoria: ${category} (não scrapeável)`,
            processing_status: 'completed', // NOVO: Libera para migração
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        skippedSites++;
        categoryCounts[category]++;
        console.log(`  ⏭️ Skipped: ${category}`);
        continue;
      }

      // CASO 3: Business - Enfileirar para scraping
      const messagePayload = {
        profile_id: id,
        website_url: normalizedUrl,
        workspace_id: workspace_id,
        run_id: run_id,
        source: 'instagram',
        queued_at: new Date().toISOString()
      };

      const { data: msgId, error: queueError } = await supabase.rpc('pgmq_send', {
        queue_name: 'scraping_queue',
        message: messagePayload,
        delay_seconds: 0
      });

      if (queueError) {
        console.error(`  ❌ Erro ao enfileirar: ${queueError.message}`);
        // Marcar como failed para não ficar travado
        await supabase
          .from('instagram_enriched_profiles')
          .update({
            website_scraping_status: 'failed',
            website_scraping_enriched: true,
            website_scraping_error: `Erro ao enfileirar: ${queueError.message}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);
        continue;
      }

      console.log(`  ✅ Enfileirado: msg_id=${msgId}`);

      // Marcar como enfileirado
      await supabase
        .from('instagram_enriched_profiles')
        .update({
          website_scraping_status: 'queued',
          website_category: 'business',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      validSites++;
      console.log(`  📤 Enfileirado: ${normalizedUrl}`);
    }

    console.log(`\n📊 Resumo:`);
    console.log(`   ✅ Válidos (enfileirados): ${validSites}`);
    console.log(`   ⏭️ Ignorados: ${skippedSites}`);
    console.log(`   💬 WhatsApp extraídos: ${whatsappExtracted}`);
    console.log(`   Categorias: social=${categoryCounts.social}, aggregator=${categoryCounts.aggregator}, communication=${categoryCounts.communication}, invalid=${categoryCounts.invalid}`);

    // Criar logs para cada run_id encontrado
    for (const runId of runIds) {
      await createLog(
        supabase,
        runId,
        11,
        'Website Classification',
        'info',
        `Websites classificados: ${validSites} business, ${skippedSites} skipped (${categoryCounts.social} social, ${categoryCounts.aggregator} aggregator, ${categoryCounts.communication} communication)`,
        {
          total_profiles: profiles.length,
          valid_websites: validSites,
          skipped_sites: skippedSites,
          whatsapp_extracted: whatsappExtracted,
          skipped_breakdown: categoryCounts
        }
      );

      if (validSites > 0) {
        await createLog(
          supabase,
          runId,
          12,
          'Websites Enfileirados',
          'success',
          `${validSites} websites enfileirados para scraping (fila PGMQ)`,
          { queued_count: validSites }
        );
      }

      if (whatsappExtracted > 0) {
        await createLog(
          supabase,
          runId,
          12,
          'WhatsApp Extraído',
          'success',
          `${whatsappExtracted} números de WhatsApp extraídos de URLs wa.me`,
          { whatsapp_count: whatsappExtracted }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: profiles.length,
        valid: validSites,
        skipped: skippedSites,
        whatsapp_extracted: whatsappExtracted,
        categories: categoryCounts
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro fatal:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
