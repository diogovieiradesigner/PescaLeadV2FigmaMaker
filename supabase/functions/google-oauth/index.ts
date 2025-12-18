// Edge Function: google-oauth
// Gerencia fluxo OAuth com Google Calendar
// Endpoints:
// - GET /google-oauth/auth-url - Gera URL de autorização
// - GET /google-oauth/callback - Recebe callback do Google
// - POST /google-oauth/disconnect - Desconecta conta Google
// - POST /google-oauth/refresh - Renova access token
// - GET /google-oauth/status - Status da conexão

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  createServiceClient,
  refreshAccessToken,
  ensureValidToken,
} from "../_shared/google-auth.ts";

// Domínios permitidos para CORS
const ALLOWED_ORIGINS = [
  "https://hub.pescalead.com.br",
  "http://localhost:5173",
  "http://localhost:3000",
];

// Função para obter headers CORS dinâmicos
function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0]; // Fallback para produção

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
}

// Google OAuth Config
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const GOOGLE_REDIRECT_URI = Deno.env.get("GOOGLE_REDIRECT_URI") || "https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/google-oauth/callback";

// Scopes necessários para Google Calendar
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

/**
 * Troca authorization code por tokens
 */
async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: GOOGLE_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Token exchange error:", error);
    throw new Error("Falha ao obter tokens do Google");
  }

  return response.json();
}

/**
 * Busca informações do usuário Google
 */
async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Falha ao obter informações do usuário Google");
  }

  return response.json();
}

/**
 * Revoga tokens no Google
 */
async function revokeGoogleTokens(accessToken: string): Promise<void> {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
    method: "POST",
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Usar cliente com service role para bypass RLS
  const supabase = createServiceClient();

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const action = pathParts[pathParts.length - 1];

  try {
    // ==================================================
    // GET /google-oauth/auth-url - Gera URL de autorização
    // ==================================================
    if (req.method === "GET" && action === "auth-url") {
      // Verificar autenticação
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Não autorizado" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Token inválido" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const workspaceId = url.searchParams.get("workspace_id");
      if (!workspaceId) {
        return new Response(
          JSON.stringify({ error: "workspace_id é obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Gerar state para segurança (inclui user_id e workspace_id)
      const state = btoa(JSON.stringify({
        user_id: user.id,
        workspace_id: workspaceId,
        timestamp: Date.now(),
      }));

      // Construir URL de autorização
      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", GOOGLE_REDIRECT_URI);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", GOOGLE_SCOPES);
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent"); // Força exibição de consentimento para obter refresh_token
      authUrl.searchParams.set("state", state);

      console.log("[google-oauth] Auth URL redirect_uri:", GOOGLE_REDIRECT_URI);
      console.log("[google-oauth] Client ID:", GOOGLE_CLIENT_ID?.substring(0, 20) + "...");
      console.log("[google-oauth] Full auth URL:", authUrl.toString());

      return new Response(
        JSON.stringify({
          success: true,
          auth_url: authUrl.toString(),
          debug: {
            redirect_uri: GOOGLE_REDIRECT_URI,
            client_id_prefix: GOOGLE_CLIENT_ID?.substring(0, 20)
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ==================================================
    // GET /google-oauth/callback - Callback do Google OAuth
    // ==================================================
    if (req.method === "GET" && action === "callback") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const error = url.searchParams.get("error");

      // URL base para redirecionamento - SEMPRE usar hub.pescalead.com.br
      const appBaseUrl = "https://hub.pescalead.com.br";

      console.log("[google-oauth] === CALLBACK STARTED ===");
      console.log("[google-oauth] Code present:", !!code);
      console.log("[google-oauth] State present:", !!state);
      console.log("[google-oauth] Error:", error);
      console.log("[google-oauth] App base URL:", appBaseUrl);

      if (error) {
        console.error("[google-oauth] Google OAuth error:", error);
        return new Response(null, {
          status: 302,
          headers: { "Location": `${appBaseUrl}/calendar?google_error=${encodeURIComponent(error)}` }
        });
      }

      if (!code || !state) {
        console.error("[google-oauth] Missing code or state");
        return new Response(null, {
          status: 302,
          headers: { "Location": `${appBaseUrl}/calendar?google_error=missing_params` }
        });
      }

      // Decodificar state
      let stateData: { user_id: string; workspace_id: string; timestamp: number };
      try {
        stateData = JSON.parse(atob(state));
        console.log("[google-oauth] State decoded successfully");
      } catch (e) {
        console.error("[google-oauth] Failed to decode state:", e);
        return new Response(null, {
          status: 302,
          headers: { "Location": `${appBaseUrl}/calendar?google_error=invalid_state` }
        });
      }

      // Verificar se o state não expirou (15 minutos)
      if (Date.now() - stateData.timestamp > 15 * 60 * 1000) {
        console.error("[google-oauth] State expired");
        return new Response(null, {
          status: 302,
          headers: { "Location": `${appBaseUrl}/calendar?google_error=state_expired` }
        });
      }

      try {
        console.log("[google-oauth] Starting token exchange...");
        console.log("[google-oauth] User ID:", stateData.user_id);
        console.log("[google-oauth] Workspace ID:", stateData.workspace_id);

        // Trocar code por tokens
        const tokens = await exchangeCodeForTokens(code);
        console.log("[google-oauth] Tokens received!");
        console.log("[google-oauth] Has access_token:", !!tokens.access_token);
        console.log("[google-oauth] Has refresh_token:", !!tokens.refresh_token);
        console.log("[google-oauth] Expires in:", tokens.expires_in);

        // Buscar informações do usuário Google
        const googleUser = await getGoogleUserInfo(tokens.access_token);
        console.log("[google-oauth] Google user email:", googleUser.email);
        console.log("[google-oauth] Google user ID:", googleUser.id);

        // Calcular expiração do token
        const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);
        console.log("[google-oauth] Token expires at:", tokenExpiresAt.toISOString());

        // Verificar se já existe conexão para este usuário/workspace
        console.log("[google-oauth] Checking for existing connection...");
        const { data: existingConnection, error: selectError } = await supabase
          .from("google_calendar_connections")
          .select("id")
          .eq("user_id", stateData.user_id)
          .eq("workspace_id", stateData.workspace_id)
          .maybeSingle();

        console.log("[google-oauth] Existing connection:", existingConnection);
        if (selectError) {
          console.error("[google-oauth] Select error:", JSON.stringify(selectError));
        }

        let connectionId: string;

        if (existingConnection) {
          console.log("[google-oauth] Updating existing connection:", existingConnection.id);
          // Atualizar conexão existente
          const { data: updateData, error: updateError } = await supabase
            .from("google_calendar_connections")
            .update({
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token || undefined,
              token_expires_at: tokenExpiresAt.toISOString(),
              google_email: googleUser.email,
              google_user_id: googleUser.id,
              is_active: true,
              sync_error: null,
              last_sync_at: null,
            })
            .eq("id", existingConnection.id)
            .select()
            .single();

          if (updateError) {
            console.error("[google-oauth] Update error:", JSON.stringify(updateError));
            return new Response(null, {
              status: 302,
              headers: { "Location": `${appBaseUrl}/calendar?google_error=db_update_error&details=${encodeURIComponent(updateError.message || 'unknown')}` }
            });
          }
          console.log("[google-oauth] Connection UPDATED successfully!");
          connectionId = existingConnection.id;
        } else {
          console.log("[google-oauth] Creating NEW connection...");
          console.log("[google-oauth] Insert data:", JSON.stringify({
            user_id: stateData.user_id,
            workspace_id: stateData.workspace_id,
            google_email: googleUser.email,
            google_user_id: googleUser.id,
          }));

          // Criar nova conexão
          const { data: insertData, error: insertError } = await supabase
            .from("google_calendar_connections")
            .insert({
              user_id: stateData.user_id,
              workspace_id: stateData.workspace_id,
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token!,
              token_expires_at: tokenExpiresAt.toISOString(),
              google_email: googleUser.email,
              google_user_id: googleUser.id,
            })
            .select()
            .single();

          if (insertError) {
            console.error("[google-oauth] INSERT ERROR:", JSON.stringify(insertError));
            console.error("[google-oauth] Insert error code:", insertError.code);
            console.error("[google-oauth] Insert error message:", insertError.message);
            console.error("[google-oauth] Insert error details:", insertError.details);
            return new Response(null, {
              status: 302,
              headers: { "Location": `${appBaseUrl}/calendar?google_error=db_insert_error&code=${insertError.code}&details=${encodeURIComponent(insertError.message || 'unknown')}` }
            });
          }

          console.log("[google-oauth] Connection CREATED successfully!");
          console.log("[google-oauth] New connection ID:", insertData?.id);
          connectionId = insertData?.id;
        }

        console.log("[google-oauth] === CALLBACK SUCCESS ===");
        console.log("[google-oauth] Final connection ID:", connectionId);
        console.log("[google-oauth] Redirecting to:", `${appBaseUrl}/calendar?google_connected=true`);

        // Redirecionar para o calendário com sucesso
        return new Response(null, {
          status: 302,
          headers: { "Location": `${appBaseUrl}/calendar?google_connected=true` }
        });
      } catch (err: any) {
        console.error("[google-oauth] EXCEPTION in callback:", err);
        console.error("[google-oauth] Exception message:", err.message);
        console.error("[google-oauth] Exception stack:", err.stack);
        return new Response(null, {
          status: 302,
          headers: { "Location": `${appBaseUrl}/calendar?google_error=${encodeURIComponent(err.message || 'unknown')}` }
        });
      }
    }

    // ==================================================
    // POST /google-oauth/disconnect - Desconectar Google
    // ==================================================
    if (req.method === "POST" && action === "disconnect") {
      // Verificar autenticação
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Não autorizado" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Token inválido" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const body = await req.json();
      const { workspace_id } = body;

      if (!workspace_id) {
        return new Response(
          JSON.stringify({ error: "workspace_id é obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Buscar conexão
      const { data: connection } = await supabase
        .from("google_calendar_connections")
        .select("id, access_token")
        .eq("user_id", user.id)
        .eq("workspace_id", workspace_id)
        .single();

      if (!connection) {
        return new Response(
          JSON.stringify({ error: "Conexão não encontrada" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Revogar tokens no Google (best effort)
      try {
        await revokeGoogleTokens(connection.access_token);
      } catch (err) {
        console.warn("Failed to revoke Google tokens:", err);
      }

      // Deletar calendários sincronizados
      await supabase
        .from("google_calendar_sync")
        .delete()
        .eq("connection_id", connection.id);

      // Deletar conexão
      const { error: deleteError } = await supabase
        .from("google_calendar_connections")
        .delete()
        .eq("id", connection.id);

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: "Erro ao desconectar" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Google Calendar desconectado com sucesso" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ==================================================
    // POST /google-oauth/refresh - Renovar access token
    // ==================================================
    if (req.method === "POST" && action === "refresh") {
      // Verificar autenticação - SEGURANÇA: usuário deve estar logado
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Não autorizado" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Token inválido" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const body = await req.json();
      const { connection_id } = body;

      if (!connection_id) {
        return new Response(
          JSON.stringify({ error: "connection_id é obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Buscar conexão - SEGURANÇA: verificar se pertence ao usuário
      const { data: connection, error: connError } = await supabase
        .from("google_calendar_connections")
        .select("id, refresh_token, user_id")
        .eq("id", connection_id)
        .single();

      if (connError || !connection) {
        return new Response(
          JSON.stringify({ error: "Conexão não encontrada" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // SEGURANÇA: Verificar se o usuário é dono da conexão
      if (connection.user_id !== user.id) {
        console.warn(`[google-oauth] User ${user.id} tried to refresh connection owned by ${connection.user_id}`);
        return new Response(
          JSON.stringify({ error: "Acesso negado" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        // Usar módulo compartilhado para refresh (já atualiza no banco)
        const validConnection = await ensureValidToken(supabase, connection_id);

        return new Response(
          JSON.stringify({
            success: true,
            expires_at: validConnection.token_expires_at,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err: any) {
        // Marcar conexão como com erro
        await supabase
          .from("google_calendar_connections")
          .update({
            sync_error: err.message,
            is_active: false,
          })
          .eq("id", connection_id);

        return new Response(
          JSON.stringify({ error: err.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ==================================================
    // GET /google-oauth/status - Status da conexão
    // ==================================================
    if (req.method === "GET" && action === "status") {
      // Verificar autenticação
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Não autorizado" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Token inválido" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const workspaceId = url.searchParams.get("workspace_id");
      if (!workspaceId) {
        return new Response(
          JSON.stringify({ error: "workspace_id é obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Buscar conexão
      const { data: connection } = await supabase
        .from("google_calendar_connections")
        .select(`
          id,
          google_email,
          is_active,
          last_sync_at,
          sync_error,
          created_at,
          token_expires_at
        `)
        .eq("user_id", user.id)
        .eq("workspace_id", workspaceId)
        .single();

      if (!connection) {
        return new Response(
          JSON.stringify({ connected: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Buscar calendários sincronizados
      const { data: syncs } = await supabase
        .from("google_calendar_sync")
        .select("id, google_calendar_id, google_calendar_name, google_calendar_color, sync_enabled, last_sync_at")
        .eq("connection_id", connection.id);

      return new Response(
        JSON.stringify({
          connected: true,
          connection: {
            id: connection.id,
            google_email: connection.google_email,
            is_active: connection.is_active,
            last_sync_at: connection.last_sync_at,
            sync_error: connection.sync_error,
            created_at: connection.created_at,
            token_expires_soon: new Date(connection.token_expires_at) < new Date(Date.now() + 5 * 60 * 1000),
          },
          calendars: syncs || [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Endpoint não encontrado" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Google OAuth error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
