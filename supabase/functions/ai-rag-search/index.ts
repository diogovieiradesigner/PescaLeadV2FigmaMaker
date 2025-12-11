import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  agent_id: string;
  query: string;
}

Deno.serve(async (req: Request) => {
  console.log("[ai-rag-search] Request received");
  
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
    
    const body: RequestBody = await req.json();
    const { agent_id, query } = body;
    
    if (!agent_id || !query) {
      throw new Error("agent_id and query are required");
    }
    
    console.log("[ai-rag-search] Query:", query, "for agent:", agent_id);
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    const { data: collection, error: collectionError } = await supabase
      .from("ai_rag_collections")
      .select("external_store_id, name")
      .eq("agent_id", agent_id)
      .eq("is_active", true)
      .single();
    
    if (collectionError || !collection) {
      console.log("[ai-rag-search] No collection found for agent");
      return new Response(
        JSON.stringify({ 
          success: true, 
          results: [], 
          message: "No RAG collection configured for this agent" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("[ai-rag-search] Using store:", collection.external_store_id);
    
    // REST API format from official docs - using gemini-2.5-flash
    const requestBody = {
      contents: [{
        parts: [{ text: query }]
      }],
      tools: [{
        file_search: {
          file_search_store_names: [collection.external_store_id]
        }
      }]
    };
    
    console.log("[ai-rag-search] Request body:", JSON.stringify(requestBody));
    
    // Use gemini-2.5-flash which supports file_search
    const response = await fetch(
      `${GEMINI_BASE_URL}/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      }
    );
    
    console.log("[ai-rag-search] Gemini response status:", response.status);
    
    if (!response.ok) {
      const error = await response.text();
      console.error("[ai-rag-search] Gemini error:", error);
      throw new Error(`Gemini API error: ${error}`);
    }
    
    const geminiResult = await response.json();
    console.log("[ai-rag-search] Gemini result:", JSON.stringify(geminiResult));
    
    const candidate = geminiResult.candidates?.[0];
    const responseText = candidate?.content?.parts?.[0]?.text || "";
    const groundingMetadata = candidate?.groundingMetadata;
    
    const chunks = groundingMetadata?.groundingChunks || [];
    const sources = chunks.map((chunk: any) => ({
      content: chunk.retrievedContext?.text || chunk.text || "",
      title: chunk.retrievedContext?.title || "Unknown",
      uri: chunk.retrievedContext?.uri || ""
    }));
    
    return new Response(
      JSON.stringify({
        success: true,
        query: query,
        response: responseText,
        sources: sources,
        raw_grounding: groundingMetadata
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("[ai-rag-search] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});