import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAdminCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getAdminCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // ========== AUTENTICAÇÃO OBRIGATÓRIA ==========
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Criar cliente com anon key para validar o JWT do usuário
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar se é super_admin
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_super_admin")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.is_super_admin) {
      console.warn(`[exec-sql] Unauthorized access attempt by user ${user.id}`);
      return new Response(
        JSON.stringify({ success: false, error: "Super admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[exec-sql] Authorized super admin: ${user.id}`);
    // ========== FIM AUTENTICAÇÃO ==========

    const { sql } = await req.json();

    if (!sql) {
      return new Response(
        JSON.stringify({ success: false, error: "SQL required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[exec-sql] Executing:", sql.substring(0, 200));

    // Usar REST API diretamente para executar SQL arbitrário
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseServiceKey,
        "Authorization": `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ sql_text: sql })
    });

    // Se não existir a função exec_sql, tentar executar via query direta
    if (!response.ok) {
      // Tentar criar a função primeiro
      const { data, error } = await supabase.rpc('query', { query_text: sql });

      if (error) {
        // Última tentativa - executar via postgres
        const pgResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseServiceKey,
            "Authorization": `Bearer ${supabaseServiceKey}`,
            "Prefer": "return=representation"
          }
        });

        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[exec-sql] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
