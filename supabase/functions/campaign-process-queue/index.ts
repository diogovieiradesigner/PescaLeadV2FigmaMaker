/**
 * Campaign Process Queue Edge Function V7
 * - Usa o MESMO MODELO de IA do agente de atendimento (para tudo!)
 * - Usa ai_instructions da configuração da campanha como prompt
 * - Verifica se instância está conectada ANTES de cada envio
 * - Pausa campanha automaticamente se instância desconectar
 * - Suporte a fracionamento de mensagens (split_messages)
 * - Limite personalizável de partes (max_split_parts)
 * - CORRIGIDO: Splitter agora usa modelo do ai_agents (não hardcoded)
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

async function checkInstanceConnected(supabase: any, inboxId: string): Promise<{connected: boolean, status?: string, name?: string}> {
  const { data } = await supabase.rpc('check_campaign_instance_status', {
    p_inbox_id: inboxId
  });
  
  return {
    connected: data?.connected === true,
    status: data?.status,
    name: data?.instance_name
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
                content: `Gere uma mensagem de primeiro contato para este lead:\n\n${leadContext}\n\nRetorne APENAS a mensagem, sem explicações.` 
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
        const message = data.choices?.[0]?.message?.content?.trim() || '';
        const tokens = data.usage?.total_tokens || 0;
        
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
  inboxStatusCache: Map<string, {connected: boolean, status?: string, name?: string}>,
  contextMap: Map<string, any>,
  openrouterApiKeyForMsg: string
): Promise<{ processed: boolean; failed: boolean; paused: boolean; error?: any }> {
  const config = msg.campaign_runs.campaign_configs;
  const runId = msg.campaign_runs.id;
  const inboxId = config.inbox_id;
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
  
  try {
    // Verificar instância
    let instanceStatus = inboxStatusCache.get(inboxId);
    if (!instanceStatus) {
      instanceStatus = await checkInstanceConnected(supabase, inboxId);
      inboxStatusCache.set(inboxId, instanceStatus);
    }
    
    if (!instanceStatus.connected) {
      await pauseRun(supabase, runId, `Instância desconectada: ${instanceStatus.name}`);
      return { processed: false, failed: false, paused: true };
    }

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

    // Re-verificar instância
    const recheck = await checkInstanceConnected(supabase, inboxId);
    if (!recheck.connected) {
      await pauseRun(supabase, runId, `Instância desconectou durante processamento`);
      return { processed: false, failed: false, paused: true };
    }

    // Buscar ou criar conversa
    let conversationId: string | null = null;
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('lead_id', msg.lead_id)
      .maybeSingle();

    if (existingConv) {
      conversationId = existingConv.id;
    } else {
      const { data: convByPhone } = await supabase
        .from('conversations')
        .select('id')
        .eq('workspace_id', config.workspace_id)
        .eq('contact_phone', msg.phone_normalized)
        .maybeSingle();

      if (convByPhone) {
        conversationId = convByPhone.id;
        await supabase
          .from('conversations')
          .update({ lead_id: msg.lead_id })
          .eq('id', convByPhone.id);
      } else {
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            workspace_id: config.workspace_id,
            contact_phone: msg.phone_normalized,
            contact_name: leadContext.client_name || msg.phone_normalized,
            channel: 'whatsapp',
            status: 'waiting',
            lead_id: msg.lead_id,
            inbox_id: config.inbox_id
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

    for (let i = 0; i < messagesToSend.length; i++) {
      const partContent = messagesToSend[i];
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
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
          console.error(`[Processor] Send timeout for part ${i + 1} after 10 seconds`);
          allSent = false;
          break;
        }
        
        throw fetchError;
      }
    }

    if (!allSent) {
      throw new Error('Failed to send one or more message parts');
    }

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
          error_message: `Max retries (${MAX_RETRIES}) exceeded: ${err.message?.substring(0, 200) || 'Erro desconhecido'}`,
          retry_count: currentRetryCount
        })
        .eq('id', msg.id);
      
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
    const inboxStatusCache: Map<string, {connected: boolean, status?: string, name?: string}> = new Map();

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
      error_code: 'FATAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});