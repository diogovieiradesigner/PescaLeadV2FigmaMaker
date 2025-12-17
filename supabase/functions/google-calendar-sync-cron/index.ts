// Edge Function: google-calendar-sync-cron
// Processa fila de sincronização do Google Calendar
// Chamada pelo pg_cron a cada 1 minuto
//
// MELHORIAS IMPLEMENTADAS:
// - Retry com backoff exponencial para conexões com erro
// - Módulo compartilhado para refresh token
// - Respeita sync_direction

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  ensureValidToken as ensureValidTokenShared,
  createServiceClient,
  markConnectionError,
  clearConnectionError,
} from "../_shared/google-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Configurações de retry
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_BACKOFF_MINUTES = [5, 15, 60]; // Backoff: 5min, 15min, 1hora

interface GoogleEvent {
  id: string;
  summary?: string;
  description?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  location?: string;
  status: string;
  attendees?: Array<{ email: string; responseStatus: string; displayName?: string }>;
  etag: string;
  updated: string;
}

/**
 * Wrapper para usar o módulo compartilhado de refresh token
 */
async function ensureValidToken(
  supabase: any,
  connection: any
): Promise<string> {
  const validConnection = await ensureValidTokenShared(supabase, connection.id);
  return validConnection.access_token;
}

/**
 * Verifica se uma conexão com erro pode ser retentada
 * Baseado em backoff exponencial
 */
function shouldRetryConnection(connection: any): boolean {
  if (!connection.sync_error) return true;

  // Verificar número de tentativas (armazenado no erro como prefixo)
  const errorMatch = connection.sync_error.match(/^\[retry:(\d+)\]/);
  const retryCount = errorMatch ? parseInt(errorMatch[1]) : 0;

  if (retryCount >= MAX_RETRY_ATTEMPTS) {
    return false; // Máximo de tentativas atingido
  }

  // Verificar backoff time
  const backoffMinutes = RETRY_BACKOFF_MINUTES[retryCount] || 60;
  const lastUpdate = new Date(connection.updated_at);
  const nextRetry = new Date(lastUpdate.getTime() + backoffMinutes * 60 * 1000);

  return new Date() >= nextRetry;
}

/**
 * Marca conexão com erro e incrementa contador de retry
 */
async function markConnectionWithRetry(
  supabase: any,
  connectionId: string,
  errorMessage: string
): Promise<void> {
  // Buscar erro atual para pegar retry count
  const { data: conn } = await supabase
    .from("google_calendar_connections")
    .select("sync_error")
    .eq("id", connectionId)
    .single();

  const errorMatch = conn?.sync_error?.match(/^\[retry:(\d+)\]/);
  const currentRetry = errorMatch ? parseInt(errorMatch[1]) : 0;
  const nextRetry = currentRetry + 1;

  const newError = `[retry:${nextRetry}] ${errorMessage}`;

  await supabase
    .from("google_calendar_connections")
    .update({
      sync_error: newError,
      // Desativar se atingiu máximo de tentativas
      is_active: nextRetry < MAX_RETRY_ATTEMPTS,
    })
    .eq("id", connectionId);

  console.log(`[sync-cron] Connection ${connectionId} marked with retry ${nextRetry}/${MAX_RETRY_ATTEMPTS}`);
}

/**
 * Busca eventos de um calendário Google
 */
async function listGoogleEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string,
  syncToken?: string
): Promise<{ events: GoogleEvent[]; nextSyncToken?: string }> {
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  if (syncToken) {
    params.set("syncToken", syncToken);
  } else {
    params.set("timeMin", timeMin);
    params.set("timeMax", timeMax);
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    // Se sync token inválido, fazer full sync
    if (response.status === 410 && syncToken) {
      return listGoogleEvents(accessToken, calendarId, timeMin, timeMax);
    }
    throw new Error("Falha ao buscar eventos do Google");
  }

  const data = await response.json();
  return {
    events: data.items || [],
    nextSyncToken: data.nextSyncToken,
  };
}

/**
 * Converte evento Google para formato interno
 */
function googleToInternalEvent(
  googleEvent: GoogleEvent,
  workspaceId: string,
  calendarId: string,
  syncId: string
): any {
  const startTime = googleEvent.start.dateTime || `${googleEvent.start.date}T00:00:00`;
  const endTime = googleEvent.end.dateTime || `${googleEvent.end.date}T23:59:59`;

  return {
    workspace_id: workspaceId,
    internal_calendar_id: calendarId,
    title: googleEvent.summary || "(Sem título)",
    description: googleEvent.description || null,
    start_time: startTime,
    end_time: endTime,
    location: googleEvent.location || null,
    event_status: googleEvent.status === "cancelled" ? "cancelled" : "confirmed",
    show_as: "busy",
    event_type: "meeting",
    source: "google",
    google_event_id: googleEvent.id,
    google_calendar_sync_id: syncId,
    google_etag: googleEvent.etag,
    google_synced_at: new Date().toISOString(),
    attendees: (googleEvent.attendees || []).map((a) => ({
      email: a.email,
      name: a.displayName,
      status: a.responseStatus === "accepted" ? "accepted" :
              a.responseStatus === "declined" ? "declined" : "pending",
    })),
  };
}

/**
 * Sincroniza uma conexão específica
 */
async function syncConnection(supabase: any, connection: any): Promise<{
  created: number;
  updated: number;
  deleted: number;
}> {
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalDeleted = 0;

  // Garantir token válido
  const accessToken = await ensureValidToken(supabase, connection);

  // Buscar calendários para sync
  const { data: syncs } = await supabase
    .from("google_calendar_sync")
    .select("*")
    .eq("connection_id", connection.id)
    .eq("sync_enabled", true);

  if (!syncs || syncs.length === 0) {
    console.log(`[sync-cron] No calendars to sync for connection ${connection.id}`);
    return { created: 0, updated: 0, deleted: 0 };
  }

  // Buscar calendário interno do workspace
  const { data: internalCalendar } = await supabase
    .from("internal_calendars")
    .select("id")
    .eq("workspace_id", connection.workspace_id)
    .eq("is_active", true)
    .limit(1)
    .single();

  if (!internalCalendar) {
    console.log(`[sync-cron] No internal calendar for workspace ${connection.workspace_id}`);
    return { created: 0, updated: 0, deleted: 0 };
  }

  // Período para sync (últimos 7 dias até próximos 30 dias - reduzido para sync frequente)
  const timeMin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  for (const sync of syncs) {
    console.log(`[sync-cron] Syncing calendar: ${sync.google_calendar_name}, direction: ${sync.sync_direction || 'both'}`);

    // Verificar sync_direction
    const syncDirection = sync.sync_direction || 'both';
    const shouldPullFromGoogle = syncDirection === 'from_google' || syncDirection === 'both';

    if (!shouldPullFromGoogle) {
      console.log(`[sync-cron] Skipping pull from Google (sync_direction: ${syncDirection})`);
      continue;
    }

    try {
      // Usar sync token para sync incremental (mais eficiente)
      const { events: googleEvents, nextSyncToken } = await listGoogleEvents(
        accessToken,
        sync.google_calendar_id,
        timeMin,
        timeMax,
        sync.last_sync_token
      );

      console.log(`[sync-cron] Found ${googleEvents.length} events from Google`);

      for (const googleEvent of googleEvents) {
        // Verificar se evento já existe
        const { data: existingEvent } = await supabase
          .from("internal_events")
          .select("id, updated_at, google_synced_at")
          .eq("google_event_id", googleEvent.id)
          .eq("workspace_id", connection.workspace_id)
          .single();

        if (googleEvent.status === "cancelled") {
          // Deletar evento cancelado
          if (existingEvent) {
            await supabase
              .from("internal_events")
              .update({ event_status: "cancelled" })
              .eq("id", existingEvent.id);
            totalDeleted++;
          }
        } else if (existingEvent) {
          // Verificar quem tem a versão mais recente
          const googleUpdated = new Date(googleEvent.updated);
          const localSynced = existingEvent.google_synced_at
            ? new Date(existingEvent.google_synced_at)
            : new Date(0);

          if (googleUpdated > localSynced) {
            // Google tem versão mais recente - atualizar local
            const internalEvent = googleToInternalEvent(
              googleEvent,
              connection.workspace_id,
              internalCalendar.id,
              sync.id
            );
            delete internalEvent.workspace_id;
            delete internalEvent.internal_calendar_id;

            await supabase
              .from("internal_events")
              .update(internalEvent)
              .eq("id", existingEvent.id);
            totalUpdated++;
          }
        } else {
          // Criar novo evento
          const internalEvent = googleToInternalEvent(
            googleEvent,
            connection.workspace_id,
            internalCalendar.id,
            sync.id
          );

          await supabase
            .from("internal_events")
            .insert(internalEvent);
          totalCreated++;
        }
      }

      // Atualizar sync token e timestamp
      await supabase
        .from("google_calendar_sync")
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_token: nextSyncToken,
          sync_error: null,
        })
        .eq("id", sync.id);

    } catch (err: any) {
      console.error(`[sync-cron] Error syncing calendar ${sync.id}:`, err);
      await supabase
        .from("google_calendar_sync")
        .update({ sync_error: err.message })
        .eq("id", sync.id);
    }
  }

  // Atualizar conexão
  await supabase
    .from("google_calendar_connections")
    .update({
      last_sync_at: new Date().toISOString(),
      sync_error: null,
    })
    .eq("id", connection.id);

  return { created: totalCreated, updated: totalUpdated, deleted: totalDeleted };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("[sync-cron] Starting Google Calendar sync cron job...");

  try {
    // Buscar itens pendentes na fila (máximo 10 por execução)
    const { data: queueItems, error: queueError } = await supabase
      .from("google_sync_queue")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(10);

    if (queueError) {
      console.error("[sync-cron] Error fetching queue:", queueError);
      throw queueError;
    }

    if (!queueItems || queueItems.length === 0) {
      // Se não há itens na fila, buscar conexões que precisam de sync
      // Inclui conexões sem erro E conexões com erro que podem ser retentadas
      const { data: connectionsWithoutError } = await supabase
        .from("google_calendar_connections")
        .select("*")
        .eq("is_active", true)
        .is("sync_error", null)
        .or(`last_sync_at.is.null,last_sync_at.lt.${new Date(Date.now() - 60000).toISOString()}`);

      // Buscar conexões com erro para retry
      const { data: connectionsWithError } = await supabase
        .from("google_calendar_connections")
        .select("*")
        .eq("is_active", true)
        .not("sync_error", "is", null);

      // Filtrar conexões com erro que podem ser retentadas
      const retryableConnections = (connectionsWithError || []).filter(shouldRetryConnection);

      const connections = [...(connectionsWithoutError || []), ...retryableConnections];

      if (connections.length === 0) {
        console.log("[sync-cron] No connections to sync");
        return new Response(
          JSON.stringify({ success: true, message: "No connections to sync" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[sync-cron] Found ${connectionsWithoutError?.length || 0} normal + ${retryableConnections.length} retry connections`);

      // Sincronizar conexões diretamente
      let totalStats = { created: 0, updated: 0, deleted: 0 };

      for (const connection of connections.slice(0, 5)) { // Máximo 5 por execução
        try {
          console.log(`[sync-cron] Processing connection ${connection.id}${connection.sync_error ? ' (retry)' : ''}`);
          const stats = await syncConnection(supabase, connection);
          totalStats.created += stats.created;
          totalStats.updated += stats.updated;
          totalStats.deleted += stats.deleted;

          // Limpar erro se sync foi bem sucedido (conexão com retry)
          if (connection.sync_error) {
            await clearConnectionError(supabase, connection.id);
            console.log(`[sync-cron] Cleared error for connection ${connection.id} after successful retry`);
          }
        } catch (err: any) {
          console.error(`[sync-cron] Error processing connection ${connection.id}:`, err);
          // Usar novo sistema de retry com backoff
          await markConnectionWithRetry(supabase, connection.id, err.message);
        }
      }

      console.log("[sync-cron] Sync completed:", totalStats);
      return new Response(
        JSON.stringify({ success: true, stats: totalStats }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Processar itens da fila
    let totalStats = { created: 0, updated: 0, deleted: 0 };

    for (const item of queueItems) {
      try {
        // Marcar como processando
        await supabase
          .from("google_sync_queue")
          .update({ status: "processing", started_at: new Date().toISOString() })
          .eq("id", item.id);

        // Buscar conexão
        const { data: connection } = await supabase
          .from("google_calendar_connections")
          .select("*")
          .eq("id", item.connection_id)
          .single();

        if (!connection) {
          throw new Error("Connection not found");
        }

        // Sincronizar
        const stats = await syncConnection(supabase, connection);
        totalStats.created += stats.created;
        totalStats.updated += stats.updated;
        totalStats.deleted += stats.deleted;

        // Marcar como concluído
        await supabase
          .from("google_sync_queue")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", item.id);

      } catch (err: any) {
        console.error(`[sync-cron] Error processing queue item ${item.id}:`, err);
        await supabase
          .from("google_sync_queue")
          .update({
            status: "error",
            error_message: err.message,
            completed_at: new Date().toISOString(),
          })
          .eq("id", item.id);
      }
    }

    // Limpar itens antigos da fila (mais de 1 hora)
    await supabase
      .from("google_sync_queue")
      .delete()
      .in("status", ["completed", "error"])
      .lt("completed_at", new Date(Date.now() - 3600000).toISOString());

    // ============================================
    // RENOVAÇÃO DE WEBHOOKS
    // ============================================
    // Verificar webhooks que expiram em menos de 2 dias e renovar
    const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

    const { data: expiringWebhooks } = await supabase
      .from("google_calendar_sync")
      .select(`
        *,
        connection:connection_id (
          id,
          user_id,
          workspace_id,
          access_token,
          refresh_token,
          token_expires_at
        )
      `)
      .eq("sync_enabled", true)
      .not("webhook_channel_id", "is", null)
      .lt("webhook_expiration", twoDaysFromNow);

    if (expiringWebhooks && expiringWebhooks.length > 0) {
      console.log(`[sync-cron] Renewing ${expiringWebhooks.length} expiring webhooks...`);

      for (const sync of expiringWebhooks) {
        try {
          const connection = sync.connection;
          if (!connection) continue;

          // Garantir token válido
          const validConnection = await ensureValidTokenShared(supabase, connection.id);
          const accessToken = validConnection.access_token;

          // Parar webhook antigo
          if (sync.webhook_channel_id && sync.webhook_resource_id) {
            try {
              await fetch("https://www.googleapis.com/calendar/v3/channels/stop", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  id: sync.webhook_channel_id,
                  resourceId: sync.webhook_resource_id,
                }),
              });
            } catch (err) {
              console.warn(`[sync-cron] Error stopping old webhook for ${sync.id}:`, err);
            }
          }

          // Criar novo webhook
          const channelId = crypto.randomUUID();
          const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/google-webhook`;
          const expirationTime = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 dias

          const watchResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(sync.google_calendar_id)}/events/watch`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                id: channelId,
                type: "web_hook",
                address: webhookUrl,
                expiration: expirationTime,
              }),
            }
          );

          if (watchResponse.ok) {
            const watchResult = await watchResponse.json();

            await supabase
              .from("google_calendar_sync")
              .update({
                webhook_channel_id: watchResult.id,
                webhook_resource_id: watchResult.resourceId,
                webhook_expiration: new Date(Number(watchResult.expiration)).toISOString(),
              })
              .eq("id", sync.id);

            // Log de sucesso
            await supabase
              .from("google_sync_log")
              .insert({
                google_calendar_sync_id: sync.id,
                workspace_id: connection.workspace_id,
                user_id: connection.user_id,
                operation: "webhook_renew",
                status: "success",
              });

            console.log(`[sync-cron] Webhook renewed for ${sync.google_calendar_name}`);
          } else {
            const errorText = await watchResponse.text();
            console.error(`[sync-cron] Failed to renew webhook for ${sync.id}:`, errorText);

            // Limpar webhook expirado
            await supabase
              .from("google_calendar_sync")
              .update({
                webhook_channel_id: null,
                webhook_resource_id: null,
                webhook_expiration: null,
              })
              .eq("id", sync.id);
          }
        } catch (err: any) {
          console.error(`[sync-cron] Error renewing webhook for ${sync.id}:`, err);
        }
      }
    }

    console.log("[sync-cron] Queue processing completed:", totalStats);
    return new Response(
      JSON.stringify({ success: true, stats: totalStats, processed: queueItems.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[sync-cron] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
