import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

/**
 * AI Preview Create Endpoint
 *
 * Cria uma conversa de preview sem enviar mensagem inicial.
 * Opcionalmente pode criar com um template de prospecção.
 *
 * Parâmetros:
 * - agentId: ID do agente
 * - conversationName: Nome da conversa (opcional)
 * - template: 'clean' | 'prospection' (default: 'clean')
 * - prospectionMessage: Mensagem de prospecção customizada (opcional)
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const payload = await req.json();
    const {
      agentId,
      conversationName,
      template = 'clean', // 'clean' ou 'prospection'
      prospectionMessage // Mensagem customizada para prospecção
    } = payload;

    console.log(`[ai-preview-create] Agent: ${agentId}, Template: ${template}`);

    // Validações
    if (!agentId) {
      return new Response(
        JSON.stringify({ error: "agentId is required" }),
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
      console.error("[ai-preview-create] Agent not found:", agentError);
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

    // 2. CRIAR CONVERSA
    // IMPORTANTE: contact_phone deve ser o agentId para que list_preview_conversations funcione
    const templateSuffix = template === 'prospection' ? ' (Prospecção)' : '';
    const displayName = conversationName || `Preview - ${new Date().toLocaleString('pt-BR')}${templateSuffix}`;

    const { data: newConversation, error: createError } = await supabase
      .from("conversations")
      .insert({
        workspace_id: agent.workspace_id,
        contact_name: displayName,
        contact_phone: agentId, // Usar agentId para consistência com list_preview_conversations
        channel: "preview",
        status: "in-progress",
        attendant_type: "ai",
        total_messages: 0,
        unread_count: 0
      })
      .select("id, workspace_id")
      .single();

    if (createError) {
      console.error("[ai-preview-create] Error creating conversation:", createError);
      return new Response(
        JSON.stringify({ error: "Failed to create conversation", details: createError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[ai-preview-create] Created conversation: ${newConversation.id}`);

    // 3. SE TEMPLATE DE PROSPECÇÃO, ADICIONAR MENSAGEM DA IA
    let aiMessageId = null;
    if (template === 'prospection' && prospectionMessage?.trim()) {
      const { data: aiMsg, error: msgError } = await supabase
        .from("messages")
        .insert({
          conversation_id: newConversation.id,
          message_type: "sent", // Mensagem enviada pela IA
          content_type: "text",
          text_content: prospectionMessage.trim()
        })
        .select("id")
        .single();

      if (msgError) {
        console.error("[ai-preview-create] Error creating prospection message:", msgError);
        // Não falhar, apenas logar
      } else {
        aiMessageId = aiMsg.id;
        console.log(`[ai-preview-create] Created prospection message: ${aiMessageId}`);

        // Atualizar contador de mensagens
        await supabase
          .from("conversations")
          .update({
            total_messages: 1,
            last_message: prospectionMessage.trim().substring(0, 100),
            last_message_at: new Date().toISOString()
          })
          .eq("id", newConversation.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        conversationId: newConversation.id,
        template,
        aiMessageId,
        displayName
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[ai-preview-create] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
