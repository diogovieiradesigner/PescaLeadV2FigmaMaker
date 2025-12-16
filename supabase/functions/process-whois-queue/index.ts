// =============================================================================
// EDGE FUNCTION: process-whois-queue V7 (CLOUDFLARE PROXY + PARALELO)
// =============================================================================
// V7 (Otimização de Performance):
// - Batch size aumentado para 50 (antes: 10)
// - Processamento em paralelo com Promise.allSettled (antes: sequencial)
// - Concorrência máxima de 10 requests simultâneos
// - Delay removido (Cloudflare proxy não tem rate limit)
// - Performance estimada: ~500 leads/minuto (antes: ~10 leads/minuto)
// =============================================================================
// V6:
// - USA O ENDPOINT CLOUDFLARE WORKERS CORRETO
// - Endpoint: https://dominio.diogo-vieira-pb-f91.workers.dev/?domain=XXX
// - Dados já vêm formatados e prontos para uso
// =============================================================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// V6: Endpoint do Cloudflare Workers
const WHOIS_ENDPOINT = 'https://dominio.diogo-vieira-pb-f91.workers.dev';

function createSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

function normalizeDomain(domain: string): string {
  let normalized = domain.toLowerCase().trim();
  normalized = normalized.replace(/^(https?:\/\/)?(www\.)?/, '');
  normalized = normalized.split('/')[0];
  normalized = normalized.split('?')[0];
  return normalized;
}

function isBrazilianDomain(domain: string): boolean {
  return domain.endsWith('.br');
}

const IGNORED_DOMAINS = [
  'instagram.com',
  'facebook.com',
  'linkedin.com',
  'twitter.com',
  'youtube.com',
  'tiktok.com',
  'linktr.ee',
  'sites.google.com',
  'framer.ai',
  'ueniweb.com',
  'wixsite.com',
  'wordpress.com',
  'blogspot.com',
  'carrd.co',
  'google.com',
  'whatsapp.com',
  'wa.me',
  'bit.ly',
  'goo.gl'
];

// V6: Chamar o endpoint correto do Cloudflare Workers
async function fetchWhoisData(domain: string) {
  // Ignorar domínios de plataformas
  const baseDomain = domain.split('.').slice(-2).join('.');
  if (IGNORED_DOMAINS.some(d => domain.includes(d) || baseDomain === d)) {
    console.log(`⏭️ [WHOIS] Domínio ignorado (plataforma): ${domain}`);
    return {
      success: false,
      skipped: true,
      error: 'Plataforma ignorada'
    };
  }
  
  // SOMENTE domínios .BR
  if (!isBrazilianDomain(domain)) {
    console.log(`⏭️ [WHOIS] Domínio ignorado (não é .BR): ${domain}`);
    return {
      success: false,
      skipped: true,
      error: 'Não é domínio .BR'
    };
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  
  try {
    // V6: Usar endpoint Cloudflare Workers
    const url = `${WHOIS_ENDPOINT}/?domain=${encodeURIComponent(domain)}`;
    console.log(`🔍 [WHOIS] Consultando: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    const data = await response.json();
    
    // Verificar se retornou erro (domínio não encontrado)
    if (data.erro || data.status === 404) {
      console.log(`⚠️ [WHOIS] Domínio não encontrado: ${domain}`);
      return {
        success: false,
        notFound: true,
        error: data.mensagem || 'Domínio não encontrado'
      };
    }
    
    // Sucesso!
    if (data.sucesso) {
      console.log(`✅ [WHOIS] Dados encontrados para: ${domain}`);
      return {
        success: true,
        data: data,
        provider: 'cloudflare-workers'
      };
    }
    
    return {
      success: false,
      error: 'Resposta inesperada da API'
    };
    
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error(`❌ [WHOIS] Erro ao consultar ${domain}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  const startTime = Date.now();
  
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 [START] Process WHOIS queue V6 (CLOUDFLARE PROXY)');
    console.log('='.repeat(60));
    
    const supabase = createSupabaseClient();
    
    // V7: Batch size aumentado de 10 para 50
    const { data: rawMessages, error: readError } = await supabase.rpc('pgmq_read_batch', {
      queue_name: 'whois_queue',
      visibility_timeout: 180, // V7: Aumentado para 3 minutos (processamento paralelo)
      qty: 50 // V7: Aumentado de 10 para 50
    });
    
    if (readError) {
      console.error('❌ [WHOIS] Erro ao ler fila:', readError);
      throw new Error(`Erro ao ler fila: ${readError.message}`);
    }
    
    let messages = rawMessages && Array.isArray(rawMessages) ? rawMessages : [];
    console.log(`📬 [WHOIS] ${messages.length} mensagens encontradas`);
    
    if (messages.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        version: 'V7_PARALLEL',
        message: 'Nenhuma mensagem',
        total_messages: 0,
        processed: 0,
        duration_ms: Date.now() - startTime
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    let processed = 0, skipped = 0, failed = 0, notFound = 0;

    // V7: Função para processar um único lead (usada em paralelo)
    async function processLead(msg: any): Promise<{ status: 'processed' | 'skipped' | 'notFound' | 'failed', msgId: number }> {
      const msgId = msg.msg_id;
      const { lead_id, domain } = msg.message;

      try {
        if (!domain) {
          await supabase.from('lead_extraction_staging').update({
            whois_enriched: false,
            whois_checked_at: new Date().toISOString()
          }).eq('id', lead_id);

          await supabase.rpc('pgmq_delete_msg', {
            queue_name: 'whois_queue',
            msg_id: msgId
          });

          return { status: 'skipped', msgId };
        }

        const normalizedDomain = normalizeDomain(domain);
        const whoisResult = await fetchWhoisData(normalizedDomain);

        if (whoisResult.skipped) {
          await supabase.from('lead_extraction_staging').update({
            whois_enriched: false,
            whois_checked_at: new Date().toISOString()
          }).eq('id', lead_id);

          await supabase.rpc('pgmq_delete_msg', {
            queue_name: 'whois_queue',
            msg_id: msgId
          });

          return { status: 'skipped', msgId };
        }

        if (whoisResult.notFound) {
          await supabase.from('lead_extraction_staging').update({
            whois_enriched: false,
            whois_checked_at: new Date().toISOString()
          }).eq('id', lead_id);

          await supabase.rpc('pgmq_delete_msg', {
            queue_name: 'whois_queue',
            msg_id: msgId
          });

          return { status: 'notFound', msgId };
        }

        if (!whoisResult.success || !whoisResult.data) {
          await supabase.from('lead_extraction_staging').update({
            whois_enriched: false,
            whois_checked_at: new Date().toISOString()
          }).eq('id', lead_id);

          await supabase.rpc('pgmq_delete_msg', {
            queue_name: 'whois_queue',
            msg_id: msgId
          });

          return { status: 'failed', msgId };
        }

        // Dados já vêm formatados do endpoint Cloudflare
        const apiData = whoisResult.data;

        // Preparar whois_data com emails no formato esperado pelo trigger
        const whoisEmails: any[] = [];
        if (apiData.emails && Array.isArray(apiData.emails)) {
          apiData.emails.forEach((email: string) => {
            if (email && typeof email === 'string' && email.includes('@')) {
              whoisEmails.push({
                address: email.toLowerCase().trim(),
                source: 'whois',
                type: 'main',
                verified: false
              });
            }
          });
        }

        // Construir whois_data com estrutura completa + emails formatados
        const whoisDataToSave: any = {
          ...(apiData.dados_completos || apiData),
          emails: whoisEmails.length > 0 ? whoisEmails : undefined,
          dominio: apiData.dominio,
          cnpj: apiData.cnpj,
          razao_social: apiData.razao_social,
          representante_legal: apiData.representante_legal,
          responsaveis: apiData.responsaveis,
          nameservers: apiData.nameservers,
          datas: apiData.datas,
          status: apiData.status
        };

        const updateData: any = {
          whois_data: whoisDataToSave,
          whois_enriched: true,
          whois_checked_at: new Date().toISOString()
        };

        // Extrair dados do formato do Cloudflare Workers
        const extractedData: any = {
          cnpj: apiData.cnpj?.replace(/[^\d]/g, '') || null,
          company_name: apiData.razao_social || null,
          legal_representative: apiData.representante_legal || null,
          admin_email: apiData.emails?.[0] || null,
          admin_name: apiData.responsaveis?.find((r: any) => r.tipo === 'Administrativo')?.nome || null,
          tech_name: apiData.responsaveis?.find((r: any) => r.tipo === 'Técnico')?.nome || null,
          registration_date: apiData.datas?.criacao || null,
          expiration_date: apiData.datas?.expiracao || null,
          status: apiData.status?.[0] || null,
          nameservers: apiData.nameservers || []
        };

        // Atualizar CNPJ se encontrado
        if (extractedData.cnpj) {
          updateData.cnpj_normalized = extractedData.cnpj;
        }

        // Salvar dados extraídos
        updateData.whois_extracted_data = extractedData;

        const { error: updateError } = await supabase
          .from('lead_extraction_staging')
          .update(updateData)
          .eq('id', lead_id);

        if (updateError) {
          console.error(`❌ [WHOIS] Erro ao salvar msg ${msgId}:`, updateError);
          return { status: 'failed', msgId };
        }

        await supabase.rpc('pgmq_delete_msg', {
          queue_name: 'whois_queue',
          msg_id: msgId
        });

        return { status: 'processed', msgId };

      } catch (error: any) {
        console.error(`❌ [WHOIS] Erro msg ${msgId}:`, error.message);
        return { status: 'failed', msgId };
      }
    }

    // V7: Processar em paralelo com concorrência limitada
    const CONCURRENCY = 10; // Máximo 10 requests simultâneos
    const chunks: any[][] = [];

    for (let i = 0; i < messages.length; i += CONCURRENCY) {
      chunks.push(messages.slice(i, i + CONCURRENCY));
    }

    console.log(`⚡ [V7] Processando ${messages.length} mensagens em ${chunks.length} batches (${CONCURRENCY} paralelos)`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`\n🔄 [V7] Batch ${i + 1}/${chunks.length} (${chunk.length} leads)`);

      const results = await Promise.allSettled(chunk.map(msg => processLead(msg)));

      for (const result of results) {
        if (result.status === 'fulfilled') {
          switch (result.value.status) {
            case 'processed': processed++; break;
            case 'skipped': skipped++; break;
            case 'notFound': notFound++; break;
            case 'failed': failed++; break;
          }
        } else {
          failed++;
        }
      }
    }
    
    console.log(`\n🎉 [COMPLETE] ${processed} processados, ${skipped} ignorados, ${notFound} não encontrados, ${failed} falharam`);
    
    return new Response(JSON.stringify({
      success: true,
      version: 'V7_PARALLEL',
      total_messages: messages.length,
      processed,
      skipped,
      not_found: notFound,
      failed,
      duration_ms: Date.now() - startTime,
      performance: {
        batch_size: 50,
        concurrency: 10,
        leads_per_minute_estimate: Math.round((processed / (Date.now() - startTime)) * 60000)
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    console.error('❌ [FATAL]', error);
    return new Response(JSON.stringify({
      error: 'Erro interno',
      details: error.message,
      duration_ms: Date.now() - startTime
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
