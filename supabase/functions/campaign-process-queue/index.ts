/**
 * Campaign Process Queue Edge Function V9
 *
 * Funcionalidades:
 * - Usa o MESMO MODELO de IA do agente de atendimento (para tudo!)
 * - Usa ai_instructions da configuração da campanha como prompt
 * - Verifica se instância está conectada ANTES de cada envio
 * - Pausa campanha automaticamente se instância desconectar
 * - Suporte a fracionamento de mensagens (split_messages)
 * - Limite personalizável de partes (max_split_parts)
 *
 * V8 - Melhorias:
 * - ✅ Timeout aumentado de 10s para 60s no envio de mensagens
 * - ✅ Validação de WhatsApp ANTES do envio (suporta Evolution e Uazapi)
 * - ✅ Busca automática de números alternativos nos campos personalizados
 * - ✅ Logs detalhados de validação (PHONE_VALIDATION) para frontend
 * - ✅ Troca automática de número se principal não for WhatsApp válido
 * - ✅ Não cria conversa se instância desconectada ou número inválido
 *
 * V9 - Correções:
 * - ✅ CORRIGIDO: Bug de campanhas travadas em 'running' mesmo após todos leads processados
 * - ✅ Nova função finalize_orphan_campaign_runs() para recuperar campanhas órfãs
 * - ✅ Verificação automática de campanhas travadas ao final de cada batch
 */

import { createClient } from "jsr:@supabase/supabase-js@2";
import { timeToDate, getCurrentTimeInTimezone } from "../_shared/timezone-helpers.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// ==================== VALIDATION HELPERS ====================

// ✅ FASE 2: Validação de status antes de atualizar
const VALID_CAMPAIGN_MESSAGE_STATUSES = ['pending', 'queued', 'generating', 'sending', 'sent', 'failed', 'skipped', 'replied'] as const;
const VALID_CAMPAIGN_RUN_STATUSES = ['running', 'completed', 'failed', 'cancelled', 'paused'] as const;

function validateCampaignMessageStatus(status: string): void {
  if (!VALID_CAMPAIGN_MESSAGE_STATUSES.includes(status as any)) {
    throw new Error(`Invalid campaign message status: ${status}. Valid statuses: ${VALID_CAMPAIGN_MESSAGE_STATUSES.join(', ')}`);
  }
}

function validateCampaignRunStatus(status: string): void {
  if (!VALID_CAMPAIGN_RUN_STATUSES.includes(status as any)) {
    throw new Error(`Invalid campaign run status: ${status}. Valid statuses: ${VALID_CAMPAIGN_RUN_STATUSES.join(', ')}`);
  }
}

// ==================== HELPER FUNCTIONS ====================

async function log(supabase: any, runId: string, stepName: string, level: string, message: string, details?: any, leadId?: string, messageId?: string) {
  try {
    await supabase.rpc('log_campaign_step', {
      p_run_id: runId,
      p_step_name: stepName,
      p_level: level,
      p_message: message,
      p_details: details || null,
      p_lead_id: leadId || null,
      p_message_id: messageId || null
    });
  } catch (e) {
    console.error('[Log Error]', e);
  }
}

async function getWorkspaceAIModel(supabase: any, workspaceId: string): Promise<string | null> {
  const { data: agent } = await supabase
    .from('ai_agents')
    .select('model')
    .eq('workspace_id', workspaceId)
    .limit(1)
    .single();
  
  return agent?.model || null;
}

interface InstanceStatus {
  connected: boolean;
  status?: string;
  name?: string;
  providerType?: string;
  apiKey?: string;
}

async function checkInstanceConnected(supabase: any, inboxId: string): Promise<InstanceStatus> {
  const { data } = await supabase.rpc('check_campaign_instance_status', {
    p_inbox_id: inboxId
  });

  return {
    connected: data?.connected === true,
    status: data?.status,
    name: data?.instance_name,
    providerType: data?.provider_type || 'evolution',
    apiKey: data?.api_key
  };
}

// ==================== WHATSAPP VALIDATION ====================

interface PhoneValidationResult {
  isValid: boolean;
  validPhone: string | null;
  originalPhone: string;
  switchedFrom?: string;
  allPhonesTested: string[];
  validationDetails: string;
}

/**
 * Verifica se um número é WhatsApp válido
 * Suporta Evolution API e Uazapi
 *
 * - Evolution: usa /chat/whatsappNumbers/{instance} (endpoint dedicado)
 * - Uazapi: usa /contact/onwhatsapp (endpoint dedicado para verificação)
 */
async function checkIsWhatsApp(
  instanceName: string,
  token: string,
  phoneNumber: string,
  providerType: 'evolution' | 'uazapi' = 'evolution'
): Promise<{ exists: boolean; jid?: string; error?: string }> {
  // Limpar número
  let cleanPhone = phoneNumber.replace(/\D/g, '');

  // Adicionar 55 se não tiver DDI
  if (cleanPhone.length === 10 || cleanPhone.length === 11) {
    cleanPhone = '55' + cleanPhone;
  }

  console.log(`[WhatsApp Check] Verificando ${cleanPhone} via ${instanceName} (${providerType})`);

  try {
    if (providerType === 'uazapi') {
      // ==================== UAZAPI ====================
      const baseUrl = Deno.env.get('UAZAPI_API_URL')?.replace(/\/$/, '') || 'https://free.uazapi.com';

      // Uazapi: usar endpoint /contact/onwhatsapp para verificar se número existe
      // Docs: https://docs.uazapi.com/
      const response = await fetch(`${baseUrl}/contact/onwhatsapp`, {
        method: 'POST',
        headers: {
          'token': token,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          number: cleanPhone
        })
      });

      const responseText = await response.text();
      console.log(`[WhatsApp Check] Uazapi status: ${response.status}, resposta: ${responseText}`);

      if (!response.ok) {
        // Verificar se é erro de "número não existe"
        const errorLower = responseText.toLowerCase();
        if (errorLower.includes('not on whatsapp') ||
            errorLower.includes('not exists') ||
            errorLower.includes('invalid number') ||
            errorLower.includes('não existe') ||
            errorLower.includes('not found')) {
          return { exists: false, error: 'Número não registrado no WhatsApp' };
        }

        // Se endpoint não existe (404), tentar fallback com /chat/details
        if (response.status === 404) {
          console.log('[WhatsApp Check] Endpoint /contact/onwhatsapp não encontrado, tentando /chat/details...');

          const fallbackResponse = await fetch(`${baseUrl}/chat/details`, {
            method: 'POST',
            headers: {
              'token': token,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              number: cleanPhone,
              preview: false
            })
          });

          if (!fallbackResponse.ok) {
            const fallbackError = await fallbackResponse.text();
            console.log(`[WhatsApp Check] Fallback /chat/details falhou: ${fallbackError}`);

            // Se deu erro, provavelmente número não existe
            if (fallbackResponse.status === 400 || fallbackResponse.status === 404) {
              return { exists: false, error: 'Número não encontrado' };
            }

            // Outros erros - assumir que existe (não podemos validar)
            console.log('[WhatsApp Check] Não foi possível validar - assumindo que existe');
            return { exists: true, jid: `${cleanPhone}@s.whatsapp.net`, error: 'Validação indisponível' };
          }

          const fallbackData = await fallbackResponse.json();
          console.log('[WhatsApp Check] Fallback resposta:', JSON.stringify(fallbackData));

          // Se retornou dados do contato, o número existe
          const exists = !!(fallbackData && (fallbackData.name || fallbackData.wa_name || fallbackData.jid));
          return {
            exists,
            jid: fallbackData.jid || `${cleanPhone}@s.whatsapp.net`
          };
        }

        // Erro desconhecido - não podemos validar
        console.error(`[WhatsApp Check] Uazapi erro: ${responseText}`);
        return { exists: true, error: 'Erro na validação - enviando mesmo assim' };
      }

      // Parsear resposta de sucesso
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { exists: responseText.toLowerCase().includes('true') };
      }

      console.log('[WhatsApp Check] Uazapi parsed:', JSON.stringify(data));

      // Verificar resposta - pode ser { exists: true/false, jid: "..." }
      // ou { onWhatsapp: true/false }
      const exists = data.exists === true || data.onWhatsapp === true || data.registered === true;

      return {
        exists,
        jid: data.jid || `${cleanPhone}@s.whatsapp.net`
      };

    } else {
      // ==================== EVOLUTION API ====================
      const baseUrl = Deno.env.get('EVOLUTION_API_URL')?.replace(/\/$/, '');
      if (!baseUrl) {
        console.error('[WhatsApp Check] EVOLUTION_API_URL não configurada');
        return { exists: true, error: 'URL não configurada - enviando mesmo assim' };
      }

      const response = await fetch(`${baseUrl}/chat/whatsappNumbers/${encodeURIComponent(instanceName)}`, {
        method: 'POST',
        headers: {
          'apikey': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          numbers: [cleanPhone]
        })
      });

      if (!response.ok) {
        console.error(`[WhatsApp Check] Evolution retornou ${response.status}`);
        return { exists: true, error: 'Erro na API - enviando mesmo assim' };
      }

      const data = await response.json();
      console.log('[WhatsApp Check] Evolution resposta:', JSON.stringify(data));

      // Evolution API retorna array com { exists: boolean, jid: string }
      if (Array.isArray(data) && data.length > 0) {
        const result = data[0];
        return {
          exists: result.exists === true,
          jid: result.jid
        };
      }

      return { exists: false, error: 'Resposta vazia da API' };
    }
  } catch (error: any) {
    console.error('[WhatsApp Check] Erro:', error.message);
    // Em caso de erro de rede/timeout, assumir que existe para não bloquear
    return { exists: true, error: `Erro de conexão: ${error.message}` };
  }
}

/**
 * Busca números alternativos do lead nos campos personalizados
 */
async function getAlternativePhones(supabase: any, leadId: string): Promise<string[]> {
  const phones: string[] = [];

  try {
    // Buscar campos personalizados do tipo 'phone'
    const { data: phoneFields } = await supabase
      .from('lead_custom_values')
      .select(`
        value,
        custom_fields!inner (
          name,
          field_type
        )
      `)
      .eq('lead_id', leadId);

    if (!phoneFields) return phones;

    for (const field of phoneFields) {
      const fieldType = field.custom_fields?.field_type;
      const fieldName = field.custom_fields?.name?.toLowerCase() || '';
      const value = field.value;

      if (!value) continue;

      // Campo do tipo phone
      if (fieldType === 'phone') {
        // Pode ser um único número ou JSON com múltiplos
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            // Array de objetos com { number, whatsapp }
            for (const item of parsed) {
              if (item.number && item.whatsapp === true) {
                phones.push(item.number);
              }
            }
          } else if (typeof parsed === 'object' && parsed.number) {
            if (parsed.whatsapp === true) {
              phones.push(parsed.number);
            }
          }
        } catch {
          // Não é JSON, é número simples
          phones.push(value);
        }
      }

      // Campos com nome sugestivo de telefone
      if (fieldName.includes('telefone') || fieldName.includes('phone') || fieldName.includes('whatsapp') || fieldName.includes('celular')) {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              const num = item.number || item.phoneNumber || item;
              if (typeof num === 'string' && num.length >= 10) {
                // Priorizar números já validados como WhatsApp
                if (item.whatsapp === true) {
                  phones.unshift(num); // Adiciona no início
                } else {
                  phones.push(num);
                }
              }
            }
          }
        } catch {
          if (value.length >= 10) {
            phones.push(value);
          }
        }
      }
    }

    // Remover duplicatas mantendo ordem
    return [...new Set(phones)];
  } catch (error: any) {
    console.error('[Alt Phones] Erro ao buscar números alternativos:', error.message);
    return phones;
  }
}

/**
 * Valida o número do lead e busca alternativas se necessário
 * Retorna o primeiro número válido encontrado ou null
 */
async function validateAndFindValidPhone(
  supabase: any,
  instanceName: string,
  token: string,
  leadId: string,
  primaryPhone: string,
  runId: string,
  providerType: 'evolution' | 'uazapi' = 'evolution'
): Promise<PhoneValidationResult> {
  const allPhonesTested: string[] = [];
  const cleanPrimary = primaryPhone.replace(/\D/g, '');

  // 1. Testar telefone principal
  console.log(`[Phone Validation] Testando telefone principal: ${cleanPrimary} (provider: ${providerType})`);
  allPhonesTested.push(cleanPrimary);

  const primaryCheck = await checkIsWhatsApp(instanceName, token, cleanPrimary, providerType);

  if (primaryCheck.exists) {
    await log(supabase, runId, 'PHONE_VALIDATION', 'info',
      `✅ Telefone principal validado: ${cleanPrimary}`,
      { phone: cleanPrimary, jid: primaryCheck.jid, provider: providerType }
    );

    return {
      isValid: true,
      validPhone: cleanPrimary,
      originalPhone: cleanPrimary,
      allPhonesTested,
      validationDetails: `Telefone principal ${cleanPrimary} é WhatsApp válido`
    };
  }

  console.log(`[Phone Validation] ❌ Telefone principal ${cleanPrimary} NÃO é WhatsApp`);
  await log(supabase, runId, 'PHONE_VALIDATION', 'warning',
    `❌ Telefone principal ${cleanPrimary} não é WhatsApp - Buscando alternativos...`,
    { phone: cleanPrimary, exists: false, provider: providerType }
  );

  // 2. Buscar números alternativos
  const alternativePhones = await getAlternativePhones(supabase, leadId);
  console.log(`[Phone Validation] Encontrados ${alternativePhones.length} números alternativos`);

  for (const altPhone of alternativePhones) {
    const cleanAlt = altPhone.replace(/\D/g, '');

    // Pular se já testamos esse número
    if (allPhonesTested.includes(cleanAlt)) continue;

    allPhonesTested.push(cleanAlt);
    console.log(`[Phone Validation] Testando alternativo: ${cleanAlt}`);

    const altCheck = await checkIsWhatsApp(instanceName, token, cleanAlt, providerType);

    if (altCheck.exists) {
      await log(supabase, runId, 'PHONE_VALIDATION', 'info',
        `✅ Número alternativo validado: ${cleanAlt} (substituindo ${cleanPrimary})`,
        {
          original_phone: cleanPrimary,
          new_phone: cleanAlt,
          jid: altCheck.jid,
          phones_tested: allPhonesTested
        }
      );

      return {
        isValid: true,
        validPhone: cleanAlt,
        originalPhone: cleanPrimary,
        switchedFrom: cleanPrimary,
        allPhonesTested,
        validationDetails: `Trocou de ${cleanPrimary} para ${cleanAlt} (WhatsApp válido)`
      };
    }

    console.log(`[Phone Validation] ❌ Alternativo ${cleanAlt} também não é WhatsApp`);
  }

  // 3. Nenhum número válido encontrado
  await log(supabase, runId, 'PHONE_VALIDATION', 'error',
    `❌ Nenhum WhatsApp válido encontrado para o lead`,
    {
      original_phone: cleanPrimary,
      phones_tested: allPhonesTested,
      alternatives_count: alternativePhones.length
    }
  );

  return {
    isValid: false,
    validPhone: null,
    originalPhone: cleanPrimary,
    allPhonesTested,
    validationDetails: `Nenhum dos ${allPhonesTested.length} números testados é WhatsApp válido`
  };
}

/**
 * Busca os dados da instância (nome, token, providerType e status) para um inbox
 * Retorna connected: false se a instância não estiver online
 */
async function getInstanceDataForInbox(supabase: any, inboxId: string): Promise<{
  instanceName: string | null;
  token: string | null;
  instanceId: string | null;
  providerType: 'evolution' | 'uazapi';
  connected: boolean;
  status: string | null;
}> {
  try {
    // Buscar instância via inbox_instances
    const { data: inboxInstance } = await supabase
      .from('inbox_instances')
      .select('instance_id')
      .eq('inbox_id', inboxId)
      .limit(1)
      .maybeSingle();

    if (!inboxInstance?.instance_id) {
      console.log('[Instance Data] Nenhuma instância vinculada ao inbox');
      return { instanceName: null, token: null, instanceId: null, providerType: 'evolution', connected: false, status: null };
    }

    // Buscar dados da instância incluindo provider_type e status
    const { data: instance } = await supabase
      .from('instances')
      .select('id, name, api_key, status, provider_type')
      .eq('id', inboxInstance.instance_id)
      .single();

    if (!instance) {
      console.log('[Instance Data] Instância não encontrada');
      return { instanceName: null, token: null, instanceId: null, providerType: 'evolution', connected: false, status: null };
    }

    // Detectar provider type
    const providerType: 'evolution' | 'uazapi' = instance.provider_type === 'uazapi' ? 'uazapi' : 'evolution';

    // Verificar se está conectada
    const connected = instance.status === 'connected';

    // Token pode estar na instância ou usar o global
    let token = instance.api_key;
    if (!token) {
      token = providerType === 'uazapi'
        ? Deno.env.get('UAZAPI_ADMIN_TOKEN') || null
        : Deno.env.get('EVOLUTION_API_KEY') || null;
    }

    console.log(`[Instance Data] Provider: ${providerType}, Instance: ${instance.name}, Status: ${instance.status}, Connected: ${connected}`);

    return {
      instanceName: instance.name,
      token,
      instanceId: instance.id,
      providerType,
      connected,
      status: instance.status
    };
  } catch (error: any) {
    console.error('[Instance Data] Erro:', error.message);
    return { instanceName: null, token: null, instanceId: null, providerType: 'evolution', connected: false, status: null };
  }
}

/**
 * ✅ NOVO: Verifica conexão e faz switch automático para inbox reserva se necessário
 * @returns { connected, inboxId, switched, paused, reason }
 */
async function checkAndSwitchIfNeeded(
  supabase: any,
  runId: string,
  configId: string,
  currentInboxId: string
): Promise<{
  connected: boolean;
  inboxId: string;
  switched?: boolean;
  paused?: boolean;
  reason?: string;
  instanceName?: string;
}> {
  // 1. Verifica se inbox atual está conectado
  const status = await checkInstanceConnected(supabase, currentInboxId);

  if (status.connected) {
    return { connected: true, inboxId: currentInboxId, instanceName: status.name };
  }

  // 2. Busca fallback_behavior da config
  const { data: config } = await supabase
    .from('campaign_configs')
    .select('fallback_behavior')
    .eq('id', configId)
    .single();

  if (!config || config.fallback_behavior === 'pause') {
    // Comportamento = pausar (ou não configurado)
    await pauseRun(supabase, runId, `Instância desconectada: ${status.name}`);
    return {
      connected: false,
      inboxId: currentInboxId,
      paused: true,
      reason: `Instance ${status.name} disconnected (fallback disabled)`
    };
  }

  // 3. Tenta trocar para inbox reserva
  const { data: nextInbox } = await supabase.rpc('get_next_available_inbox', {
    p_campaign_config_id: configId,
    p_current_inbox_id: currentInboxId
  });

  if (!nextInbox || nextInbox.length === 0) {
    // Nenhuma reserva disponível → pausa
    await pauseRun(supabase, runId, 'All instances disconnected');
    return {
      connected: false,
      inboxId: currentInboxId,
      paused: true,
      reason: 'No reserve instances available'
    };
  }

  const newInbox = nextInbox[0];

  // 4. Atualiza run com novo inbox
  const switchRecord = {
    from_inbox_id: currentInboxId,
    to_inbox_id: newInbox.inbox_id,
    from_instance_name: status.name,
    to_instance_name: newInbox.instance_name,
    reason: 'primary_disconnected',
    switched_at: new Date().toISOString()
  };

  const { data: currentRun } = await supabase
    .from('campaign_runs')
    .select('inbox_switches')
    .eq('id', runId)
    .single();

  const updatedSwitches = [...(currentRun?.inbox_switches || []), switchRecord];

  await supabase
    .from('campaign_runs')
    .update({
      current_inbox_id: newInbox.inbox_id,
      inbox_switches: updatedSwitches
    })
    .eq('id', runId);

  // 5. Log do switch
  await log(
    supabase,
    runId,
    'INSTANCE_SWITCH',
    'warning',
    `🔄 Switched from ${status.name} (disconnected) to ${newInbox.instance_name} (priority ${newInbox.priority})`,
    switchRecord
  );

  console.log(`🔄 [FALLBACK] Switched inbox: ${status.name} → ${newInbox.instance_name}`);

  return {
    connected: true,
    inboxId: newInbox.inbox_id,
    switched: true,
    instanceName: newInbox.instance_name
  };
}

async function pauseRun(supabase: any, runId: string, reason: string) {
  await supabase
    .from('campaign_runs')
    .update({ status: 'paused', error_message: reason })
    .eq('id', runId);
  
  await supabase
    .from('campaign_messages')
    .update({ status: 'skipped', error_message: reason })
    .eq('run_id', runId)
    .in('status', ['pending', 'queued', 'generating', 'sending']); // ✅ CORREÇÃO: Incluir 'sending'
}

function formatLeadContextForAI(context: any): string {
  if (!context) return 'Dados do lead não disponíveis.';
  
  const lines: string[] = [];
  
  lines.push('📋 DADOS BÁSICOS:');
  if (context.client_name) lines.push(`- Nome: ${context.client_name}`);
  if (context.company) lines.push(`- Empresa: ${context.company}`);
  if (context.deal_value) lines.push(`- Valor potencial: R$ ${context.deal_value.toLocaleString('pt-BR')}`);
  if (context.priority) lines.push(`- Prioridade: ${context.priority}`);
  if (context.tags?.length) lines.push(`- Tags: ${context.tags.join(', ')}`);
  
  if (context.whatsapp_name) {
    lines.push('');
    lines.push('📱 WHATSAPP:');
    lines.push(`- Nome no WhatsApp: ${context.whatsapp_name}`);
  }
  
  if (context.funnel_name || context.column_name) {
    lines.push('');
    lines.push('📊 LOCALIZAÇÃO NO CRM:');
    if (context.funnel_name) lines.push(`- Funil: ${context.funnel_name}`);
    if (context.column_name) lines.push(`- Etapa: ${context.column_name}`);
  }
  
  const customFields = context.custom_fields || {};
  const priorityFields = [
    'Categoria', 'CNAE Principal', 'Porte da Empresa', 'Razão Social',
    'Rating', 'Avaliações', 'Endereço', 'Cidade/UF',
    'Website Principal', 'Email', 'WHOIS Responsável',
    'Capital Social', 'Data Abertura'
  ];
  
  const priorityData: string[] = [];
  for (const field of priorityFields) {
    if (customFields[field]) {
      priorityData.push(`- ${field}: ${customFields[field]}`);
    }
  }
  
  if (priorityData.length > 0) {
    lines.push('');
    lines.push('🔧 INFORMAÇÕES ADICIONAIS:');
    lines.push(...priorityData);
  }
  
  const otherFields = Object.keys(customFields)
    .filter(k => !priorityFields.includes(k))
    .slice(0, 10);
  
  if (otherFields.length > 0) {
    const otherData: string[] = [];
    for (const field of otherFields) {
      const value = customFields[field];
      if (typeof value === 'string' && value.length < 200 && !value.startsWith('[{')) {
        otherData.push(`- ${field}: ${value}`);
      }
    }
    if (otherData.length > 0) {
      lines.push('');
      lines.push('📝 OUTROS DADOS:');
      lines.push(...otherData);
    }
  }
  
  return lines.join('\n');
}

async function generateMessage(
  apiKey: string,
  systemPrompt: string,
  leadContext: string,
  model: string,
  maxRetries: number = 3
): Promise<{ message: string; tokens: number; timeMs: number }> {
  const startTime = Date.now();
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      try {
        const response = await fetch(OPENROUTER_URL, {
          signal: controller.signal,
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://pescalead.com',
            'X-Title': 'PescaLead Campaign'
          },
          body: JSON.stringify({
            model,
            max_tokens: 500,
            temperature: 0.7,
            messages: [
              { role: 'system', content: systemPrompt },
              {
                role: 'user',
                content: `Gere uma mensagem de primeiro contato para este lead:\n\n${leadContext}\n\nIMPORTANTE: Retorne APENAS o texto da mensagem que será enviada ao cliente, sem aspas, sem formatação markdown, sem explicações ou comentários adicionais. A mensagem deve estar pronta para ser enviada diretamente no WhatsApp.`
              }
            ]
          })
        });
        
        clearTimeout(timeoutId);
        
        // ✅ CORREÇÃO: Tratar rate limit (429)
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
          const backoffMs = Math.min(retryAfter * 1000, 60000); // Max 60s
          
          if (attempt < maxRetries) {
            console.log(`[GenerateMessage] Rate limit (429), waiting ${backoffMs}ms before retry ${attempt + 1}/${maxRetries}...`);
            await new Promise(r => setTimeout(r, backoffMs));
            continue;
          }
          throw new Error(`Rate limit exceeded after ${maxRetries} attempts`);
        }
        
        if (!response.ok) {
          const error = await response.text();
          throw new Error(`OpenRouter error: ${response.status} - ${error}`);
        }
        
        const data = await response.json();
        let message = data.choices?.[0]?.message?.content?.trim() || '';
        const tokens = data.usage?.total_tokens || 0;

        // Remover aspas no início e fim (simples ou duplas)
        // A IA às vezes retorna: "mensagem aqui" ou 'mensagem aqui'
        if ((message.startsWith('"') && message.endsWith('"')) ||
            (message.startsWith("'") && message.endsWith("'"))) {
          message = message.slice(1, -1).trim();
        }

        return {
          message,
          tokens,
          timeMs: Date.now() - startTime
        };
        
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        // Se foi abortado por timeout
        if (fetchError.name === 'AbortError') {
          throw new Error(`Request timeout after 30 seconds`);
        }
        
        throw fetchError;
      }
      
    } catch (err: any) {
      lastError = err;
      
      // Se é rate limit e ainda temos tentativas, fazer backoff exponencial
      if (attempt < maxRetries && (err.message?.includes('429') || err.message?.includes('Rate limit'))) {
        const backoffMs = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.log(`[GenerateMessage] Retry ${attempt + 1}/${maxRetries} after ${backoffMs}ms...`);
        await new Promise(r => setTimeout(r, backoffMs));
        continue;
      }
      
      // Se não é rate limit ou esgotamos tentativas, lançar erro
      throw err;
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

// ==================== MESSAGE SPLITTER ====================
// Agora usa o MESMO modelo do ai_agents (não tem mais fallback hardcoded)

interface SplitResult {
  messages: string[];
  tokensUsed: number;
  delayMs: number;
}

async function splitMessageWithAI(
  supabase: any,
  openrouterApiKey: string,
  message: string,
  maxParts: number,
  aiModel: string  // Modelo vem do ai_agents
): Promise<SplitResult> {
  // Buscar apenas configurações de comportamento (delay, min_chars)
  // O MODELO vem do ai_agents, não da config do splitter
  let splitterConfig = null;
  try {
    const result = await supabase
      .from('ai_message_splitter_config')
      .select('min_chars_to_split, delay_between_messages, temperature, max_tokens')
      .eq('is_active', true)
      .single();
    if (!result.error) splitterConfig = result.data;
  } catch (err) {
    console.error('[MessageSplit] Error fetching config:', err);
  }

  const minChars = splitterConfig?.min_chars_to_split || 150;
  const delayMs = splitterConfig?.delay_between_messages || 500;
  const maxTokens = splitterConfig?.max_tokens || 1000;
  const temperature = parseFloat(splitterConfig?.temperature || '0.1') || 0.1;
  
  // Garantir que maxParts está entre 1 e 5
  const safeMaxParts = Math.max(1, Math.min(5, maxParts));

  // Se mensagem é curta, não fracionar
  if (message.length < minChars) {
    return { messages: [message], tokensUsed: 0, delayMs };
  }

  // System prompt dinâmico com limite de partes
  const systemPrompt = `Você é um SEPARADOR DE TEXTO especializado. Sua única função é dividir mensagens em partes menores.

### REGRAS ###
1. Divida o texto em NO MÁXIMO ${safeMaxParts} partes
2. Se o texto for curto, use MENOS partes (pode ser apenas 1)
3. Use pontos finais (.) como pontos de divisão
4. NUNCA divida listas - mantenha-as na mesma parte
5. PRESERVE exatamente o texto original, sem alterar nada
6. Cada parte deve ser uma unidade coerente

### FORMATO DE SAÍDA ###
Responda APENAS com JSON:
{"messages": ["parte1", "parte2"]}

IMPORTANTE: Máximo de ${safeMaxParts} partes!`;

  try {
    console.log(`[MessageSplit] Using model: ${aiModel}, maxParts: ${safeMaxParts}`);
    
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout
        
        try {
          const llmResponse = await fetch(OPENROUTER_URL, {
            signal: controller.signal,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openrouterApiKey}`,
              'HTTP-Referer': 'https://pescalead.com',
              'X-Title': 'PescaLead Campaign Splitter'
            },
            body: JSON.stringify({
              model: aiModel,  // USA O MODELO DO AI_AGENTS!
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message }
              ],
              max_tokens: maxTokens,
              temperature
            })
          });
          
          clearTimeout(timeoutId);
          
          // ✅ CORREÇÃO: Tratar rate limit (429)
          if (llmResponse.status === 429) {
            const retryAfter = parseInt(llmResponse.headers.get('Retry-After') || '60');
            const backoffMs = Math.min(retryAfter * 1000, 60000); // Max 60s
            
            if (attempt < maxRetries) {
              console.log(`[MessageSplit] Rate limit (429), waiting ${backoffMs}ms before retry ${attempt + 1}/${maxRetries}...`);
              await new Promise(r => setTimeout(r, backoffMs));
              continue;
            }
            console.error('[MessageSplit] Rate limit exceeded, returning original message');
            return { messages: [message], tokensUsed: 0, delayMs };
          }

          if (!llmResponse.ok) {
            const errorText = await llmResponse.text();
            throw new Error(`OpenRouter error: ${llmResponse.status} - ${errorText}`);
          }
          
          // Processar resposta normalmente
          const result = await llmResponse.json();
          const responseText = result.choices[0]?.message?.content || '';
          const tokensIn = result.usage?.prompt_tokens || 0;
          const tokensOut = result.usage?.completion_tokens || 0;

          // ✅ CORREÇÃO: Usar função auxiliar para parsing
          const parseResult = parseSplitResponse(responseText, safeMaxParts, message);
          
          if (!parseResult.valid) {
            console.error('[MessageSplit] Parse failed:', parseResult.error);
            console.error('[MessageSplit] Response text:', responseText?.substring(0, 200));
          }
          
          const splitMessages = parseResult.messages;

          return {
            messages: splitMessages,
            tokensUsed: tokensIn + tokensOut,
            delayMs
          };
          
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          
          // Se foi abortado por timeout
          if (fetchError.name === 'AbortError') {
            throw new Error(`Request timeout after 20 seconds`);
          }
          
          throw fetchError;
        }
        
      } catch (err: any) {
        lastError = err;
        
        // Se é rate limit e ainda temos tentativas, fazer backoff exponencial
        if (attempt < maxRetries && (err.message?.includes('429') || err.message?.includes('Rate limit'))) {
          const backoffMs = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          console.log(`[MessageSplit] Retry ${attempt + 1}/${maxRetries} after ${backoffMs}ms...`);
          await new Promise(r => setTimeout(r, backoffMs));
          continue;
        }
        
        // Se não é rate limit ou esgotamos tentativas, retornar mensagem original
        if (attempt === maxRetries) {
          console.error('[MessageSplit] Max retries exceeded, returning original message');
          return { messages: [message], tokensUsed: 0, delayMs };
        }
        
        throw err;
      }
    }
    
    // Fallback final
    console.error('[MessageSplit] All retries failed, returning original message');
    return { messages: [message], tokensUsed: 0, delayMs };
  } catch (error: any) {
    // ✅ FASE 3: Log detalhado de erros em splitMessageWithAI
    console.error('[MessageSplit] Unexpected error:', error);
    console.error('[MessageSplit] Error stack:', error?.stack);
    console.error('[MessageSplit] Error details:', {
      message: error?.message,
      name: error?.name,
      cause: error?.cause,
      model: aiModel,
      message_length: message.length,
      max_parts: maxParts
    });
    
    // Retornar mensagem original em caso de erro
    return { messages: [message], tokensUsed: 0, delayMs: 500 };
  }
}

// ==================== PROCESSING HELPERS ====================

/**
 * Processa uma mensagem individual
 * Extraído do loop principal para permitir processamento paralelo
 */
async function processSingleMessage(
  msg: any,
  supabase: any,
  openrouterApiKey: string,
  modelCache: Map<string, string | null>,
  inboxStatusCache: Map<string, InstanceStatus>,
  contextMap: Map<string, any>,
  openrouterApiKeyForMsg: string
): Promise<{ processed: boolean; failed: boolean; paused: boolean; error?: any }> {
  const config = msg.campaign_runs.campaign_configs;
  const runId = msg.campaign_runs.id;
  const configId = config.id;

  // ✅ NOVO: Buscar current_inbox_id da run (pode ter mudado por fallback)
  const currentInboxId = msg.campaign_runs.current_inbox_id || config.inbox_id;
  let inboxId = currentInboxId;

  const workspaceId = config.workspace_id;
  const splitMessagesEnabled = config.split_messages === true;
  
  // ✅ CRÍTICO: Verificar se a run ainda está 'running' ANTES de gerar IA
  // Se foi pausada/cancelada após seleção, não gasta tokens
  const { data: runStatus } = await supabase
    .from('campaign_runs')
    .select('status')
    .eq('id', runId)
    .single();
  
  if (!runStatus || runStatus.status !== 'running') {
    // Run foi pausada/cancelada - marcar mensagem como skipped sem gastar tokens
    await supabase
      .from('campaign_messages')
      .update({
        status: 'skipped',
        error_message: `Campanha ${runStatus?.status || 'não encontrada'} - mensagem cancelada antes do envio`
      })
      .eq('id', msg.id);
    
    return { processed: false, failed: false, paused: runStatus?.status === 'paused' };
  }
  
  // Validar max_split_parts
  const maxSplitParts = config.max_split_parts;
  let safeMaxSplitParts = 3;
  if (!maxSplitParts || maxSplitParts < 1 || maxSplitParts > 5) {
    safeMaxSplitParts = 3;
  } else {
    safeMaxSplitParts = maxSplitParts;
  }
  
  // Verificar end_time
  if (config.end_time) {
    const timezone = config.timezone || 'America/Sao_Paulo';
    const today = new Date();
    const endTimeToday = timeToDate(config.end_time, today, timezone);
    const currentTimeInTz = getCurrentTimeInTimezone(timezone);
    
    if (currentTimeInTz > endTimeToday) {
      await pauseRun(supabase, runId, `Horário limite (${config.end_time}) atingido`);
      return { processed: false, failed: false, paused: true };
    }
  }

  // ✅ Variáveis de telefone no escopo da função para uso no catch block
  let phoneToUse = msg.phone_normalized;
  let phoneSource = 'primary';

  try {
    // ✅ NOVO: Verificar instância E fazer switch automático se necessário
    const connectionCheck = await checkAndSwitchIfNeeded(
      supabase,
      runId,
      configId,
      inboxId
    );

    if (!connectionCheck.connected) {
      // Já foi pausado dentro do checkAndSwitchIfNeeded
      return { processed: false, failed: false, paused: true };
    }

    // Atualizar inboxId se houve switch
    if (connectionCheck.switched) {
      inboxId = connectionCheck.inboxId;
      console.log(`✅ [FALLBACK] Using reserve inbox: ${connectionCheck.instanceName}`);
    }

    // Atualizar cache com novo inbox (se mudou)
    inboxStatusCache.set(inboxId, {
      connected: true,
      name: connectionCheck.instanceName
    });

    // Buscar modelo
    let aiModel = modelCache.get(workspaceId);
    if (aiModel === undefined) {
      aiModel = await getWorkspaceAIModel(supabase, workspaceId);
      modelCache.set(workspaceId, aiModel);
    }

    if (!aiModel) {
      await supabase
        .from('campaign_messages')
        .update({
          status: 'failed',
          error_message: 'Nenhum modelo de IA configurado no ai_agents para este workspace.'
        })
        .eq('id', msg.id);
      
      await supabase.rpc('increment_campaign_run_metrics', {
        p_run_id: runId,
        p_success: 0,
        p_failed: 1,
        p_skipped: 0
      });
      
      return { processed: false, failed: true, paused: false };
    }

    // Buscar lead
    const { data: leadData } = await supabase
      .from('leads')
      .select('client_name')
      .eq('id', msg.lead_id)
      .maybeSingle();

    if (!leadData) {
      await supabase
        .from('campaign_messages')
        .update({
          status: 'skipped',
          error_message: 'Lead foi deletado antes do processamento'
        })
        .eq('id', msg.id);
      
      await supabase.rpc('increment_campaign_run_metrics', {
        p_run_id: runId,
        p_success: 0,
        p_failed: 0,
        p_skipped: 1
      });
      
      return { processed: false, failed: false, paused: false };
    }

    const leadName = leadData.client_name || 'Lead';

    // ✅ CORREÇÃO: Usar contexto do map se disponível, senão buscar
    let leadContext = contextMap.get(msg.lead_id);
    if (!leadContext) {
      const { data: contextData } = await supabase
        .rpc('get_lead_full_context', { p_lead_id: msg.lead_id });
      if (contextData) {
        leadContext = contextData;
        contextMap.set(msg.lead_id, contextData);
      }
    }

    if (!leadContext) {
      throw new Error('Lead context not found');
    }

    const formattedContext = formatLeadContextForAI(leadContext);

    // Gerar mensagem via IA
    const systemPrompt = config.ai_instructions || 'Você é um assistente de vendas. Gere uma mensagem de primeiro contato profissional e personalizada.';
    
    const aiStartTime = Date.now();
    const aiResult = await generateMessage(
      openrouterApiKeyForMsg,
      systemPrompt,
      formattedContext,
      aiModel
    );
    const aiTimeMs = Date.now() - aiStartTime;

    const MIN_MESSAGE_LENGTH = 10;
    if (!aiResult.message || aiResult.message.trim().length < MIN_MESSAGE_LENGTH) {
      throw new Error(`AI generated invalid message (length: ${aiResult.message?.length || 0}, min: ${MIN_MESSAGE_LENGTH})`);
    }
    
    aiResult.message = aiResult.message.trim();
    
    await supabase
      .from('campaign_messages')
      .update({
        ai_tokens_used: aiResult.tokens,
        ai_generation_time_ms: aiTimeMs
      })
      .eq('id', msg.id);

    let totalTokens = aiResult.tokens;
    let messagesToSend: string[] = [aiResult.message];
    let delayBetweenParts = 500;

    // Fracionamento
    if (splitMessagesEnabled) {
      try {
        const splitStartTime = Date.now();
        const splitResult = await splitMessageWithAI(
          supabase, 
          openrouterApiKeyForMsg, 
          aiResult.message,
          safeMaxSplitParts,
          aiModel
        );
        const splitTimeMs = Date.now() - splitStartTime;
        
        messagesToSend = splitResult.messages;
        totalTokens += splitResult.tokensUsed;
        delayBetweenParts = splitResult.delayMs;
      } catch (splitError: any) {
        messagesToSend = [aiResult.message];
        delayBetweenParts = 500;
      }
    }

    await supabase
      .from('campaign_messages')
      .update({
        status: 'sending',
        generated_message: aiResult.message
      })
      .eq('id', msg.id);

    // ✅ NOVO: Re-verificar instância E trocar se necessário
    const recheckResult = await checkAndSwitchIfNeeded(
      supabase,
      runId,
      configId,
      inboxId
    );

    if (!recheckResult.connected) {
      // Já foi pausado dentro do checkAndSwitchIfNeeded
      return { processed: false, failed: false, paused: true };
    }

    // Atualizar inboxId se houve switch durante o processamento
    if (recheckResult.switched) {
      inboxId = recheckResult.inboxId;
      console.log(`✅ [FALLBACK] Mid-process switch to: ${recheckResult.instanceName}`);
    }

    // ==================== VALIDAÇÃO DE WHATSAPP ====================
    // Buscar dados da instância para validação
    const instanceData = await getInstanceDataForInbox(supabase, inboxId);

    // Verificar se instância existe e tem dados
    if (!instanceData.instanceName || !instanceData.token) {
      console.error('[Phone Validation] Não foi possível obter dados da instância para validação');
      await log(supabase, runId, 'PHONE_VALIDATION', 'error',
        '❌ Falha na validação - dados da instância indisponíveis',
        { inbox_id: inboxId }
      );

      await supabase
        .from('campaign_messages')
        .update({
          status: 'failed',
          error_message: '❌ Instância não encontrada - não foi possível validar o número'
        })
        .eq('id', msg.id);

      await supabase.rpc('increment_campaign_run_metrics', {
        p_run_id: runId,
        p_success: 0,
        p_failed: 1,
        p_skipped: 0
      });

      return { processed: false, failed: true, paused: false };
    }

    // ❌ Verificar se instância está CONECTADA e ONLINE
    if (!instanceData.connected) {
      console.error(`[Phone Validation] Instância ${instanceData.instanceName} está DESCONECTADA (status: ${instanceData.status})`);
      await log(supabase, runId, 'PHONE_VALIDATION', 'error',
        `❌ Instância "${instanceData.instanceName}" desconectada (status: ${instanceData.status}) - NÃO criando conversa`,
        {
          inbox_id: inboxId,
          instance_name: instanceData.instanceName,
          status: instanceData.status
        }
      );

      await supabase
        .from('campaign_messages')
        .update({
          status: 'failed',
          error_message: `❌ Instância "${instanceData.instanceName}" desconectada (${instanceData.status}) - número não validado`
        })
        .eq('id', msg.id);

      await supabase.rpc('increment_campaign_run_metrics', {
        p_run_id: runId,
        p_success: 0,
        p_failed: 1,
        p_skipped: 0
      });

      return { processed: false, failed: true, paused: false };
    }

    // ✅ Instância conectada - prosseguir com validação do número
    console.log(`[Phone Validation] Iniciando validação para lead ${msg.lead_id} (provider: ${instanceData.providerType}, instance: ${instanceData.instanceName})`);

    const phoneValidation = await validateAndFindValidPhone(
      supabase,
      instanceData.instanceName,
      instanceData.token,
      msg.lead_id,
      msg.phone_normalized,
      runId,
      instanceData.providerType
    );

    if (!phoneValidation.isValid) {
      // ❌ Nenhum WhatsApp válido encontrado - NÃO criar conversa, marcar como falha
      await supabase
        .from('campaign_messages')
        .update({
          status: 'failed',
          error_message: `❌ Número inválido: ${phoneValidation.validationDetails}`
        })
        .eq('id', msg.id);

      await supabase.rpc('increment_campaign_run_metrics', {
        p_run_id: runId,
        p_success: 0,
        p_failed: 1,
        p_skipped: 0
      });

      return { processed: false, failed: true, paused: false };
    }

    // Se trocou de número, atualizar phone_normalized na mensagem
    if (phoneValidation.switchedFrom && phoneValidation.validPhone) {
      console.log(`[Phone Validation] 🔄 Trocando número: ${phoneValidation.switchedFrom} → ${phoneValidation.validPhone}`);

      await supabase
        .from('campaign_messages')
        .update({
          phone_normalized: phoneValidation.validPhone,
          error_message: `📱 Número trocado: ${phoneValidation.switchedFrom} → ${phoneValidation.validPhone}`
        })
        .eq('id', msg.id);

      // Atualizar o número para uso no restante do processamento
      msg.phone_normalized = phoneValidation.validPhone;
    }
    // ==================== FIM VALIDAÇÃO DE WHATSAPP ====================

    // Buscar ou criar conversa
    let conversationId: string | null = null;
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id, campaign_run_id, contact_phone')
      .eq('lead_id', msg.lead_id)
      .maybeSingle();

    if (existingConv) {
      conversationId = existingConv.id;
      // ✅ Atualizar campaign_run_id e contact_phone se mudou (telefone alternativo)
      const updateData: any = {};
      if (!existingConv.campaign_run_id) {
        updateData.campaign_run_id = runId;
      }
      // Se usou telefone alternativo, atualizar o contact_phone da conversa
      if (phoneSource !== 'primary' && existingConv.contact_phone !== phoneToUse) {
        updateData.contact_phone = phoneToUse;
        console.log(`[Processor] Atualizando telefone da conversa de ${existingConv.contact_phone} para ${phoneToUse}`);
      }

      if (Object.keys(updateData).length > 0) {
        await supabase
          .from('conversations')
          .update(updateData)
          .eq('id', existingConv.id);
      }
    } else {
      const { data: convByPhone } = await supabase
        .from('conversations')
        .select('id')
        .eq('workspace_id', config.workspace_id)
        .eq('contact_phone', phoneToUse)
        .maybeSingle();

      if (convByPhone) {
        conversationId = convByPhone.id;
        // ✅ Atualizar lead_id e campaign_run_id
        await supabase
          .from('conversations')
          .update({
            lead_id: msg.lead_id,
            campaign_run_id: runId
          })
          .eq('id', convByPhone.id);
      } else {
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            workspace_id: config.workspace_id,
            contact_phone: phoneToUse,
            contact_name: leadContext.client_name || phoneToUse,
            channel: 'whatsapp',
            status: 'waiting',
            lead_id: msg.lead_id,
            inbox_id: config.inbox_id,
            campaign_run_id: runId  // ✅ Salvar campaign_run_id
          })
          .select('id')
          .single();

        if (convError) throw convError;
        conversationId = newConv.id;
      }
    }

    // Enviar mensagens
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    let lastProviderMessageId: string | null = null;
    let allSent = true;
    let lastSendError: string | null = null; // ✅ Guardar erro real da API

    for (let i = 0; i < messagesToSend.length; i++) {
      const partContent = messagesToSend[i];

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout (aumentado de 10s)

      try {
        const sendResponse = await fetch(`${supabaseUrl}/functions/v1/internal-send-ai-message`, {
          signal: controller.signal,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Service-Role-Key': serviceRoleKey!
          },
          body: JSON.stringify({
            conversationId,
            text: partContent
          })
        });

        clearTimeout(timeoutId);

        if (!sendResponse.ok) {
          const errorText = await sendResponse.text();
          console.error(`[Processor] Send failed for part ${i + 1}:`, errorText);
          // ✅ Extrair erro real do JSON se possível
          try {
            const errorJson = JSON.parse(errorText);
            lastSendError = errorJson.error || errorJson.message || errorText;
          } catch {
            lastSendError = errorText;
          }
          allSent = false;
          break;
        }

        const sendResult = await sendResponse.json();
        lastProviderMessageId = sendResult.provider_response?.key?.id || null;

        if (i < messagesToSend.length - 1 && delayBetweenParts > 0) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenParts));
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);

        if (fetchError.name === 'AbortError') {
          console.error(`[Processor] Send timeout for part ${i + 1} after 60 seconds`);
          allSent = false;
          break;
        }

        throw fetchError;
      }
    }

    if (!allSent) {
      throw new Error(lastSendError || 'Falha ao enviar mensagem');
    }

    // ✅ NOVO: Atualizar inbox_id antes de completar (rastreia qual inbox foi usado)
    await supabase
      .from('campaign_messages')
      .update({ inbox_id: inboxId })
      .eq('id', msg.id);

    // Operação atômica
    const { data: completionResult, error: completionError } = await supabase.rpc(
      'complete_campaign_message_atomic',
      {
        p_message_id: msg.id,
        p_run_id: runId,
        p_lead_id: msg.lead_id,
        p_target_column_id: config.target_column_id,
        p_conversation_id: conversationId,
        p_provider_message_id: lastProviderMessageId,
        p_success: true
      }
    );

    if (completionError || !completionResult?.success) {
      throw new Error(`Atomic completion failed: ${completionError?.message || completionResult?.error}`);
    }

    return { processed: true, failed: false, paused: false };

  } catch (err: any) {
    // Retry automático
    const currentRetryCount = (msg.retry_count || 0) + 1;
    const MAX_RETRIES = 3;
    
    if (currentRetryCount < MAX_RETRIES) {
      const backoffMinutes = [5, 15, 30][currentRetryCount - 1] || 30;
      const retryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);
      
      await supabase
        .from('campaign_messages')
        .update({
          status: 'pending',
          scheduled_at: retryAt.toISOString(),
          error_message: `Retry ${currentRetryCount}/${MAX_RETRIES}: ${err.message?.substring(0, 200) || 'Erro desconhecido'}`,
          retry_count: currentRetryCount
        })
        .eq('id', msg.id);
      
      return { processed: false, failed: false, paused: false, error: err };
    } else {
      const errorMessage = `Max retries (${MAX_RETRIES}) exceeded: ${err.message?.substring(0, 200) || 'Erro desconhecido'}`;

      await supabase.rpc('complete_campaign_message_atomic', {
        p_message_id: msg.id,
        p_run_id: runId,
        p_lead_id: msg.lead_id,
        p_target_column_id: config.target_column_id,
        p_conversation_id: null,
        p_provider_message_id: null,
        p_success: false
      });

      await supabase
        .from('campaign_messages')
        .update({
          error_message: errorMessage,
          retry_count: currentRetryCount
        })
        .eq('id', msg.id);

      // ✅ Registrar erro nos logs da campanha para visibilidade na UI
      // Detectar tipos específicos de erro para mensagens mais úteis
      const errorMsg = err.message || '';
      const isInsufficientCredits = errorMsg.includes('Insufficient credits') || errorMsg.includes('402');
      const isInvalidApiKey = errorMsg.includes('401') || errorMsg.includes('Unauthorized') || errorMsg.includes('Invalid API key');
      const isAccountSuspended = errorMsg.includes('403') || errorMsg.includes('Forbidden') || errorMsg.includes('suspended') || errorMsg.includes('banned');
      const isModelNotFound = errorMsg.includes('404') || errorMsg.includes('model not found') || errorMsg.includes('Model not available');
      const isServerError = errorMsg.includes('500') || errorMsg.includes('502') || errorMsg.includes('503') || errorMsg.includes('Internal Server Error');
      const isRateLimit = errorMsg.includes('429') || errorMsg.includes('Rate limit');
      const isTimeout = errorMsg.includes('timeout') || errorMsg.includes('Timeout');

      // Erros críticos que justificam pausar a campanha (todos os leads vão falhar)
      const isCriticalError = isInsufficientCredits || isInvalidApiKey || isAccountSuspended || isModelNotFound || isServerError;

      let stepName = 'ENVIO_FALHOU';
      let logMessage = `❌ Falha no envio após ${MAX_RETRIES} tentativas`;
      let errorType = 'unknown';
      let pauseReason = '';

      if (isInsufficientCredits) {
        stepName = 'CREDITOS_INSUFICIENTES';
        logMessage = '💳 Créditos insuficientes na API de IA - adicione mais créditos para continuar';
        errorType = 'insufficient_credits';
        pauseReason = 'Créditos insuficientes na API de IA';
      } else if (isInvalidApiKey) {
        stepName = 'API_KEY_INVALIDA';
        logMessage = '🔑 Chave de API inválida - verifique a configuração da API de IA';
        errorType = 'invalid_api_key';
        pauseReason = 'Chave de API inválida';
      } else if (isAccountSuspended) {
        stepName = 'CONTA_SUSPENSA';
        logMessage = '🚫 Conta suspensa ou sem permissão - verifique sua conta na API de IA';
        errorType = 'account_suspended';
        pauseReason = 'Conta suspensa ou sem permissão';
      } else if (isModelNotFound) {
        stepName = 'MODELO_INDISPONIVEL';
        logMessage = '🤖 Modelo de IA não disponível - selecione outro modelo nas configurações';
        errorType = 'model_not_found';
        pauseReason = 'Modelo de IA não disponível';
      } else if (isServerError) {
        stepName = 'ERRO_SERVIDOR_IA';
        logMessage = '🔥 Servidor da API de IA fora do ar - tente novamente mais tarde';
        errorType = 'server_error';
        pauseReason = 'Servidor da API de IA fora do ar';
      } else if (isRateLimit) {
        stepName = 'RATE_LIMIT';
        logMessage = '⚠️ Limite de requisições excedido na API de IA';
        errorType = 'rate_limit';
      } else if (isTimeout) {
        stepName = 'TIMEOUT';
        logMessage = '⏱️ Timeout na geração de mensagem - API de IA demorou muito para responder';
        errorType = 'timeout';
      }

      // Pausar campanha se for erro crítico
      if (isCriticalError) {
        await pauseRun(supabase, runId, pauseReason);

        await log(supabase, runId, stepName, 'error',
          logMessage,
          {
            error: errorMsg.substring(0, 500) || 'Erro desconhecido',
            phone: phoneToUse,
            original_phone: phoneToUse !== msg.phone_normalized ? msg.phone_normalized : undefined,
            phone_source: phoneSource,
            lead_id: msg.lead_id,
            retry_count: currentRetryCount,
            error_type: errorType,
            action: 'campaign_paused'
          },
          msg.lead_id,
          msg.id
        );

        return { processed: false, failed: true, paused: true, error: err };
      }

      // Erros não críticos - apenas logar sem pausar
      await log(supabase, runId, stepName, 'error',
        logMessage,
        {
          error: errorMsg.substring(0, 500) || 'Erro desconhecido',
          phone: phoneToUse,
          original_phone: phoneToUse !== msg.phone_normalized ? msg.phone_normalized : undefined,
          phone_source: phoneSource,
          lead_id: msg.lead_id,
          retry_count: currentRetryCount,
          error_type: errorType
        },
        msg.lead_id,
        msg.id
      );

      return { processed: false, failed: true, paused: false, error: err };
    }
  }
}

// ==================== MAIN HANDLER ====================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    // ✅ CORREÇÃO: Validar batch_size entre 1-100
    let { batch_size = 5 } = await req.json().catch(() => ({}));
    if (!batch_size || batch_size < 1 || batch_size > 100) {
      console.warn(`[Processor] Invalid batch_size: ${batch_size}, using default: 5`);
      batch_size = 5;
    }
    const now = new Date();

    console.log(`[Processor V7] Processing batch of ${batch_size} messages`);

    // 1. Buscar API key do OpenRouter
    const { data: secrets } = await supabase
      .from('decrypted_secrets')
      .select('decrypted_secret')
      .eq('name', 'OPENROUTER_API_KEY')
      .single();

    if (!secrets?.decrypted_secret) {
      throw new Error('OpenRouter API key not configured');
    }
    const openrouterApiKey = secrets.decrypted_secret;

    // 2. Buscar mensagens prontas para envio (seleção atômica)
    // ✅ CORREÇÃO: Usar função SQL para seleção atômica com FOR UPDATE SKIP LOCKED
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const { data: messagesData, error: msgError } = await supabase
      .rpc('get_and_lock_campaign_messages', {
        p_batch_size: batch_size,
        p_one_hour_ago: oneHourAgo.toISOString()
      });
    
    // Converter JSONB array para array de objetos
    // messagesData já é um array JSONB parseado pelo Supabase client
    const messages: any[] = Array.isArray(messagesData) ? messagesData : [];
    
    // ✅ CORREÇÃO: Usar função SQL otimizada para marcar mensagens antigas
    const { data: skippedCount, error: skipOldError } = await supabase.rpc(
      'mark_old_campaign_messages_as_skipped',
      { p_one_hour_ago: oneHourAgo.toISOString() }
    );
    
    if (skipOldError) {
      console.warn('[Processor] Error skipping old messages:', skipOldError);
    } else if (skippedCount && skippedCount > 0) {
      console.log(`[Processor] Marked ${skippedCount} old messages as skipped`);
    }

    if (msgError) {
      console.error('[Processor] Error fetching messages:', msgError);
      throw msgError;
    }

    if (!messages || messages.length === 0) {
      console.log('[Processor] No messages ready to process');
      return new Response(JSON.stringify({ processed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Processor] Found ${messages.length} messages to process`);

    let processed = 0;
    let failed = 0;
    let paused = 0;

    const modelCache: Map<string, string | null> = new Map();
    const inboxStatusCache: Map<string, InstanceStatus> = new Map();

    // ✅ CORREÇÃO: Buscar contextos em batch antes do processamento paralelo
    const leadIds = messages.map(m => m.lead_id);
    const contextPromises = leadIds.map(leadId => 
      supabase.rpc('get_lead_full_context', { p_lead_id: leadId })
        .then(result => ({ leadId, context: result.data }))
        .catch(err => ({ leadId, context: null, error: err }))
    );
    
    const contextResults = await Promise.allSettled(contextPromises);
    const contextMap = new Map<string, any>();
    
    contextResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.context) {
        contextMap.set(leadIds[index], result.value.context);
      }
    });
    
    console.log(`[Processor] Loaded ${contextMap.size}/${leadIds.length} lead contexts in batch`);

    // ✅ CORREÇÃO: Processamento paralelo com limite de concorrência
    const CONCURRENCY_LIMIT = 5;
    const messageChunks: any[][] = [];
    
    for (let i = 0; i < messages.length; i += CONCURRENCY_LIMIT) {
      messageChunks.push(messages.slice(i, i + CONCURRENCY_LIMIT));
    }
    
    console.log(`[Processor] Processing ${messages.length} messages in ${messageChunks.length} chunks (${CONCURRENCY_LIMIT} concurrent)`);
    
    for (const chunk of messageChunks) {
      // Processar chunk em paralelo
      const chunkResults = await Promise.allSettled(
        chunk.map(msg => processSingleMessage(
          msg,
          supabase,
          openrouterApiKey,
          modelCache,
          inboxStatusCache,
          contextMap,
          openrouterApiKey
        ))
      );
      
      // Contar resultados
      for (const result of chunkResults) {
        if (result.status === 'fulfilled') {
          if (result.value.processed) processed++;
          if (result.value.failed) failed++;
          if (result.value.paused) paused++;
        } else {
          failed++;
          console.error('[Processor] Message processing rejected:', result.reason);
        }
      }
    }

    // Loop sequencial antigo foi removido - agora usa processamento paralelo acima

    // Verificar runs completos (usando função SQL atômica para evitar race condition)
    const runIds = [...new Set(messages.map(m => m.campaign_runs.id))];
    for (const runId of runIds) {
      // ✅ CORREÇÃO: Usar função SQL atômica que previne race condition
      // A função só finaliza se status = 'running' E leads_processed >= leads_total
      const { data: result, error: finalizeError } = await supabase
        .rpc('finalize_campaign_run_if_complete', {
          p_run_id: runId
        });

      if (finalizeError) {
        console.error(`[Processor] Error finalizing run ${runId}:`, finalizeError);
        continue;
      }

      // Se finalizou (result[0].finalized === true), logar
      if (result && result.length > 0 && result[0].finalized === true) {
        await log(supabase, runId, 'FINALIZAÇÃO', 'success',
          `🎉 Campanha concluída! ${result[0].leads_processed} leads processados`,
          {
            total: result[0].leads_total,
            processed: result[0].leads_processed
          }
        );
      }
    }

    // ✅ CORREÇÃO: Finalizar campanhas órfãs (travadas)
    // Isso corrige o bug onde campanhas terminam de processar mas não são finalizadas
    // porque o último batch não tinha mensagens do run
    try {
      const { data: orphanRuns, error: orphanError } = await supabase
        .rpc('finalize_orphan_campaign_runs');

      if (orphanError) {
        console.error('[Processor] Error finalizing orphan runs:', orphanError);
      } else if (orphanRuns && orphanRuns.length > 0) {
        console.log(`[Processor] ✅ Finalized ${orphanRuns.length} orphan campaign runs`);
        for (const run of orphanRuns) {
          await log(supabase, run.run_id, 'FINALIZAÇÃO', 'success',
            `🎉 Campanha finalizada (recuperada)! ${run.leads_processed}/${run.leads_total} leads`,
            {
              total: run.leads_total,
              processed: run.leads_processed,
              success: run.leads_success,
              failed: run.leads_failed,
              recovered: true
            }
          );
        }
      }
    } catch (orphanErr: any) {
      console.error('[Processor] Exception finalizing orphan runs:', orphanErr.message);
    }

    return new Response(JSON.stringify({
      success: true,
      processed,
      failed,
      paused
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    // ✅ NOVO: Log detalhado de erros
    console.error('[Processor] Fatal error:', error);
    console.error('[Processor] Error stack:', error.stack);
    console.error('[Processor] Error details:', {
      message: error.message,
      name: error.name,
      cause: error.cause
    });
    
    return new Response(JSON.stringify({
      error: error.message || 'Erro interno do servidor',
      error_code: 'FATAL_ERROR'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});