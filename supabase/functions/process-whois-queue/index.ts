// =============================================================================
// EDGE FUNCTION: process-whois-queue V6 (CLOUDFLARE PROXY ENDPOINT)
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
    
    // Ler mensagens da fila
    const { data: rawMessages, error: readError } = await supabase.rpc('pgmq_read_batch', {
      queue_name: 'whois_queue',
      visibility_timeout: 120,
      qty: 10
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
        version: 'V6_CLOUDFLARE_PROXY',
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
    
    for (const msg of messages) {
      const msgId = msg.msg_id;
      const { lead_id, domain } = msg.message;
      
      console.log(`\n🚀 [WHOIS] Processando msg ${msgId} (domain: ${domain})`);
      
      if (!domain) {
        await supabase.from('lead_extraction_staging').update({
          whois_enriched: false,
          whois_checked_at: new Date().toISOString()
        }).eq('id', lead_id);
        
        await supabase.rpc('pgmq_delete_msg', {
          queue_name: 'whois_queue',
          msg_id: msgId
        });
        
        skipped++;
        continue;
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
        
        skipped++;
        continue;
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
        
        notFound++;
        continue;
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
        
        failed++;
        continue;
      }
      
      // V6: Dados já vêm formatados do endpoint Cloudflare
      const apiData = whoisResult.data;
      
      // V6: Preparar whois_data com emails no formato esperado pelo trigger
      // O trigger espera whois_data->emails como array JSONB de objetos
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
      
      // V6: Extrair dados do formato do Cloudflare Workers
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
        console.log(`🎯 [WHOIS] CNPJ encontrado: ${apiData.cnpj}`);
      }
      
      // Salvar dados extraídos
      updateData.whois_extracted_data = extractedData;
      
      console.log(`📧 [WHOIS] Emails formatados: ${whoisEmails.length} emails encontrados`);
      
      console.log(`📊 [WHOIS] Dados extraídos:`, {
        cnpj: apiData.cnpj,
        razao_social: extractedData.company_name,
        representante: extractedData.legal_representative,
        email: extractedData.admin_email
      });
      
      const { error: updateError } = await supabase
        .from('lead_extraction_staging')
        .update(updateData)
        .eq('id', lead_id);
      
      if (updateError) {
        console.error(`❌ [WHOIS] Erro ao salvar:`, updateError);
        failed++;
        continue;
      }
      
      console.log(`✅ [WHOIS] Dados salvos com sucesso!`);
      
      await supabase.rpc('pgmq_delete_msg', {
        queue_name: 'whois_queue',
        msg_id: msgId
      });
      
      processed++;
      
      // Delay entre requisições para não sobrecarregar
      await new Promise(r => setTimeout(r, 500));
    }
    
    console.log(`\n🎉 [COMPLETE] ${processed} processados, ${skipped} ignorados, ${notFound} não encontrados, ${failed} falharam`);
    
    return new Response(JSON.stringify({
      success: true,
      version: 'V6_CLOUDFLARE_PROXY',
      total_messages: messages.length,
      processed,
      skipped,
      not_found: notFound,
      failed,
      duration_ms: Date.now() - startTime
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
