// ============================================
// 🚀 AI PROCESS CONVERSATION - v36
// 📅 Last Updated: 2024-12-08 (TESTE DE SINCRONIZAÇÃO)
// ✨ Added validations for resolved conversations and assigned attendants
// ============================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
// VERSION 42 - FIX: Get tools directly from ai_agent_system_tools table
const FUNCTION_VERSION = "v42-tools-direct";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
// ==================== LOGGER HELPER ====================
class PipelineLogger {
  supabase;
  pipelineId = null;
  isPreview = false;
  constructor(supabase, isPreview = false){
    this.supabase = supabase;
    this.isPreview = isPreview;
  }
  async start(conversationId, debouncerId, agentId, messageIds = null) {
    const { data, error } = await this.supabase.rpc("log_pipeline_start", {
      p_conversation_id: conversationId,
      p_debouncer_id: debouncerId,
      p_agent_id: agentId,
      p_message_ids: messageIds
    });
    if (error) {
      console.error("[Logger] Error starting pipeline:", error);
      return null;
    }
    this.pipelineId = data;
    const mode = this.isPreview ? "[PREVIEW]" : "[PRODUCTION]";
    console.log(`[Logger] ${mode} Pipeline started:`, this.pipelineId);
    return this.pipelineId;
  }
  async step(stepKey, stepName, stepIcon, status, statusMessage, config = null, inputSummary = null, inputData = null, outputSummary = null, outputData = null, tokensInput = null, tokensOutput = null, durationMs = null, errorMessage = null) {
    if (!this.pipelineId) return null;
    const finalStatusMessage = this.isPreview ? `[PREVIEW] ${statusMessage}` : statusMessage;
    const { data, error } = await this.supabase.rpc("log_pipeline_step", {
      p_pipeline_id: this.pipelineId,
      p_step_key: stepKey,
      p_step_name: stepName,
      p_step_icon: stepIcon,
      p_status: status,
      p_status_message: finalStatusMessage,
      p_config: config,
      p_input_summary: inputSummary,
      p_input_data: inputData,
      p_output_summary: outputSummary,
      p_output_data: outputData,
      p_tokens_input: tokensInput,
      p_tokens_output: tokensOutput,
      p_duration_ms: durationMs,
      p_error_message: errorMessage
    });
    if (error) console.error("[Logger] Error logging step:", error);
    return data;
  }
  async complete(status, statusMessage = null, responseText = null, responseSent = false, providerMessageId = null, errorMessage = null, errorStep = null) {
    if (!this.pipelineId) {
      console.error("[Logger] Cannot complete - no pipeline ID");
      return false;
    }
    const finalStatusMessage = this.isPreview ? `[PREVIEW] ${statusMessage}` : statusMessage;
    console.log(`[Logger] Completing pipeline ${this.pipelineId} with status: ${status}`);
    const { data, error } = await this.supabase.rpc("log_pipeline_complete", {
      p_pipeline_id: this.pipelineId,
      p_status: status,
      p_status_message: finalStatusMessage,
      p_response_text: responseText,
      p_response_sent: responseSent,
      p_provider_message_id: providerMessageId,
      p_error_message: errorMessage,
      p_error_step: errorStep
    });
    if (error) {
      console.error("[Logger] Error completing pipeline:", error);
      return false;
    }
    console.log(`[Logger] Pipeline completed successfully, result:`, data);
    return true;
  }
  getPipelineId() {
    return this.pipelineId;
  }
}

// ==================== GET AGENT TOOLS DIRECTLY ====================
// Busca tools diretamente das tabelas ai_system_tools e ai_agent_system_tools
// Substitui a RPC get_agent_tools que usava tabela errada
async function getAgentToolsDirect(supabase: any, agentId: string) {
  // Buscar tools habilitadas para este agente
  const { data: agentTools, error } = await supabase
    .from('ai_agent_system_tools')
    .select(`
      system_tool_id,
      is_enabled,
      ai_system_tools (
        id,
        name,
        description,
        category,
        is_active
      )
    `)
    .eq('agent_id', agentId)
    .eq('is_enabled', true);

  if (error) {
    console.error('[Tools] Error fetching agent tools:', error);
    return [];
  }

  if (!agentTools || agentTools.length === 0) {
    console.log('[Tools] No tools enabled for this agent');
    return [];
  }

  // Construir tools no formato OpenAI/OpenRouter
  const tools: any[] = [];

  for (const at of agentTools) {
    const st = at.ai_system_tools;
    if (!st || !st.is_active) continue;

    switch (st.name) {
      case 'transferir_para_humano':
        tools.push({
          type: 'function',
          function: {
            name: 'transferir_para_humano',
            description: 'Transfere a conversa para um atendente humano quando o cliente solicita ou em situações que exigem atenção humana. Use quando: cliente pede explicitamente, reclamação grave, situação complexa, cliente muito insatisfeito.',
            parameters: {
              type: 'object',
              properties: {
                motivo: { type: 'string', description: 'Motivo claro da transferência' },
                resumo_conversa: { type: 'string', description: 'Resumo breve do que foi conversado' },
                prioridade: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'], description: 'Urgência da transferência' }
              },
              required: ['motivo', 'resumo_conversa']
            }
          }
        });
        break;

      case 'finalizar_atendimento':
        tools.push({
          type: 'function',
          function: {
            name: 'finalizar_atendimento',
            description: 'Marca o atendimento como concluído quando a demanda do cliente foi totalmente resolvida.',
            parameters: {
              type: 'object',
              properties: {
                resumo: { type: 'string', description: 'Resumo do que foi resolvido no atendimento' }
              },
              required: ['resumo']
            }
          }
        });
        break;

      case 'atualizar_crm':
        tools.push({
          type: 'function',
          function: {
            name: 'atualizar_crm',
            description: 'Atualiza informações do lead no CRM quando o cliente fornece dados importantes.',
            parameters: {
              type: 'object',
              properties: {
                campo: { type: 'string', description: 'Campo a atualizar (empresa, cargo, email, telefone)' },
                valor: { type: 'string', description: 'Novo valor para o campo' },
                observacao: { type: 'string', description: 'Observação adicional (opcional)' }
              },
              required: ['campo', 'valor']
            }
          }
        });
        break;

      case 'agendar_reuniao':
        tools.push({
          type: 'function',
          function: {
            name: 'agendar_reuniao',
            description: 'Agenda uma reunião ou compromisso no calendário. Use quando o cliente quiser marcar reunião, visita ou demonstração.',
            parameters: {
              type: 'object',
              properties: {
                titulo: { type: 'string', description: 'Título do evento' },
                data: { type: 'string', description: 'Data (YYYY-MM-DD)' },
                hora_inicio: { type: 'string', description: 'Hora início (HH:MM)' },
                hora_fim: { type: 'string', description: 'Hora fim (HH:MM)' },
                descricao: { type: 'string', description: 'Descrição ou notas (opcional)' }
              },
              required: ['titulo', 'data', 'hora_inicio', 'hora_fim']
            }
          }
        });
        break;

      case 'consultar_disponibilidade':
        tools.push({
          type: 'function',
          function: {
            name: 'consultar_disponibilidade',
            description: 'Consulta horários disponíveis no calendário para agendamento.',
            parameters: {
              type: 'object',
              properties: {
                data: { type: 'string', description: 'Data (YYYY-MM-DD)' },
                periodo: { type: 'string', enum: ['manha', 'tarde', 'dia_todo'], description: 'Período do dia' }
              },
              required: ['data']
            }
          }
        });
        break;

      case 'enviar_documento':
        tools.push({
          type: 'function',
          function: {
            name: 'enviar_documento',
            description: 'Envia um documento ou arquivo para o cliente.',
            parameters: {
              type: 'object',
              properties: {
                tipo_documento: { type: 'string', enum: ['catalogo', 'proposta', 'contrato', 'apresentacao', 'outro'], description: 'Tipo de documento' },
                nome_documento: { type: 'string', description: 'Nome específico (opcional)' },
                mensagem: { type: 'string', description: 'Mensagem para acompanhar (opcional)' }
              },
              required: ['tipo_documento']
            }
          }
        });
        break;
    }
  }

  console.log(`[Tools] Loaded ${tools.length} tools for agent ${agentId}`);
  return tools;
}

// ==================== AUTO CRM LEAD CREATION ====================
async function createLeadIfNeeded(supabase, conversationId, agentId, crmAutoConfig, logger) {
  const stepStart = Date.now();
  try {
    if (!crmAutoConfig || crmAutoConfig.enabled !== true) {
      console.log(`[CRM Auto] Disabled for this agent`);
      return { created: false, leadId: null, reason: "disabled" };
    }
    if (!crmAutoConfig.funnel_id || !crmAutoConfig.column_id) {
      console.log(`[CRM Auto] Missing funnel_id or column_id`);
      await logger.step("crm_auto", "Criação Automática de Lead", "📋", "skipped", "⚠️ Funil ou coluna não configurados", { enabled: true, funnel_id: crmAutoConfig.funnel_id, column_id: crmAutoConfig.column_id }, null, null, "Configuração incompleta", null, 0, 0, Date.now() - stepStart);
      return { created: false, leadId: null, reason: "missing_config" };
    }
    const { data: leadId, error } = await supabase.rpc("create_lead_from_conversation", { p_conversation_id: conversationId, p_agent_id: agentId });
    if (error) {
      console.error(`[CRM Auto] Error creating lead:`, error);
      await logger.step("crm_auto", "Criação Automática de Lead", "📋", "error", "❌ Erro ao criar lead", crmAutoConfig, "Conversa: " + conversationId, null, null, null, 0, 0, Date.now() - stepStart, error.message);
      return { created: false, leadId: null, reason: "error", error: error.message };
    }
    if (!leadId) {
      console.log(`[CRM Auto] Lead already exists for this conversation`);
      return { created: false, leadId: null, reason: "already_exists" };
    }
    console.log(`[CRM Auto] Lead created successfully: ${leadId}`);
    await logger.step("crm_auto", "Criação Automática de Lead", "📋", "success", "✅ Lead criado automaticamente no CRM", { funnel_id: crmAutoConfig.funnel_id, column_id: crmAutoConfig.column_id }, "Conversa: " + conversationId, null, "Lead vinculado ao funil", { lead_id: leadId, funnel_id: crmAutoConfig.funnel_id, column_id: crmAutoConfig.column_id }, 0, 0, Date.now() - stepStart);
    return { created: true, leadId, reason: "created" };
  } catch (error) {
    console.error(`[CRM Auto] Unexpected error:`, error);
    return { created: false, leadId: null, reason: "exception", error: error.message };
  }
}
// ==================== SMART ATTENDANT SELECTION ====================
async function selectBestAttendant(supabase, openrouterApiKey, agentId, conversationContext, logger) {
  const stepStart = Date.now();
  try {
    const { data: attendants, error: attError } = await supabase.rpc("get_agent_attendants", { p_agent_id: agentId });
    if (attError || !attendants || attendants.length === 0) {
      console.log("[SmartTransfer] No attendants configured");
      await logger.step("attendant_selection", "Seleção de Atendente", "👤", "skipped", "⚠️ Nenhum atendente configurado", { agent_id: agentId }, null, null, "Transferência genérica", null, 0, 0, Date.now() - stepStart);
      return { selected: null, reason: "no_attendants" };
    }
    console.log(`[SmartTransfer] Found ${attendants.length} attendants`);
    if (attendants.length === 1) {
      const att = attendants[0];
      await logger.step("attendant_selection", "Seleção de Atendente", "👤", "success", `✅ Atendente único: ${att.user_name}`, { attendants_count: 1 }, null, null, `Selecionado: ${att.user_name}`, { selected_id: att.user_id, selected_name: att.user_name }, 0, 0, Date.now() - stepStart);
      return { selected: att, reason: "single_attendant" };
    }
    const attendantOptions = attendants.map((a, idx) => ({ index: idx + 1, name: a.user_name, user_id: a.user_id, trigger_conditions: a.trigger_conditions || "Sem condição específica" }));
    const selectionPrompt = `Você é um roteador de atendimento. Analise o contexto da conversa e escolha o melhor atendente.\n\nCONTEXTO DA CONVERSA:\n${conversationContext}\n\nATENDENTES DISPONÍVEIS:\n${attendantOptions.map((a) => `${a.index}. ${a.name}\n   Condição: ${a.trigger_conditions}`).join("\n\n")}\n\nResponda APENAS com JSON:\n{"selected_index": <número>, "reasoning": "<breve justificativa>"}`;
    const llmResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + openrouterApiKey },
      body: JSON.stringify({ model: "openai/gpt-4o-mini", messages: [{ role: "user", content: selectionPrompt }], max_tokens: 150, temperature: 0.1 })
    });
    if (!llmResponse.ok) {
      const fallback = attendants[0];
      await logger.step("attendant_selection", "Seleção de Atendente", "👤", "warning", `⚠️ Erro na IA, usando primeiro: ${fallback.user_name}`, { attendants_count: attendants.length }, null, null, `Fallback: ${fallback.user_name}`, { selected_id: fallback.user_id }, 0, 0, Date.now() - stepStart);
      return { selected: fallback, reason: "ai_error_fallback" };
    }
    const result = await llmResponse.json();
    const responseText = result.choices[0]?.message?.content || "";
    const tokensIn = result.usage?.prompt_tokens || 0;
    const tokensOut = result.usage?.completion_tokens || 0;
    let selectedIndex = 1;
    let reasoning = "";
    try {
      const cleanResponse = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleanResponse);
      selectedIndex = parsed.selected_index || 1;
      reasoning = parsed.reasoning || "";
    } catch (e) { selectedIndex = 1; }
    const selectedAtt = attendants[Math.min(selectedIndex - 1, attendants.length - 1)];
    await logger.step("attendant_selection", "Seleção de Atendente", "👤", "success", `✅ IA selecionou: ${selectedAtt.user_name}`, { attendants_count: attendants.length, model: "gpt-4o-mini" }, `Contexto: ${conversationContext.substring(0, 100)}...`, { attendants: attendantOptions }, `${selectedAtt.user_name} - ${reasoning}`, { selected_id: selectedAtt.user_id, selected_name: selectedAtt.user_name, reasoning }, tokensIn, tokensOut, Date.now() - stepStart);
    return { selected: selectedAtt, reason: "ai_selected", tokensUsed: tokensIn + tokensOut };
  } catch (error) {
    console.error("[SmartTransfer] Error:", error);
    await logger.step("attendant_selection", "Seleção de Atendente", "👤", "error", "❌ Erro na seleção", null, null, null, null, null, 0, 0, Date.now() - stepStart, error.message);
    return { selected: null, reason: "error", error: error.message };
  }
}
// ==================== GUARDRAIL COM IA (GLOBAL) ====================
async function checkGuardrailWithAI(supabase, openrouterApiKey, messages, logger) {
  const stepStart = Date.now();
  try {
    const { data: guardrailConfig, error: configError } = await supabase.from("ai_guardrail_config").select("*").eq("is_active", true).single();
    if (configError || !guardrailConfig) {
      console.log("[Guardrail] No global config found, allowing all");
      await logger.step("guardrail", "Validação de Segurança", "🛡️", "skipped", "ℹ️ Guardrail não configurado - permitindo conversa", { configured: false }, null, null, "Sem configuração de guardrail ativa", { enable_conversation: true, enable_response: true }, 0, 0, Date.now() - stepStart);
      return { enable_conversation: true, enable_response: true, context_summary: "Guardrail não configurado", tokensUsed: 0 };
    }
    const historico = messages.map((msg) => ({ tipo: msg.message_type === "received" ? "cliente" : "assistente", conteudo: (msg.text_content || msg.transcription || "").substring(0, 500) }));
    const lastClientMessage = messages.filter((m) => m.message_type === "received").pop();
    const lastClientText = lastClientMessage?.text_content || lastClientMessage?.transcription || "";
    console.log(`[Guardrail] Using model from DB: ${guardrailConfig.model}`);
    const guardrailResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + openrouterApiKey },
      body: JSON.stringify({ model: guardrailConfig.model || "openai/gpt-4o-mini", messages: [{ role: "system", content: guardrailConfig.system_prompt }, { role: "user", content: JSON.stringify({ historico }, null, 2) }], max_tokens: guardrailConfig.max_tokens || 500, temperature: parseFloat(guardrailConfig.temperature) || 0.2 })
    });
    if (!guardrailResponse.ok) {
      const error = await guardrailResponse.text();
      console.error("[Guardrail] API error:", error);
      await logger.step("guardrail", "Validação de Segurança", "🛡️", "error", "⚠️ Erro na API do Guardrail - permitindo conversa", { model: guardrailConfig.model }, "Mensagem: " + lastClientText.substring(0, 50), null, null, null, 0, 0, Date.now() - stepStart, error.substring(0, 200));
      return { enable_conversation: true, enable_response: true, context_summary: "Erro no guardrail - fallback para permitir", tokensUsed: 0 };
    }
    const guardrailResult = await guardrailResponse.json();
    const responseText = guardrailResult.choices[0]?.message?.content || "";
    const tokensIn = guardrailResult.usage?.prompt_tokens || 0;
    const tokensOut = guardrailResult.usage?.completion_tokens || 0;
    const totalTokens = tokensIn + tokensOut;
    let analysisResult = { enable_conversation: true, enable_response: true, context_summary: "Análise concluída" };
    try {
      const cleanResponse = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      analysisResult = JSON.parse(cleanResponse);
    } catch (parseError) {
      analysisResult = { enable_conversation: true, enable_response: true, context_summary: "Erro no parse da análise - permitindo conversa" };
    }
    let stepStatus = "success";
    let stepMessage = "✅ Mensagem aprovada";
    if (!analysisResult.enable_conversation) {
      stepStatus = "blocked";
      stepMessage = "🚫 Conversa bloqueada: " + (analysisResult.context_summary || "Violação detectada");
    } else if (!analysisResult.enable_response) {
      stepStatus = "warning";
      stepMessage = "⏸️ Aguardando: " + (analysisResult.context_summary || "Mensagem automática detectada");
    }
    await logger.step("guardrail", "Validação de Segurança", "🛡️", stepStatus, stepMessage, { model: guardrailConfig.model, temperature: guardrailConfig.temperature, global_config: true }, "Mensagem: " + lastClientText.substring(0, 100), { historico_length: historico.length, last_client_message: lastClientText.substring(0, 200) }, analysisResult.context_summary, { enable_conversation: analysisResult.enable_conversation, enable_response: analysisResult.enable_response, context_summary: analysisResult.context_summary }, tokensIn, tokensOut, Date.now() - stepStart);
    return { enable_conversation: analysisResult.enable_conversation, enable_response: analysisResult.enable_response, context_summary: analysisResult.context_summary, tokensUsed: totalTokens };
  } catch (error) {
    console.error("[Guardrail] Unexpected error:", error);
    await logger.step("guardrail", "Validação de Segurança", "🛡️", "error", "❌ Erro inesperado no Guardrail", null, null, null, null, null, 0, 0, Date.now() - stepStart, error.message);
    return { enable_conversation: true, enable_response: true, context_summary: "Erro inesperado - permitindo conversa", tokensUsed: 0 };
  }
}
// ==================== GERAR RESPOSTA DE VIOLAÇÃO DE POLÍTICA ====================
async function generatePolicyViolationResponse(supabase, openrouterApiKey, agent, violationReason, logger) {
  const stepStart = Date.now();
  try {
    console.log(`[PolicyViolation] Generating farewell message for violation: ${violationReason}`);
    const systemPrompt = agent.system_prompt || "Você é um assistente profissional.";
    const model = agent.model || "anthropic/claude-3.5-sonnet";
    const userInput = `O cliente violou nossas políticas de conversa da empresa.\n\nMotivo da violação: ${violationReason}\n\nGere uma mensagem CURTA e EDUCADA finalizando o atendimento. A mensagem deve:\n1. Ser profissional e respeitosa\n2. Informar que não podemos continuar o atendimento devido às nossas políticas\n3. Não ser agressiva ou acusatória\n4. Ter no máximo 2-3 frases\n\nResponda APENAS com a mensagem de despedida, sem explicações adicionais.`;
    const llmResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + openrouterApiKey },
      body: JSON.stringify({ model, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userInput }], max_tokens: 150, temperature: 0.5 })
    });
    if (!llmResponse.ok) {
      const error = await llmResponse.text();
      console.error("[PolicyViolation] LLM error:", error);
      await logger.step("policy_response", "Geração de Despedida", "👋", "error", "❌ Erro ao gerar mensagem de despedida", { model }, "Violação: " + violationReason.substring(0, 50), null, null, null, 0, 0, Date.now() - stepStart, error.substring(0, 200));
      return { response: "Infelizmente, não podemos continuar este atendimento devido às nossas políticas de conversa. Obrigado pela compreensão.", tokensUsed: 0 };
    }
    const result = await llmResponse.json();
    const responseText = result.choices[0]?.message?.content || "";
    const tokensIn = result.usage?.prompt_tokens || 0;
    const tokensOut = result.usage?.completion_tokens || 0;
    await logger.step("policy_response", "Geração de Despedida", "👋", "success", "✅ Mensagem de despedida gerada", { model, max_tokens: 150, temperature: 0.5, no_rag: true, no_orchestrator: true }, "Violação: " + violationReason.substring(0, 100), { violation_reason: violationReason }, "Resposta com " + responseText.length + " caracteres", { response_preview: responseText.substring(0, 200) }, tokensIn, tokensOut, Date.now() - stepStart);
    return { response: responseText, tokensUsed: tokensIn + tokensOut };
  } catch (error) {
    console.error("[PolicyViolation] Unexpected error:", error);
    await logger.step("policy_response", "Geração de Despedida", "👋", "error", "❌ Erro inesperado", null, null, null, null, null, 0, 0, Date.now() - stepStart, error.message);
    return { response: "Infelizmente, não podemos continuar este atendimento devido às nossas políticas de conversa. Obrigado pela compreensão.", tokensUsed: 0 };
  }
}
// ==================== FRACIONAR MENSAGEM COM IA ====================
async function splitMessageWithAI(supabase, openrouterApiKey, message, logger) {
  const stepStart = Date.now();
  const DEFAULT_CONFIG = { model: "openai/gpt-4o-mini", temperature: 0.1, max_tokens: 1000, min_chars_to_split: 150, delay_between_messages: 500, system_prompt: "Você é um separador de texto. Divida em partes menores. Responda apenas JSON: {\"messages\": [\"parte1\", \"parte2\"]}" };
  let splitterConfig = null;
  try {
    const result = await supabase.from("ai_message_splitter_config").select("*").eq("is_active", true).single();
    if (!result.error) splitterConfig = result.data;
  } catch (err) { console.error(`[MessageSplit] Exception:`, err); }
  const modelToUse = splitterConfig?.model || DEFAULT_CONFIG.model;
  const minChars = splitterConfig?.min_chars_to_split || DEFAULT_CONFIG.min_chars_to_split;
  const delayMs = splitterConfig?.delay_between_messages || DEFAULT_CONFIG.delay_between_messages;
  const maxTokens = splitterConfig?.max_tokens || DEFAULT_CONFIG.max_tokens;
  const temperature = parseFloat(splitterConfig?.temperature || DEFAULT_CONFIG.temperature) || 0.1;
  const systemPrompt = splitterConfig?.system_prompt || DEFAULT_CONFIG.system_prompt;
  if (message.length < minChars) {
    await logger.step("message_split", "Fracionamento de Mensagens", "✂️", "skipped", "ℹ️ Mensagem curta - sem necessidade de fracionar", { message_length: message.length, min_required: minChars }, "Mensagem com " + message.length + " caracteres", null, "Mensagem enviada como única parte", { parts: 1 }, 0, 0, Date.now() - stepStart);
    return { messages: [message], tokensUsed: 0, delayMs };
  }
  try {
    const llmResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + openrouterApiKey },
      body: JSON.stringify({ model: modelToUse, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: message }], max_tokens: maxTokens, temperature })
    });
    if (!llmResponse.ok) {
      await logger.step("message_split", "Fracionamento de Mensagens", "✂️", "error", "⚠️ Erro na API", { model: modelToUse }, null, null, "Fallback: mensagem única", { parts: 1 }, 0, 0, Date.now() - stepStart);
      return { messages: [message], tokensUsed: 0, delayMs };
    }
    const result = await llmResponse.json();
    const responseText = result.choices[0]?.message?.content || "";
    const tokensIn = result.usage?.prompt_tokens || 0;
    const tokensOut = result.usage?.completion_tokens || 0;
    let splitMessages = [message];
    try {
      const cleanResponse = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleanResponse);
      if (parsed.messages && Array.isArray(parsed.messages) && parsed.messages.length > 0) {
        splitMessages = parsed.messages.filter((m) => m && m.trim().length > 0);
        if (splitMessages.length === 0) splitMessages = [message];
      }
    } catch (parseError) { splitMessages = [message]; }
    await logger.step("message_split", "Fracionamento de Mensagens", "✂️", "success", `✂️ Mensagem dividida em ${splitMessages.length} parte(s)`, { model: modelToUse, temperature, original_length: message.length, delay_ms: delayMs }, "Mensagem original: " + message.length + " caracteres", null, "Dividido em " + splitMessages.length + " partes", { parts: splitMessages.length }, tokensIn, tokensOut, Date.now() - stepStart);
    return { messages: splitMessages, tokensUsed: tokensIn + tokensOut, delayMs };
  } catch (error) {
    await logger.step("message_split", "Fracionamento de Mensagens", "✂️", "error", "❌ Erro inesperado", null, null, null, "Fallback: mensagem única", { parts: 1 }, 0, 0, Date.now() - stepStart, error.message);
    return { messages: [message], tokensUsed: 0, delayMs: 500 };
  }
}
// ==================== ORCHESTRATOR ====================
async function callOrchestrator(supabase, openrouterApiKey, agentId, messages, allSpecialists, logger) {
  const stepStart = Date.now();
  try {
    const inboundSpecialist = allSpecialists.find((s) => s.type === 'inbound');
    const outboundSpecialist = allSpecialists.find((s) => s.type === 'outbound');
    const customSpecialists = allSpecialists.filter((s) => s.type === 'custom');
    const firstMessage = messages[0];
    const isInbound = firstMessage?.message_type === 'received';
    const conversationType = isInbound ? 'inbound' : 'outbound';
    let directionSpecialist = null;
    if (isInbound && inboundSpecialist) directionSpecialist = inboundSpecialist;
    else if (!isInbound && outboundSpecialist) directionSpecialist = outboundSpecialist;
    if (customSpecialists.length === 0) {
      const selectedSpecialists = directionSpecialist ? [directionSpecialist] : [];
      await logger.step("orchestrator", "Orquestrador", "🧠", selectedSpecialists.length > 0 ? "success" : "skipped", selectedSpecialists.length > 0 ? `🎯 ${conversationType.toUpperCase()} selecionado: ${directionSpecialist?.name}` : "ℹ️ Nenhum especialista aplicável", { conversation_type: conversationType, has_direction: !!directionSpecialist, custom_count: 0, used_ai: false }, null, null, selectedSpecialists.length > 0 ? `Usando: ${selectedSpecialists.map((s) => s.name).join(', ')}` : "Sem especialistas", { selected: selectedSpecialists.map((s) => ({ name: s.name, type: s.type })) }, 0, 0, Date.now() - stepStart);
      return { selectedSpecialists, context_summary: directionSpecialist ? `Conversa ${conversationType} - ${directionSpecialist.description}` : "", tokensUsed: 0 };
    }
    const { data: orchestratorConfig, error: orchError } = await supabase.from("ai_orchestrator_config").select("*").eq("is_active", true).single();
    if (orchError || !orchestratorConfig) {
      const selectedSpecialists = directionSpecialist ? [directionSpecialist] : [];
      await logger.step("orchestrator", "Orquestrador", "🧠", "skipped", "ℹ️ Orquestrador não configurado", { used_ai: false }, null, null, null, null, 0, 0, Date.now() - stepStart);
      return { selectedSpecialists, context_summary: directionSpecialist ? `Conversa ${conversationType}` : "", tokensUsed: 0 };
    }
    const modelToUse = orchestratorConfig.model;
    const recentMessages = messages.slice(-10);
    const orchestratorInput = { tipo_conversa: conversationType, total_mensagens: messages.length, historico: recentMessages.map((msg, idx) => ({ mensagem: idx + 1, tipo: msg.message_type === "received" ? "cliente" : "empresa", conteudo: (msg.text_content || msg.transcription || "").substring(0, 200) })), especialistas_disponiveis: customSpecialists.map((s) => ({ id: s.function_key, nome: s.name, descricao: s.description })) };
    const maxCustom = directionSpecialist ? 2 : 3;
    let orchestratorPrompt = orchestratorConfig.system_prompt || "";
    orchestratorPrompt = orchestratorPrompt.replace(/\{\{MAX_SPECIALISTS\}\}/g, String(maxCustom)).replace(/\{\{CONVERSATION_TYPE\}\}/g, conversationType);
    const orchestratorResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + openrouterApiKey },
      body: JSON.stringify({ model: modelToUse, messages: [{ role: "system", content: orchestratorPrompt }, { role: "user", content: JSON.stringify(orchestratorInput, null, 2) }], max_tokens: orchestratorConfig.max_tokens || 500, temperature: parseFloat(orchestratorConfig.temperature) || 0.3 })
    });
    if (!orchestratorResponse.ok) {
      const selectedSpecialists = directionSpecialist ? [directionSpecialist] : [];
      await logger.step("orchestrator", "Orquestrador", "🧠", "error", "❌ Erro na API", { model: modelToUse }, null, null, null, null, 0, 0, Date.now() - stepStart);
      return { selectedSpecialists, context_summary: "", tokensUsed: 0 };
    }
    const orchestratorResult = await orchestratorResponse.json();
    const responseText = orchestratorResult.choices[0]?.message?.content || "";
    const tokensIn = orchestratorResult.usage?.prompt_tokens || 0;
    const tokensOut = orchestratorResult.usage?.completion_tokens || 0;
    let selectedCustomIds = [];
    let reasoning = "";
    try {
      const cleanResponse = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleanResponse);
      selectedCustomIds = parsed.selected_specialists || parsed.especialistas_selecionados || [];
      reasoning = parsed.reasoning || parsed.justificativa || "";
    } catch (parseError) { selectedCustomIds = []; }
    const selectedCustomSpecialists = selectedCustomIds.slice(0, maxCustom).map((id) => customSpecialists.find((s) => s.function_key === id)).filter(Boolean);
    const finalSelectedSpecialists = [];
    if (directionSpecialist) finalSelectedSpecialists.push(directionSpecialist);
    finalSelectedSpecialists.push(...selectedCustomSpecialists);
    const limitedSpecialists = finalSelectedSpecialists.slice(0, 3);
    const contextParts = [];
    if (directionSpecialist) contextParts.push(`Conversa ${conversationType}: ${directionSpecialist.description}`);
    if (selectedCustomSpecialists.length > 0) contextParts.push(`Especialistas: ${selectedCustomSpecialists.map((s) => s.name).join(', ')}`);
    if (reasoning) contextParts.push(`Análise: ${reasoning}`);
    await logger.step("orchestrator", "Orquestrador", "🧠", "success", `🎯 ${limitedSpecialists.length} especialista(s) selecionado(s)`, { model: modelToUse, conversation_type: conversationType, direction_specialist: directionSpecialist?.name || null, custom_selected: selectedCustomSpecialists.map((s) => s.name), used_ai: true }, null, null, `Selecionados: ${limitedSpecialists.map((s) => `${s.name}(${s.type})`).join(', ')}`, { selected: limitedSpecialists.map((s) => ({ name: s.name, type: s.type })), reasoning }, tokensIn, tokensOut, Date.now() - stepStart);
    return { selectedSpecialists: limitedSpecialists, context_summary: contextParts.join(' | '), tokensUsed: tokensIn + tokensOut };
  } catch (error) {
    console.error("[Orchestrator] Error:", error);
    await logger.step("orchestrator", "Orquestrador", "🧠", "error", "❌ Erro inesperado", null, null, null, null, null, 0, 0, Date.now() - stepStart, error.message);
    return { selectedSpecialists: [], context_summary: "", tokensUsed: 0 };
  }
}
// ==================== RAG SEARCH ====================
async function searchRAG(supabase, agentId, query, logger) {
  const stepStart = Date.now();
  const ragModel = "gemini-2.5-flash";
  try {
    if (!GEMINI_API_KEY) {
      await logger.step("rag", "Base de Conhecimento (RAG)", "📚", "skipped", "ℹ️ API Key do Gemini não configurada", { model: ragModel }, null, null, "RAG desabilitado", null, 0, 0, Date.now() - stepStart);
      return { context: null, chunksFound: 0, tokensUsed: 0 };
    }
    const { data: collection, error: collError } = await supabase.from("ai_rag_collections").select("external_store_id, total_documents, name").eq("agent_id", agentId).eq("is_active", true).single();
    if (collError || !collection?.external_store_id) {
      await logger.step("rag", "Base de Conhecimento (RAG)", "📚", "skipped", "ℹ️ Nenhuma base de conhecimento configurada", { model: ragModel }, "Busca: " + query.substring(0, 100), null, "Sem coleção ativa", null, 0, 0, Date.now() - stepStart);
      return { context: null, chunksFound: 0, tokensUsed: 0 };
    }
    if (collection.total_documents === 0) {
      await logger.step("rag", "Base de Conhecimento (RAG)", "📚", "skipped", "ℹ️ Base de conhecimento vazia", { model: ragModel, collection: collection.name }, null, null, "Coleção sem documentos", null, 0, 0, Date.now() - stepStart);
      return { context: null, chunksFound: 0, tokensUsed: 0 };
    }
    const requestBody = { contents: [{ parts: [{ text: query }] }], tools: [{ file_search: { file_search_store_names: [collection.external_store_id] } }] };
    const response = await fetch(`${GEMINI_BASE_URL}/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });
    if (!response.ok) {
      const error = await response.text();
      await logger.step("rag", "Base de Conhecimento (RAG)", "📚", "error", "❌ Erro na busca", { model: ragModel }, null, null, null, null, 0, 0, Date.now() - stepStart, error.substring(0, 500));
      return { context: null, chunksFound: 0, tokensUsed: 0 };
    }
    const result = await response.json();
    const groundingChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const usageMetadata = result.usageMetadata || {};
    const ragTokensIn = usageMetadata.promptTokenCount || 0;
    const ragTokensOut = usageMetadata.candidatesTokenCount || 0;
    if (groundingChunks.length === 0) {
      await logger.step("rag", "Base de Conhecimento (RAG)", "📚", "success", "📭 Nenhum documento relevante", { model: ragModel, collection: collection.name }, "Busca: " + query.substring(0, 100), null, "Busca sem resultados", { chunks_found: 0 }, ragTokensIn, ragTokensOut, Date.now() - stepStart);
      return { context: null, chunksFound: 0, tokensUsed: ragTokensIn + ragTokensOut };
    }
    const ragContext = groundingChunks.slice(0, 3).map((chunk) => { const text = chunk.retrievedContext?.text || chunk.text || ""; const title = chunk.retrievedContext?.title || "Documento"; return `[${title}]:\n${text.substring(0, 800)}`; }).join("\n\n");
    const sources = groundingChunks.slice(0, 3).map((c) => c.retrievedContext?.title || "Documento");
    await logger.step("rag", "Base de Conhecimento (RAG)", "📚", "success", `📖 ${groundingChunks.length} documento(s) encontrado(s)`, { model: ragModel, collection: collection.name }, "Busca: " + query.substring(0, 100), null, "Fontes: " + sources.join(", "), { chunks_found: groundingChunks.length, sources }, ragTokensIn, ragTokensOut, Date.now() - stepStart);
    return { context: ragContext, chunksFound: groundingChunks.length, tokensUsed: ragTokensIn + ragTokensOut };
  } catch (error) {
    await logger.step("rag", "Base de Conhecimento (RAG)", "📚", "error", "❌ Erro inesperado", { model: ragModel }, null, null, null, null, 0, 0, Date.now() - stepStart, error.message);
    return { context: null, chunksFound: 0, tokensUsed: 0 };
  }
}
// ==================== TOOL EXECUTION (FIXED v35) ====================
async function executeSystemTool(supabase, openrouterApiKey, toolName, args, context, isPreview, logger) {
  const previewPrefix = isPreview ? "[PREVIEW] " : "";
  switch(toolName) {
    case "transferir_para_humano": {
      const stepStart = Date.now();
      // 1. Montar contexto da conversa para seleção
      const conversationContext = `Motivo da transferência: ${args.motivo || 'Não especificado'}\nResumo: ${args.resumo_conversa || 'Sem resumo'}\nPrioridade: ${args.prioridade || 'normal'}`;
      // 2. Selecionar melhor atendente
      const selectionResult = await selectBestAttendant(supabase, openrouterApiKey, context.agentId, conversationContext, logger);
      let messageToCustomer = "Um momento, vou transferir você para um de nossos especialistas.";
      let messageToAttendant = "Você foi solicitado para atender um novo lead.";
      let attendantName = "atendente humano";
      let attendantId = null;
      if (selectionResult.selected) {
        attendantId = selectionResult.selected.user_id;
        attendantName = selectionResult.selected.user_name || "atendente";
        messageToCustomer = selectionResult.selected.message_to_customer || messageToCustomer;
        messageToAttendant = selectionResult.selected.message_to_attendant || messageToAttendant;
      }
      // 3. Executar transferência via função SQL
      const { data: transferResult, error: transferError } = await supabase.rpc("transfer_conversation_to_human", {
        p_conversation_id: context.conversationId,
        p_attendant_user_id: attendantId,
        p_reason: args.motivo,
        p_context_summary: args.resumo_conversa,
        p_message_to_customer: messageToCustomer,
        p_message_to_attendant: messageToAttendant
      });
      // v35 FIX: Check BOTH RPC error AND success field in result
      if (transferError || !transferResult?.success) {
        const errorMsg = transferError?.message || transferResult?.error || "Erro desconhecido na transferência";
        console.error("[Transfer] Error:", errorMsg);
        // Fallback: atualização simples
        await supabase.from("conversations").update({ attendant_type: "human", status: "waiting" }).eq("id", context.conversationId);
        await supabase.from("ai_conversation_sessions").update({ status: "transferred", end_reason: args.motivo, context_summary: args.resumo_conversa, ended_at: new Date().toISOString() }).eq("id", context.sessionId);
        await logger.step("tool_transferir_para_humano", "Transferência para Humano", "👤", "warning", `⚠️ Transferido (fallback) - ${errorMsg}`, { preview_mode: isPreview, error: errorMsg }, "Motivo: " + args.motivo, args, "Transferência simples executada", { transferred: true, fallback: true, error: errorMsg }, 0, 0, Date.now() - stepStart);
        return { success: true, result: { transferred: true, fallback: true }, message: previewPrefix + "Conversa transferida para atendente humano.", messageToCustomer };
      }
      console.log("[Transfer] Result:", transferResult);
      // Use message from SQL function if available
      const finalMessageToCustomer = transferResult.message_to_customer || messageToCustomer;
      const finalAttendantName = transferResult.attendant_name || attendantName;
      const isGenericTransfer = transferResult.generic_transfer === true;
      await logger.step("tool_transferir_para_humano", "Transferência para Humano", "👤", "success", isGenericTransfer ? `✅ Transferência genérica (sem atendente específico)` : `✅ Transferido para ${finalAttendantName}`, { preview_mode: isPreview, attendant_id: transferResult.attendant_id, generic_transfer: isGenericTransfer }, "Motivo: " + args.motivo, args, isGenericTransfer ? "Aguardando atendente" : `Atendente: ${finalAttendantName}`, { transferred: true, attendant_id: transferResult.attendant_id, attendant_name: finalAttendantName, notification_id: transferResult.notification_id, generic_transfer: isGenericTransfer }, selectionResult.tokensUsed || 0, 0, Date.now() - stepStart);
      return {
        success: true,
        result: { transferred: true, attendant_id: transferResult.attendant_id, attendant_name: finalAttendantName, notification_id: transferResult.notification_id, generic_transfer: isGenericTransfer },
        message: previewPrefix + (isGenericTransfer ? "Conversa transferida para atendimento humano." : `Conversa transferida para ${finalAttendantName}.`),
        messageToCustomer: finalMessageToCustomer
      };
    }
    case "finalizar_atendimento": {
      await supabase.from("conversations").update({ status: "resolved" }).eq("id", context.conversationId);
      await supabase.from("ai_conversation_sessions").update({ status: "completed", end_reason: "resolved", context_summary: args.resumo, ended_at: new Date().toISOString() }).eq("id", context.sessionId);
      return { success: true, result: { finalized: true }, message: previewPrefix + "Atendimento finalizado com sucesso." };
    }
    case "atualizar_crm": {
      if (!context.leadId) return { success: false, result: null, message: "Lead não encontrado para esta conversa" };
      const campoLower = (args.campo || "").toLowerCase().trim();
      const valor = args.valor || "";
      const observacao = args.observacao || "";
      const fixedFieldsMapping = { "nome": "client_name", "name": "client_name", "cliente": "client_name", "empresa": "company", "company": "company", "notas": "notes", "notes": "notes", "observacao": "notes", "observações": "notes" };
      const dbField = fixedFieldsMapping[campoLower];
      if (dbField) {
        const { error: updateError } = await supabase.from("leads").update({ [dbField]: valor }).eq("id", context.leadId);
        if (updateError) return { success: false, result: null, message: "Erro ao atualizar campo: " + updateError.message };
        await supabase.from("lead_activities").insert({ lead_id: context.leadId, activity_type: "note", description: previewPrefix + `Campo ${args.campo} atualizado para "${valor}" via IA.${observacao ? " Obs: " + observacao : ""}` });
        return { success: true, result: { updated: true, field: args.campo, field_type: "fixed", db_field: dbField }, message: previewPrefix + `Campo ${args.campo} atualizado com sucesso.` };
      }
      const { data: customField, error: cfError } = await supabase.from("custom_fields").select("id, name, field_type").ilike("name", args.campo).single();
      if (cfError || !customField) {
        const { data: customFields } = await supabase.from("custom_fields").select("id, name, field_type").ilike("name", `%${args.campo}%`);
        if (!customFields || customFields.length === 0) {
          const { data: allFields } = await supabase.from("custom_fields").select("name").limit(20);
          const availableFields = allFields?.map((f) => f.name).join(", ") || "nenhum";
          return { success: false, result: { available_fields: availableFields }, message: `Campo "${args.campo}" não encontrado. Campos disponíveis: ${availableFields}` };
        }
        const matchedField = customFields[0];
        const { error: upsertError } = await supabase.from("lead_custom_values").upsert({ lead_id: context.leadId, custom_field_id: matchedField.id, value: valor }, { onConflict: "lead_id,custom_field_id" });
        if (upsertError) return { success: false, result: null, message: "Erro ao salvar valor: " + upsertError.message };
        await supabase.from("lead_activities").insert({ lead_id: context.leadId, activity_type: "note", description: previewPrefix + `Campo personalizado "${matchedField.name}" atualizado para "${valor}" via IA.${observacao ? " Obs: " + observacao : ""}` });
        return { success: true, result: { updated: true, field: matchedField.name, field_type: "custom", custom_field_id: matchedField.id, matched_from: args.campo }, message: previewPrefix + `Campo personalizado "${matchedField.name}" atualizado com sucesso.` };
      }
      const { error: upsertError } = await supabase.from("lead_custom_values").upsert({ lead_id: context.leadId, custom_field_id: customField.id, value: valor }, { onConflict: "lead_id,custom_field_id" });
      if (upsertError) return { success: false, result: null, message: "Erro ao salvar valor: " + upsertError.message };
      await supabase.from("lead_activities").insert({ lead_id: context.leadId, activity_type: "note", description: previewPrefix + `Campo personalizado "${customField.name}" atualizado para "${valor}" via IA.${observacao ? " Obs: " + observacao : ""}` });
      return { success: true, result: { updated: true, field: customField.name, field_type: "custom", custom_field_id: customField.id }, message: previewPrefix + `Campo personalizado "${customField.name}" atualizado com sucesso.` };
    }
    // ==================== CALENDAR TOOLS ====================
    case "agendar_reuniao": {
      const stepStart = Date.now();
      try {
        // Validar parâmetros obrigatórios
        if (!args.titulo || !args.data || !args.hora) {
          return { success: false, result: null, message: "Parâmetros obrigatórios: titulo, data (YYYY-MM-DD), hora (HH:MM)" };
        }
        // Buscar workspace_id do agente
        const { data: agentData } = await supabase.from("ai_agents").select("workspace_id").eq("id", context.agentId).single();
        if (!agentData?.workspace_id) {
          return { success: false, result: null, message: "Workspace não encontrado para o agente" };
        }
        const workspaceId = agentData.workspace_id;
        // Buscar calendário interno do workspace
        let { data: calendar } = await supabase.from("internal_calendars").select("id").eq("workspace_id", workspaceId).eq("is_active", true).limit(1).single();
        if (!calendar) {
          // Criar calendário padrão se não existir
          const { data: newCalendar, error: createError } = await supabase.from("internal_calendars").insert({
            workspace_id: workspaceId,
            name: "Calendário Principal",
            calendar_type: "default",
            is_active: true,
            timezone: "America/Sao_Paulo"
          }).select("id").single();
          if (createError) {
            return { success: false, result: null, message: "Erro ao criar calendário: " + createError.message };
          }
          calendar = newCalendar;
        }
        // Montar data/hora do evento
        const startDateTime = new Date(`${args.data}T${args.hora}:00`);
        const durationMinutes = args.duracao_minutos || 60;
        const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);
        // Verificar disponibilidade
        const { data: conflictingEvents } = await supabase.from("internal_events")
          .select("id, title, start_time, end_time")
          .eq("workspace_id", workspaceId)
          .neq("event_status", "cancelled")
          .or(`and(start_time.lt.${endDateTime.toISOString()},end_time.gt.${startDateTime.toISOString()})`);
        if (conflictingEvents && conflictingEvents.length > 0) {
          const conflicts = conflictingEvents.map((e: any) => `${e.title} (${new Date(e.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})`).join(", ");
          await logger.step("tool_agendar_reuniao", "Agendar Reunião", "📅", "warning", `⚠️ Conflito de horário`, { preview_mode: isPreview }, `${args.data} ${args.hora}`, args, `Conflito com: ${conflicts}`, { conflicting_events: conflictingEvents }, 0, 0, Date.now() - stepStart);
          return { success: false, result: { conflicts: conflictingEvents }, message: `Horário indisponível. Já existe(m) evento(s) neste horário: ${conflicts}. Por favor, sugira outro horário ao cliente.` };
        }
        // Criar o evento
        const eventData = {
          workspace_id: workspaceId,
          internal_calendar_id: calendar.id,
          title: args.titulo,
          description: args.observacoes || null,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          event_status: "tentative",
          event_type: "meeting",
          lead_id: context.leadId || null,
          conversation_id: context.conversationId || null,
        };
        if (isPreview) {
          await logger.step("tool_agendar_reuniao", "Agendar Reunião", "📅", "success", `✅ Evento seria criado (Preview)`, { preview_mode: true }, `${args.titulo} - ${args.data} ${args.hora}`, args, `Duração: ${durationMinutes} min`, eventData, 0, 0, Date.now() - stepStart);
          return { success: true, result: { scheduled: true, preview: true, event_data: eventData }, message: previewPrefix + `Reunião "${args.titulo}" seria agendada para ${args.data} às ${args.hora} (${durationMinutes} min).` };
        }
        const { data: newEvent, error: eventError } = await supabase.from("internal_events").insert(eventData).select("id, title, start_time, end_time").single();
        if (eventError) {
          await logger.step("tool_agendar_reuniao", "Agendar Reunião", "📅", "error", `❌ Erro ao criar evento`, { preview_mode: isPreview }, `${args.titulo} - ${args.data} ${args.hora}`, args, null, null, 0, 0, Date.now() - stepStart, eventError.message);
          return { success: false, result: null, message: "Erro ao agendar reunião: " + eventError.message };
        }
        // Registrar atividade no lead se existir
        if (context.leadId) {
          await supabase.from("lead_activities").insert({
            lead_id: context.leadId,
            activity_type: "meeting",
            description: `Reunião agendada via IA: "${args.titulo}" para ${args.data} às ${args.hora}`,
            metadata: { event_id: newEvent.id }
          });
        }
        await logger.step("tool_agendar_reuniao", "Agendar Reunião", "📅", "success", `✅ Evento criado: ${newEvent.title}`, { preview_mode: isPreview }, `${args.titulo} - ${args.data} ${args.hora}`, args, `ID: ${newEvent.id}`, { event_id: newEvent.id, start_time: newEvent.start_time, end_time: newEvent.end_time }, 0, 0, Date.now() - stepStart);
        return { success: true, result: { scheduled: true, event_id: newEvent.id, start_time: newEvent.start_time, end_time: newEvent.end_time }, message: `Reunião "${args.titulo}" agendada com sucesso para ${args.data} às ${args.hora} (${durationMinutes} minutos).` };
      } catch (error: any) {
        await logger.step("tool_agendar_reuniao", "Agendar Reunião", "📅", "error", `❌ Erro inesperado`, { preview_mode: isPreview }, null, args, null, null, 0, 0, Date.now() - stepStart, error?.message || String(error));
        return { success: false, result: null, message: "Erro ao agendar reunião: " + (error?.message || String(error)) };
      }
    }
    case "consultar_disponibilidade": {
      const stepStart = Date.now();
      try {
        // Validar parâmetros
        if (!args.data) {
          return { success: false, result: null, message: "Parâmetro obrigatório: data (YYYY-MM-DD)" };
        }
        // Buscar workspace_id do agente
        const { data: agentData } = await supabase.from("ai_agents").select("workspace_id").eq("id", context.agentId).single();
        if (!agentData?.workspace_id) {
          return { success: false, result: null, message: "Workspace não encontrado para o agente" };
        }
        const workspaceId = agentData.workspace_id;
        // Buscar configurações de disponibilidade
        const { data: calendarSettings } = await supabase.from("calendar_settings").select("availability, buffer_between_events").eq("workspace_id", workspaceId).limit(1).single();
        // Dia da semana (0 = domingo, 1 = segunda, etc.)
        const requestedDate = new Date(args.data + "T12:00:00");
        const dayOfWeek = requestedDate.getDay();
        const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        const dayName = dayNames[dayOfWeek];
        // Disponibilidade padrão se não configurado
        const defaultAvailability = { start: "09:00", end: "18:00" };
        const dayAvailability = calendarSettings?.availability?.[dayName] || [defaultAvailability];
        if (!dayAvailability || dayAvailability.length === 0) {
          await logger.step("tool_consultar_disponibilidade", "Consultar Disponibilidade", "🕐", "success", `📅 Sem expediente configurado`, { preview_mode: isPreview }, args.data, args, "Sem horários disponíveis", { day: dayName, available: false }, 0, 0, Date.now() - stepStart);
          return { success: true, result: { date: args.data, day_name: dayName, available_slots: [], message: "Sem expediente neste dia" }, message: `Não há horários de atendimento configurados para ${dayName === 'sunday' ? 'domingo' : dayName === 'saturday' ? 'sábado' : 'este dia'}.` };
        }
        // Buscar eventos existentes no dia
        const dayStart = new Date(args.data + "T00:00:00").toISOString();
        const dayEnd = new Date(args.data + "T23:59:59").toISOString();
        const { data: existingEvents } = await supabase.from("internal_events")
          .select("start_time, end_time, title")
          .eq("workspace_id", workspaceId)
          .neq("event_status", "cancelled")
          .gte("start_time", dayStart)
          .lte("start_time", dayEnd)
          .order("start_time");
        // Calcular slots disponíveis
        const bufferMinutes = calendarSettings?.buffer_between_events || 15;
        const slotDuration = 60; // 1 hora por slot
        const availableSlots = [];
        for (const period of dayAvailability) {
          const periodStart = new Date(`${args.data}T${period.start}:00`);
          const periodEnd = new Date(`${args.data}T${period.end}:00`);
          let currentSlotStart = periodStart;
          while (currentSlotStart.getTime() + slotDuration * 60 * 1000 <= periodEnd.getTime()) {
            const currentSlotEnd = new Date(currentSlotStart.getTime() + slotDuration * 60 * 1000);
            // Verificar se há conflito com eventos existentes
            const hasConflict = existingEvents?.some((event: any) => {
              const eventStart = new Date(event.start_time);
              const eventEnd = new Date(event.end_time);
              // Adicionar buffer
              const bufferedEventStart = new Date(eventStart.getTime() - bufferMinutes * 60 * 1000);
              const bufferedEventEnd = new Date(eventEnd.getTime() + bufferMinutes * 60 * 1000);
              return currentSlotStart < bufferedEventEnd && currentSlotEnd > bufferedEventStart;
            });
            if (!hasConflict) {
              availableSlots.push({
                start: currentSlotStart.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                end: currentSlotEnd.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              });
            }
            currentSlotStart = new Date(currentSlotStart.getTime() + 30 * 60 * 1000); // Avançar 30 min
          }
        }
        const slotsText = availableSlots.length > 0
          ? availableSlots.map(s => s.start).join(", ")
          : "Nenhum horário disponível";
        await logger.step("tool_consultar_disponibilidade", "Consultar Disponibilidade", "🕐", "success", `📅 ${availableSlots.length} slots disponíveis`, { preview_mode: isPreview }, args.data, args, slotsText, { slots_count: availableSlots.length, slots: availableSlots }, 0, 0, Date.now() - stepStart);
        if (availableSlots.length === 0) {
          return { success: true, result: { date: args.data, available_slots: [], busy_events: existingEvents?.length || 0 }, message: `Não há horários disponíveis para ${args.data}. Todos os horários estão ocupados. Sugira outra data ao cliente.` };
        }
        return { success: true, result: { date: args.data, available_slots: availableSlots, slots_count: availableSlots.length }, message: `Horários disponíveis para ${args.data}: ${slotsText}. Pergunte ao cliente qual horário prefere.` };
      } catch (error: any) {
        await logger.step("tool_consultar_disponibilidade", "Consultar Disponibilidade", "🕐", "error", `❌ Erro`, { preview_mode: isPreview }, null, args, null, null, 0, 0, Date.now() - stepStart, error?.message || String(error));
        return { success: false, result: null, message: "Erro ao consultar disponibilidade: " + (error?.message || String(error)) };
      }
    }
    default:
      return { success: false, result: null, message: "Tool desconhecido: " + toolName };
  }
}
// ==================== WHATSAPP SENDER ====================
async function sendWhatsAppMessage(supabase, conversationId, content, pipelineId, logger) {
  const stepStart = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  try {
    const response = await fetch(supabaseUrl + "/functions/v1/internal-send-ai-message", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Service-Role-Key": serviceRoleKey },
      body: JSON.stringify({ conversationId, text: content })
    });
    const responseText = await response.text();
    if (!response.ok) {
      const { data: savedMessage } = await supabase.from("messages").insert({ conversation_id: conversationId, message_type: "sent", content_type: "text", text_content: content, pipeline_id: pipelineId }).select("id").single();
      await supabase.from("conversations").update({ last_message: content.substring(0, 100), last_message_at: new Date().toISOString() }).eq("id", conversationId);
      await logger.step("whatsapp", "Envio WhatsApp", "📤", "error", "⚠️ Erro no envio - salvo localmente", { provider: "fallback", pipeline_id: pipelineId }, "Mensagem com " + content.length + " caracteres", null, "Mensagem salva no banco", { message_id: savedMessage?.id, fallback: true }, null, null, Date.now() - stepStart, responseText.substring(0, 200));
      return { success: false, messageId: savedMessage?.id || null, providerMessageId: null };
    }
    const result = JSON.parse(responseText);
    if (result.message?.id) await supabase.from("messages").update({ pipeline_id: pipelineId }).eq("id", result.message.id);
    await logger.step("whatsapp", "Envio WhatsApp", "📤", "success", "✅ Mensagem entregue ao WhatsApp", { provider: result.provider || "uazapi", pipeline_id: pipelineId }, "Mensagem com " + content.length + " caracteres", null, "Enviado com sucesso", { message_id: result.message?.id, provider_message_id: result.providerMessageId }, null, null, Date.now() - stepStart);
    return { success: true, messageId: result.message?.id || null, providerMessageId: result.providerMessageId || null };
  } catch (error) {
    await logger.step("whatsapp", "Envio WhatsApp", "📤", "error", "❌ Erro no envio", null, "Mensagem com " + content.length + " caracteres", null, null, null, null, null, Date.now() - stepStart, error.message);
    return { success: false, messageId: null, providerMessageId: null };
  }
}
// ==================== SAVE PREVIEW MESSAGE ====================
async function savePreviewMessage(supabase, conversationId, content, pipelineId, logger) {
  const stepStart = Date.now();
  try {
    const { data: savedMessage, error } = await supabase.from("messages").insert({ conversation_id: conversationId, message_type: "sent", content_type: "text", text_content: content, pipeline_id: pipelineId }).select("id").single();
    if (error) {
      await logger.step("preview_save", "Salvar Resposta (Preview)", "💾", "error", "❌ Erro ao salvar mensagem", null, "Mensagem com " + content.length + " caracteres", null, null, null, null, null, Date.now() - stepStart, error.message);
      return { success: false, messageId: null };
    }
    await supabase.from("conversations").update({ last_message: content.substring(0, 100), last_message_at: new Date().toISOString() }).eq("id", conversationId);
    await logger.step("preview_save", "Salvar Resposta (Preview)", "💾", "success", "✅ Mensagem salva no banco (Preview)", { preview_mode: true }, "Mensagem com " + content.length + " caracteres", null, "Salvo com sucesso", { message_id: savedMessage?.id }, null, null, Date.now() - stepStart);
    return { success: true, messageId: savedMessage?.id || null };
  } catch (error) {
    await logger.step("preview_save", "Salvar Resposta (Preview)", "💾", "error", "❌ Erro inesperado", null, null, null, null, null, null, null, Date.now() - stepStart, error.message);
    return { success: false, messageId: null };
  }
}
// ==================== SEND MULTIPLE MESSAGES ====================
async function sendMultipleMessages(supabase, conversationId, messages, isPreviewMode, delayMs, pipelineId, logger) {
  const stepStart = Date.now();
  const results = [];
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  for (let i = 0; i < messages.length; i++) {
    const content = messages[i];
    if (isPreviewMode) {
      const { data: savedMessage, error } = await supabase.from("messages").insert({ conversation_id: conversationId, message_type: "sent", content_type: "text", text_content: content, pipeline_id: pipelineId }).select("id").single();
      results.push({ success: !error, messageId: savedMessage?.id || null, providerMessageId: null });
    } else {
      try {
        const response = await fetch(supabaseUrl + "/functions/v1/internal-send-ai-message", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Service-Role-Key": serviceRoleKey },
          body: JSON.stringify({ conversationId, text: content })
        });
        if (response.ok) {
          const result = JSON.parse(await response.text());
          if (result.message?.id) await supabase.from("messages").update({ pipeline_id: pipelineId }).eq("id", result.message.id);
          results.push({ success: true, messageId: result.message?.id || null, providerMessageId: result.providerMessageId || null });
        } else {
          const { data: savedMessage } = await supabase.from("messages").insert({ conversation_id: conversationId, message_type: "sent", content_type: "text", text_content: content, pipeline_id: pipelineId }).select("id").single();
          results.push({ success: false, messageId: savedMessage?.id || null, providerMessageId: null });
        }
      } catch (err) {
        results.push({ success: false, messageId: null, providerMessageId: null });
      }
    }
    if (i < messages.length - 1) await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  const lastMessage = messages[messages.length - 1];
  await supabase.from("conversations").update({ last_message: lastMessage.substring(0, 100), last_message_at: new Date().toISOString() }).eq("id", conversationId);
  const allSuccess = results.every((r) => r.success);
  const anySuccess = results.some((r) => r.success);
  const allMessageIds = results.map((r) => r.messageId).filter(Boolean);
  const modeText = isPreviewMode ? "salvas" : "enviadas";
  await logger.step("send_response", "Envio de Resposta", "📤", allSuccess ? "success" : anySuccess ? "warning" : "error", allSuccess ? `✅ ${messages.length} mensagens ${modeText} com sucesso` : anySuccess ? `⚠️ ${results.filter((r) => r.success).length}/${messages.length} mensagens ${modeText}` : `❌ Erro ao enviar mensagens`, { parts: messages.length, preview_mode: isPreviewMode, delay_ms: delayMs, fracionado: true }, null, null, `${results.filter((r) => r.success).length}/${messages.length} ${modeText}`, { message_ids: allMessageIds, results: results.map((r) => r.success) }, null, null, Date.now() - stepStart);
  return results;
}
// ==================== MAIN HANDLER ====================
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const startTime = Date.now();
  let logger = null;
  let supabase = null;
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const payload = await req.json();
    const isPreviewMode = payload.preview_mode === true;
    const modeLabel = isPreviewMode ? "[PREVIEW]" : "[PRODUCTION]";
    console.log(`[ai-process-conversation] ${FUNCTION_VERSION} ${modeLabel} Processing: ${payload.conversation_id}`);
    logger = new PipelineLogger(supabase, isPreviewMode);
    await logger.start(payload.conversation_id, payload.debouncer_id || null, payload.agent_id, payload.message_ids || null);
    const pipelineId = logger.getPipelineId();
    // ===================== SETUP STEP =====================
    const setupStart = Date.now();
    const { data: secrets, error: secretError } = await supabase.from("decrypted_secrets").select("name, decrypted_secret").eq("name", "OPENROUTER_API_KEY").single();
    if (secretError || !secrets?.decrypted_secret) {
      await logger.complete("error", "❌ API Key não configurada", null, false, null, "OpenRouter API key not found", "setup");
      throw new Error("OpenRouter API key not configured");
    }
    const openrouterApiKey = secrets.decrypted_secret;
    const { data: agent, error: agentError } = await supabase.from("ai_agents").select(`id, name, system_prompt, behavior_config, model, provider_id, rag_enabled, orchestrator_enabled, is_active, daily_message_limit, monthly_token_limit, total_messages, total_tokens_used, transcription_model, crm_auto_update, crm_auto_config, workspace_id`).eq("id", payload.agent_id).single();
    if (agentError || !agent) {
      await logger.complete("error", "❌ Agente não encontrado", null, false, null, "Agent not found: " + payload.agent_id, "setup");
      throw new Error("Agent not found");
    }
    if (!agent.is_active) {
      await logger.step("setup", "Configuração Inicial", "⚙️", "blocked", "🚫 Agente desativado", { agent_id: agent.id }, "Agente: " + agent.name, null, "Pipeline cancelado", null, 0, 0, Date.now() - setupStart, "Agent is_active = false");
      await logger.complete("blocked", "🚫 Agente desativado", null, false, null, "Agent is not active", "setup");
      return new Response(JSON.stringify({ status: "blocked", reason: "agent_inactive", pipeline_id: pipelineId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const splitMessagesEnabled = agent.behavior_config?.response?.split_long_messages === true;
    const debounceSeconds = agent.behavior_config?.timing?.debounce_seconds || 15;
    const { data: conversationInfo } = await supabase.from("conversations").select(`id, contact_name, contact_phone, attendant_type, status, assigned_to, inbox_id, lead_id, inboxes!inner (id, name)`).eq("id", payload.conversation_id).single();
    if (conversationInfo?.attendant_type === "human" && !isPreviewMode) {
      await logger.step("setup", "Configuração Inicial", "⚙️", "skipped", "👤 Conversa com atendente humano", { attendant_type: "human" }, null, null, "Pipeline cancelado", null, 0, 0, Date.now() - setupStart);
      await logger.complete("skipped", "👤 Conversa está com atendente humano", null, false, null, "Human attendant active", "setup");
      return new Response(JSON.stringify({ status: "skipped", reason: "human_attendant", pipeline_id: pipelineId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    
    // ✅ NOVO: Se conversa está resolvida, não processar
    if (conversationInfo?.status === "resolved" && !isPreviewMode) {
      await logger.step("setup", "Configuração Inicial", "⚙️", "skipped", "✅ Conversa já resolvida", { status: "resolved" }, null, null, "Pipeline cancelado", null, 0, 0, Date.now() - setupStart);
      await logger.complete("skipped", "✅ Conversa já está resolvida", null, false, null, "Conversation already resolved", "setup");
      return new Response(JSON.stringify({ status: "skipped", reason: "conversation_resolved", pipeline_id: pipelineId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ✅ NOVO: Se tem atendente humano atribuído, não processar
    if (conversationInfo?.assigned_to && !isPreviewMode) {
      await logger.step("setup", "Configuração Inicial", "⚙️", "skipped", "👤 Conversa atribuída a atendente", { assigned_to: conversationInfo.assigned_to }, null, null, "Pipeline cancelado", null, 0, 0, Date.now() - setupStart);
      await logger.complete("skipped", "👤 Conversa atribuída a atendente humano", null, false, null, "Conversation assigned to human attendant", "setup");
      return new Response(JSON.stringify({ status: "skipped", reason: "assigned_to_human", pipeline_id: pipelineId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!isPreviewMode) {
      const dailyLimitReached = agent.total_messages >= agent.daily_message_limit;
      const monthlyTokenLimitReached = agent.total_tokens_used >= agent.monthly_token_limit;
      if (dailyLimitReached || monthlyTokenLimitReached) {
        const limitType = dailyLimitReached ? "daily_messages" : "monthly_tokens";
        const limitMessage = dailyLimitReached ? `Limite diário atingido (${agent.total_messages}/${agent.daily_message_limit})` : `Limite mensal de tokens atingido`;
        await logger.step("setup", "Configuração Inicial", "⚙️", "blocked", "🚫 " + limitMessage, { limit_type: limitType }, null, null, "Pipeline cancelado", null, 0, 0, Date.now() - setupStart, limitMessage);
        await logger.complete("blocked", "🚫 " + limitMessage, null, false, null, limitMessage, "setup");
        return new Response(JSON.stringify({ status: "blocked", reason: "limit_reached", limit_type: limitType, pipeline_id: pipelineId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }
    const modelToUse = agent.model || "anthropic/claude-3.5-sonnet";
    const crmAutoEnabled = agent.crm_auto_config?.enabled === true;
    await logger.step("setup", "Configuração Inicial", "⚙️", "success", "✅ Configuração carregada", { agent_id: agent.id, agent_name: agent.name, model: modelToUse, rag_enabled: agent.rag_enabled, orchestrator_enabled: agent.orchestrator_enabled, crm_auto_update: agent.crm_auto_update, crm_auto_enabled: crmAutoEnabled, split_messages: splitMessagesEnabled, preview_mode: isPreviewMode, function_version: FUNCTION_VERSION }, "Agente: " + agent.name + " | Modelo: " + modelToUse + (isPreviewMode ? " | PREVIEW" : ""), null, "RAG: " + (agent.rag_enabled ? "✅" : "❌") + " | Orquestrador: " + (agent.orchestrator_enabled ? "✅" : "❌") + " | CRM Auto: " + (crmAutoEnabled ? "✅" : "❌"), { features: { rag: agent.rag_enabled, orchestrator: agent.orchestrator_enabled, crm_auto_update: agent.crm_auto_update, crm_auto_enabled: crmAutoEnabled, split_messages: splitMessagesEnabled } }, 0, 0, Date.now() - setupStart);
    let { data: session } = await supabase.from("ai_conversation_sessions").select("id, context_summary").eq("conversation_id", payload.conversation_id).eq("agent_id", payload.agent_id).eq("status", "active").single();
    if (!session) {
      const { data: newSession } = await supabase.from("ai_conversation_sessions").insert({ conversation_id: payload.conversation_id, agent_id: payload.agent_id, status: "active", started_at: new Date().toISOString() }).select("id").single();
      session = newSession;
    }
    const conversation = conversationInfo;
    let leadInfo = null;
    if (conversation?.lead_id) {
      const { data: lead } = await supabase.from("leads").select("id, client_name, company").eq("id", conversation.lead_id).single();
      leadInfo = lead;
    }
    let { data: messages } = await supabase.from("messages").select("id, text_content, content_type, message_type, transcription, transcription_status, created_at").eq("conversation_id", payload.conversation_id).order("created_at", { ascending: true }).limit(50);

    // ✅ AGUARDAR TRANSCRIÇÕES PENDENTES (máx 30s)
    // Verifica se há mensagens de mídia com transcrição pendente e aguarda completar
    const mediaTypes = ["audio", "ptt", "image", "video"];
    const pendingTranscriptions = (messages || []).filter(
      (m: any) => mediaTypes.includes(m.content_type) &&
                  m.message_type === "received" &&
                  ["pending", "processing"].includes(m.transcription_status)
    );

    if (pendingTranscriptions.length > 0) {
      const transcriptionWaitStart = Date.now();
      const maxWaitMs = 30000; // 30 segundos máximo
      const checkIntervalMs = 2000; // Verificar a cada 2 segundos
      let waitedMs = 0;
      let transcriptionsReady = false;

      console.log(`[ai-process-conversation] ⏳ Aguardando ${pendingTranscriptions.length} transcrição(ões) pendente(s)...`);

      while (waitedMs < maxWaitMs && !transcriptionsReady) {
        await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
        waitedMs += checkIntervalMs;

        // Re-verificar status das transcrições
        const { data: updatedMessages } = await supabase
          .from("messages")
          .select("id, transcription, transcription_status")
          .in("id", pendingTranscriptions.map((m: any) => m.id));

        const stillPending = (updatedMessages || []).filter(
          (m: any) => ["pending", "processing"].includes(m.transcription_status)
        );

        if (stillPending.length === 0) {
          transcriptionsReady = true;
          // Atualizar as mensagens com as transcrições prontas
          for (const updated of updatedMessages || []) {
            const original = messages?.find((m: any) => m.id === updated.id);
            if (original) {
              original.transcription = updated.transcription;
              original.transcription_status = updated.transcription_status;
            }
          }
          console.log(`[ai-process-conversation] ✅ Transcrições prontas após ${waitedMs}ms`);
        } else {
          console.log(`[ai-process-conversation] ⏳ Ainda aguardando ${stillPending.length} transcrição(ões)... (${waitedMs}ms/${maxWaitMs}ms)`);
        }
      }

      if (!transcriptionsReady) {
        console.log(`[ai-process-conversation] ⚠️ Timeout de transcrição atingido (${maxWaitMs}ms). Processando com conteúdo disponível.`);
        // Buscar o que tiver disponível mesmo após timeout
        const { data: finalMessages } = await supabase
          .from("messages")
          .select("id, transcription, transcription_status")
          .in("id", pendingTranscriptions.map((m: any) => m.id));

        for (const updated of finalMessages || []) {
          const original = messages?.find((m: any) => m.id === updated.id);
          if (original) {
            original.transcription = updated.transcription;
            original.transcription_status = updated.transcription_status;
          }
        }
      }

      // Logar tempo de espera
      const totalWaitTime = Date.now() - transcriptionWaitStart;
      await logger.step(
        "transcription_wait",
        "Aguardando Transcrições",
        "🎤",
        transcriptionsReady ? "success" : "warning",
        transcriptionsReady
          ? `✅ ${pendingTranscriptions.length} transcrição(ões) pronta(s) em ${totalWaitTime}ms`
          : `⚠️ Timeout após ${totalWaitTime}ms - ${pendingTranscriptions.length} mídia(s)`,
        { pending_count: pendingTranscriptions.length, wait_time_ms: totalWaitTime, completed: transcriptionsReady }, // config
        `${pendingTranscriptions.length} mídia(s) aguardando`, // inputSummary
        { media_ids: pendingTranscriptions.map((m: any) => m.id) }, // inputData
        transcriptionsReady ? "Transcrições completadas" : "Timeout - processando com conteúdo parcial", // outputSummary
        { media_types: pendingTranscriptions.map((m: any) => m.content_type) }, // outputData
        0, // tokensInput
        0, // tokensOutput
        totalWaitTime // durationMs
      );
    }

    const messageCount = payload.message_ids?.length || 1;
    const debounceMs = debounceSeconds * 1000;
    await logger.step("debouncer", "Agrupamento de Mensagens", "📨", "success", `📨 ${messageCount} mensagem(ns) recebida(s) (aguardou ${debounceSeconds}s)`, { debounce_seconds: debounceSeconds }, messageCount + " mensagem(ns) do cliente", null, "Mensagens prontas para processamento", { message_count: messageCount, wait_time_seconds: debounceSeconds }, 0, 0, debounceMs);
    // GUARDRAIL
    let guardrailTokensUsed = 0;
    let policyResponseTokensUsed = 0;
    let splitTokensUsed = 0;
    let attendantSelectionTokensUsed = 0;
    const guardrailResult = await checkGuardrailWithAI(supabase, openrouterApiKey, messages || [], logger);
    guardrailTokensUsed = guardrailResult.tokensUsed || 0;
    if (!guardrailResult.enable_conversation) {
      const policyResponse = await generatePolicyViolationResponse(supabase, openrouterApiKey, agent, guardrailResult.context_summary, logger);
      policyResponseTokensUsed = policyResponse.tokensUsed || 0;
      let sendResult = { success: false, messageId: null, providerMessageId: null };
      if (policyResponse.response) {
        if (isPreviewMode) {
          const saveResult = await savePreviewMessage(supabase, payload.conversation_id, policyResponse.response, pipelineId, logger);
          sendResult = { success: saveResult.success, messageId: saveResult.messageId, providerMessageId: null };
        } else {
          sendResult = await sendWhatsAppMessage(supabase, payload.conversation_id, policyResponse.response, pipelineId, logger);
        }
      }
      await supabase.from("conversations").update({ status: "resolved" }).eq("id", payload.conversation_id);
      await supabase.from("ai_conversation_sessions").update({ status: "completed", end_reason: "policy_violation", context_summary: guardrailResult.context_summary, ended_at: new Date().toISOString() }).eq("id", session?.id);
      const totalTokens = guardrailTokensUsed + policyResponseTokensUsed;
      await supabase.rpc("increment_agent_metrics", { p_agent_id: payload.agent_id, p_messages: 1, p_tokens: totalTokens });
      await logger.complete("blocked", "🚫 Conversa bloqueada", policyResponse.response, sendResult.success, sendResult.providerMessageId, guardrailResult.context_summary, "guardrail");
      return new Response(JSON.stringify({ status: "blocked", reason: "guardrail_blocked", pipeline_id: pipelineId, preview_mode: isPreviewMode, response_sent: sendResult.success, tokens_used: totalTokens }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!guardrailResult.enable_response) {
      // ✅ CORREÇÃO: Resetar debouncer para 'waiting' para permitir reprocessamento de novas mensagens
      // Quando o guardrail bloqueia resposta (mensagem automática detectada), o debouncer deve
      // voltar ao estado 'waiting' para que quando o cliente enviar uma mensagem humana real,
      // o sistema possa reprocessar e responder adequadamente.
      if (payload.debouncer_id) {
        await supabase.from("ai_debouncer_queue").update({
          status: "waiting",
          process_after: new Date(Date.now() + 15000).toISOString(), // Resetar debounce para 15 segundos
          updated_at: new Date().toISOString()
        }).eq("id", payload.debouncer_id);
        console.log(`[ai-process-conversation] Debouncer ${payload.debouncer_id} reset to waiting for future messages`);
      }
      await logger.complete("skipped", "⏸️ Aguardando interação humana: " + guardrailResult.context_summary, null, false, null, guardrailResult.context_summary, "guardrail");
      return new Response(JSON.stringify({ status: "waiting", reason: "guardrail_waiting", pipeline_id: pipelineId, preview_mode: isPreviewMode, tokens_used: guardrailTokensUsed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // ORCHESTRATOR
    let allSpecialists = [];
    if (agent.orchestrator_enabled) {
      const { data: specialistsData } = await supabase.from("ai_specialist_agents").select("id, function_key, name, description, extra_prompt, priority, type").eq("parent_agent_id", payload.agent_id).eq("is_active", true).order("priority", { ascending: true });
      allSpecialists = specialistsData || [];
    }
    let selectedSpecialists = [];
    let orchestratorContext = "";
    let orchestratorTokensUsed = 0;
    if (agent.orchestrator_enabled) {
      const orchestratorResult = await callOrchestrator(supabase, openrouterApiKey, payload.agent_id, messages || [], allSpecialists, logger);
      selectedSpecialists = orchestratorResult.selectedSpecialists || [];
      orchestratorContext = orchestratorResult.context_summary || "";
      orchestratorTokensUsed = orchestratorResult.tokensUsed || 0;
    } else {
      await logger.step("orchestrator", "Orquestrador", "🧠", "skipped", "ℹ️ Orquestrador desabilitado", { orchestrator_enabled: false }, null, null, "Feature desabilitada", null, 0, 0, 1);
    }
    // TOOLS - Busca direta das tabelas (substituindo RPC que usava tabela errada)
    const tools = await getAgentToolsDirect(supabase, payload.agent_id);
    const conversationHistory = (messages || []).map((msg) => { let content = msg.text_content || ""; if (msg.transcription && ["audio", "image", "video"].includes(msg.content_type)) content = "[" + msg.content_type.toUpperCase() + "] " + msg.transcription; return { role: msg.message_type === "received" ? "user" : "assistant", content }; }).filter((msg) => msg.content.trim() !== "");
    // RAG
    let ragContext = "";
    let ragTokensUsed = 0;
    if (agent.rag_enabled) {
      const lastUserMsg = conversationHistory.filter((m) => m.role === "user").pop();
      if (lastUserMsg?.content) {
        const ragResult = await searchRAG(supabase, agent.id, lastUserMsg.content, logger);
        if (ragResult.context) ragContext = "\n\n=== BASE DE CONHECIMENTO ===\nUse as informacoes abaixo para responder:\n\n" + ragResult.context + "\n\n=== FIM DA BASE ===";
        ragTokensUsed = ragResult.tokensUsed || 0;
      }
    } else {
      await logger.step("rag", "Base de Conhecimento (RAG)", "📚", "skipped", "ℹ️ RAG desabilitado", null, null, null, "Agente sem base de conhecimento", null, 0, 0, 1);
    }
    // BUILD PROMPT - ✅ INFORMAÇÕES DO CLIENTE NO INÍCIO (ANTES DO SYSTEM_PROMPT)
    
    // Extrair informações do cliente PRIMEIRO
    const clientName = leadInfo?.client_name || conversation?.contact_name || null;
    const clientCompany = leadInfo?.company || null;
    const clientPhone = conversation?.contact_phone || null;

    // Extrair primeiro nome (remover emojis e pegar apenas o primeiro nome)
    let firstName = null;
    if (clientName) {
      // Remove emojis e caracteres especiais, pega o primeiro nome
      firstName = clientName
        .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '') // Remove emojis
        .trim()
        .split(/[\s-]/)[0] // Pega primeiro nome (antes de espaço ou hífen)
        .trim();
    }

    // Construir prompt com cliente NO INÍCIO
    let fullSystemPrompt = "";

    // BLOCO DO CLIENTE PRIMEIRO (antes do system_prompt do agente)
    if (firstName || clientName || clientPhone) {
      fullSystemPrompt += "=== CLIENTE QUE VOCÊ ESTÁ ATENDENDO ===\n";
      if (firstName) {
        fullSystemPrompt += "Primeiro nome do cliente: " + firstName + "\n";
      }
      if (clientName && clientName !== firstName) {
        fullSystemPrompt += "Nome completo do cliente: " + clientName + "\n";
      }
      if (clientCompany) {
        fullSystemPrompt += "Empresa do cliente: " + clientCompany + "\n";
      }
      if (clientPhone) {
        fullSystemPrompt += "Telefone do cliente: " + clientPhone + "\n";
      }
      fullSystemPrompt += "\nREGRA OBRIGATÓRIA: Você DEVE usar o primeiro nome do cliente (\"" + firstName + "\") nas suas respostas para personalizar o atendimento. Se o cliente perguntar o nome dele, responda que o nome dele é " + firstName + ".\n";
      fullSystemPrompt += "=== FIM DADOS DO CLIENTE ===\n\n";
    }

    // DEPOIS adiciona o system_prompt do agente
    fullSystemPrompt += agent.system_prompt || "";
    
    // Adiciona especialistas
    if (selectedSpecialists.length > 0) {
      const specialistPrompts = selectedSpecialists.filter((s) => s.extra_prompt).map((s) => `[${s.type.toUpperCase()}: ${s.name}]\n${s.extra_prompt}`);
      if (specialistPrompts.length > 0) fullSystemPrompt += "\n\n=== CONTEXTO DOS ESPECIALISTAS ===\n" + specialistPrompts.join("\n\n") + "\n=== FIM CONTEXTO ESPECIALISTAS ===";
    }
    
    // Adiciona orquestrador
    if (orchestratorContext) fullSystemPrompt += "\n\n=== ANÁLISE DO ORQUESTRADOR ===\n" + orchestratorContext + "\n=== FIM ANÁLISE ===";
    
    // Adiciona RAG
    fullSystemPrompt += ragContext;

    // Adiciona seção de TOOLS disponíveis (automático e conciso)
    console.log("[TOOLS DEBUG] tools variable:", tools ? `Array with ${tools.length} items` : "null/undefined");
    if (tools && tools.length > 0) {
      fullSystemPrompt += "\n\n=== FERRAMENTAS DISPONÍVEIS ===\n";
      fullSystemPrompt += "Você tem acesso às seguintes ferramentas. Use-as quando apropriado:\n\n";
      for (const tool of tools) {
        const fn = tool.function;
        fullSystemPrompt += `• ${fn.name}: ${fn.description}\n`;
        // Adiciona parâmetros obrigatórios de forma concisa
        if (fn.parameters?.required?.length > 0) {
          fullSystemPrompt += `  Params: ${fn.parameters.required.join(", ")}\n`;
        }
      }
      fullSystemPrompt += "\nIMPORTANTE: Chame a ferramenta apropriada quando o cliente:\n";
      fullSystemPrompt += "- Pedir para agendar/marcar reunião → use 'agendar_reuniao'\n";
      fullSystemPrompt += "- Perguntar horários disponíveis → use 'consultar_disponibilidade'\n";
      fullSystemPrompt += "- Pedir para falar com humano → use 'transferir_para_humano'\n";
      fullSystemPrompt += "- Concluir o atendimento → use 'finalizar_atendimento'\n";
      fullSystemPrompt += "=== FIM FERRAMENTAS ===";
    }

    // Adiciona resumo da sessão
    if (session?.context_summary) fullSystemPrompt += "\n\nResumo da sessao anterior:\n" + session.context_summary;
    fullSystemPrompt += "\n\nData/hora atual: " + new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    if (isPreviewMode) fullSystemPrompt += "\n\n[MODO PREVIEW] Esta é uma conversa de teste.";
    // LLM CALL
    const llmStepStart = Date.now();
    const model = agent.model || "anthropic/claude-3.5-sonnet";
    const maxTokens = agent.behavior_config?.response?.max_tokens || 500;
    const temperature = agent.behavior_config?.response?.temperature || 0.7;
    const llmPayload = { model, messages: [{ role: "system", content: fullSystemPrompt }, ...conversationHistory], max_tokens: maxTokens, temperature };
    if (tools && tools.length > 0) { llmPayload.tools = tools; llmPayload.tool_choice = "auto"; }
    const llmResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + openrouterApiKey, "HTTP-Referer": supabaseUrl, "X-Title": isPreviewMode ? "Pesca Lead AI Preview" : "Pesca Lead AI" },
      body: JSON.stringify(llmPayload)
    });
    if (!llmResponse.ok) {
      const error = await llmResponse.text();
      await logger.step("llm", "Geração de Resposta", "🤖", "error", "❌ Erro na API do LLM", { model }, null, null, null, null, null, null, Date.now() - llmStepStart, error.substring(0, 500));
      await logger.complete("error", "❌ Erro ao gerar resposta", null, false, null, error.substring(0, 200), "llm");
      throw new Error("LLM API error");
    }
    const llmResult = await llmResponse.json();
    const assistantMessage = llmResult.choices[0]?.message;
    const tokensIn = llmResult.usage?.prompt_tokens || 0;
    const tokensOut = llmResult.usage?.completion_tokens || 0;
    if (!assistantMessage) {
      await logger.complete("error", "❌ Sem resposta do LLM", null, false, null, "No response from LLM", "llm");
      throw new Error("No response from LLM");
    }
    let finalResponse = assistantMessage.content || "";
    let transferMessageToCustomer = null;
    // TOOL CALLS
    if (assistantMessage.tool_calls?.length > 0) {
      for (const toolCall of assistantMessage.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        const result = await executeSystemTool(supabase, openrouterApiKey, toolCall.function.name, args, { conversationId: payload.conversation_id, agentId: payload.agent_id, leadId: conversation?.lead_id, sessionId: session?.id }, isPreviewMode, logger);
        if (result.tokensUsed) attendantSelectionTokensUsed += result.tokensUsed;
        if (toolCall.function.name === "transferir_para_humano" && result.success) {
          transferMessageToCustomer = result.messageToCustomer || result.message || "Transferindo para um atendente humano...";
          finalResponse = transferMessageToCustomer;
          break;
        }
      }
    }
    const specialistNames = selectedSpecialists.map((s) => `${s.name}(${s.type})`).join(', ') || 'nenhum';
    await logger.step("llm", "Geração de Resposta", "🤖", "success", "✍️ Resposta gerada (" + (tokensIn + tokensOut) + " tokens)", { model, temperature, max_tokens: maxTokens, specialists_used: specialistNames, rag_used: !!ragContext, tools_available: tools?.length || 0, preview_mode: isPreviewMode }, "Prompt: " + fullSystemPrompt.length + " chars | Histórico: " + conversationHistory.length + " msgs", null, "Resposta com " + finalResponse.length + " caracteres", { response_length: finalResponse.length, response_preview: finalResponse.substring(0, 200), tools_called: assistantMessage.tool_calls?.length || 0 }, tokensIn, tokensOut, Date.now() - llmStepStart);
    // MESSAGE SPLIT
    let messagesToSend = [finalResponse];
    let delayBetweenMessages = 500;
    if (splitMessagesEnabled && finalResponse && !transferMessageToCustomer) {
      const splitResult = await splitMessageWithAI(supabase, openrouterApiKey, finalResponse, logger);
      messagesToSend = splitResult.messages;
      splitTokensUsed = splitResult.tokensUsed || 0;
      delayBetweenMessages = splitResult.delayMs || 500;
    } else if (!splitMessagesEnabled) {
      await logger.step("message_split", "Fracionamento de Mensagens", "✂️", "skipped", transferMessageToCustomer ? "ℹ️ Mensagem de transferência - sem fracionamento" : "ℹ️ Fracionamento desabilitado", { split_messages_enabled: false }, "Resposta com " + finalResponse.length + " caracteres", null, "Mensagem única", { parts: 1 }, 0, 0, 1);
    }
    // SEND MESSAGES
    let sendResult = { success: false, messageId: null, providerMessageId: null };
    let allMessageIds = [];
    if (messagesToSend.length > 1) {
      const results = await sendMultipleMessages(supabase, payload.conversation_id, messagesToSend, isPreviewMode, delayBetweenMessages, pipelineId, logger);
      allMessageIds = results.map((r) => r.messageId).filter(Boolean);
      const allSuccess = results.every((r) => r.success);
      sendResult = { success: allSuccess, messageId: allMessageIds[allMessageIds.length - 1] || null, providerMessageId: results[results.length - 1]?.providerMessageId || null };
    } else if (finalResponse) {
      if (isPreviewMode) {
        const saveResult = await savePreviewMessage(supabase, payload.conversation_id, finalResponse, pipelineId, logger);
        sendResult = { success: saveResult.success, messageId: saveResult.messageId, providerMessageId: null };
      } else {
        sendResult = await sendWhatsAppMessage(supabase, payload.conversation_id, finalResponse, pipelineId, logger);
      }
      allMessageIds = sendResult.messageId ? [sendResult.messageId] : [];
    }
    // AUTO CRM LEAD CREATION
    let crmAutoResult = { created: false, leadId: null, reason: "not_attempted" };
    if (sendResult.success && !isPreviewMode && !conversation?.lead_id) {
      crmAutoResult = await createLeadIfNeeded(supabase, payload.conversation_id, payload.agent_id, agent.crm_auto_config, logger);
    }
    // FINALIZE
    if (payload.debouncer_id) {
      await supabase.from("ai_debouncer_queue").update({ status: "completed", processed_at: new Date().toISOString() }).eq("id", payload.debouncer_id);
    }
    const totalTokens = guardrailTokensUsed + orchestratorTokensUsed + ragTokensUsed + tokensIn + tokensOut + splitTokensUsed + attendantSelectionTokensUsed;
    await supabase.from("ai_conversation_sessions").update({ messages_processed: messages?.length || 0, tokens_used: totalTokens, last_activity_at: new Date().toISOString() }).eq("id", session?.id);
    await supabase.rpc("increment_agent_metrics", { p_agent_id: payload.agent_id, p_messages: messagesToSend.length, p_tokens: totalTokens });
    const finalStatus = sendResult.success ? "success" : "partial";
    const finalStatusMessage = isPreviewMode ? sendResult.success ? `✅ Preview concluído - ${messagesToSend.length} mensagem(ns) salva(s)` : "⚠️ Preview com erro ao salvar" : sendResult.success ? `✅ Atendimento concluído - ${messagesToSend.length} mensagem(ns) enviada(s)${crmAutoResult.created ? " | Lead criado" : ""}${transferMessageToCustomer ? " | Transferido para humano" : ""}` : "⚠️ Resposta gerada mas houve erro no envio";
    await logger.complete(finalStatus, finalStatusMessage, finalResponse, !isPreviewMode && sendResult.success, sendResult.providerMessageId, sendResult.success ? null : isPreviewMode ? "Erro ao salvar" : "Erro no envio WhatsApp");
    console.log(`[ai-process-conversation] ${FUNCTION_VERSION} ${modeLabel} Completed in ${Date.now() - startTime}ms | Tokens: ${totalTokens} | Messages: ${messagesToSend.length} | CRM Auto: ${crmAutoResult.created ? "created" : crmAutoResult.reason} | Transfer: ${transferMessageToCustomer ? "yes" : "no"} | Pipeline: ${pipelineId}`);
    return new Response(JSON.stringify({ status: "success", preview_mode: isPreviewMode, pipeline_id: pipelineId, function_version: FUNCTION_VERSION, specialists_used: selectedSpecialists.map((s) => ({ name: s.name, type: s.type })), response_text: finalResponse, response_length: finalResponse?.length || 0, messages_sent: messagesToSend.length, message_ids: allMessageIds, tokens_used: totalTokens, tokens_breakdown: { guardrail: guardrailTokensUsed, orchestrator: orchestratorTokensUsed, rag: ragTokensUsed, llm: tokensIn + tokensOut, split: splitTokensUsed, attendant_selection: attendantSelectionTokensUsed }, duration_ms: Date.now() - startTime, rag_used: !!ragContext, guardrail_passed: true, split_enabled: splitMessagesEnabled, message_id: sendResult.messageId, crm_auto: crmAutoResult, transfer: transferMessageToCustomer ? { transferred: true, message_to_customer: transferMessageToCustomer } : null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("[ai-process-conversation] Error:", error);
    if (logger) await logger.complete("error", "❌ Erro no processamento", null, false, null, error.message);
    return new Response(JSON.stringify({ status: "error", message: error.message, pipeline_id: logger?.getPipelineId() }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});