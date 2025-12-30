import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-webhook-secret"
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Validate webhook secret if configured
    const webhookSecret = Deno.env.get("AI_WEBHOOK_SECRET");
    const providedSecret = req.headers.get("x-webhook-secret");
    if (webhookSecret && providedSecret !== webhookSecret) {
      console.error("[ai-webhook-receiver] Invalid webhook secret");
      return new Response(JSON.stringify({
        status: "error",
        reason: "unauthorized"
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse payload
    const payload = await req.json();
    console.log(`[ai-webhook-receiver] Event: ${payload.event}`);

    // Only process incoming messages
    if (payload.event !== "message.received" && payload.event !== "messages.upsert") {
      return new Response(JSON.stringify({
        status: "ignored",
        reason: "not a message event"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const message = payload.message;
    if (!message || !payload.conversation_id) {
      return new Response(JSON.stringify({
        status: "error",
        reason: "missing message or conversation_id"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 1. Check if conversation should be handled by AI
    const { data: shouldHandle, error: checkError } = await supabase.rpc(
      "should_ai_handle_conversation",
      { p_conversation_id: payload.conversation_id }
    );

    if (checkError) {
      console.error("[ai-webhook-receiver] Error checking AI handling:", checkError);
      throw checkError;
    }

    if (!shouldHandle) {
      console.log(`[ai-webhook-receiver] Conversation ${payload.conversation_id} not handled by AI`);
      return new Response(JSON.stringify({
        status: "skipped",
        reason: "conversation not handled by AI"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 2. Get the inbox_id from conversation to find the agent
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("id, inbox_id, lead_id")
      .eq("id", payload.conversation_id)
      .single();

    if (convError || !conversation) {
      console.error("[ai-webhook-receiver] Conversation not found:", convError);
      throw new Error("Conversation not found");
    }

    // 3. Get active agent for this inbox
    const { data: agentId, error: agentError } = await supabase.rpc(
      "get_active_agent_for_inbox",
      { p_inbox_id: conversation.inbox_id }
    );

    if (agentError || !agentId) {
      console.log(`[ai-webhook-receiver] No active agent for inbox ${conversation.inbox_id}`);
      return new Response(JSON.stringify({
        status: "skipped",
        reason: "no active agent for inbox"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 4. Get agent config for debounce time
    const { data: agent, error: agentConfigError } = await supabase
      .from("ai_agents")
      .select("id, behavior_config")
      .eq("id", agentId)
      .single();

    if (agentConfigError || !agent) {
      throw new Error("Agent config not found");
    }

    const debounceSeconds = agent.behavior_config?.timing?.debounce_seconds || 15;

    // 5. Determine content type mapping
    // WhatsApp types: text, audio, video, image, document, sticker, location, contacts
    // Our content_type: text, audio, video, image, document, etc
    const contentTypeMap: Record<string, string> = {
      "text": "text",
      "audio": "audio",
      "ptt": "audio",  // push-to-talk voice message
      "video": "video",
      "image": "image",
      "document": "document",
      "sticker": "image",
      "location": "location",
      "contacts": "contact"
    };
    const contentType = contentTypeMap[message.type] || "text";

    // 5. Save message to database
    // CAMPOS CORRETOS DA TABELA messages:
    // - message_type: 'sent' (enviada) ou 'received' (recebida)
    // - text_content: conteúdo textual
    // - provider_message_id: ID externo do provedor (WhatsApp)
    const { data: savedMessage, error: msgError } = await supabase
      .from("messages")
      .insert({
        conversation_id: payload.conversation_id,
        message_type: "received",                          // CORRIGIDO: era sender_type
        content_type: contentType,
        text_content: message.content || message.caption || message.body || "",  // CORRIGIDO: era content
        media_url: message.media_url || null,
        provider_message_id: message.id || null,           // CORRIGIDO: era external_id
        transcription_status: ["audio", "video", "ptt"].includes(message.type) ? "pending" : "none",
        payload: message.payload || null                   // dados extras do webhook
      })
      .select("id")
      .single();

    if (msgError) {
      console.error("[ai-webhook-receiver] Error saving message:", msgError);
      throw msgError;
    }

    console.log(`[ai-webhook-receiver] Message saved: ${savedMessage.id}`);

    // 6. If media (audio/video/image), queue for transcription
    const needsTranscription = ["audio", "video", "ptt", "image"].includes(message.type) && message.media_url;
    
    if (needsTranscription) {
      // Para audio/video: transcrição de voz
      // Para image: descrição da imagem
      const transcriptionType = message.type === "image" ? "image" : "audio";
      
      const { error: transcriptionError } = await supabase.rpc(
        "ai_queue_transcription",
        {
          p_message_id: savedMessage.id,
          p_media_url: message.media_url,
          p_content_type: transcriptionType
        }
      );

      if (transcriptionError) {
        console.error("[ai-webhook-receiver] Error queuing transcription:", transcriptionError);
        // Don't throw - continue with debouncer
      } else {
        console.log(`[ai-webhook-receiver] Transcription queued for message ${savedMessage.id} (type: ${transcriptionType})`);
      }
    }

    // 7. Add to debouncer
    const { data: debouncerId, error: debounceError } = await supabase.rpc(
      "ai_add_to_debouncer",
      {
        p_conversation_id: payload.conversation_id,
        p_message_id: savedMessage.id,
        p_agent_id: agentId,
        p_debounce_seconds: debounceSeconds
      }
    );

    if (debounceError) {
      console.error("[ai-webhook-receiver] Error adding to debouncer:", debounceError);
      throw debounceError;
    }

    console.log(`[ai-webhook-receiver] Added to debouncer: ${debouncerId}`);

    // 8. Update conversation last_message and unread_count
    const textPreview = (message.content || message.caption || message.body || "").substring(0, 100);
    await supabase
      .from("conversations")
      .update({
        last_message: textPreview || `[${contentType}]`,
        last_message_at: new Date().toISOString(),
        unread_count: supabase.rpc('increment', { x: 1 })  // Incrementa contador
      })
      .eq("id", payload.conversation_id);

    const duration = Date.now() - startTime;
    console.log(`[ai-webhook-receiver] Completed in ${duration}ms`);

    return new Response(JSON.stringify({
      status: "success",
      message_id: savedMessage.id,
      debouncer_id: debouncerId,
      will_transcribe: needsTranscription,
      debounce_seconds: debounceSeconds,
      duration_ms: duration
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("[ai-webhook-receiver] Error:", error);
    return new Response(JSON.stringify({
      status: "error",
      message: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});