import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

/**
 * AI Preview Chat Endpoint v9
 * 
 * CORREÇÃO: Usa RPC function para buscar pipeline (bypass RLS)
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const payload = await req.json();
    const { agentId, message, conversationId: inputConversationId, resetConversation = false } = payload;

    console.log(`[ai-preview-chat] v10 - Agent: ${agentId}, ConversationId: ${inputConversationId || 'auto'}`);
    console.log(`[ai-preview-chat] Message: ${message?.substring(0, 50)}...`);

    // Validações
    if (!agentId) {
      return new Response(
        JSON.stringify({ error: "agentId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!message?.trim()) {
      return new Response(
        JSON.stringify({ error: "message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. BUSCAR AGENTE
    const { data: agent, error: agentError } = await supabase
      .from("ai_agents")
      .select("workspace_id, name, is_active")
      .eq("id", agentId)
      .single();

    if (agentError || !agent) {
      console.error("[ai-preview-chat] Agent not found:", agentError);
      return new Response(
        JSON.stringify({ error: "Agent not found", details: agentError?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!agent.is_active) {
      return new Response(
        JSON.stringify({ error: "Agent is not active", code: "AGENT_INACTIVE" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. BUSCAR OU CRIAR CONVERSA DE PREVIEW
    let conversation: { id: string; workspace_id: string } | null = null;
    let convError: any = null;

    // Se um conversationId foi fornecido, usar diretamente
    if (inputConversationId) {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, workspace_id")
        .eq("id", inputConversationId)
        .eq("channel", "preview")
        .single();

      conversation = data;
      convError = error;
      console.log(`[ai-preview-chat] Using provided conversationId: ${inputConversationId}, found: ${!!conversation}`);
    } else {
      // Busca por contact_phone = agentId (padrão)
      const { data, error } = await supabase
        .from("conversations")
        .select("id, workspace_id")
        .eq("workspace_id", agent.workspace_id)
        .eq("channel", "preview")
        .eq("contact_phone", agentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      conversation = data;
      convError = error;
      console.log(`[ai-preview-chat] Search by agentId: conversation=${conversation?.id}, error=${convError?.message}`);
    }

    // Se reset solicitado, limpar mensagens antigas
    if (resetConversation && conversation) {
      await supabase.from("messages").delete().eq("conversation_id", conversation.id);
      await supabase
        .from("ai_conversation_sessions")
        .update({ status: "completed", ended_at: new Date().toISOString() })
        .eq("conversation_id", conversation.id)
        .eq("status", "active");
    }

    // Se não existe, criar a conversa de preview
    if (convError || !conversation) {
      const { data: newConversation, error: createError } = await supabase
        .from("conversations")
        .insert({
          workspace_id: agent.workspace_id,
          contact_name: `Preview: ${agent.name}`,
          contact_phone: agentId,
          channel: "preview",
          status: "in-progress",
          attendant_type: "ai",
          total_messages: 0,
          unread_count: 0
        })
        .select("id, workspace_id")
        .single();

      if (createError) {
        return new Response(
          JSON.stringify({ error: "Failed to create preview conversation", details: createError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      conversation = newConversation;
    }

    if (!conversation) {
      return new Response(
        JSON.stringify({ error: "Failed to get or create conversation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. SALVAR MENSAGEM DO USUÁRIO
    const { data: userMessage, error: msgError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversation.id,
        message_type: "received",
        content_type: "text",
        text_content: message.trim()
      })
      .select("id, created_at")
      .single();

    if (msgError) {
      return new Response(
        JSON.stringify({ error: "Failed to save user message", details: msgError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Atualizar contador
    const { count: messageCount } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversation.id);

    await supabase
      .from("conversations")
      .update({
        last_message: message.trim().substring(0, 100),
        last_message_at: new Date().toISOString(),
        total_messages: messageCount || 0
      })
      .eq("id", conversation.id);

    // 4. CHAMAR ai-process-conversation
    console.log(`[ai-preview-chat] Calling ai-process-conversation...`);
    
    const processResponse = await fetch(
      `${supabaseUrl}/functions/v1/ai-process-conversation`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceRoleKey}`
        },
        body: JSON.stringify({
          conversation_id: conversation.id,
          agent_id: agentId,
          debouncer_id: null,
          message_ids: [userMessage.id],
          preview_mode: true
        })
      }
    );

    if (!processResponse.ok) {
      const errorText = await processResponse.text();
      console.error("[ai-preview-chat] Error from ai-process-conversation:", errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        return new Response(
          JSON.stringify({
            success: false,
            error: errorJson.message || "AI processing failed",
            status: errorJson.status,
            reason: errorJson.reason,
            pipeline_id: errorJson.pipeline_id
          }),
          { status: processResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch {
        return new Response(
          JSON.stringify({ success: false, error: "AI processing failed", details: errorText.substring(0, 200) }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const result = await processResponse.json();
    console.log(`[ai-preview-chat] AI response received, pipeline_id: ${result.pipeline_id}`);

    // 5. BUSCAR LOGS DETALHADOS DO PIPELINE USANDO RPC
    let pipelineObject: any = null;
    
    if (result.pipeline_id) {
      console.log(`[ai-preview-chat] Fetching pipeline via RPC...`);
      
      // Aguardar um pouco para garantir que os logs foram persistidos
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Usar RPC function que bypassa RLS
      const { data: pipelineData, error: pipelineError } = await supabase
        .rpc('get_pipeline_with_steps', { p_pipeline_id: result.pipeline_id });
      
      if (pipelineError) {
        console.error(`[ai-preview-chat] RPC error:`, pipelineError.message);
      } else if (pipelineData) {
        console.log(`[ai-preview-chat] Pipeline fetched via RPC, steps: ${pipelineData.steps?.length || 0}`);
        pipelineObject = pipelineData;
      } else {
        console.warn(`[ai-preview-chat] RPC returned null`);
      }
    } else {
      console.warn(`[ai-preview-chat] No pipeline_id in result`);
    }

    // 6. RETORNAR RESPOSTA COM LOGS
    const totalDuration = Date.now() - startTime;
    console.log(`[ai-preview-chat] Completed in ${totalDuration}ms, pipeline: ${pipelineObject ? 'yes' : 'no'}, steps: ${pipelineObject?.steps?.length || 0}`);

    return new Response(
      JSON.stringify({
        success: true,
        reply: result.response_text || "",
        conversationId: conversation.id,
        userMessageId: userMessage.id,
        aiMessageId: result.message_id,
        pipelineId: result.pipeline_id,
        tokensUsed: result.tokens_used || 0,
        durationMs: totalDuration,
        aiProcessingMs: result.duration_ms || 0,
        metadata: {
          ragUsed: result.rag_used || false,
          specialistUsed: result.specialist_used || null,
          guardrailPassed: result.guardrail_passed ?? true,
          previewMode: true
        },
        // LOGS DETALHADOS DO PIPELINE
        pipeline: pipelineObject
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[ai-preview-chat] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
