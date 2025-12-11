import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let processedCount = 0;
  let errorCount = 0;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. First, move ready debouncer items to PGMQ
    const { data: movedCount, error: moveError } = await supabase
      .rpc("ai_debouncer_to_pgmq");

    if (moveError) {
      console.error("[ai-process-queue] Error moving debouncer to PGMQ:", moveError);
    } else if (movedCount > 0) {
      console.log(`[ai-process-queue] Moved ${movedCount} items from debouncer to PGMQ`);
    }

    // 2. Read messages from processing queue (batch of 3)
    // Parâmetros: queue_name, vt_seconds, qty
    const { data: queueMessages, error: readError } = await supabase
      .rpc("pgmq_read", {
        queue_name: "ai_processing_queue",
        vt_seconds: 120,
        qty: 3,
      });

    if (readError) {
      console.error("[ai-process-queue] Error reading queue:", readError);
      throw readError;
    }

    if (!queueMessages || queueMessages.length === 0) {
      return new Response(
        JSON.stringify({ 
          status: "empty", 
          message: "No messages in queue",
          debouncer_moved: movedCount || 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[ai-process-queue] Processing ${queueMessages.length} conversations`);

    // 3. Process each queue message
    for (const queueMsg of queueMessages) {
      const job = queueMsg.message;
      
      try {
        console.log(`[ai-process-queue] Processing conversation ${job.conversation_id}`);

        // Update debouncer status
        await supabase
          .from("ai_debouncer_queue")
          .update({ status: "processing" })
          .eq("id", job.debouncer_id);

        // Call ai-process-conversation
        const processResponse = await fetch(
          `${supabaseUrl}/functions/v1/ai-process-conversation`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              conversation_id: job.conversation_id,
              agent_id: job.agent_id,
              message_ids: job.message_ids,
              debouncer_id: job.debouncer_id,
            }),
          }
        );

        if (!processResponse.ok) {
          const errorText = await processResponse.text();
          throw new Error(`Process conversation failed: ${errorText}`);
        }

        const processResult = await processResponse.json();
        console.log(`[ai-process-queue] Conversation ${job.conversation_id} processed:`, processResult);

        // Delete from queue on success
        // Parâmetros: queue_name, msg_id
        await supabase.rpc("pgmq_delete", {
          queue_name: "ai_processing_queue",
          msg_id: queueMsg.msg_id,
        });

        processedCount++;

      } catch (jobError) {
        console.error(`[ai-process-queue] Error processing ${job.conversation_id}:`, jobError);
        
        // Update debouncer with error
        await supabase
          .from("ai_debouncer_queue")
          .update({ 
            status: "failed",
            last_error: jobError.message,
            retry_count: queueMsg.read_ct || 1,
          })
          .eq("id", job.debouncer_id);

        // If too many retries, archive the message
        if ((queueMsg.read_ct || 0) >= 3) {
          console.log(`[ai-process-queue] Max retries reached for ${job.conversation_id}, archiving`);
          // Parâmetros: p_queue_name, p_msg_id (com prefixo p_)
          await supabase.rpc("pgmq_archive", {
            p_queue_name: "ai_processing_queue",
            p_msg_id: queueMsg.msg_id,
          });
        }

        errorCount++;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[ai-process-queue] Completed: ${processedCount} success, ${errorCount} errors in ${duration}ms`);

    return new Response(
      JSON.stringify({
        status: "success",
        processed: processedCount,
        errors: errorCount,
        debouncer_moved: movedCount || 0,
        duration_ms: duration,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[ai-process-queue] Fatal error:", error);
    return new Response(
      JSON.stringify({ status: "error", message: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});