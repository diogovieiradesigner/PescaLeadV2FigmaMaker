import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ler body
    const body = await req.json();
    const { workspace_id, email, role = "member" } = body;

    // Validações
    if (!workspace_id) {
      return new Response(
        JSON.stringify({ success: false, error: "workspace_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: "E-mail é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validar role
    const validRoles = ["admin", "member", "viewer"];
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ success: false, error: `Role inválido. Use: ${validRoles.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar se quem está convidando é admin/owner do workspace
    const { data: callerMembership, error: callerError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .single();

    if (callerError || !callerMembership) {
      return new Response(
        JSON.stringify({ success: false, error: "Você não é membro deste workspace" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!['owner', 'admin'].includes(callerMembership.role)) {
      return new Response(
        JSON.stringify({ success: false, error: "Apenas owners e admins podem convidar membros" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalizar e-mail
    const normalizedEmail = email.toLowerCase().trim();

    // Buscar usuário pelo e-mail
    const { data: targetUser, error: userError } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("email", normalizedEmail)
      .single();

    if (userError || !targetUser) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Usuário não encontrado",
          error_code: "USER_NOT_FOUND",
          message: `O e-mail ${normalizedEmail} não possui uma conta no sistema. O usuário precisa criar uma conta primeiro.`
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar se já é membro
    const { data: existingMember } = await supabase
      .from("workspace_members")
      .select("user_id, role")
      .eq("workspace_id", workspace_id)
      .eq("user_id", targetUser.id)
      .single();

    if (existingMember) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Usuário já é membro",
          error_code: "ALREADY_MEMBER",
          message: `${targetUser.name || normalizedEmail} já é membro deste workspace como ${existingMember.role}.`
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Adicionar como membro
    const { error: insertError } = await supabase
      .from("workspace_members")
      .insert({
        workspace_id: workspace_id,
        user_id: targetUser.id,
        role: role,
        invited_by: user.id,
        joined_at: new Date().toISOString()
      });

    if (insertError) {
      console.error("[invite-member-by-email] Insert error:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: "Erro ao adicionar membro", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Adicionar na lookup table também
    await supabase
      .from("workspace_membership_lookup")
      .insert({
        workspace_id: workspace_id,
        user_id: targetUser.id
      })
      .catch(() => {}); // Ignorar erro se já existir

    // Buscar nome do workspace para retorno
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("name")
      .eq("id", workspace_id)
      .single();

    console.log(`[invite-member-by-email] ${targetUser.email} adicionado ao workspace ${workspace?.name} como ${role}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${targetUser.name || targetUser.email} foi adicionado como ${role}!`,
        member: {
          user_id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          role: role
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[invite-member-by-email] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
