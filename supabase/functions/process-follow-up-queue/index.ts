/**
 * Process Follow-up Queue Edge Function
 * 
 * Processa fila de follow-ups automáticos.
 * Usa o sistema padronizado de envio via internal-send-ai-message
 * que suporta múltiplos providers (WhatsApp, futuramente Email, Instagram, etc).
 * 
 * ATUALIZAÇÃO: Agora filtra categorias e modelos por workspace_id
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FollowUpJob {
  job_id: string;
  conversation_id: string;
  workspace_id: string;
  trigger_message_id: string;
  category_id: string | null;
  current_model_index: number;
}

interface ValidationResult {
  valid: boolean;
  reason?: string;
  job_id: string;
  conversation_id: string;
  last_message_id?: string;
}

interface ModelResult {
  model_id: string;
  model_name: string;
  message: string;
  wait_seconds: number;
  next_index: number;
  is_last: boolean;
}

interface Category {
  id: string;
  name: string;
  ai_instructions: string;
  availability: string;
}

interface AIConfig {
  model: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
  prompt_template: string;
}

let cachedConfig: AIConfig | null = null;
let cachedApiKey: string | null = null;

async function getOpenRouterKey(supabase: any): Promise<string | null> {
  if (cachedApiKey) return cachedApiKey;

  try {
    const { data, error } = await supabase
      .rpc('get_secret', { secret_name: 'OPENROUTER_API_KEY' });

    if (error) {
      const { data: vaultData, error: vaultError } = await supabase
        .from('decrypted_secrets')
        .select('decrypted_secret')
        .eq('name', 'OPENROUTER_API_KEY')
        .single();

      if (vaultError || !vaultData) {
        console.warn('⚠️ [FOLLOW-UP] Não foi possível buscar OPENROUTER_API_KEY do Vault');
        return null;
      }
      
      cachedApiKey = vaultData.decrypted_secret;
      return cachedApiKey;
    }

    cachedApiKey = data;
    return cachedApiKey;
  } catch (e) {
    console.error('❌ [FOLLOW-UP] Erro ao buscar API key:', e);
    return null;
  }
}

async function getAIConfig(supabase: any): Promise<AIConfig> {
  if (cachedConfig) return cachedConfig;

  const { data, error } = await supabase
    .from('ai_follow_up_config')
    .select('model, temperature, max_tokens, system_prompt, prompt_template')
    .eq('is_active', true)
    .eq('name', 'default')
    .single();

  if (error || !data) {
    console.warn('⚠️ [FOLLOW-UP] Config não encontrada, usando padrão');
    return {
      model: 'x-ai/grok-4-fast',
      temperature: 0.3,
      max_tokens: 50,
      system_prompt: 'Você é um assistente que analisa conversas e seleciona a categoria de follow-up mais apropriada.',
      prompt_template: 'Analise a conversa abaixo e escolha a categoria de follow-up mais apropriada.\n\nCONVERSA:\n{{conversation}}\n\nCATEGORIAS DISPONÍVEIS:\n{{categories}}\n\nResponda APENAS com o nome exato da categoria escolhida, sem explicações.'
    };
  }

  cachedConfig = {
    model: data.model,
    temperature: parseFloat(data.temperature) || 0.3,
    max_tokens: data.max_tokens || 50,
    system_prompt: data.system_prompt,
    prompt_template: data.prompt_template
  };

  console.log(`📋 [FOLLOW-UP] Config carregada: modelo=${cachedConfig.model}`);
  return cachedConfig;
}

/**
 * Seleciona categoria usando IA - AGORA FILTRA POR WORKSPACE
 */
async function selectCategoryWithAI(
  supabase: any,
  job: FollowUpJob
): Promise<{ categoryId: string; aiLog: any }> {
  const startTime = Date.now();
  
  try {
    const config = await getAIConfig(supabase);

    // Buscar contexto da conversa
    const { data: messages } = await supabase
      .from('messages')
      .select('text_content, message_type, created_at')
      .eq('conversation_id', job.conversation_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10);

    // ✅ CORREÇÃO: Filtrar categorias pelo workspace_id do job
    const { data: categories } = await supabase
      .from('follow_up_categories')
      .select('id, name, ai_instructions')
      .eq('workspace_id', job.workspace_id)
      .eq('is_published', true);

    if (!categories || categories.length === 0) {
      console.error(`❌ [FOLLOW-UP] Nenhuma categoria publicada para workspace ${job.workspace_id}`);
      throw new Error('No published categories found for this workspace');
    }

    // Se só tem uma categoria, usa ela
    if (categories.length === 1) {
      console.log(`📁 [FOLLOW-UP] Apenas 1 categoria disponível: ${categories[0].name}`);
      return {
        categoryId: categories[0].id,
        aiLog: {
          skipped: true,
          reason: 'single_category',
          category_name: categories[0].name,
          workspace_id: job.workspace_id,
          selected_at: new Date().toISOString()
        }
      };
    }

    const conversationContext = messages
      ?.reverse()
      .map((m: any) => `${m.message_type === 'sent' ? 'Atendente' : 'Cliente'}: ${m.text_content || '[mídia]'}`)
      .join('\n') || 'Sem mensagens';

    const categoriesDescription = categories
      .map((c: Category) => `- ${c.name}: ${c.ai_instructions}`)
      .join('\n');

    const prompt = config.prompt_template
      .replace('{{conversation}}', conversationContext)
      .replace('{{categories}}', categoriesDescription);

    const openRouterKey = await getOpenRouterKey(supabase);
    
    if (!openRouterKey) {
      console.warn('⚠️ [FOLLOW-UP] OPENROUTER_API_KEY não encontrada, usando primeira categoria');
      return {
        categoryId: categories[0].id,
        aiLog: {
          skipped: true,
          reason: 'no_api_key',
          category_name: categories[0].name,
          workspace_id: job.workspace_id,
          selected_at: new Date().toISOString()
        }
      };
    }

    console.log(`🤖 [FOLLOW-UP] Chamando IA: ${config.model}`);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: config.system_prompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: config.max_tokens,
        temperature: config.temperature
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [FOLLOW-UP] Erro OpenRouter:', errorText);
      return {
        categoryId: categories[0].id,
        aiLog: {
          error: true,
          error_message: errorText,
          fallback_category: categories[0].name,
          workspace_id: job.workspace_id,
          selected_at: new Date().toISOString()
        }
      };
    }

    const aiResult = await response.json();
    const selectedName = aiResult.choices?.[0]?.message?.content?.trim();
    const duration = Date.now() - startTime;

    console.log(`🤖 [FOLLOW-UP] IA selecionou: "${selectedName}" (${duration}ms)`);

    const selectedCategory = categories.find(
      (c: Category) => c.name.toLowerCase() === selectedName?.toLowerCase()
    );

    if (selectedCategory) {
      return {
        categoryId: selectedCategory.id,
        aiLog: {
          model: config.model,
          temperature: config.temperature,
          selected_name: selectedName,
          category_id: selectedCategory.id,
          workspace_id: job.workspace_id,
          duration_ms: duration,
          tokens_used: aiResult.usage?.total_tokens,
          selected_at: new Date().toISOString()
        }
      };
    }

    console.warn(`⚠️ [FOLLOW-UP] Categoria '${selectedName}' não encontrada, usando: ${categories[0].name}`);
    return {
      categoryId: categories[0].id,
      aiLog: {
        model: config.model,
        ai_response: selectedName,
        fallback: true,
        fallback_category: categories[0].name,
        workspace_id: job.workspace_id,
        duration_ms: duration,
        selected_at: new Date().toISOString()
      }
    };

  } catch (error: any) {
    console.error('❌ [FOLLOW-UP] Erro ao selecionar categoria:', error);
    
    // ✅ CORREÇÃO: Fallback também filtra por workspace
    const { data: categories } = await supabase
      .from('follow_up_categories')
      .select('id, name')
      .eq('workspace_id', job.workspace_id)
      .eq('is_published', true)
      .limit(1);
    
    return {
      categoryId: categories?.[0]?.id || null,
      aiLog: {
        error: true,
        error_message: error.message,
        fallback_category: categories?.[0]?.name,
        workspace_id: job.workspace_id,
        selected_at: new Date().toISOString()
      }
    };
  }
}

/**
 * Sanitiza mensagem de template removendo aspas extras
 * PROBLEMA: Templates armazenados como "Olá {nome}" são enviados com aspas
 * SOLUÇÃO: Remove aspas do início/fim E aspas internas extras
 */
function sanitizeTemplateMessage(message: string): string {
  if (!message) return message;

  let sanitized = message.trim();

  // Remove aspas duplas do início e fim (caso template tenha sido salvo com aspas)
  // Ex: "Olá {nome}, tudo bem?" -> Olá {nome}, tudo bem?
  if (sanitized.startsWith('"') && sanitized.endsWith('"')) {
    sanitized = sanitized.slice(1, -1);
  }

  // Remove aspas simples do início e fim
  // Ex: 'Olá {nome}, tudo bem?' -> Olá {nome}, tudo bem?
  if (sanitized.startsWith("'") && sanitized.endsWith("'")) {
    sanitized = sanitized.slice(1, -1);
  }

  // Remove múltiplas aspas duplas consecutivas (escape mal formatado)
  // Ex: ""Olá"" -> "Olá"
  sanitized = sanitized.replace(/""+/g, '"');

  // Remove aspas que foram escapadas incorretamente
  // Ex: \"Olá\" -> "Olá"
  sanitized = sanitized.replace(/\\"/g, '"');

  // Remove backslashes extras
  sanitized = sanitized.replace(/\\\\/g, '\\');

  return sanitized.trim();
}

async function sendFollowUpMessage(
  conversationId: string,
  messageText: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    console.log(`📤 [FOLLOW-UP] Enviando via internal-send-ai-message...`);

    const response = await fetch(`${supabaseUrl}/functions/v1/internal-send-ai-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Role-Key': serviceRoleKey,
      },
      body: JSON.stringify({
        conversationId,
        text: messageText
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ [FOLLOW-UP] Erro no envio:', result);
      return {
        success: false,
        error: result.error || `HTTP ${response.status}`
      };
    }

    console.log(`✅ [FOLLOW-UP] Mensagem enviada via provider!`);
    
    return {
      success: true,
      messageId: result.message?.id
    };

  } catch (error: any) {
    console.error('❌ [FOLLOW-UP] Erro fatal no envio:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  cachedConfig = null;
  cachedApiKey = null;
  
  console.log('🚀 [FOLLOW-UP] Processando fila de follow-ups...');

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: jobs, error: jobsError } = await supabase
      .rpc('get_ready_follow_up_jobs', { p_limit: 10 });

    if (jobsError) {
      console.error('❌ [FOLLOW-UP] Erro ao buscar jobs:', jobsError);
      throw jobsError;
    }

    if (!jobs || jobs.length === 0) {
      console.log('✅ [FOLLOW-UP] Nenhum job pronto para execução');
      return new Response(
        JSON.stringify({ 
          processed: 0, 
          message: "No jobs ready",
          duration_ms: Date.now() - startTime
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📋 [FOLLOW-UP] ${jobs.length} job(s) encontrado(s)`);
    const results: any[] = [];

    for (const job of jobs as FollowUpJob[]) {
      try {
        console.log(`\n🔄 [FOLLOW-UP] Processando job ${job.job_id.substring(0, 8)}... (workspace: ${job.workspace_id.substring(0, 8)})`);

        const { data: validation, error: valError } = await supabase
          .rpc('validate_follow_up_execution', { p_job_id: job.job_id });

        if (valError) {
          console.error('❌ [FOLLOW-UP] Erro na validação:', valError);
          throw valError;
        }

        const validationResult = validation as ValidationResult;

        if (!validationResult.valid) {
          console.log(`⏭️ [FOLLOW-UP] Job pulado: ${validationResult.reason}`);
          results.push({
            job_id: job.job_id,
            status: 'skipped',
            reason: validationResult.reason
          });
          continue;
        }

        let categoryId = job.category_id;
        let aiLog = null;
        
        if (!categoryId) {
          console.log('🤖 [FOLLOW-UP] Selecionando categoria com IA...');
          const aiResult = await selectCategoryWithAI(supabase, job);
          categoryId = aiResult.categoryId;
          aiLog = aiResult.aiLog;
          
          if (!categoryId) {
            console.error('❌ [FOLLOW-UP] Não foi possível selecionar categoria');
            results.push({
              job_id: job.job_id,
              status: 'error',
              error: 'No category available for this workspace'
            });
            continue;
          }
          
          await supabase
            .from('follow_up_jobs')
            .update({ 
              category_id: categoryId,
              ai_decision_log: aiLog,
              updated_at: new Date().toISOString()
            })
            .eq('id', job.job_id);
        }

        // ✅ CORREÇÃO: Buscar categoria com filtro de workspace
        const { data: category } = await supabase
          .from('follow_up_categories')
          .select('availability, name')
          .eq('id', categoryId)
          .eq('workspace_id', job.workspace_id)
          .single();

        if (!category) {
          console.error(`❌ [FOLLOW-UP] Categoria ${categoryId} não encontrada para workspace ${job.workspace_id}`);
          results.push({
            job_id: job.job_id,
            status: 'error',
            error: 'Category not found for this workspace'
          });
          continue;
        }

        if (category.availability === 'business_hours') {
          const { data: isBusinessHour } = await supabase
            .rpc('is_business_hours');

          if (!isBusinessHour) {
            const { data: nextHour } = await supabase
              .rpc('next_business_hour');

            await supabase
              .from('follow_up_jobs')
              .update({ 
                next_execution_at: nextHour,
                updated_at: new Date().toISOString()
              })
              .eq('id', job.job_id);

            console.log(`⏰ [FOLLOW-UP] Reagendado para horário comercial: ${nextHour}`);
            results.push({
              job_id: job.job_id,
              status: 'rescheduled',
              reason: 'outside_business_hours',
              category: category.name,
              next_execution: nextHour
            });
            continue;
          }
        }

        // ✅ CORREÇÃO: Buscar modelo com filtro de workspace
        const { data: modelData, error: modelError } = await supabase
          .rpc('get_next_follow_up_model', {
            p_category_id: categoryId,
            p_current_index: job.current_model_index,
            p_workspace_id: job.workspace_id
          });

        if (modelError) {
          console.error('❌ [FOLLOW-UP] Erro ao buscar modelo:', modelError);
          throw modelError;
        }

        const model = (modelData as ModelResult[])?.[0];
        
        if (!model) {
          await supabase
            .from('follow_up_jobs')
            .update({ 
              status: 'completed',
              completed_at: new Date().toISOString(),
              cancel_reason: 'Todos os modelos enviados',
              updated_at: new Date().toISOString()
            })
            .eq('id', job.job_id);

          console.log(`✅ [FOLLOW-UP] Job completado (sem mais modelos)`);
          results.push({
            job_id: job.job_id,
            status: 'completed',
            reason: 'no_more_models',
            category: category.name
          });
          continue;
        }

        console.log(`📝 [FOLLOW-UP] Modelo: ${model.model_name} (espera: ${model.wait_seconds}s)`);

        // ✅ SANITIZAR mensagem antes de enviar
        const sanitizedMessage = sanitizeTemplateMessage(model.message);

        const sendResult = await sendFollowUpMessage(
          job.conversation_id,
          sanitizedMessage
        );

        if (!sendResult.success) {
          console.error(`❌ [FOLLOW-UP] Falha no envio: ${sendResult.error}`);
          results.push({
            job_id: job.job_id,
            status: 'send_failed',
            error: sendResult.error,
            model: model.model_name
          });
          continue;
        }

        const messageId = sendResult.messageId;
        console.log(`✉️ [FOLLOW-UP] Mensagem enviada: ${messageId}`);

        // ✅ Salvar mensagem SANITIZADA no histórico (não a original com aspas)
        await supabase
          .from('follow_up_history')
          .insert({
            job_id: job.job_id,
            model_id: model.model_id,
            category_id: categoryId,
            conversation_id: job.conversation_id,
            message_sent: sanitizedMessage,
            message_id: messageId,
            sequence_number: job.current_model_index + 1,
            status: 'sent'
          });

        await supabase.rpc('update_follow_up_job_after_send', {
          p_job_id: job.job_id,
          p_message_id: messageId,
          p_next_model_index: model.next_index,
          p_next_wait_seconds: model.is_last ? null : model.wait_seconds,
          p_is_completed: model.is_last
        });

        const status = model.is_last ? 'completed' : 'sent';
        console.log(`${model.is_last ? '🏁' : '📤'} [FOLLOW-UP] Status: ${status}`);

        results.push({
          job_id: job.job_id,
          status: status,
          category: category.name,
          model: model.model_name,
          message_id: messageId,
          sequence: job.current_model_index + 1,
          is_last: model.is_last,
          next_wait_seconds: model.is_last ? null : model.wait_seconds,
          ai_decision: aiLog
        });

      } catch (jobError: any) {
        console.error(`❌ [FOLLOW-UP] Erro no job ${job.job_id}:`, jobError);
        results.push({
          job_id: job.job_id,
          status: 'error',
          error: jobError.message
        });
      }
    }

    const duration = Date.now() - startTime;
    const sent = results.filter(r => r.status === 'sent' || r.status === 'completed').length;
    const skipped = results.filter(r => r.status === 'skipped' || r.status === 'rescheduled').length;
    const errors = results.filter(r => r.status === 'error' || r.status === 'send_failed').length;

    console.log(`\n✅ [FOLLOW-UP] Processamento concluído em ${duration}ms`);
    console.log(`   📊 Total: ${results.length} | Enviados: ${sent} | Pulados: ${skipped} | Erros: ${errors}`);

    return new Response(
      JSON.stringify({ 
        processed: results.length,
        sent,
        skipped,
        errors,
        duration_ms: duration,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ [FOLLOW-UP] Erro fatal:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        duration_ms: Date.now() - startTime
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});