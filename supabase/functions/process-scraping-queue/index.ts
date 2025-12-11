// ===========================================================================
// EDGE FUNCTION: process-scraping-queue (V6 - TODAS CORREÇÕES)
// ===========================================================================
// Processa fila PGMQ de scraping web com controle de concorrência
// IMPORTANTE: verify_jwt DEVE estar FALSE no config.toml
// ===========================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ===========================
// CONFIGURAÇÕES
// ===========================
const SCRAPER_API_URL = Deno.env.get('SCRAPER_API_URL') || 'https://proxy-scraper-api.diogo-vieira-pb-f91.workers.dev';
const MAX_CONCURRENT = 60;
const VT_SECONDS = 180; // 3 minutos
const REQUEST_TIMEOUT_MS = 180000; // 3 minutos

// ===========================
// TIPOS
// ===========================
interface ScrapingQueueMessage {
  staging_id: string;
  website_url: string;
  workspace_id: string;
  queued_at: string;
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
  const stagingId = message.staging_id;
  const websiteUrl = message.website_url;

  console.log(`🔍 [START] Processing msg_id=${msgId} staging_id=${stagingId} url=${websiteUrl}`);

  try {
    // 1️⃣ MARCAR COMO PROCESSING
    console.log(`  ⏳ [UPDATE] Setting status to 'processing'`);
    
    const { error: updateError } = await supabase
      .from('lead_extraction_staging')
      .update({
        scraping_status: 'processing',
        scraping_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', stagingId);

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
        throw new Error(`Scraper API returned ${scrapingResponse.status}: ${errorText}`);
      }

      const scrapingData: ScrapingApiResponse = await scrapingResponse.json();
      
      console.log(`  📊 [DATA] Scraping completed with status: ${scrapingData.status}`);
      console.log(`  📧 [EMAILS] Found ${scrapingData.emails?.length || 0} emails`);
      console.log(`  📱 [PHONES] Found ${scrapingData.phones?.length || 0} phones`);
      console.log(`  🌐 [SOCIAL] FB:${scrapingData.social_media?.facebook?.length || 0} IG:${scrapingData.social_media?.instagram?.length || 0}`);

      // 3️⃣ PROCESSAR RESULTADO VIA FUNÇÃO SQL
      console.log(`  💾 [PROCESS] Calling process_scraping_result function`);
      
      const { data: processResult, error: processError } = await supabase.rpc(
        'process_scraping_result',
        {
          p_staging_id: stagingId,
          p_scraping_data: scrapingData,
          p_status: scrapingData.status
        }
      );

      if (processError) {
        console.error(`  ❌ [ERROR] process_scraping_result failed:`, processError);
        throw new Error(`Failed to process result: ${processError.message}`);
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

    // Marcar como failed no banco
    try {
      // Primeiro pegar o número atual de tentativas
      const { data: currentData } = await supabase
        .from('lead_extraction_staging')
        .select('scraping_attempts')
        .eq('id', stagingId)
        .single();
      
      const newAttempts = (currentData?.scraping_attempts || 0) + 1;
      
      await supabase
        .from('lead_extraction_staging')
        .update({
          scraping_status: 'failed',
          scraping_error: error.message,
          scraping_completed_at: new Date().toISOString(),
          scraping_attempts: newAttempts,
          updated_at: new Date().toISOString()
        })
        .eq('id', stagingId);

      console.log(`  📝 [UPDATED] Status set to 'failed' in database (attempts: ${newAttempts})`);
    } catch (updateError) {
      console.error(`  ⚠️ [WARNING] Failed to update error status:`, updateError);
    }

    // Deletar mensagem da fila (não retry - API já tem retry interno)
    try {
      await supabase.rpc('pgmq_delete', {
        queue_name: 'scraping_queue',
        msg_id: msgId
      });
      
      console.log(`  🗑️ [DELETED] Failed message removed from queue`);
    } catch (deleteError) {
      console.error(`  ⚠️ [WARNING] Failed to delete failed message:`, deleteError);
    }

    throw error; // Re-throw para Promise.all contar como failed
  }
}
