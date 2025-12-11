import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();
    
    switch (path) {
      case "members":
        return handleMembers(req, supabase, user.id);
      case "invites":
        return handleInvites(req, supabase, user.id);
      case "remove-member":
        return handleRemoveMember(req, supabase, user.id);
      case "update-role":
        return handleUpdateRole(req, supabase, user.id);
      case "create-invite":
        return handleCreateInvite(req, supabase, user.id);
      case "delete-invite":
        return handleDeleteInvite(req, supabase, user.id);
      default:
        return new Response(
          JSON.stringify({ 
            error: "Unknown endpoint", 
            available: ["members", "invites", "remove-member", "update-role", "create-invite", "delete-invite"] 
          }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("[workspace-team] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// GET /members?workspace_id=xxx
async function handleMembers(req: Request, supabase: any, userId: string) {
  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const url = new URL(req.url);
  const workspaceId = url.searchParams.get("workspace_id");

  if (!workspaceId) {
    return new Response(
      JSON.stringify({ error: "workspace_id required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .single();

  if (!membership) {
    return new Response(
      JSON.stringify({ error: "Voce nao e membro deste workspace" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data: members, error } = await supabase
    .from("workspace_members")
    .select(`
      user_id,
      role,
      joined_at,
      users:user_id (
        id,
        name,
        email,
        avatar_url
      )
    `)
    .eq("workspace_id", workspaceId)
    .order("joined_at", { ascending: true });

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      members: members.map(m => ({
        user_id: m.user_id,
        role: m.role,
        joined_at: m.joined_at,
        name: m.users?.name,
        email: m.users?.email,
        avatar_url: m.users?.avatar_url
      })),
      current_user_role: membership.role
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// GET /invites?workspace_id=xxx
async function handleInvites(req: Request, supabase: any, userId: string) {
  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const url = new URL(req.url);
  const workspaceId = url.searchParams.get("workspace_id");

  if (!workspaceId) {
    return new Response(
      JSON.stringify({ error: "workspace_id required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data, error } = await supabase.rpc("get_workspace_invites", {
    p_workspace_id: workspaceId,
    p_caller_id: userId
  });

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// POST /create-invite { workspace_id, role?, expires_in_days? }
async function handleCreateInvite(req: Request, supabase: any, userId: string) {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const body = await req.json();
  const { workspace_id, role = "member", expires_in_days = 7 } = body;

  if (!workspace_id) {
    return new Response(
      JSON.stringify({ error: "workspace_id required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data, error } = await supabase.rpc("create_workspace_invite", {
    p_workspace_id: workspace_id,
    p_role: role,
    p_expires_in_days: expires_in_days,
    p_user_id: userId
  });

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// POST /remove-member { workspace_id, target_user_id }
async function handleRemoveMember(req: Request, supabase: any, userId: string) {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const body = await req.json();
  const { workspace_id, target_user_id } = body;

  if (!workspace_id || !target_user_id) {
    return new Response(
      JSON.stringify({ error: "workspace_id and target_user_id required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data, error } = await supabase.rpc("remove_workspace_member_v2", {
    p_workspace_id: workspace_id,
    p_target_user_id: target_user_id,
    p_caller_id: userId
  });

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// POST /update-role { workspace_id, target_user_id, new_role }
async function handleUpdateRole(req: Request, supabase: any, userId: string) {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const body = await req.json();
  const { workspace_id, target_user_id, new_role } = body;

  if (!workspace_id || !target_user_id || !new_role) {
    return new Response(
      JSON.stringify({ error: "workspace_id, target_user_id and new_role required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data, error } = await supabase.rpc("update_member_role", {
    p_workspace_id: workspace_id,
    p_target_user_id: target_user_id,
    p_new_role: new_role,
    p_caller_id: userId
  });

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// POST /delete-invite { invite_code }
async function handleDeleteInvite(req: Request, supabase: any, userId: string) {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed, use POST" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const body = await req.json();
  const { invite_code } = body;

  if (!invite_code) {
    return new Response(
      JSON.stringify({ error: "invite_code required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data, error } = await supabase.rpc("delete_workspace_invite", {
    p_invite_code: invite_code,
    p_caller_id: userId
  });

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
