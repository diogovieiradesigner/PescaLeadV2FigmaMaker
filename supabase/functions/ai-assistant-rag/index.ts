import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  sources?: Array<{ title: string; url: string }>;
  thinking_content?: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  model_id?: string;
}

// Converte conversa para Markdown
function conversationToMarkdown(conversation: Conversation, messages: Message[]): string {
  const lines: string[] = [];

  lines.push(`# Conversa: ${conversation.title}`);
  lines.push(`Data: ${new Date(conversation.created_at).toLocaleDateString('pt-BR')}`);
  if (conversation.model_id) {
    lines.push(`Modelo: ${conversation.model_id}`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const msg of messages) {
    const time = new Date(msg.created_at).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const roleLabel = msg.role === 'user' ? 'Usuário' : 'Assistente';
    lines.push(`## ${roleLabel} (${time})`);
    lines.push(msg.content);

    // Adicionar thinking content se existir
    if (msg.thinking_content) {
      lines.push('');
      lines.push('### Raciocínio:');
      lines.push(msg.thinking_content);
    }

    // Adicionar sources se existirem
    if (msg.sources && msg.sources.length > 0) {
      lines.push('');
      lines.push('### Fontes consultadas:');
      for (const source of msg.sources) {
        lines.push(`- [${source.title}](${source.url})`);
      }
    }

    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

Deno.serve(async (req) => {
  console.log("[ai-assistant-rag] Request received");

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
    console.log("[ai-assistant-rag] Action:", action);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    let result;

    switch (action) {
      // =======================================================================
      // CREATE STORE - Cria store do Gemini para o workspace
      // =======================================================================
      case "create_store": {
        if (!body.workspace_id) throw new Error("workspace_id is required");

        const displayName = `pesca-lead-assistant-${body.workspace_id}`;

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

        // Salvar no Supabase
        const { data: store, error: insertError } = await supabase
          .from("ai_assistant_rag_stores")
          .upsert({
            workspace_id: body.workspace_id,
            external_store_id: storeResult.name,
            total_documents: 0
          }, { onConflict: "workspace_id" })
          .select()
          .single();

        if (insertError) throw insertError;

        result = { success: true, store };
        break;
      }

      // =======================================================================
      // IMPORT CONVERSATION - Importa conversa como documento Markdown
      // =======================================================================
      case "import_conversation": {
        if (!body.workspace_id || !body.conversation_id) {
          throw new Error("workspace_id and conversation_id are required");
        }

        console.log("[ai-assistant-rag] Importing conversation:", body.conversation_id);

        // 1. Buscar ou criar store
        let { data: store } = await supabase
          .from("ai_assistant_rag_stores")
          .select("*")
          .eq("workspace_id", body.workspace_id)
          .single();

        if (!store) {
          // Criar store se não existir
          const displayName = `pesca-lead-assistant-${body.workspace_id}`;
          const createResponse = await fetch(`${GEMINI_BASE_URL}/fileSearchStores?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ displayName })
          });

          if (!createResponse.ok) {
            const error = await createResponse.text();
            throw new Error(`Failed to create store: ${error}`);
          }

          const storeResult = await createResponse.json();

          const { data: newStore, error: insertError } = await supabase
            .from("ai_assistant_rag_stores")
            .insert({
              workspace_id: body.workspace_id,
              external_store_id: storeResult.name,
              total_documents: 0
            })
            .select()
            .single();

          if (insertError) throw insertError;
          store = newStore;
        }

        // 2. Verificar se já existe documento para esta conversa
        const { data: existingDoc } = await supabase
          .from("ai_assistant_rag_documents")
          .select("*")
          .eq("store_id", store.id)
          .eq("conversation_id", body.conversation_id)
          .single();

        // Se já existe, deletar do Gemini primeiro
        if (existingDoc?.external_file_id) {
          console.log("[ai-assistant-rag] Deleting existing document:", existingDoc.external_file_id);
          await fetch(
            `${GEMINI_BASE_URL}/${existingDoc.external_file_id}?force=true&key=${GEMINI_API_KEY}`,
            { method: "DELETE" }
          );

          // Deletar do banco (trigger vai decrementar contador)
          await supabase
            .from("ai_assistant_rag_documents")
            .delete()
            .eq("id", existingDoc.id);
        }

        // 3. Buscar conversa e mensagens
        const { data: conversation, error: convError } = await supabase
          .from("ai_conversations")
          .select("*")
          .eq("id", body.conversation_id)
          .single();

        if (convError || !conversation) {
          throw new Error("Conversation not found");
        }

        const { data: messages, error: msgError } = await supabase
          .from("ai_messages")
          .select("*")
          .eq("conversation_id", body.conversation_id)
          .order("created_at", { ascending: true });

        if (msgError) throw msgError;

        // 4. Converter para Markdown
        const markdown = conversationToMarkdown(conversation, messages || []);
        const encoder = new TextEncoder();
        const bytes = encoder.encode(markdown);

        console.log("[ai-assistant-rag] Markdown size:", bytes.length, "bytes");

        // 5. Upload para Gemini (resumable upload)
        const fileName = `conversa-${conversation.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.md`;

        const initResponse = await fetch(
          `https://generativelanguage.googleapis.com/upload/v1beta/${store.external_store_id}:uploadToFileSearchStore?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: {
              "X-Goog-Upload-Protocol": "resumable",
              "X-Goog-Upload-Command": "start",
              "X-Goog-Upload-Header-Content-Length": bytes.length.toString(),
              "X-Goog-Upload-Header-Content-Type": "text/markdown",
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              display_name: fileName,
              custom_metadata: [
                { key: "conversation_id", string_value: body.conversation_id },
                { key: "conversation_title", string_value: conversation.title },
                { key: "upload_timestamp", string_value: new Date().toISOString() },
                { key: "message_count", string_value: String(messages?.length || 0) }
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

        // Upload dos bytes
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
        const documentName = uploadResult.response?.documentName || uploadResult.documentName || uploadResult.name;

        console.log("[ai-assistant-rag] Upload result:", documentName);

        // 6. Salvar no banco
        const { data: doc, error: docError } = await supabase
          .from("ai_assistant_rag_documents")
          .insert({
            store_id: store.id,
            conversation_id: body.conversation_id,
            external_file_id: documentName,
            title: conversation.title,
            message_count: messages?.length || 0
          })
          .select()
          .single();

        if (docError) throw docError;

        // 7. Incrementar contador
        await supabase.rpc("increment_assistant_rag_documents", { p_store_id: store.id });

        result = { success: true, document: doc };
        break;
      }

      // =======================================================================
      // DELETE DOCUMENT - Remove documento do RAG
      // =======================================================================
      case "delete_document": {
        if (!body.document_id) throw new Error("document_id is required");

        console.log("[ai-assistant-rag] Deleting document:", body.document_id);

        // Buscar documento
        const { data: doc, error: docError } = await supabase
          .from("ai_assistant_rag_documents")
          .select("*")
          .eq("id", body.document_id)
          .single();

        if (docError || !doc) {
          throw new Error("Document not found");
        }

        // Deletar do Gemini
        if (doc.external_file_id) {
          const response = await fetch(
            `${GEMINI_BASE_URL}/${doc.external_file_id}?force=true&key=${GEMINI_API_KEY}`,
            { method: "DELETE" }
          );

          if (!response.ok) {
            const error = await response.text();
            console.error("[ai-assistant-rag] Error deleting from Gemini:", error);
            // Continua mesmo se falhar no Gemini (doc pode não existir mais)
          }
        }

        // Deletar do banco (trigger vai decrementar contador)
        const { error: deleteError } = await supabase
          .from("ai_assistant_rag_documents")
          .delete()
          .eq("id", body.document_id);

        if (deleteError) throw deleteError;

        result = { success: true };
        break;
      }

      // =======================================================================
      // LIST DOCUMENTS - Lista documentos do workspace
      // =======================================================================
      case "list_documents": {
        if (!body.workspace_id) throw new Error("workspace_id is required");

        // Buscar store
        const { data: store } = await supabase
          .from("ai_assistant_rag_stores")
          .select("*")
          .eq("workspace_id", body.workspace_id)
          .single();

        if (!store) {
          result = { success: true, documents: [], total: 0 };
          break;
        }

        // Buscar documentos com info da conversa
        const { data: documents, error: docsError } = await supabase
          .from("ai_assistant_rag_documents")
          .select(`
            *,
            conversation:ai_conversations(title, created_at)
          `)
          .eq("store_id", store.id)
          .order("imported_at", { ascending: false });

        if (docsError) throw docsError;

        result = {
          success: true,
          documents: documents || [],
          total: store.total_documents,
          store_id: store.external_store_id
        };
        break;
      }

      // =======================================================================
      // SEARCH - Busca no RAG usando Gemini File Search
      // =======================================================================
      case "search": {
        if (!body.workspace_id || !body.query) {
          throw new Error("workspace_id and query are required");
        }

        console.log("[ai-assistant-rag] Searching:", body.query);

        // Buscar store
        const { data: store, error: storeError } = await supabase
          .from("ai_assistant_rag_stores")
          .select("*")
          .eq("workspace_id", body.workspace_id)
          .single();

        if (storeError || !store || !store.external_store_id) {
          console.log("[ai-assistant-rag] No store found for workspace");
          result = {
            success: true,
            query: body.query,
            response: "",
            sources: [],
            context: "",
            message: "No RAG store configured for this workspace"
          };
          break;
        }

        if (store.total_documents === 0) {
          console.log("[ai-assistant-rag] Store has no documents");
          result = {
            success: true,
            query: body.query,
            response: "",
            sources: [],
            context: "",
            message: "No documents in RAG store"
          };
          break;
        }

        console.log("[ai-assistant-rag] Store found:", store.external_store_id, "with", store.total_documents, "documents");

        // Buscar usando Gemini file_search
        const requestBody = {
          contents: [{
            parts: [{ text: body.query }]
          }],
          tools: [{
            file_search: {
              file_search_store_names: [store.external_store_id]
            }
          }]
        };

        const response = await fetch(
          `${GEMINI_BASE_URL}/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
          }
        );

        if (!response.ok) {
          const error = await response.text();
          console.error("[ai-assistant-rag] Gemini error:", error);
          throw new Error(`Gemini API error: ${error}`);
        }

        const geminiResult = await response.json();
        console.log("[ai-assistant-rag] Gemini response:", JSON.stringify(geminiResult).slice(0, 500));

        const candidate = geminiResult.candidates?.[0];
        const responseText = candidate?.content?.parts?.[0]?.text || "";
        const groundingMetadata = candidate?.groundingMetadata;

        console.log("[ai-assistant-rag] Response text:", responseText?.slice(0, 200));
        console.log("[ai-assistant-rag] Grounding metadata:", JSON.stringify(groundingMetadata)?.slice(0, 300));

        const chunks = groundingMetadata?.groundingChunks || [];
        const sources = chunks.map((chunk: any) => ({
          content: chunk.retrievedContext?.text || chunk.text || "",
          title: chunk.retrievedContext?.title || "Unknown",
          uri: chunk.retrievedContext?.uri || ""
        }));

        console.log("[ai-assistant-rag] Found", sources.length, "sources");

        result = {
          success: true,
          query: body.query,
          response: responseText,
          sources,
          context: sources.length > 0 ? sources.map((s: any) => s.content).join("\n\n---\n\n") : responseText
        };
        break;
      }

      // =======================================================================
      // CHECK IMPORTED - Verifica se conversa já foi importada
      // =======================================================================
      case "check_imported": {
        if (!body.workspace_id || !body.conversation_id) {
          throw new Error("workspace_id and conversation_id are required");
        }

        // Buscar store
        const { data: store } = await supabase
          .from("ai_assistant_rag_stores")
          .select("id")
          .eq("workspace_id", body.workspace_id)
          .single();

        if (!store) {
          result = { success: true, imported: false };
          break;
        }

        // Verificar se existe documento
        const { data: doc } = await supabase
          .from("ai_assistant_rag_documents")
          .select("id, imported_at")
          .eq("store_id", store.id)
          .eq("conversation_id", body.conversation_id)
          .single();

        result = {
          success: true,
          imported: !!doc,
          imported_at: doc?.imported_at
        };
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
    console.error("[ai-assistant-rag] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
