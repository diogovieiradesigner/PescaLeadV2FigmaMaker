// =============================================================================
// EDGE FUNCTION: process-whatsapp-queue V2 (MULTI-PROVIDER)
// =============================================================================
// Valida números de WhatsApp usando a instância conectada do workspace
// Suporta: Uazapi, Evolution API (e futuros providers)
// =============================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Interface para resultado da verificação
interface WhatsAppCheckResult {
  number: string;
  isInWhatsapp: boolean;
  jid?: string;
  verifiedName?: string;
}

// =============================================================================
// PROVIDER: UAZAPI
// =============================================================================
async function checkWhatsAppUazapi(
  baseUrl: string,
  token: string,
  numbers: string[]
): Promise<WhatsAppCheckResult[]> {
  console.log(`[Uazapi] Checking ${numbers.length} numbers...`);
  console.log(`[Uazapi] Base URL: ${baseUrl}`);
  
  try {
    const response = await fetch(`${baseUrl}/chat/check`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'token': token
      },
      body: JSON.stringify({ numbers })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Uazapi] Check failed: ${response.status} - ${errorText}`);
      throw new Error(`Uazapi check failed: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[Uazapi] ✅ Check completed, got ${data?.length || 0} results`);
    
    // Normalizar resposta para formato padrão
    // Uazapi retorna: [{ jid, query, isInWhatsapp, verifiedName }]
    return (data || []).map((item: any) => ({
      number: item.query || item.number,
      isInWhatsapp: item.isInWhatsapp === true,
      jid: item.jid,
      verifiedName: item.verifiedName
    }));
  } catch (error) {
    console.error('[Uazapi] Error checking numbers:', error);
    throw error;
  }
}

// =============================================================================
// PROVIDER: EVOLUTION API
// =============================================================================
async function checkWhatsAppEvolution(
  baseUrl: string,
  instanceName: string,
  token: string,
  numbers: string[]
): Promise<WhatsAppCheckResult[]> {
  console.log(`[Evolution] Checking ${numbers.length} numbers via instance ${instanceName}...`);
  
  const results: WhatsAppCheckResult[] = [];
  
  // Evolution não tem endpoint bulk, então verificamos um por um
  for (const number of numbers) {
    try {
      const response = await fetch(`${baseUrl}/chat/whatsappNumbers/${instanceName}`, {
        method: 'POST',
        headers: {
          'apikey': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ numbers: [number] })
      });

      if (!response.ok) {
        console.warn(`[Evolution] Check failed for ${number}: ${response.status}`);
        results.push({ number, isInWhatsapp: false });
        continue;
      }

      const data = await response.json();
      // Evolution retorna: [{ exists: boolean, jid: string, number: string }]
      const result = data?.[0];
      
      results.push({
        number: result?.number || number,
        isInWhatsapp: result?.exists === true,
        jid: result?.jid,
        verifiedName: undefined // Evolution não retorna nome
      });
      
      // Rate limit: 500ms entre requests
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.error(`[Evolution] Error checking ${number}:`, err);
      results.push({ number, isInWhatsapp: false });
    }
  }
  
  console.log(`[Evolution] ✅ Check completed, got ${results.length} results`);
  return results;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Parâmetros opcionais do body
    let workspace_id: string | null = null;
    let batch_size = 30;
    
    try {
      const body = await req.json();
      workspace_id = body.workspace_id || null;
      batch_size = body.batch_size || 30;
    } catch {
      // Body vazio é OK, usa defaults
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📱 [WHATSAPP-QUEUE] STARTING VALIDATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Batch size: ${batch_size}`);
    console.log(`   Workspace filter: ${workspace_id || 'ALL'}`);

    // ==========================================================================
    // PASSO 1: Buscar instância conectada
    // ==========================================================================
    console.log('\n🔍 [STEP 1] Finding connected WhatsApp instance...');
    
    let instanceQuery = supabase
      .from('instances')
      .select('id, name, provider_type, api_key, instance_token, provider_config, workspace_id')
      .eq('status', 'connected')
      .eq('provider', 'whatsapp')
      .limit(1);
    
    if (workspace_id) {
      instanceQuery = instanceQuery.eq('workspace_id', workspace_id);
    }
    
    const { data: instances, error: instanceError } = await instanceQuery;
    
    if (instanceError) {
      console.error('❌ Error fetching instances:', instanceError);
      throw new Error(`Failed to fetch instances: ${instanceError.message}`);
    }
    
    if (!instances || instances.length === 0) {
      console.warn('⚠️ No connected WhatsApp instance found');
      return new Response(JSON.stringify({
        success: false,
        error: 'No connected WhatsApp instance found',
        hint: 'Please connect a WhatsApp instance first'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const instance = instances[0];
    console.log(`✅ Found instance: ${instance.name} (${instance.provider_type})`);
    console.log(`   Workspace: ${instance.workspace_id}`);
    
    // Obter token e config do provider
    const providerType = instance.provider_type || 'evolution';
    const token = instance.api_key || instance.instance_token;
    const config = instance.provider_config || {};
    
    if (!token) {
      console.error('❌ No API token configured for instance');
      throw new Error('No API token configured for WhatsApp instance');
    }
    
    console.log(`   Provider: ${providerType}`);
    console.log(`   Token: ***${token.slice(-8)}`);

    // ==========================================================================
    // PASSO 2: Buscar leads pendentes de verificação
    // ==========================================================================
    console.log('\n🔍 [STEP 2] Fetching leads pending WhatsApp validation...');
    
    let leadsQuery = supabase
      .from('lead_extraction_staging')
      .select('id, phone_normalized, phones, workspace_id')
      .not('phone_normalized', 'is', null)
      .is('whatsapp_checked_at', null)
      .limit(batch_size);
    
    // Filtrar pelo workspace da instância encontrada
    // Isso garante que só processamos leads do mesmo workspace
    leadsQuery = leadsQuery.eq('workspace_id', instance.workspace_id);
    
    const { data: leads, error: leadsError } = await leadsQuery;
    
    if (leadsError) {
      console.error('❌ Error fetching leads:', leadsError);
      throw new Error(`Failed to fetch leads: ${leadsError.message}`);
    }
    
    if (!leads || leads.length === 0) {
      console.log('✅ No leads pending validation');
      return new Response(JSON.stringify({
        success: true,
        processed: 0,
        valid: 0,
        invalid: 0,
        message: 'No leads pending WhatsApp validation'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`✅ Found ${leads.length} leads to validate`);

    // ==========================================================================
    // PASSO 3: Preparar números para verificação
    // ==========================================================================
    console.log('\n📞 [STEP 3] Preparing numbers for validation...');
    
    // Criar mapa: número normalizado -> lead_id
    const numberToLeadMap = new Map<string, string>();
    const numbersToCheck: string[] = [];
    
    for (const lead of leads) {
      let phoneNumber = lead.phone_normalized;
      
      if (!phoneNumber) continue;
      
      // Limpar número (remover caracteres especiais)
      phoneNumber = phoneNumber.replace(/\D/g, '');
      
      // Normalizar para formato brasileiro: adicionar 55 se necessário
      if (phoneNumber.length <= 11) {
        phoneNumber = '55' + phoneNumber;
      }
      
      // Mapeamento bidirecional (com e sem 55)
      numberToLeadMap.set(phoneNumber, lead.id);
      numberToLeadMap.set(phoneNumber.replace(/^55/, ''), lead.id);
      
      numbersToCheck.push(phoneNumber);
    }
    
    console.log(`✅ Prepared ${numbersToCheck.length} numbers`);
    console.log(`   Sample: ${numbersToCheck.slice(0, 3).join(', ')}...`);

    // ==========================================================================
    // PASSO 4: Chamar API do provider para verificar
    // ==========================================================================
    console.log(`\n🌐 [STEP 4] Calling ${providerType} API...`);
    
    let results: WhatsAppCheckResult[] = [];
    
    try {
      if (providerType === 'uazapi') {
        const baseUrl = config.baseUrl || Deno.env.get('UAZAPI_API_URL') || 'https://free.uazapi.com';
        results = await checkWhatsAppUazapi(baseUrl, token, numbersToCheck);
      } else if (providerType === 'evolution') {
        const baseUrl = Deno.env.get('EVOLUTION_API_URL') || config.baseUrl;
        if (!baseUrl) throw new Error('EVOLUTION_API_URL not configured');
        results = await checkWhatsAppEvolution(baseUrl, instance.name, token, numbersToCheck);
      } else {
        console.warn(`⚠️ Unknown provider type: ${providerType}, skipping API call`);
        // Marcar todos como não verificados
        results = numbersToCheck.map(n => ({ number: n, isInWhatsapp: false }));
      }
    } catch (apiError) {
      console.error('❌ API call failed:', apiError);
      // Em caso de erro, marcar todos como verificados mas inválidos
      // para evitar loop infinito de retry
      results = numbersToCheck.map(n => ({ number: n, isInWhatsapp: false }));
    }
    
    console.log(`✅ Got ${results.length} results from API`);

    // ==========================================================================
    // PASSO 5: Atualizar leads no banco
    // ==========================================================================
    console.log('\n💾 [STEP 5] Updating leads in database...');
    
    let validCount = 0;
    let invalidCount = 0;
    let errorCount = 0;
    
    // Criar mapa de resultados por número
    const resultMap = new Map<string, WhatsAppCheckResult>();
    for (const result of results) {
      const cleanNumber = (result.number || '').replace(/\D/g, '');
      resultMap.set(cleanNumber, result);
      // Também mapear com prefixo 55
      if (!cleanNumber.startsWith('55')) {
        resultMap.set('55' + cleanNumber, result);
      }
    }
    
    for (const lead of leads) {
      try {
        let phoneNumber = (lead.phone_normalized || '').replace(/\D/g, '');
        if (phoneNumber.length <= 11) {
          phoneNumber = '55' + phoneNumber;
        }
        
        // Buscar resultado
        const result = resultMap.get(phoneNumber) || resultMap.get(phoneNumber.replace(/^55/, ''));
        
        const isValid = result?.isInWhatsapp === true;
        
        const updateData: any = {
          whatsapp_valid: isValid,
          whatsapp_checked_at: new Date().toISOString()
        };
        
        if (isValid && result) {
          updateData.whatsapp_jid = result.jid || null;
          updateData.whatsapp_name = result.verifiedName || null;
          validCount++;
        } else {
          invalidCount++;
        }
        
        const { error: updateError } = await supabase
          .from('lead_extraction_staging')
          .update(updateData)
          .eq('id', lead.id);
        
        if (updateError) {
          console.error(`❌ Error updating lead ${lead.id}:`, updateError.message);
          errorCount++;
        }
      } catch (err) {
        console.error(`❌ Error processing lead ${lead.id}:`, err);
        errorCount++;
      }
    }
    
    const duration = Date.now() - startTime;
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ [WHATSAPP-QUEUE] VALIDATION COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Processed: ${leads.length}`);
    console.log(`   Valid (WhatsApp): ${validCount}`);
    console.log(`   Invalid: ${invalidCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Provider: ${providerType}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return new Response(JSON.stringify({
      success: true,
      processed: leads.length,
      valid: validCount,
      invalid: invalidCount,
      errors: errorCount,
      duration_ms: duration,
      provider: providerType,
      instance: instance.name
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ [WHATSAPP-QUEUE] ERROR');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('   Error:', error);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
