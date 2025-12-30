// Edge Function: google-webhook
// Recebe webhooks do Google Calendar para sync em tempo real
// Este endpoint é chamado pelo Google quando há alterações nos calendários
//
// MELHORIAS:
// - Usa módulo compartilhado para refresh token
// - Adiciona item na fila de sync

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  ensureValidToken as ensureValidTokenShared,
} from "../_shared/google-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-goog-channel-id, x-goog-channel-token, x-goog-resource-id, x-goog-resource-state, x-goog-resource-uri, x-goog-message-number",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Adiciona item na fila de sync
 */
async function addToSyncQueue(
  supabase: any,
  connectionId: string,
  workspaceId: string
): Promise<void> {
  try {
    await supabase
      .from("google_sync_queue")
      .insert({
        connection_id: connectionId,
        workspace_id: workspaceId,
        sync_type: 'webhook',
        priority: 0, // Prioridade 0 para webhooks (mais urgente)
        status: 'pending',
      });
    console.log("[google-webhook] Added to sync queue");
  } catch (err) {
    console.warn("[google-webhook] Failed to add to sync queue:", err);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Apenas POST é aceito
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Headers do webhook do Google
    const channelId = req.headers.get("x-goog-channel-id");
    const channelToken = req.headers.get("x-goog-channel-token");
    const resourceId = req.headers.get("x-goog-resource-id");
    const resourceState = req.headers.get("x-goog-resource-state");
    const resourceUri = req.headers.get("x-goog-resource-uri");
    const messageNumber = req.headers.get("x-goog-message-number");

    console.log("Google webhook received:", {
      channelId,
      hasToken: !!channelToken,
      resourceId,
      resourceState,
      messageNumber,
    });

    // Validar channel token (configurado quando registramos o webhook)
    const expectedToken = Deno.env.get("GOOGLE_WEBHOOK_SECRET");
    if (expectedToken && channelToken !== expectedToken) {
      console.error("Invalid webhook token");
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    // Ignorar mensagem de sincronização inicial
    if (resourceState === "sync") {
      console.log("Sync message received, acknowledging");
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // Verificar se é uma notificação de mudança
    if (resourceState !== "exists") {
      console.log("Unknown resource state:", resourceState);
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    if (!channelId) {
      console.error("Missing channel ID");
      return new Response("Missing channel ID", { status: 400, headers: corsHeaders });
    }

    // Buscar sync pelo channel ID
    const { data: sync, error: syncError } = await supabase
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
      .eq("webhook_channel_id", channelId)
      .single();

    if (syncError || !sync) {
      console.error("Sync not found for channel:", channelId);
      // Retornar 200 para evitar que Google continue tentando
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    const connection = sync.connection;
    if (!connection) {
      console.error("Connection not found for sync:", sync.id);
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // Criar log de webhook
    const { data: syncLog } = await supabase
      .from("google_sync_log")
      .insert({
        google_calendar_sync_id: sync.id,
        workspace_id: connection.workspace_id,
        user_id: connection.user_id,
        operation: "webhook_received",
        status: "started",
      })
      .select("id")
      .single();

    const startedAt = Date.now();

    try {
      // Adicionar à fila de sync (prioridade máxima para webhook)
      await addToSyncQueue(supabase, connection.id, connection.workspace_id);

      // Garantir token válido usando módulo compartilhado
      const validConnection = await ensureValidTokenShared(supabase, connection.id);
      const accessToken = validConnection.access_token;

      // Buscar alterações incrementais usando sync token
      const params = new URLSearchParams({
        singleEvents: "true",
        maxResults: "100",
      });

      if (sync.last_sync_token) {
        params.set("syncToken", sync.last_sync_token);
      } else {
        // Se não tem sync token, buscar últimas 24h
        const timeMin = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        params.set("timeMin", timeMin);
        params.set("orderBy", "updated");
      }

      const eventsUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(sync.google_calendar_id)}/events?${params}`;

      const eventsResponse = await fetch(eventsUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!eventsResponse.ok) {
        // Se sync token expirou, fazer full sync depois
        if (eventsResponse.status === 410) {
          console.log("Sync token expired, will need full sync");
          await supabase
            .from("google_calendar_sync")
            .update({ last_sync_token: null })
            .eq("id", sync.id);
          throw new Error("Sync token expired");
        }
        throw new Error(`Failed to fetch events: ${eventsResponse.status}`);
      }

      const eventsData = await eventsResponse.json();
      const events = eventsData.items || [];
      const nextSyncToken = eventsData.nextSyncToken;

      console.log(`Processing ${events.length} changed events`);

      // Buscar calendário interno do workspace
      const { data: internalCalendar } = await supabase
        .from("internal_calendars")
        .select("id")
        .eq("workspace_id", connection.workspace_id)
        .eq("is_active", true)
        .limit(1)
        .single();

      if (!internalCalendar) {
        throw new Error("Internal calendar not found");
      }

      let created = 0;
      let updated = 0;
      let deleted = 0;

      for (const googleEvent of events) {
        // Verificar se evento já existe
        const { data: existingEvent } = await supabase
          .from("internal_events")
          .select("id")
          .eq("google_event_id", googleEvent.id)
          .eq("workspace_id", connection.workspace_id)
          .single();

        if (googleEvent.status === "cancelled") {
          // Evento cancelado
          if (existingEvent) {
            await supabase
              .from("internal_events")
              .update({ event_status: "cancelled" })
              .eq("id", existingEvent.id);
            deleted++;
          }
        } else if (existingEvent) {
          // Atualizar evento existente
          const startTime = googleEvent.start?.dateTime || `${googleEvent.start?.date}T00:00:00`;
          const endTime = googleEvent.end?.dateTime || `${googleEvent.end?.date}T23:59:59`;

          await supabase
            .from("internal_events")
            .update({
              title: googleEvent.summary || "(Sem título)",
              description: googleEvent.description || null,
              start_time: startTime,
              end_time: endTime,
              location: googleEvent.location || null,
              google_etag: googleEvent.etag,
              google_synced_at: new Date().toISOString(),
              attendees: (googleEvent.attendees || []).map((a: any) => ({
                email: a.email,
                name: a.displayName,
                status: a.responseStatus === "accepted" ? "accepted" :
                        a.responseStatus === "declined" ? "declined" : "pending",
              })),
            })
            .eq("id", existingEvent.id);
          updated++;
        } else {
          // Criar novo evento
          const startTime = googleEvent.start?.dateTime || `${googleEvent.start?.date}T00:00:00`;
          const endTime = googleEvent.end?.dateTime || `${googleEvent.end?.date}T23:59:59`;

          await supabase
            .from("internal_events")
            .insert({
              workspace_id: connection.workspace_id,
              internal_calendar_id: internalCalendar.id,
              title: googleEvent.summary || "(Sem título)",
              description: googleEvent.description || null,
              start_time: startTime,
              end_time: endTime,
              location: googleEvent.location || null,
              event_status: "confirmed",
              show_as: "busy",
              event_type: "meeting",
              source: "google",
              google_event_id: googleEvent.id,
              google_calendar_sync_id: sync.id,
              google_etag: googleEvent.etag,
              google_synced_at: new Date().toISOString(),
              attendees: (googleEvent.attendees || []).map((a: any) => ({
                email: a.email,
                name: a.displayName,
                status: a.responseStatus === "accepted" ? "accepted" :
                        a.responseStatus === "declined" ? "declined" : "pending",
              })),
            });
          created++;
        }
      }

      // Atualizar sync token
      if (nextSyncToken) {
        await supabase
          .from("google_calendar_sync")
          .update({
            last_sync_at: new Date().toISOString(),
            last_sync_token: nextSyncToken,
            sync_error: null,
          })
          .eq("id", sync.id);
      }

      // Atualizar log de sucesso
      await supabase
        .from("google_sync_log")
        .update({
          status: "success",
          events_created: created,
          events_updated: updated,
          events_deleted: deleted,
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startedAt,
        })
        .eq("id", syncLog?.id);

      console.log(`Webhook processed: ${created} created, ${updated} updated, ${deleted} deleted`);

      return new Response("OK", { status: 200, headers: corsHeaders });
    } catch (err: any) {
      console.error("Webhook processing error:", err);

      // Atualizar log de erro
      await supabase
        .from("google_sync_log")
        .update({
          status: "error",
          error_message: err.message,
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startedAt,
        })
        .eq("id", syncLog?.id);

      // Retornar 200 para evitar retry infinito do Google
      return new Response("OK", { status: 200, headers: corsHeaders });
    }
  } catch (error: any) {
    console.error("Webhook error:", error);
    return new Response("OK", { status: 200, headers: corsHeaders });
  }
});
