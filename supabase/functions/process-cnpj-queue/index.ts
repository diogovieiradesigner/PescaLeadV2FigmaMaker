// =============================================================================
// EDGE FUNCTION: process-cnpj-queue V4 (FORMATTED DATA)
// =============================================================================
// V4: 
// - Formata emails e phones no formato esperado pelo trigger
// - Salva todos os campos úteis da API BrasilAPI
// - Compatível com trigger normalize_and_consolidate_staging_v2
// =============================================================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Importar funções de formatação
import { formatCNPJ, formatPhoneToBrazilian, formatDateToDDMMYYYY, formatCurrencyBRL } from '../_shared/cnpj-formatters.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const CNPJ_APIS = [
  // Banco local (Hetzner) - PRIMEIRA OPÇÃO, mais rápido e sem rate limit
  {
    name: 'banco_local',
    url: (cnpj: string) => `${Deno.env.get('SUPABASE_URL')}/functions/v1/cnpj-api?cnpj=${cnpj}`,
    timeout: 15000,
    // NOTA: Usando 'apikey' header para chamadas internas do Supabase
    // Isso é mais seguro que passar service_role_key no Authorization header
    headers: {
      'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
    }
  },
  // APIs externas - fallback
  { name: 'brasilapi', url: (cnpj: string) => `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, timeout: 10000 },
  { name: 'receitaws', url: (cnpj: string) => `https://www.receitaws.com.br/v1/cnpj/${cnpj}`, timeout: 15000 },
  { name: 'publica', url: (cnpj: string) => `https://publica.cnpj.ws/cnpj/${cnpj}`, timeout: 10000 }
];

function createSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function isValidCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/[^\d]/g, '');
  if (cleaned.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cleaned)) return false;
  return true;
}

function normalizeCNPJ(cnpj: string): string {
  return cnpj.replace(/[^\d]/g, '');
}

async function fetchCNPJFromAPI(cnpj: string, api: any) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), api.timeout);

  try {
    console.log(`🔍 [CNPJ] Consultando ${api.name} para CNPJ: ${cnpj}`);

    // Montar headers (incluindo customizados se existirem)
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'PescaLead/1.0',
      ...(api.headers || {})
    };

    const response = await fetch(api.url(cnpj), {
      method: 'GET',
      headers,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };
    const data = await response.json();

    // Para banco_local, extrair data do wrapper
    if (api.name === 'banco_local') {
      if (data.success && data.data) {
        console.log(`✅ [CNPJ] ${api.name} respondeu com sucesso (${data.response_time_ms}ms)`);
        return { success: true, data: data.data };
      }
      return { success: false, error: data.error || 'CNPJ não encontrado' };
    }

    console.log(`✅ [CNPJ] ${api.name} respondeu com sucesso`);
    return { success: true, data };
  } catch (error: any) {
    clearTimeout(timeoutId);
    return { success: false, error: error.name === 'AbortError' ? 'Timeout' : error.message };
  }
}

async function fetchCNPJData(cnpj: string) {
  for (const api of CNPJ_APIS) {
    const result = await fetchCNPJFromAPI(cnpj, api);
    if (result.success && result.data) {
      return { success: true, data: result.data, provider: api.name };
    }
  }
  return { success: false, error: 'Todas as APIs falharam' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 [START] Process CNPJ queue V4 (FORMATTED)');
    console.log('='.repeat(60));

    const supabase = createSupabaseClient();

    // V3: Ler mensagens da fila
    console.log('📥 [CNPJ] Lendo mensagens da fila...');
    
    const { data: rawMessages, error: readError } = await supabase
      .rpc('pgmq_read_batch', {
        queue_name: 'cnpj_queue',
        visibility_timeout: 120,
        qty: 10
      });

    if (readError) {
      console.error('❌ [CNPJ] Erro ao ler fila:', readError);
      throw new Error(`Erro ao ler fila: ${readError.message}`);
    }

    // V3: O retorno do RPC é JSONB direto
    let messages: any[] = [];
    
    if (rawMessages) {
      if (Array.isArray(rawMessages)) {
        messages = rawMessages;
      } else if (typeof rawMessages === 'object') {
        messages = [rawMessages];
      }
    }

    console.log(`📬 [CNPJ] Raw response type: ${typeof rawMessages}`);
    console.log(`📬 [CNPJ] Messages count: ${messages.length}`);

    if (messages.length === 0) {
      console.log('📭 [CNPJ] Nenhuma mensagem na fila');
      return new Response(JSON.stringify({
        success: true,
        version: 'V4_FORMATTED',
        message: 'Nenhuma mensagem para processar',
        total_messages: 0,
        processed: 0,
        duration_ms: Date.now() - startTime
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`📨 [CNPJ] ${messages.length} mensagens encontradas`);

    const results: any[] = [];
    let processed = 0;
    let failed = 0;

    for (const msg of messages) {
      try {
        const msgId = msg.msg_id;
        const payload = msg.message;
        const { lead_id, staging_id, cnpj } = payload;

        // Usar staging_id se disponível, senão lead_id (compatibilidade)
        const recordId = staging_id || lead_id;

        if (!recordId) {
          console.error(`❌ [CNPJ] Mensagem ${msgId} sem staging_id ou lead_id:`, payload);
          await supabase.rpc('pgmq_delete', { queue_name: 'cnpj_queue', msg_id: msgId });
          failed++;
          continue;
        }

        console.log(`\n🚀 [CNPJ] Processando msg ${msgId} (staging: ${recordId}, cnpj: ${cnpj})`);

        // Validar CNPJ
        if (!cnpj || !isValidCNPJ(cnpj)) {
        console.log(`⚠️ [CNPJ] CNPJ inválido: ${cnpj}`);
        await supabase.from('lead_extraction_staging').update({
          cnpj_enriched: false,
          cnpj_checked_at: new Date().toISOString()
        }).eq('id', recordId);
        await supabase.rpc('pgmq_delete_msg', { queue_name: 'cnpj_queue', msg_id: msgId });
        failed++;
        continue;
      }

      const normalizedCNPJ = normalizeCNPJ(cnpj);
      const cnpjResult = await fetchCNPJData(normalizedCNPJ);

      if (!cnpjResult.success || !cnpjResult.data) {
        console.log(`⚠️ [CNPJ] APIs falharam para ${cnpj}`);
        await supabase.from('lead_extraction_staging').update({
          cnpj_enriched: false,
          cnpj_checked_at: new Date().toISOString()
        }).eq('id', recordId);
        await supabase.rpc('pgmq_delete_msg', { queue_name: 'cnpj_queue', msg_id: msgId });
        failed++;
        continue;
      }

      // V4: Formatar dados no formato esperado pelo trigger
      const apiData = cnpjResult.data;
      const provider = cnpjResult.provider;
      
      // Normalizar estrutura de dados conforme a API
      let normalizedData: any = {};
      let cnpjEmails: any[] = [];
      let cnpjPhones: any[] = [];

      if (provider === 'banco_local') {
        // Banco Local (Hetzner) - dados já normalizados pela cnpj-api
        normalizedData = {
          cnpj: formatCNPJ(normalizedCNPJ),
          razao_social: apiData.razao_social,
          nome_fantasia: apiData.nome_fantasia,
          porte: apiData.porte,
          natureza_juridica: apiData.natureza_juridica,
          situacao_cadastral: apiData.situacao_cadastral,
          data_situacao_cadastral: formatDateToDDMMYYYY(apiData.data_situacao_cadastral),
          data_inicio_atividade: formatDateToDDMMYYYY(apiData.data_inicio_atividade),
          tipo: apiData.tipo,
          capital_social: apiData.capital_social,
          capital_social_formatado: formatCurrencyBRL(apiData.capital_social),
          // Endereço
          logradouro: apiData.endereco?.logradouro ?
            `${apiData.endereco.tipo_logradouro || ''} ${apiData.endereco.logradouro}`.trim() : null,
          numero: apiData.endereco?.numero,
          complemento: apiData.endereco?.complemento,
          bairro: apiData.endereco?.bairro,
          municipio: apiData.endereco?.municipio,
          uf: apiData.endereco?.uf,
          cep: apiData.endereco?.cep,
          // Atividade
          cnae_fiscal: apiData.atividade?.cnae_principal,
          cnae_fiscal_descricao: apiData.atividade?.cnae_descricao,
          // Simples
          opcao_pelo_simples: apiData.simples?.opcao_simples,
          data_opcao_pelo_simples: apiData.simples?.data_opcao_simples,
          opcao_mei: apiData.simples?.opcao_mei,
          data_opcao_mei: apiData.simples?.data_opcao_mei,
          // Sócios (QSA)
          qsa: apiData.socios?.map((s: any) => ({
            nome: s.nome,
            qual: s.qualificacao,
            pais_origem: s.pais,
            faixa_etaria: s.faixa_etaria
          }))
        };

        // Email do banco local
        if (apiData.contato?.email && apiData.contato.email.includes('@')) {
          cnpjEmails.push({
            address: apiData.contato.email.toLowerCase().trim(),
            source: 'cnpj',
            type: 'main',
            verified: true
          });
        }

        // Telefone 1 do banco local
        if (apiData.contato?.telefone_1) {
          const phoneStr = apiData.contato.telefone_1.replace(/\D/g, '');
          if (phoneStr.length >= 10) {
            const ddd = phoneStr.substring(0, 2);
            const number = phoneStr.substring(2);
            cnpjPhones.push({
              number: phoneStr,
              source: 'cnpj',
              type: number.length === 8 ? 'landline' : 'mobile',
              verified: true,
              formatted: formatPhoneToBrazilian(apiData.contato.telefone_1),
              with_country: `+55 ${formatPhoneToBrazilian(apiData.contato.telefone_1)}`
            });
          }
        }

        // Telefone 2 do banco local
        if (apiData.contato?.telefone_2) {
          const phoneStr = apiData.contato.telefone_2.replace(/\D/g, '');
          if (phoneStr.length >= 10) {
            const ddd = phoneStr.substring(0, 2);
            const number = phoneStr.substring(2);
            cnpjPhones.push({
              number: phoneStr,
              source: 'cnpj',
              type: number.length === 8 ? 'landline' : 'mobile',
              verified: true,
              formatted: formatPhoneToBrazilian(apiData.contato.telefone_2),
              with_country: `+55 ${formatPhoneToBrazilian(apiData.contato.telefone_2)}`
            });
          }
        }

      } else if (provider === 'brasilapi') {
        // BrasilAPI: https://brasilapi.com.br/api/cnpj/v1/{cnpj}
        normalizedData = {
          cnpj: formatCNPJ(normalizedCNPJ),
          razao_social: apiData.razao_social,
          nome_fantasia: apiData.nome_fantasia,
          porte: apiData.porte,
          natureza_juridica: apiData.natureza_juridica,
          situacao_cadastral: apiData.descricao_situacao_cadastral || apiData.situacao_cadastral,
          data_situacao_cadastral: formatDateToDDMMYYYY(apiData.data_situacao_cadastral),
          logradouro: apiData.logradouro,
          numero: apiData.numero,
          complemento: apiData.complemento,
          bairro: apiData.bairro,
          municipio: apiData.municipio,
          uf: apiData.uf,
          cep: apiData.cep,
          cnae_fiscal: apiData.cnae_fiscal,
          cnae_fiscal_descricao: apiData.cnae_fiscal_descricao,
          cnaes_secundarios: apiData.cnaes_secundarios,
          capital_social: apiData.capital_social,
          capital_social_formatado: formatCurrencyBRL(apiData.capital_social),
          qsa: apiData.qsa,
          data_inicio_atividade: apiData.data_inicio_atividade,
          regime_tributario: apiData.regime_tributario,
          opcao_pelo_simples: apiData.opcao_pelo_simples,
          data_opcao_pelo_simples: apiData.data_opcao_pelo_simples
        };
        
        // Email BrasilAPI
        if (apiData.email && typeof apiData.email === 'string' && apiData.email.includes('@')) {
          cnpjEmails.push({
            address: apiData.email.toLowerCase().trim(),
            source: 'cnpj',
            type: 'main',
            verified: true
          });
        }
        
        // Telefone BrasilAPI: ddd_telefone_1 vem como "8398564818" (DDD+telefone junto)
        if (apiData.ddd_telefone_1 && typeof apiData.ddd_telefone_1 === 'string') {
          const phoneStr = apiData.ddd_telefone_1.replace(/\D/g, '');
          if (phoneStr.length >= 10) {
            const ddd = phoneStr.substring(0, 2);
            const number = phoneStr.substring(2);
            const formatted = formatPhoneToBrazilian(`${ddd}${number}`);
            
            cnpjPhones.push({
              number: `${ddd}${number}`,
              source: 'cnpj',
              type: number.length === 8 ? 'landline' : 'mobile',
              verified: true,
              formatted: formatted,
              with_country: `+55 ${formatted}`
            });
          }
        }
        
        // Telefone 2 BrasilAPI (se existir)
        if (apiData.ddd_telefone_2 && typeof apiData.ddd_telefone_2 === 'string') {
          const phoneStr = apiData.ddd_telefone_2.replace(/\D/g, '');
          if (phoneStr.length >= 10) {
            const ddd = phoneStr.substring(0, 2);
            const number = phoneStr.substring(2);
            const formatted = formatPhoneToBrazilian(`${ddd}${number}`);
            
            cnpjPhones.push({
              number: `${ddd}${number}`,
              source: 'cnpj',
              type: number.length === 8 ? 'landline' : 'mobile',
              verified: true,
              formatted: formatted,
              with_country: `+55 ${formatted}`
            });
          }
        }
        
      } else if (provider === 'receitaws') {
        // ReceitaWS: https://www.receitaws.com.br/v1/cnpj/{cnpj}
        normalizedData = {
          cnpj: formatCNPJ(normalizedCNPJ),
          razao_social: apiData.nome,  // ReceitaWS usa "nome" ao invés de "razao_social"
          nome_fantasia: apiData.fantasia,  // ReceitaWS usa "fantasia" ao invés de "nome_fantasia"
          porte: apiData.porte,
          natureza_juridica: apiData.natureza_juridica,
          situacao_cadastral: apiData.situacao,
          data_situacao_cadastral: formatDateToDDMMYYYY(apiData.data_situacao),
          tipo: apiData.tipo,  // MATRIZ ou FILIAL
          abertura: formatDateToDDMMYYYY(apiData.abertura),
          logradouro: apiData.logradouro,
          numero: apiData.numero,
          complemento: apiData.complemento,
          bairro: apiData.bairro,
          municipio: apiData.municipio,
          uf: apiData.uf,
          cep: apiData.cep,
          atividade_principal: apiData.atividade_principal,
          atividades_secundarias: apiData.atividades_secundarias,
          qsa: apiData.qsa,
          capital_social: apiData.capital_social,
          capital_social_formatado: formatCurrencyBRL(apiData.capital_social),
          simples: apiData.simples,
          simei: apiData.simei,
          ultima_atualizacao: apiData.ultima_atualizacao
        };
        
        // Email ReceitaWS
        if (apiData.email && typeof apiData.email === 'string' && apiData.email.includes('@')) {
          cnpjEmails.push({
            address: apiData.email.toLowerCase().trim(),
            source: 'cnpj',
            type: 'main',
            verified: true
          });
        }
        
        // Telefone ReceitaWS: vem formatado como "(83) 9856-4818"
        if (apiData.telefone && typeof apiData.telefone === 'string') {
          const phoneClean = apiData.telefone.replace(/\D/g, '');
          if (phoneClean.length >= 10) {
            const ddd = phoneClean.substring(0, 2);
            const number = phoneClean.substring(2);
            const formatted = formatPhoneToBrazilian(`${ddd}${number}`);
            
            cnpjPhones.push({
              number: `${ddd}${number}`,
              source: 'cnpj',
              type: number.length === 8 ? 'landline' : 'mobile',
              verified: true,
              formatted: formatted,
              with_country: `+55 ${formatted}`
            });
          }
        }
        
      } else if (provider === 'publica') {
        // Publica: https://publica.cnpj.ws/cnpj/{cnpj}
        // Estrutura: dados principais em estabelecimento, razao_social no nível raiz
        const estabelecimento = apiData.estabelecimento || {};
        
        normalizedData = {
          cnpj: formatCNPJ(normalizedCNPJ),
          cnpj_raiz: apiData.cnpj_raiz,
          razao_social: apiData.razao_social,
          nome_fantasia: estabelecimento.nome_fantasia,
          porte: apiData.porte?.descricao || apiData.porte,
          natureza_juridica: apiData.natureza_juridica?.descricao || apiData.natureza_juridica,
          situacao_cadastral: estabelecimento.situacao_cadastral,
          data_situacao_cadastral: formatDateToDDMMYYYY(estabelecimento.data_situacao_cadastral),
          data_inicio_atividade: formatDateToDDMMYYYY(estabelecimento.data_inicio_atividade),
          tipo: estabelecimento.tipo,  // Matriz ou Filial
          logradouro: estabelecimento.logradouro,
          tipo_logradouro: estabelecimento.tipo_logradouro,
          numero: estabelecimento.numero,
          complemento: estabelecimento.complemento,
          bairro: estabelecimento.bairro,
          municipio: estabelecimento.cidade?.nome || estabelecimento.municipio,
          uf: estabelecimento.estado?.sigla || estabelecimento.uf,
          cep: estabelecimento.cep,
          atividade_principal: estabelecimento.atividade_principal,
          atividades_secundarias: estabelecimento.atividades_secundarias,
          socios: apiData.socios,
          simples: apiData.simples,
          capital_social: apiData.capital_social,
          capital_social_formatado: formatCurrencyBRL(apiData.capital_social),
          qualificacao_do_responsavel: apiData.qualificacao_do_responsavel,
          inscricoes_estaduais: estabelecimento.inscricoes_estaduais,
          atualizado_em: apiData.atualizado_em || estabelecimento.atualizado_em
        };
        
        // Email Publica: está em estabelecimento.email
        if (estabelecimento.email && typeof estabelecimento.email === 'string' && estabelecimento.email.includes('@')) {
          cnpjEmails.push({
            address: estabelecimento.email.toLowerCase().trim(),
            source: 'cnpj',
            type: 'main',
            verified: true
          });
        }
        
        // Telefone Publica: ddd1 e telefone1 separados em estabelecimento
        if (estabelecimento.ddd1 && estabelecimento.telefone1) {
          const ddd = estabelecimento.ddd1.toString().replace(/\D/g, '');
          const number = estabelecimento.telefone1.toString().replace(/\D/g, '');
          
          if (ddd.length === 2 && number.length >= 8) {
            const formatted = formatPhoneToBrazilian(`${ddd}${number}`);
            
            cnpjPhones.push({
              number: `${ddd}${number}`,
              source: 'cnpj',
              type: number.length === 8 ? 'landline' : 'mobile',
              verified: true,
              formatted: formatted,
              with_country: `+55 ${formatted}`
            });
          }
        }
        
        // Telefone 2 Publica (se existir)
        if (estabelecimento.ddd2 && estabelecimento.telefone2) {
          const ddd = estabelecimento.ddd2.toString().replace(/\D/g, '');
          const number = estabelecimento.telefone2.toString().replace(/\D/g, '');
          
          if (ddd.length === 2 && number.length >= 8) {
            const formatted = formatPhoneToBrazilian(`${ddd}${number}`);
            
            cnpjPhones.push({
              number: `${ddd}${number}`,
              source: 'cnpj',
              type: number.length === 8 ? 'landline' : 'mobile',
              verified: true,
              formatted: formatted,
              with_country: `+55 ${formatted}`
            });
          }
        }
      }
      
      // Construir cnpj_data com estrutura normalizada + emails/phones formatados
      const cnpjDataToSave: any = {
        ...normalizedData,
        provider: provider,
        // Manter dados brutos da API para referência
        raw_data: apiData,
        emails: cnpjEmails.length > 0 ? cnpjEmails : undefined,
        phones: cnpjPhones.length > 0 ? cnpjPhones : undefined
      };
      
      console.log(`📊 [CNPJ] Dados formatados:`, {
        provider: provider,
        razao_social: normalizedData.razao_social || 'N/A',
        emails: cnpjEmails.length,
        phones: cnpjPhones.length
      });

      const { error: updateError } = await supabase
        .from('lead_extraction_staging')
        .update({
          cnpj_data: cnpjDataToSave,
          cnpj_enriched: true,
          cnpj_checked_at: new Date().toISOString(),
          cnpj_provider: cnpjResult.provider
        })
        .eq('id', recordId);

      if (updateError) {
        console.error(`❌ [CNPJ] Erro ao salvar:`, updateError);
        failed++;
        continue;
      }

      console.log(`✅ [CNPJ] Dados salvos (provider: ${cnpjResult.provider})`);
      await supabase.rpc('pgmq_delete', { queue_name: 'cnpj_queue', msg_id: msgId });
      processed++;

      results.push({
        msg_id: msgId,
        staging_id: recordId,
        success: true,
        provider: cnpjResult.provider,
        emails_found: cnpjEmails.length,
        phones_found: cnpjPhones.length
      });
      } catch (msgError: any) {
        console.error(`❌ [CNPJ] Erro ao processar mensagem ${msg.msg_id}:`, msgError);
        console.error(`❌ [CNPJ] Stack:`, msgError.stack);
        failed++;
        // Não deletar da fila se deu erro - deixar para retry
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`🎉 [COMPLETE] ${processed} processados, ${failed} falharam`);
    console.log('='.repeat(60));

    return new Response(JSON.stringify({
      success: true,
      version: 'V4_FORMATTED',
      total_messages: messages.length,
      processed,
      failed,
      duration_ms: Date.now() - startTime,
      results
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('❌ [FATAL]', error);
    return new Response(JSON.stringify({
      error: 'Erro interno',
      details: error.message,
      duration_ms: Date.now() - startTime
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
