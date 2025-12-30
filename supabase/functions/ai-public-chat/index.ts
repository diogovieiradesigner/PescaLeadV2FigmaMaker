import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitExceededResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Rate limit: 20 requisições por minuto por IP (chat com IA é mais pesado)
const RATE_LIMIT_CONFIG = {
  maxRequests: 20,
  windowSeconds: 60,
  prefix: "ai-public-chat",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Rate limiting
  const rateLimitResult = checkRateLimit(req, RATE_LIMIT_CONFIG);
  if (!rateLimitResult.allowed) {
    return rateLimitExceededResponse(rateLimitResult, corsHeaders);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { linkId, agentId, workspaceId, message, conversationId, sessionId } = body;

    console.log("[ai-public-chat] Request:", { linkId, agentId, workspaceId, message: message?.substring(0, 50), conversationId });
    console.log("[ai-public-chat] Supabase URL:", supabaseUrl);
    console.log("[ai-public-chat] Has service key:", !!supabaseServiceKey);

    // Validar parâmetros obrigatórios
    if (!linkId || !agentId || !workspaceId || !message) {
      console.log("[ai-public-chat] Missing params:", { linkId: !!linkId, agentId: !!agentId, workspaceId: !!workspaceId, message: !!message });
      return new Response(
        JSON.stringify({ success: false, error: "Missing required parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar se o link ainda está ativo - primeiro sem filtro is_active para debug
    console.log("[ai-public-chat] Querying link with id:", linkId);

    // Query direta sem filtro is_active primeiro para debug
    const { data: allLinks, error: allLinksError } = await supabase
      .from("ai_public_chat_links")
      .select("id, is_active, public_slug")
      .eq("id", linkId);

    console.log("[ai-public-chat] All links query:", {
      count: allLinks?.length,
      links: allLinks,
      error: allLinksError?.message
    });

    const { data: linkData, error: linkError } = await supabase
      .from("ai_public_chat_links")
      .select("*")
      .eq("id", linkId)
      .eq("is_active", true)
      .single();

    console.log("[ai-public-chat] Link query result:", {
      hasData: !!linkData,
      linkId: linkData?.id,
      isActive: linkData?.is_active,
      error: linkError?.message,
      errorCode: linkError?.code,
      errorDetails: linkError?.details
    });

    if (linkError || !linkData) {
      console.error("[ai-public-chat] Link not found or inactive:", {
        linkId,
        error: linkError,
        hint: "Check if link exists and is_active=true"
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Link inválido ou expirado",
          debug: { linkId, errorCode: linkError?.code, errorMessage: linkError?.message, allLinksFound: allLinks?.length }
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar expiração
    if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, error: "Link expirado" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar limite de conversas
    if (linkData.max_conversations && linkData.current_conversations >= linkData.max_conversations) {
      return new Response(
        JSON.stringify({ success: false, error: "Limite de conversas atingido" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let activeConversationId = conversationId;

    // Se não tem conversationId, criar nova conversa
    if (!activeConversationId) {
      console.log("[ai-public-chat] Creating new conversation");

      const { data: newConversation, error: convError } = await supabase
        .from("conversations")
        .insert({
          workspace_id: workspaceId,
          inbox_id: null,
          channel: "chat",
          contact_phone: `public-${sessionId || Date.now()}`,
          contact_name: `Chat Público - ${new Date().toLocaleString("pt-BR")}`,
          status: "in-progress",
          attendant_type: "ai"
        })
        .select()
        .single();

      if (convError) {
        console.error("[ai-public-chat] Error creating conversation:", {
          error: convError,
          code: convError.code,
          message: convError.message,
          details: convError.details,
          hint: convError.hint
        });
        return new Response(
          JSON.stringify({
            success: false,
            error: "Erro ao criar conversa",
            debug: { code: convError.code, message: convError.message, details: convError.details }
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      activeConversationId = newConversation.id;

      // Atualizar contador de conversas do link
      await supabase
        .from("ai_public_chat_links")
        .update({
          current_conversations: (linkData.current_conversations || 0) + 1,
          last_used_at: new Date().toISOString()
        })
        .eq("id", linkId);

      // Registrar conversa pública
      await supabase
        .from("ai_public_chat_conversations")
        .insert({
          link_id: linkId,
          session_id: sessionId || `session-${Date.now()}`,
          conversation_id: activeConversationId
        });

      // Se tem mensagem de boas-vindas, inserir
      if (linkData.welcome_message) {
        await supabase
          .from("messages")
          .insert({
            conversation_id: activeConversationId,
            content_type: "text",
            message_type: "sent",
            text_content: linkData.welcome_message,
            is_read: true
          });
      }
    }

    // Inserir mensagem do usuário
    await supabase
      .from("messages")
      .insert({
        conversation_id: activeConversationId,
        content_type: "text",
        message_type: "received",
        text_content: message,
        is_read: true
      });

    // Atualizar estatísticas do link
    await supabase
      .from("ai_public_chat_links")
      .update({
        total_messages: (linkData.total_messages || 0) + 1,
        last_used_at: new Date().toISOString()
      })
      .eq("id", linkId);

    // Chamar a função de processamento de IA (reutilizando a lógica existente)
    const aiProcessUrl = `${supabaseUrl}/functions/v1/ai-process-conversation`;

    const aiResponse = await fetch(aiProcessUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({
        conversation_id: activeConversationId,
        agent_id: agentId,
        message_text: message,
        preview_mode: false // Tratar como produção para funcionalidades completas
      })
    });

    const aiResult = await aiResponse.json();
    console.log("[ai-public-chat] AI response:", {
      httpStatus: aiResponse.status,
      aiStatus: aiResult.status,
      hasResponseText: !!aiResult.response_text,
      error: aiResult.message,
      fullResult: JSON.stringify(aiResult).substring(0, 500)
    });

    // ai-process-conversation retorna status: "success" | "error" | "blocked" | "skipped"
    if (!aiResponse.ok || aiResult.status === "error") {
      console.error("[ai-public-chat] AI processing error:", aiResult);
      return new Response(
        JSON.stringify({
          success: false,
          error: aiResult.message || "Erro ao processar mensagem",
          conversationId: activeConversationId,
          aiDebug: { httpStatus: aiResponse.status, aiStatus: aiResult.status, aiMessage: aiResult.message }
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Se foi bloqueado ou pulado, não tem resposta para retornar
    if (aiResult.status !== "success") {
      return new Response(
        JSON.stringify({
          success: true,
          reply: null,
          reason: aiResult.reason || aiResult.status,
          conversationId: activeConversationId
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        reply: aiResult.response_text,
        conversationId: activeConversationId
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[ai-public-chat] Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
