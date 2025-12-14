import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

/**
 * AI Preview Clear All Endpoint
 *
 * Deleta todas as conversas de preview de um agente, incluindo:
 * - Pipeline logs e steps
 * - AI sessions
 * - Messages
 * - Conversations
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

    console.log(`[ai-preview-clear-all] Agent: ${agentId}`);

    if (!agentId) {
      return new Response(
        JSON.stringify({ success: false, error: "agentId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Buscar workspace_id do agente
    const { data: agent, error: agentError } = await supabase
      .from("ai_agents")
      .select("workspace_id")
      .eq("id", agentId)
      .single();

    if (agentError || !agent) {
      console.error("[ai-preview-clear-all] Agent not found:", agentError);
      return new Response(
        JSON.stringify({ success: false, error: "Agent not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[ai-preview-clear-all] Agent workspace: ${agent.workspace_id}`);

    // 2. Buscar todas as conversas de preview deste agente
    // Formato do contact_name: agentId_timestamp|displayName
    const { data: allConversations, error: convError } = await supabase
      .from("conversations")
      .select("id, contact_name")
      .eq("workspace_id", agent.workspace_id)
      .eq("channel", "preview");

    if (convError) {
      console.error("[ai-preview-clear-all] Error fetching conversations:", convError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to fetch conversations" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filtrar pelo agentId no contact_name
    const conversationsToDelete = (allConversations || []).filter(
      (conv: any) => conv.contact_name?.startsWith(`${agentId}_`)
    );

    console.log(`[ai-preview-clear-all] Found ${conversationsToDelete.length} conversations to delete`);

    if (conversationsToDelete.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No preview conversations found",
          deleted: { conversations: 0, messages: 0, sessions: 0, pipelines: 0, pipelineSteps: 0 }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const conversationIds = conversationsToDelete.map((c: any) => c.id);

    // 3. Buscar todos os pipeline_ids das conversas
    const { data: pipelines } = await supabase
      .from("ai_pipeline_logs")
      .select("id")
      .in("conversation_id", conversationIds);

    const pipelineIds = (pipelines || []).map((p: any) => p.id);
    console.log(`[ai-preview-clear-all] Found ${pipelineIds.length} pipelines to delete`);

    // 4. Deletar pipeline steps primeiro (FK para ai_pipeline_logs)
    let pipelineStepsDeleted = 0;
    if (pipelineIds.length > 0) {
      const { count } = await supabase
        .from("ai_pipeline_steps")
        .delete({ count: "exact" })
        .in("pipeline_id", pipelineIds);
      pipelineStepsDeleted = count || 0;
      console.log(`[ai-preview-clear-all] Deleted ${pipelineStepsDeleted} pipeline steps`);
    }

    // 5. Deletar pipeline logs
    const { count: pipelinesDeleted } = await supabase
      .from("ai_pipeline_logs")
      .delete({ count: "exact" })
      .in("conversation_id", conversationIds);
    console.log(`[ai-preview-clear-all] Deleted ${pipelinesDeleted || 0} pipeline logs`);

    // 6. Deletar AI sessions
    const { count: sessionsDeleted } = await supabase
      .from("ai_conversation_sessions")
      .delete({ count: "exact" })
      .in("conversation_id", conversationIds);
    console.log(`[ai-preview-clear-all] Deleted ${sessionsDeleted || 0} AI sessions`);

    // 7. Deletar mensagens
    const { count: messagesDeleted } = await supabase
      .from("messages")
      .delete({ count: "exact" })
      .in("conversation_id", conversationIds);
    console.log(`[ai-preview-clear-all] Deleted ${messagesDeleted || 0} messages`);

    // 8. Deletar conversas
    const { count: conversationsDeleted, error: deleteError } = await supabase
      .from("conversations")
      .delete({ count: "exact" })
      .in("id", conversationIds);

    if (deleteError) {
      console.error("[ai-preview-clear-all] Error deleting conversations:", deleteError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to delete conversations",
          details: deleteError.message
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[ai-preview-clear-all] ✅ Deleted ${conversationsDeleted || 0} conversations`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "All preview conversations deleted successfully",
        deleted: {
          conversations: conversationsDeleted || 0,
          messages: messagesDeleted || 0,
          sessions: sessionsDeleted || 0,
          pipelines: pipelinesDeleted || 0,
          pipelineSteps: pipelineStepsDeleted
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[ai-preview-clear-all] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
