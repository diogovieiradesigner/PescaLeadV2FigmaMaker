import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

/**
 * AI Preview Reset Endpoint
 *
 * Deleta completamente uma conversa de preview, incluindo:
 * - Pipeline logs
 * - AI sessions
 * - Messages
 * - Conversation
 *
 * Usa service role para bypass RLS
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Usar service role para bypass RLS
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const payload = await req.json();
    const { agentId } = payload;

    console.log(`[ai-preview-reset] Agent: ${agentId}`);

    if (!agentId) {
      return new Response(
        JSON.stringify({ success: false, error: "agentId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 0. Buscar workspace_id do agente
    const { data: agent, error: agentError } = await supabase
      .from("ai_agents")
      .select("workspace_id")
      .eq("id", agentId)
      .single();

    if (agentError || !agent) {
      console.error("[ai-preview-reset] Agent not found:", agentError);
      return new Response(
        JSON.stringify({ success: false, error: "Agent not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[ai-preview-reset] Agent workspace: ${agent.workspace_id}`);

    // 1. Buscar conversa de preview (mesma query do ai-preview-chat)
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("id")
      .eq("workspace_id", agent.workspace_id)
      .eq("channel", "preview")
      .eq("contact_phone", agentId)
      .single();

    if (convError || !conversation) {
      console.log("[ai-preview-reset] No preview conversation found");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No preview conversation found",
          deleted: { messages: 0, sessions: 0, pipelines: 0 }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const conversationId = conversation.id;
    console.log(`[ai-preview-reset] Found conversation: ${conversationId}`);

    // 2. Deletar pipeline logs
    const { count: pipelinesDeleted } = await supabase
      .from("ai_pipeline_logs")
      .delete({ count: "exact" })
      .eq("conversation_id", conversationId);

    console.log(`[ai-preview-reset] Deleted ${pipelinesDeleted || 0} pipeline logs`);

    // 3. Deletar AI sessions
    const { count: sessionsDeleted } = await supabase
      .from("ai_conversation_sessions")
      .delete({ count: "exact" })
      .eq("conversation_id", conversationId);

    console.log(`[ai-preview-reset] Deleted ${sessionsDeleted || 0} AI sessions`);

    // 4. Deletar mensagens
    const { count: messagesDeleted } = await supabase
      .from("messages")
      .delete({ count: "exact" })
      .eq("conversation_id", conversationId);

    console.log(`[ai-preview-reset] Deleted ${messagesDeleted || 0} messages`);

    // 5. Deletar conversa
    const { error: deleteError } = await supabase
      .from("conversations")
      .delete()
      .eq("id", conversationId);

    if (deleteError) {
      console.error("[ai-preview-reset] Error deleting conversation:", deleteError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to delete conversation",
          details: deleteError.message
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[ai-preview-reset] ✅ Conversation ${conversationId} deleted successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Preview conversation reset successfully",
        conversationId,
        deleted: {
          messages: messagesDeleted || 0,
          sessions: sessionsDeleted || 0,
          pipelines: pipelinesDeleted || 0
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[ai-preview-reset] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
