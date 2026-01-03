import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

Deno.serve(async (req) => {
  console.log("[ai-rag-manage] Request received");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action } = body;
    console.log("[ai-rag-manage] Action:", action);

    let result;

    switch (action) {
      case "test_connection": {
        const testResponse = await fetch(`${GEMINI_BASE_URL}/models?key=${GEMINI_API_KEY}`);
        const testData = await testResponse.json();
        result = {
          success: testResponse.ok,
          status: testResponse.status,
          api_key_configured: true,
          api_key_length: GEMINI_API_KEY.length,
          models_count: testData.models?.length || 0
        };
        break;
      }

      case "list_stores": {
        const response = await fetch(`${GEMINI_BASE_URL}/fileSearchStores?key=${GEMINI_API_KEY}`);
        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Failed to list stores: ${error}`);
        }
        result = await response.json();
        break;
      }

      case "create_store": {
        if (!body.agent_id) throw new Error("agent_id is required");

        const displayName = `pesca-lead-agent-${body.agent_id}`;

        const response = await fetch(`${GEMINI_BASE_URL}/fileSearchStores?key=${GEMINI_API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ displayName })
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Failed to create store: ${error}`);
        }

        const storeResult = await response.json();
        console.log("[ai-rag-manage] Gemini store created:", storeResult.name);

        // Save to Supabase
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        const { data: collectionData, error: upsertError } = await supabase
          .from("ai_rag_collections")
          .upsert({
            agent_id: body.agent_id,
            external_store_id: storeResult.name,
            name: displayName,
            description: `File Search Store for agent ${body.agent_id}`,
            is_active: true,
            total_documents: 0
          }, { onConflict: "agent_id" })
          .select()
          .single();

        if (upsertError) {
          console.error("[ai-rag-manage] Failed to save collection to database:", upsertError);
          throw new Error(`Failed to save collection: ${upsertError.message}`);
        }

        console.log("[ai-rag-manage] Collection saved:", collectionData.id);

        result = { success: true, store: storeResult, collection: collectionData };
        break;
      }

      case "delete_store": {
        if (!body.store_name) throw new Error("store_name is required");

        const response = await fetch(
          `${GEMINI_BASE_URL}/${body.store_name}?force=true&key=${GEMINI_API_KEY}`,
          { method: "DELETE" }
        );

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Failed to delete store: ${error}`);
        }

        // Remove from Supabase
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        const { error: deleteError } = await supabase
          .from("ai_rag_collections")
          .delete()
          .eq("external_store_id", body.store_name);

        if (deleteError) {
          console.error("[ai-rag-manage] Error deleting collection from database:", deleteError);
        }

        result = { success: true };
        break;
      }

      case "upload_document": {
        if (!body.store_name || !body.file_base64 || !body.file_name || !body.file_type || !body.agent_id) {
          throw new Error("store_name, file_base64, file_name, file_type, and agent_id are required");
        }

        console.log("[ai-rag-manage] Uploading:", body.file_name);

        // Decode base64
        const binaryString = atob(body.file_base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Step 1: Initiate resumable upload
        const initResponse = await fetch(
          `https://generativelanguage.googleapis.com/upload/v1beta/${body.store_name}:uploadToFileSearchStore?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: {
              "X-Goog-Upload-Protocol": "resumable",
              "X-Goog-Upload-Command": "start",
              "X-Goog-Upload-Header-Content-Length": bytes.length.toString(),
              "X-Goog-Upload-Header-Content-Type": body.file_type,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              display_name: body.file_name,
              custom_metadata: [
                { key: "original_filename", string_value: body.file_name },
                { key: "upload_timestamp", string_value: new Date().toISOString() }
              ]
            })
          }
        );

        if (!initResponse.ok) {
          const error = await initResponse.text();
          throw new Error(`Failed to initiate upload: ${error}`);
        }

        const uploadUrl = initResponse.headers.get("x-goog-upload-url");
        if (!uploadUrl) throw new Error("No upload URL returned");

        // Step 2: Upload the actual bytes
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            "X-Goog-Upload-Offset": "0",
            "X-Goog-Upload-Command": "upload, finalize"
          },
          body: bytes
        });

        if (!uploadResponse.ok) {
          const error = await uploadResponse.text();
          throw new Error(`Failed to upload file: ${error}`);
        }

        const uploadResult = await uploadResponse.json();
        console.log("[ai-rag-manage] Upload result:", JSON.stringify(uploadResult));

        // Extract the correct document name from the response
        const documentName = uploadResult.response?.documentName || uploadResult.documentName || uploadResult.name;

        // Save to Supabase
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        const { data: collection } = await supabase
          .from("ai_rag_collections")
          .select("id")
          .eq("external_store_id", body.store_name)
          .single();

        if (!collection) throw new Error("Collection not found");

        const { data: doc, error: docError } = await supabase
          .from("ai_rag_documents")
          .insert({
            agent_id: body.agent_id,
            collection_id: collection.id,
            title: body.file_name,
            file_type: body.file_type,
            external_file_id: documentName,
            processing_status: "completed",
            processed_at: new Date().toISOString(),
            metadata: {
              original_size: bytes.length,
              mime_type: body.file_type
            }
          })
          .select()
          .single();

        if (docError) throw new Error(`Failed to save document: ${docError.message}`);

        // Increment document count
        await supabase.rpc("increment_collection_documents", { collection_id: collection.id });

        result = {
          success: true,
          document: doc,
          gemini_result: uploadResult
        };
        break;
      }

      case "delete_document": {
        if (!body.document_name) throw new Error("document_name is required");

        console.log("[ai-rag-manage] Deleting document:", body.document_name);

        // IMPORTANTE: force=true é obrigatório para deletar documentos com chunks indexados
        const response = await fetch(
          `${GEMINI_BASE_URL}/${body.document_name}?force=true&key=${GEMINI_API_KEY}`,
          { method: "DELETE" }
        );

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Failed to delete document: ${error}`);
        }

        // Remove from Supabase (trigger will decrement count automatically)
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        const { error: deleteError } = await supabase
          .from("ai_rag_documents")
          .delete()
          .eq("external_file_id", body.document_name);

        if (deleteError) {
          console.error("[ai-rag-manage] Error deleting from Supabase:", deleteError);
        }

        result = { success: true };
        break;
      }

      case "list_documents": {
        if (!body.store_name) throw new Error("store_name is required");

        const response = await fetch(
          `${GEMINI_BASE_URL}/${body.store_name}/documents?key=${GEMINI_API_KEY}`
        );

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Failed to list documents: ${error}`);
        }

        result = await response.json();
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[ai-rag-manage] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
