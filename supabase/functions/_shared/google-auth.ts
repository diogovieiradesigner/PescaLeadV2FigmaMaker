/**
 * Módulo compartilhado para autenticação Google
 * Centraliza refresh token e validação de tokens para todas Edge Functions
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Google OAuth Config
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

// Interface para conexão Google
export interface GoogleConnection {
  id: string;
  user_id: string;
  workspace_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  google_email: string;
  google_user_id: string;
  is_active: boolean;
  last_sync_at: string | null;
  sync_error: string | null;
}

// Interface para resposta de token
export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

/**
 * Criar cliente Supabase com service role (bypass RLS)
 */
export function createServiceClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
  });
}

/**
 * Renova access token usando refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[google-auth] Token refresh error:", error);
    throw new Error("Falha ao renovar token do Google");
  }

  return response.json();
}

/**
 * Verifica se o token está expirado ou prestes a expirar
 * @param tokenExpiresAt - Data de expiração do token
 * @param bufferMinutes - Minutos de antecedência para considerar expirado (default: 5)
 */
export function isTokenExpired(tokenExpiresAt: string, bufferMinutes: number = 5): boolean {
  const expiresAt = new Date(tokenExpiresAt);
  const bufferMs = bufferMinutes * 60 * 1000;
  return new Date() > new Date(expiresAt.getTime() - bufferMs);
}

/**
 * Garante que a conexão tem um token válido
 * Renova automaticamente se necessário
 *
 * @param supabase - Cliente Supabase
 * @param connectionId - ID da conexão Google
 * @returns Conexão com token válido
 * @throws Error se não conseguir renovar ou conexão não existe
 */
export async function ensureValidToken(
  supabase: SupabaseClient,
  connectionId: string
): Promise<GoogleConnection> {
  // Buscar conexão
  const { data: connection, error: connError } = await supabase
    .from("google_calendar_connections")
    .select("*")
    .eq("id", connectionId)
    .single();

  if (connError || !connection) {
    console.error("[google-auth] Connection not found:", connectionId);
    throw new Error("Conexão não encontrada");
  }

  // Verificar se token está válido
  if (!isTokenExpired(connection.token_expires_at)) {
    console.log("[google-auth] Token still valid for connection:", connectionId);
    return connection as GoogleConnection;
  }

  console.log("[google-auth] Token expired, refreshing for connection:", connectionId);

  try {
    // Renovar token
    const tokens = await refreshAccessToken(connection.refresh_token);
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Atualizar no banco
    const { data: updatedConnection, error: updateError } = await supabase
      .from("google_calendar_connections")
      .update({
        access_token: tokens.access_token,
        token_expires_at: tokenExpiresAt.toISOString(),
        sync_error: null, // Limpar erro anterior se tinha
      })
      .eq("id", connectionId)
      .select()
      .single();

    if (updateError) {
      console.error("[google-auth] Failed to update token in DB:", updateError);
      throw new Error("Falha ao atualizar token no banco");
    }

    console.log("[google-auth] Token refreshed successfully for connection:", connectionId);
    return updatedConnection as GoogleConnection;

  } catch (err: any) {
    console.error("[google-auth] Token refresh failed:", err.message);

    // Marcar conexão como com erro
    await supabase
      .from("google_calendar_connections")
      .update({
        sync_error: `Falha ao renovar token: ${err.message}`,
      })
      .eq("id", connectionId);

    throw err;
  }
}

/**
 * Busca conexão ativa por workspace
 */
export async function getActiveConnection(
  supabase: SupabaseClient,
  workspaceId: string,
  userId?: string
): Promise<GoogleConnection | null> {
  let query = supabase
    .from("google_calendar_connections")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("[google-auth] Error fetching connection:", error);
    return null;
  }

  return data as GoogleConnection | null;
}

/**
 * Marca conexão com erro de sync
 */
export async function markConnectionError(
  supabase: SupabaseClient,
  connectionId: string,
  errorMessage: string,
  deactivate: boolean = false
): Promise<void> {
  const updates: Record<string, any> = {
    sync_error: errorMessage,
  };

  if (deactivate) {
    updates.is_active = false;
  }

  await supabase
    .from("google_calendar_connections")
    .update(updates)
    .eq("id", connectionId);

  console.log("[google-auth] Connection error marked:", connectionId, errorMessage);
}

/**
 * Limpa erro de sync da conexão
 */
export async function clearConnectionError(
  supabase: SupabaseClient,
  connectionId: string
): Promise<void> {
  await supabase
    .from("google_calendar_connections")
    .update({ sync_error: null })
    .eq("id", connectionId);
}

/**
 * Faz requisição autenticada para a API do Google
 * Automaticamente renova token se necessário
 */
export async function googleApiRequest(
  supabase: SupabaseClient,
  connectionId: string,
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Garantir token válido
  const connection = await ensureValidToken(supabase, connectionId);

  // Fazer requisição
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      "Authorization": `Bearer ${connection.access_token}`,
    },
  });

  // Se 401, tentar renovar e refazer
  if (response.status === 401) {
    console.log("[google-auth] Got 401, forcing token refresh");

    // Forçar refresh (ignorando buffer de tempo)
    const tokens = await refreshAccessToken(connection.refresh_token);
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await supabase
      .from("google_calendar_connections")
      .update({
        access_token: tokens.access_token,
        token_expires_at: tokenExpiresAt.toISOString(),
      })
      .eq("id", connectionId);

    // Refazer requisição com novo token
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        "Authorization": `Bearer ${tokens.access_token}`,
      },
    });
  }

  return response;
}
