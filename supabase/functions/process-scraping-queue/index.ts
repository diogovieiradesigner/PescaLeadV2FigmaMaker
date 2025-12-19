// ===========================================================================
// EDGE FUNCTION: process-scraping-queue (V7 - SUPORTE INSTAGRAM)
// ===========================================================================
// Processa fila PGMQ de scraping web com controle de concorrência
// SUPORTA: Google Maps (lead_extraction_staging) E Instagram (instagram_enriched_profiles)
// IMPORTANTE: verify_jwt DEVE estar FALSE no config.toml
// ===========================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateCNPJ } from '../_shared/website-validator.ts';

// ===========================
// CONFIGURAÇÕES
// ===========================
const SCRAPER_API_URL = Deno.env.get('SCRAPER_API_URL') || 'https://proxy-scraper-api.diogo-vieira-pb-f91.workers.dev';
const MAX_CONCURRENT = 60;
const VT_SECONDS = 240; // ⚠️ AUMENTADO: 4 min (180s request + 60s margem) - previne reprocessamento
const REQUEST_TIMEOUT_MS = 180000; // 3 minutos
const MAX_RETRY_ATTEMPTS = 3; // NOVO: máximo de retries com backoff exponencial

// ===========================
// TIPOS
// ===========================
interface ScrapingQueueMessage {
  // Google Maps fields
  staging_id?: string;
  // Instagram fields
  profile_id?: string;
  run_id?: string;
  // Shared fields
  website_url: string;
  workspace_id: string;
  source?: 'google_maps' | 'instagram';
  queued_at: string;
  retry_attempt?: number;
}

interface PGMQMessage {
  msg_id: number;
  read_ct: number;
  enqueued_at: string;
  vt: string;
  message: ScrapingQueueMessage;
}

interface ScrapingApiRequest {
  url: string;
  extract_images: boolean;
  take_screenshot: boolean;
  timeout: number;
}

interface ScrapingApiResponse {
  status: string;
  url: string;
  method: string;
  emails: string[];
  phones: string[];
  cnpj: string[];
  whatsapp: string[];
  social_media: {
    linkedin: string[];
    facebook: string[];
    instagram: string[];
    youtube: string[];
    twitter: string[];
  };
  metadata: {
    title: string;
    description: string;
    og_image: string;
  };
  images: {
    logos: string[];
    favicon: string;
    other_images: string[];
  };
  button_links: string[];
  checkouts: {
    have_checkouts: boolean;
    platforms: string[];
  };
  pixels: {
    have_pixels: boolean;
    pixels: Record<string, boolean>;
  };
  screenshot: {
    base64: string;
    timestamp: string;
  };
  markdown: string;
  performance: {
    total_time: string;
  };
}

// ===========================
// HANDLER PRINCIPAL
// ===========================
Deno.serve(async (req: Request) => {
  const startTime = Date.now();
  
  try {
    // Inicializar cliente Supabase com SERVICE_ROLE_KEY
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🚀 [START] Process scraping queue');

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const batchSize = Math.min(body.batch_size || MAX_CONCURRENT, MAX_CONCURRENT);

    console.log(`📊 [CONFIG] Batch size: ${batchSize}, Max concurrent: ${MAX_CONCURRENT}`);

    // 1️⃣ VERIFICAR SCRAPES EM ANDAMENTO
    const { count: processingCount, error: countError } = await supabase
      .from('lead_extraction_staging')
      .select('id', { count: 'exact', head: true })
      .eq('scraping_status', 'processing');

    if (countError) {
      console.error('❌ [ERROR] Failed to count processing scrapes:', countError);
      throw countError;
    }

    const currentProcessing = processingCount || 0;
    const availableSlots = Math.max(0, MAX_CONCURRENT - currentProcessing);

    console.log(`🔢 [SLOTS] Currently processing: ${currentProcessing}, Available: ${availableSlots}`);

    if (availableSlots === 0) {
      console.log('⚠️ [SKIP] Max concurrent scrapes reached');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Max concurrent scrapes reached',
          processing_count: currentProcessing,
          max_concurrent: MAX_CONCURRENT,
          processed: 0
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const messagesToProcess = Math.min(availableSlots, batchSize);
    console.log(`📥 [FETCH] Will fetch ${messagesToProcess} messages from queue`);

    // 2️⃣ LER MENSAGENS DA FILA PGMQ
    const { data: messages, error: readError } = await supabase.rpc('pgmq_read', {
      queue_name: 'scraping_queue',
      vt_seconds: VT_SECONDS,
      qty: messagesToProcess
    });

    if (readError) {
      console.error('❌ [ERROR] Failed to read from queue:', readError);
      throw readError;
    }

    if (!messages || messages.length === 0) {
      console.log('📭 [EMPTY] No messages in queue');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No messages to process',
          processed: 0
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const messageCount = messages.length;
    console.log(`✅ [FETCHED] Got ${messageCount} messages from queue`);

    // Log das mensagens
    messages.forEach((msg: PGMQMessage) => {
      console.log(`  📨 msg_id=${msg.msg_id} url=${msg.message.website_url} staging_id=${msg.message.staging_id}`);
    });

    // 3️⃣ PROCESSAR MENSAGENS EM PARALELO
    console.log('🔄 [PROCESS] Starting parallel processing...');
    
    const processingPromises = messages.map((msg: PGMQMessage) =>
      processSingleMessage(supabase, msg)
        .then(result => {
          console.log(`✅ [SUCCESS] msg_id=${msg.msg_id} processed successfully`);
          return { status: 'fulfilled', value: result };
        })
        .catch(error => {
          console.error(`❌ [FAILED] msg_id=${msg.msg_id} error:`, error.message);
          return { status: 'rejected', reason: error };
        })
    );

    const results = await Promise.all(processingPromises);

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    const duration = Date.now() - startTime;
    console.log(`🎉 [COMPLETE] Processed ${messageCount} messages in ${duration}ms (✅ ${successful} successful, ❌ ${failed} failed)`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: messageCount,
        successful,
        failed,
        duration_ms: duration,
        available_slots: availableSlots,
        max_concurrent: MAX_CONCURRENT
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('💥 [CRITICAL] Unhandled error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});

// ===========================
// PROCESSAR MENSAGEM INDIVIDUAL
// ===========================
async function processSingleMessage(
  supabase: any,
  pgmqMessage: PGMQMessage
): Promise<void> {
  const msgId = pgmqMessage.msg_id;
  const message = pgmqMessage.message;

  // ⚠️ NOVO: Detectar source e usar tabela/campos corretos
  const source = message.source || 'google_maps';
  const isInstagram = source === 'instagram';
  const tableName = isInstagram ? 'instagram_enriched_profiles' : 'lead_extraction_staging';
  const recordId = isInstagram ? message.profile_id : message.staging_id;
  const statusField = isInstagram ? 'website_scraping_status' : 'scraping_status';
  const startedField = isInstagram ? 'website_scraping_started_at' : 'scraping_started_at';
  const websiteUrl = message.website_url;

  console.log(`🔍 [START] Processing msg_id=${msgId} source=${source} id=${recordId} url=${websiteUrl}`);

  try {
    // 1️⃣ MARCAR COMO PROCESSING
    console.log(`  ⏳ [UPDATE] Setting ${statusField}='processing' in ${tableName}`);

    const { error: updateError } = await supabase
      .from(tableName)
      .update({
        [statusField]: 'processing',
        [startedField]: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', recordId);

    if (updateError) {
      console.error(`  ❌ [ERROR] Failed to update status:`, updateError);
      throw new Error(`Failed to update status: ${updateError.message}`);
    }

    // 2️⃣ CHAMAR API DE SCRAPING
    console.log(`  🌐 [SCRAPE] Calling scraper API: ${SCRAPER_API_URL}`);
    console.log(`  📍 [TARGET] Website: ${websiteUrl}`);

    const scrapingRequest: ScrapingApiRequest = {
      url: websiteUrl,
      extract_images: false,
      take_screenshot: false,
      timeout: 20000
    };

    // Criar AbortController para timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(`  ⏰ [TIMEOUT] Aborting request after ${REQUEST_TIMEOUT_MS}ms`);
      abortController.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
      const fetchStartTime = Date.now();
      
      const scrapingResponse = await fetch(SCRAPER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(scrapingRequest),
        signal: abortController.signal
      });

      clearTimeout(timeoutId);
      
      const fetchDuration = Date.now() - fetchStartTime;
      console.log(`  ⚡ [RESPONSE] Got response in ${fetchDuration}ms, status: ${scrapingResponse.status}`);

      if (!scrapingResponse.ok) {
        const errorText = await scrapingResponse.text().catch(() => 'Unable to read error body');

        // ⚠️ NOVO: Detectar CAPTCHA (403) e marcar como blocked
        if (scrapingResponse.status === 403) {
          console.log(`  🚫 [CAPTCHA] Site com proteção anti-bot detectada`);

          if (isInstagram) {
            await supabase
              .from('instagram_enriched_profiles')
              .update({
                website_scraping_status: 'blocked',
                website_scraping_enriched: true,
                website_category: 'blocked',
                website_scraping_error: 'Site com proteção anti-bot (captcha/403)',
                website_scraping_completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', recordId);
          } else {
            await supabase
              .from('lead_extraction_staging')
              .update({
                scraping_status: 'blocked',
                scraping_enriched: true,
                scraping_error: 'Site com proteção anti-bot (captcha/403)',
                scraping_completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', recordId);
          }

          // Delete da fila - não retry captcha
          await supabase.rpc('pgmq_delete', { queue_name: 'scraping_queue', msg_id: msgId });
          console.log(`  🗑️ [DELETED] Captcha message removed from queue (no retry)`);
          return;
        }

        throw new Error(`Scraper API returned ${scrapingResponse.status}: ${errorText}`);
      }

      const scrapingData: ScrapingApiResponse = await scrapingResponse.json();

      // ⚠️ NOVO: Sanitizar dados para prevenir JSONB injection
      const sanitizedData = sanitizeScrapingData(scrapingData);

      console.log(`  📊 [DATA] Scraping completed with status: ${sanitizedData.status}`);
      console.log(`  📧 [EMAILS] Found ${sanitizedData.emails?.length || 0} emails`);
      console.log(`  📱 [PHONES] Found ${sanitizedData.phones?.length || 0} phones`);
      console.log(`  🌐 [SOCIAL] FB:${sanitizedData.social_media?.facebook?.length || 0} IG:${sanitizedData.social_media?.instagram?.length || 0}`);

      // 3️⃣ PROCESSAR RESULTADO VIA FUNÇÃO SQL (específica por source)
      if (isInstagram) {
        console.log(`  💾 [PROCESS] Calling process_instagram_scraping_result function`);

        const { data: processResult, error: processError } = await supabase.rpc(
          'process_instagram_scraping_result',
          {
            p_profile_id: recordId,
            p_scraping_data: sanitizedData,
            p_status: sanitizedData.status
          }
        );

        if (processError) {
          console.error(`  ❌ [ERROR] process_instagram_scraping_result failed:`, processError);
          throw new Error(`Failed to process result: ${processError.message}`);
        }

        // NOVO: Criar log de scraping completado com detalhes completos
        if (message.run_id) {
          try {
            const scrapingSummary = [];
            if (sanitizedData.emails?.length) scrapingSummary.push(`${sanitizedData.emails.length} emails`);
            if (sanitizedData.phones?.length) scrapingSummary.push(`${sanitizedData.phones.length} telefones`);
            if (sanitizedData.whatsapp?.length) scrapingSummary.push(`${sanitizedData.whatsapp.length} WhatsApp`);
            if (sanitizedData.cnpj?.length) scrapingSummary.push(`${sanitizedData.cnpj.length} CNPJ`);
            if (sanitizedData.social_media) {
              const socialCount =
                (sanitizedData.social_media.facebook?.length || 0) +
                (sanitizedData.social_media.instagram?.length || 0) +
                (sanitizedData.social_media.linkedin?.length || 0);
              if (socialCount > 0) scrapingSummary.push(`${socialCount} redes sociais`);
            }

            await supabase.rpc('create_extraction_log_v2', {
              p_run_id: message.run_id,
              p_step_number: 13,
              p_step_name: 'Website Scraped',
              p_level: 'success',
              p_message: `Website scraped: ${websiteUrl.substring(0, 50)}... → ${scrapingSummary.join(', ') || 'nenhum dado'}`,
              p_source: 'instagram',
              p_phase: 'scraping',
              p_details: {
                website_url: websiteUrl,
                emails: sanitizedData.emails || [],
                phones: sanitizedData.phones || [],
                whatsapp: sanitizedData.whatsapp || [],
                cnpj: sanitizedData.cnpj || [],
                social_media: sanitizedData.social_media,
                metadata_title: sanitizedData.metadata?.title,
                has_checkout: sanitizedData.checkouts?.have_checkouts,
                has_pixels: sanitizedData.pixels?.have_pixels,
                scrape_method: sanitizedData.method,
                scrape_status: sanitizedData.status
              }
            });
          } catch (e) {
            console.error('[LOG ERROR]', e);
          }
        }
      } else {
        // Google Maps (lógica original)
        console.log(`  💾 [PROCESS] Calling process_scraping_result function`);

        const { data: processResult, error: processError } = await supabase.rpc(
          'process_scraping_result',
          {
            p_staging_id: recordId,
            p_scraping_data: sanitizedData,
            p_status: sanitizedData.status
          }
        );

        if (processError) {
          console.error(`  ❌ [ERROR] process_scraping_result failed:`, processError);
          throw new Error(`Failed to process result: ${processError.message}`);
        }
      }

      console.log(`  ✅ [SAVED] Result saved to database`);

      // 4️⃣ DELETAR MENSAGEM DA FILA (SUCESSO)
      console.log(`  🗑️ [DELETE] Removing msg_id=${msgId} from queue`);
      
      const { error: deleteError } = await supabase.rpc('pgmq_delete', {
        queue_name: 'scraping_queue',
        msg_id: msgId
      });

      if (deleteError) {
        console.error(`  ⚠️ [WARNING] Failed to delete message from queue:`, deleteError);
        // Não lançar erro aqui, pois o scraping foi bem-sucedido
      } else {
        console.log(`  ✅ [DELETED] Message removed from queue`);
      }

      console.log(`✅ [COMPLETE] msg_id=${msgId} processed successfully`);

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        throw new Error(`Request timeout after ${REQUEST_TIMEOUT_MS}ms`);
      }
      
      throw fetchError;
    }

  } catch (error) {
    console.error(`❌ [FAILED] msg_id=${msgId} error:`, error.message);

    // ⚠️ NOVO: Implementar RETRY com backoff exponencial
    const retryAttempt = message.retry_attempt || 0;

    if (retryAttempt < MAX_RETRY_ATTEMPTS) {
      // Calcular delay com backoff exponencial: 1min, 2min, 4min
      const delayMinutes = Math.pow(2, retryAttempt);

      console.log(`  🔄 [RETRY] Attempt ${retryAttempt + 1}/${MAX_RETRY_ATTEMPTS}, next retry in ${delayMinutes}min`);

      // Atualizar next_retry_at e attempts count
      try {
        if (isInstagram) {
          await supabase
            .from('instagram_enriched_profiles')
            .update({
              website_scraping_attempts: retryAttempt + 1,
              website_scraping_status: 'pending',
              website_scraping_error: `Retry ${retryAttempt + 1}/${MAX_RETRY_ATTEMPTS}: ${error.message}`,
              next_retry_at: new Date(Date.now() + delayMinutes * 60000).toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', recordId);
        } else {
          await supabase
            .from('lead_extraction_staging')
            .update({
              scraping_attempts: retryAttempt + 1,
              scraping_status: 'pending',
              scraping_error: `Retry ${retryAttempt + 1}/${MAX_RETRY_ATTEMPTS}: ${error.message}`,
              updated_at: new Date().toISOString()
            })
            .eq('id', recordId);
        }

        console.log(`  📝 [UPDATED] Retry scheduled for ${delayMinutes}min from now`);
      } catch (updateError) {
        console.error(`  ⚠️ [WARNING] Failed to update retry status:`, updateError);
      }

      // Delete mensagem da fila (será re-enfileirada pelo cron quando next_retry_at chegar)
      await supabase.rpc('pgmq_delete', {
        queue_name: 'scraping_queue',
        msg_id: msgId
      });

    } else {
      // Máximo de retries atingido - marcar como failed permanente
      console.error(`  ❌ [MAX_RETRY] Giving up after ${MAX_RETRY_ATTEMPTS} attempts`);

      try {
        if (isInstagram) {
          await supabase
            .from('instagram_enriched_profiles')
            .update({
              website_scraping_status: 'failed',
              website_scraping_enriched: true,
              website_scraping_error: `Failed after ${MAX_RETRY_ATTEMPTS} attempts: ${error.message}`,
              website_scraping_attempts: MAX_RETRY_ATTEMPTS,
              website_scraping_completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', recordId);
        } else {
          await supabase
            .from('lead_extraction_staging')
            .update({
              scraping_status: 'failed',
              scraping_enriched: true,
              scraping_error: `Failed after ${MAX_RETRY_ATTEMPTS} attempts: ${error.message}`,
              scraping_attempts: MAX_RETRY_ATTEMPTS,
              scraping_completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', recordId);
        }

        console.log(`  📝 [UPDATED] Status set to 'failed' permanently`);
      } catch (updateError) {
        console.error(`  ⚠️ [WARNING] Failed to update error status:`, updateError);
      }

      // Delete mensagem da fila
      await supabase.rpc('pgmq_delete', {
        queue_name: 'scraping_queue',
        msg_id: msgId
      });

      console.log(`  🗑️ [DELETED] Failed message removed from queue`);
    }

    throw error; // Re-throw para Promise.all contar como failed
  }
}

// ===========================
// SANITIZAÇÃO DE DADOS
// ===========================
function sanitizeScrapingData(data: any): ScrapingApiResponse {
  const MAX_ARRAY_LENGTH = 100;
  const MAX_STRING_LENGTH = 50000;

  return {
    status: String(data.status || 'unknown').substring(0, 20),
    url: String(data.url || '').substring(0, 1000),
    method: String(data.method || '').substring(0, 20),
    emails: (data.emails || [])
      .slice(0, MAX_ARRAY_LENGTH)
      .map((e: any) => String(e).substring(0, 500))
      .filter((e: string) => e && e.includes('@')),
    phones: (data.phones || [])
      .slice(0, MAX_ARRAY_LENGTH)
      .map((p: any) => String(p).replace(/[^0-9+() -]/g, '').substring(0, 30))
      .filter((p: string) => p && p.length >= 8),
    cnpj: (data.cnpj || [])
      .slice(0, 10)
      .map((c: any) => validateCNPJ(String(c)))
      .filter(Boolean),
    whatsapp: (data.whatsapp || [])
      .slice(0, MAX_ARRAY_LENGTH)
      .map((w: any) => String(w).substring(0, 1000)),
    social_media: {
      linkedin: ((data.social_media?.linkedin || []) as any[]).slice(0, 20).map(s => String(s).substring(0, 1000)),
      facebook: ((data.social_media?.facebook || []) as any[]).slice(0, 20).map(s => String(s).substring(0, 1000)),
      instagram: ((data.social_media?.instagram || []) as any[]).slice(0, 20).map(s => String(s).substring(0, 1000)),
      youtube: ((data.social_media?.youtube || []) as any[]).slice(0, 20).map(s => String(s).substring(0, 1000)),
      twitter: ((data.social_media?.twitter || []) as any[]).slice(0, 20).map(s => String(s).substring(0, 1000)),
    },
    metadata: {
      title: String(data.metadata?.title || '').substring(0, 500),
      description: String(data.metadata?.description || '').substring(0, 2000),
      og_image: String(data.metadata?.og_image || '').substring(0, 1000),
    },
    images: {
      logos: ((data.images?.logos || []) as any[]).slice(0, 10).map(i => String(i).substring(0, 1000)),
      favicon: String(data.images?.favicon || '').substring(0, 1000),
      other_images: ((data.images?.other_images || []) as any[]).slice(0, 20).map(i => String(i).substring(0, 1000)),
    },
    button_links: ((data.button_links || []) as any[]).slice(0, 50).map(l => String(l).substring(0, 1000)),
    checkouts: {
      have_checkouts: Boolean(data.checkouts?.have_checkouts),
      platforms: ((data.checkouts?.platforms || []) as any[]).slice(0, 10).map(p => String(p).substring(0, 100)),
    },
    pixels: {
      have_pixels: Boolean(data.pixels?.have_pixels),
      pixels: data.pixels?.pixels || {},
    },
    screenshot: {
      base64: '', // Não armazenar screenshot (muito grande)
      timestamp: String(data.screenshot?.timestamp || ''),
    },
    markdown: String(data.markdown || '').substring(0, MAX_STRING_LENGTH),
    performance: {
      total_time: String(data.performance?.total_time || '0s'),
    },
  };
}
