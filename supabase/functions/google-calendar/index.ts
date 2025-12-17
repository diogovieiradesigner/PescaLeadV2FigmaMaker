// Edge Function: google-calendar
// Gerencia sincronização com Google Calendar
// Endpoints:
// - GET /google-calendar/list-calendars - Lista calendários do Google
// - POST /google-calendar/select-calendars - Seleciona calendários para sync
// - POST /google-calendar/sync - Sincroniza eventos
// - GET /google-calendar/events - Busca eventos do Google

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  ensureValidToken as ensureValidTokenShared,
  createServiceClient,
  GoogleConnection,
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
    : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
}

interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  primary?: boolean;
  accessRole: string;
}

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
 * Retorna apenas o access_token para compatibilidade
 */
async function ensureValidToken(
  supabase: any,
  connection: any
): Promise<string> {
  const validConnection = await ensureValidTokenShared(supabase, connection.id);
  return validConnection.access_token;
}

/**
 * Adiciona item na fila de sync (para processamento assíncrono pelo cron)
 */
async function addToSyncQueue(
  supabase: any,
  connectionId: string,
  workspaceId: string,
  syncType: 'full' | 'incremental' | 'webhook' = 'incremental',
  priority: number = 1
): Promise<void> {
  try {
    await supabase
      .from("google_sync_queue")
      .insert({
        connection_id: connectionId,
        workspace_id: workspaceId,
        sync_type: syncType,
        priority: priority,
        status: 'pending',
      });
    console.log(`[google-calendar] Added to sync queue: ${syncType}, priority ${priority}`);
  } catch (err) {
    // Ignorar erro se já existe item pendente (não crítico)
    console.warn("[google-calendar] Failed to add to sync queue (may already exist):", err);
  }
}

/**
 * Busca calendários do Google
 */
async function listGoogleCalendars(accessToken: string): Promise<GoogleCalendar[]> {
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList?showHidden=false",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    throw new Error("Falha ao listar calendários do Google");
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * Busca eventos de um calendário Google com paginação automática
 * Busca todas as páginas para garantir que nenhum evento seja perdido
 */
async function listGoogleEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string,
  syncToken?: string
): Promise<{ events: GoogleEvent[]; nextSyncToken?: string }> {
  const allEvents: GoogleEvent[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;
  let pageCount = 0;
  const MAX_PAGES = 10; // Limite de segurança para evitar loops infinitos

  do {
    const params = new URLSearchParams({
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250", // Máximo permitido pela API
    });

    if (syncToken && pageCount === 0) {
      // Sync token só é usado na primeira requisição
      params.set("syncToken", syncToken);
    } else if (!syncToken) {
      params.set("timeMin", timeMin);
      params.set("timeMax", timeMax);
    }

    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      // Se sync token inválido, fazer full sync
      if (response.status === 410 && syncToken) {
        console.log("[google-calendar] Sync token expired, doing full sync");
        return listGoogleEvents(accessToken, calendarId, timeMin, timeMax);
      }
      throw new Error("Falha ao buscar eventos do Google");
    }

    const data = await response.json();
    const pageEvents = data.items || [];
    allEvents.push(...pageEvents);

    pageToken = data.nextPageToken;
    nextSyncToken = data.nextSyncToken || nextSyncToken;
    pageCount++;

    if (pageEvents.length > 0) {
      console.log(`[google-calendar] Page ${pageCount}: fetched ${pageEvents.length} events (total: ${allEvents.length})`);
    }

  } while (pageToken && pageCount < MAX_PAGES);

  if (pageCount >= MAX_PAGES) {
    console.warn(`[google-calendar] Reached max pages limit (${MAX_PAGES}), some events may be missing`);
  }

  return {
    events: allEvents,
    nextSyncToken,
  };
}

/**
 * Cria evento no Google Calendar
 */
async function createGoogleEvent(
  accessToken: string,
  calendarId: string,
  event: any
): Promise<GoogleEvent> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Create event error:", error);
    throw new Error("Falha ao criar evento no Google");
  }

  return response.json();
}

/**
 * Atualiza evento no Google Calendar
 */
async function updateGoogleEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  event: any
): Promise<GoogleEvent> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Update event error:", error);
    throw new Error("Falha ao atualizar evento no Google");
  }

  return response.json();
}

/**
 * Deleta evento no Google Calendar
 */
async function deleteGoogleEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  // 404 ou 410 significa que o evento já foi deletado
  if (!response.ok && response.status !== 404 && response.status !== 410) {
    throw new Error("Falha ao deletar evento no Google");
  }
}

/**
 * Converte evento interno para formato Google
 */
function internalToGoogleEvent(event: any): any {
  const googleEvent: any = {
    summary: event.title,
    description: event.description || "",
    start: {
      dateTime: event.start_time,
      timeZone: "America/Sao_Paulo",
    },
    end: {
      dateTime: event.end_time,
      timeZone: "America/Sao_Paulo",
    },
  };

  if (event.location) {
    googleEvent.location = event.location;
  }

  if (event.attendees && event.attendees.length > 0) {
    googleEvent.attendees = event.attendees
      .filter((a: any) => a.email)
      .map((a: any) => ({
        email: a.email,
        displayName: a.name,
      }));
  }

  return googleEvent;
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
  // Tratar eventos de dia inteiro
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

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const action = pathParts[pathParts.length - 1];

  try {
    // Verificar autenticação para todos os endpoints
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

    // ==================================================
    // GET /google-calendar/list-calendars - Lista calendários
    // ==================================================
    if (req.method === "GET" && action === "list-calendars") {
      const workspaceId = url.searchParams.get("workspace_id");
      if (!workspaceId) {
        return new Response(
          JSON.stringify({ error: "workspace_id é obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Buscar conexão
      const { data: connection, error: connError } = await supabase
        .from("google_calendar_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .single();

      if (connError || !connection) {
        return new Response(
          JSON.stringify({ error: "Conexão com Google não encontrada" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Garantir token válido
      const accessToken = await ensureValidToken(supabase, connection);

      // Listar calendários do Google
      const googleCalendars = await listGoogleCalendars(accessToken);

      // Buscar calendários já selecionados
      const { data: selectedCalendars } = await supabase
        .from("google_calendar_sync")
        .select("google_calendar_id")
        .eq("connection_id", connection.id);

      const selectedIds = new Set((selectedCalendars || []).map((c: any) => c.google_calendar_id));

      // Formatar resposta
      const calendars = googleCalendars.map((cal) => ({
        id: cal.id,
        name: cal.summary,
        description: cal.description,
        color: cal.backgroundColor,
        is_primary: cal.primary || false,
        access_role: cal.accessRole,
        is_selected: selectedIds.has(cal.id),
      }));

      return new Response(
        JSON.stringify({ success: true, calendars }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ==================================================
    // POST /google-calendar/select-calendars - Seleciona calendários
    // ==================================================
    if (req.method === "POST" && action === "select-calendars") {
      const body = await req.json();
      const { workspace_id, calendar_ids } = body;

      if (!workspace_id || !Array.isArray(calendar_ids)) {
        return new Response(
          JSON.stringify({ error: "workspace_id e calendar_ids são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Buscar conexão
      const { data: connection, error: connError } = await supabase
        .from("google_calendar_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("workspace_id", workspace_id)
        .eq("is_active", true)
        .single();

      if (connError || !connection) {
        return new Response(
          JSON.stringify({ error: "Conexão com Google não encontrada" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Garantir token válido
      const accessToken = await ensureValidToken(supabase, connection);

      // Buscar info dos calendários no Google
      const googleCalendars = await listGoogleCalendars(accessToken);
      const calendarMap = new Map(googleCalendars.map((c) => [c.id, c]));

      // Remover calendários não mais selecionados
      const { data: existingSyncs } = await supabase
        .from("google_calendar_sync")
        .select("id, google_calendar_id")
        .eq("connection_id", connection.id);

      const existingIds = (existingSyncs || []).map((s: any) => s.google_calendar_id);
      const toRemove = existingIds.filter((id: string) => !calendar_ids.includes(id));
      const toAdd = calendar_ids.filter((id: string) => !existingIds.includes(id));

      // Remover
      if (toRemove.length > 0) {
        await supabase
          .from("google_calendar_sync")
          .delete()
          .eq("connection_id", connection.id)
          .in("google_calendar_id", toRemove);
      }

      // Adicionar novos
      if (toAdd.length > 0) {
        const newSyncs = toAdd.map((calId: string) => {
          const googleCal = calendarMap.get(calId);
          return {
            connection_id: connection.id,
            workspace_id: workspace_id,
            user_id: user.id,
            google_calendar_id: calId,
            google_calendar_name: googleCal?.summary || calId,
            google_calendar_color: googleCal?.backgroundColor,
          };
        });

        const { data: insertedSyncs, error: insertError } = await supabase
          .from("google_calendar_sync")
          .insert(newSyncs)
          .select("id, google_calendar_id, google_calendar_name");

        if (insertError) {
          console.error("Error inserting syncs:", insertError);
          return new Response(
            JSON.stringify({ error: "Erro ao salvar calendários" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Configurar webhooks para os novos calendários (em background)
        if (insertedSyncs && insertedSyncs.length > 0) {
          const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/google-webhook`;
          const expirationTime = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 dias

          for (const newSync of insertedSyncs) {
            try {
              const channelId = crypto.randomUUID();

              console.log(`[google-calendar] Setting up webhook for new calendar ${newSync.google_calendar_name}`);

              const watchResponse = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(newSync.google_calendar_id)}/events/watch`,
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
                  .eq("id", newSync.id);

                console.log(`[google-calendar] Webhook created for ${newSync.google_calendar_name}`);
              } else {
                console.warn(`[google-calendar] Webhook setup failed for ${newSync.google_calendar_name}:`, await watchResponse.text());
                // Não falhar a operação inteira se webhook falhar
              }
            } catch (err) {
              console.error(`[google-calendar] Webhook error for ${newSync.google_calendar_name}:`, err);
              // Continuar com os outros calendários
            }
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `${toAdd.length} calendários adicionados, ${toRemove.length} removidos`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ==================================================
    // POST /google-calendar/sync - Sincronizar eventos
    // ==================================================
    if (req.method === "POST" && action === "sync") {
      const body = await req.json();
      const { workspace_id, sync_id, full_sync = false } = body;

      if (!workspace_id) {
        return new Response(
          JSON.stringify({ error: "workspace_id é obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Buscar conexão
      const { data: connection, error: connError } = await supabase
        .from("google_calendar_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("workspace_id", workspace_id)
        .eq("is_active", true)
        .single();

      if (connError || !connection) {
        return new Response(
          JSON.stringify({ error: "Conexão com Google não encontrada" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Adicionar à fila de sync (para auditoria e processamento futuro)
      await addToSyncQueue(
        supabase,
        connection.id,
        workspace_id,
        full_sync ? 'full' : 'incremental',
        1 // prioridade 1 para sync manual
      );

      // Garantir token válido
      const accessToken = await ensureValidToken(supabase, connection);

      // Buscar calendários para sync
      let syncsQuery = supabase
        .from("google_calendar_sync")
        .select("*")
        .eq("connection_id", connection.id)
        .eq("sync_enabled", true);

      if (sync_id) {
        syncsQuery = syncsQuery.eq("id", sync_id);
      }

      const { data: syncs, error: syncsError } = await syncsQuery;

      if (syncsError || !syncs || syncs.length === 0) {
        return new Response(
          JSON.stringify({ error: "Nenhum calendário configurado para sync" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Buscar calendário interno do workspace
      const { data: internalCalendar } = await supabase
        .from("internal_calendars")
        .select("id")
        .eq("workspace_id", workspace_id)
        .eq("is_active", true)
        .limit(1)
        .single();

      if (!internalCalendar) {
        return new Response(
          JSON.stringify({ error: "Calendário interno não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const startedAt = Date.now();
      let totalCreated = 0;
      let totalUpdated = 0;
      let totalDeleted = 0;

      // Criar log de sync
      const { data: syncLog } = await supabase
        .from("google_sync_log")
        .insert({
          workspace_id,
          user_id: user.id,
          operation: full_sync ? "full_sync" : "incremental_sync",
          status: "started",
        })
        .select("id")
        .single();

      try {
        // Período para sync (últimos 30 dias até próximos 90 dias)
        const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

        for (const sync of syncs) {
          console.log(`Syncing calendar: ${sync.google_calendar_name}, direction: ${sync.sync_direction || 'both'}`);

          // Verificar sync_direction: 'from_google', 'to_google', ou 'both' (default)
          const syncDirection = sync.sync_direction || 'both';
          const shouldPullFromGoogle = syncDirection === 'from_google' || syncDirection === 'both';
          const shouldPushToGoogle = syncDirection === 'to_google' || syncDirection === 'both';

          // PULL: Buscar eventos do Google (se permitido)
          let googleEvents: GoogleEvent[] = [];
          let nextSyncToken: string | undefined;

          if (shouldPullFromGoogle) {
            const syncToken = full_sync ? undefined : sync.last_sync_token;
            const result = await listGoogleEvents(
              accessToken,
              sync.google_calendar_id,
              timeMin,
              timeMax,
              syncToken
            );
            googleEvents = result.events;
            nextSyncToken = result.nextSyncToken;
            console.log(`Found ${googleEvents.length} events from Google`);
          } else {
            console.log(`Skipping pull from Google (sync_direction: ${syncDirection})`);
          }

          for (const googleEvent of googleEvents) {
            // Verificar se evento já existe
            const { data: existingEvent } = await supabase
              .from("internal_events")
              .select("id, updated_at, google_synced_at, google_etag, title")
              .eq("google_event_id", googleEvent.id)
              .eq("workspace_id", workspace_id)
              .single();

            if (googleEvent.status === "cancelled") {
              // Deletar evento cancelado
              if (existingEvent) {
                await supabase
                  .from("internal_events")
                  .update({ event_status: "cancelled" })
                  .eq("id", existingEvent.id);
                totalDeleted++;
                console.log(`[google-calendar] Event cancelled: ${existingEvent.title}`);
              }
            } else if (existingEvent) {
              // Verificar se houve mudança real usando etag
              if (existingEvent.google_etag === googleEvent.etag) {
                // Evento não mudou, pular
                continue;
              }

              // Verificar quem tem a versão mais recente (last edit wins)
              const googleUpdated = new Date(googleEvent.updated);
              const localSynced = existingEvent.google_synced_at
                ? new Date(existingEvent.google_synced_at)
                : new Date(0);
              const localUpdated = existingEvent.updated_at
                ? new Date(existingEvent.updated_at)
                : new Date(0);

              // Detectar conflito: ambos foram modificados após último sync
              const isConflict = localUpdated > localSynced && googleUpdated > localSynced;

              if (isConflict) {
                // Conflito detectado - Google wins (mais seguro), mas logamos
                console.warn(`[google-calendar] CONFLICT detected for event "${existingEvent.title}": local updated at ${localUpdated.toISOString()}, Google updated at ${googleUpdated.toISOString()}. Using Google version.`);
              }

              if (googleUpdated > localSynced) {
                // Google tem versão mais recente - atualizar local
                const internalEvent = googleToInternalEvent(
                  googleEvent,
                  workspace_id,
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
                workspace_id,
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
        }

        // Push eventos locais para Google (apenas se algum calendário permite)
        // Encontrar calendário que permite push (to_google ou both)
        const pushTargetSync = syncs.find(
          (s: any) => s.sync_direction === 'to_google' || s.sync_direction === 'both' || !s.sync_direction
        );

        if (pushTargetSync) {
          const { data: localEventsToSync } = await supabase
            .from("internal_events")
            .select("*")
            .eq("workspace_id", workspace_id)
            .eq("needs_google_sync", true)
            .neq("source", "google");

          if (localEventsToSync && localEventsToSync.length > 0) {
            console.log(`Pushing ${localEventsToSync.length} local events to Google (target: ${pushTargetSync.google_calendar_name})`);

            for (const localEvent of localEventsToSync) {
              const googleEventData = internalToGoogleEvent(localEvent);

              try {
                let googleEvent: GoogleEvent;

                if (localEvent.google_event_id) {
                  // Atualizar evento existente
                  googleEvent = await updateGoogleEvent(
                    accessToken,
                    pushTargetSync.google_calendar_id,
                    localEvent.google_event_id,
                    googleEventData
                  );
                } else {
                  // Criar novo evento
                  googleEvent = await createGoogleEvent(
                    accessToken,
                    pushTargetSync.google_calendar_id,
                    googleEventData
                  );
                }

                // Atualizar evento local com ID do Google
                await supabase
                  .from("internal_events")
                  .update({
                    google_event_id: googleEvent.id,
                    google_calendar_sync_id: pushTargetSync.id,
                    google_etag: googleEvent.etag,
                    google_synced_at: new Date().toISOString(),
                    needs_google_sync: false,
                  })
                  .eq("id", localEvent.id);
              } catch (err) {
                console.error(`Failed to sync event ${localEvent.id}:`, err);
              }
            }
          }
        } else {
          console.log("No calendar configured for push to Google (all are from_google only)");
        }

        // Atualizar log de sucesso
        const duration = Date.now() - startedAt;
        await supabase
          .from("google_sync_log")
          .update({
            status: "success",
            events_created: totalCreated,
            events_updated: totalUpdated,
            events_deleted: totalDeleted,
            completed_at: new Date().toISOString(),
            duration_ms: duration,
          })
          .eq("id", syncLog?.id);

        // Atualizar conexão
        await supabase
          .from("google_calendar_connections")
          .update({
            last_sync_at: new Date().toISOString(),
            sync_error: null,
          })
          .eq("id", connection.id);

        return new Response(
          JSON.stringify({
            success: true,
            stats: {
              created: totalCreated,
              updated: totalUpdated,
              deleted: totalDeleted,
              duration_ms: duration,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err: any) {
        console.error("Sync error:", err);

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

        // Atualizar conexão com erro
        await supabase
          .from("google_calendar_connections")
          .update({ sync_error: err.message })
          .eq("id", connection.id);

        return new Response(
          JSON.stringify({ error: err.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ==================================================
    // DELETE /google-calendar/event - Deletar evento do Google
    // ==================================================
    if (req.method === "DELETE" && action === "event") {
      const body = await req.json();
      const { event_id, workspace_id } = body;

      if (!event_id || !workspace_id) {
        return new Response(
          JSON.stringify({ error: "event_id e workspace_id são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Buscar evento interno
      const { data: internalEvent } = await supabase
        .from("internal_events")
        .select("google_event_id, google_calendar_sync_id")
        .eq("id", event_id)
        .eq("workspace_id", workspace_id)
        .single();

      if (!internalEvent?.google_event_id) {
        return new Response(
          JSON.stringify({ success: true, message: "Evento não está no Google" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Buscar sync info
      const { data: sync } = await supabase
        .from("google_calendar_sync")
        .select("google_calendar_id, connection_id")
        .eq("id", internalEvent.google_calendar_sync_id)
        .single();

      if (!sync) {
        return new Response(
          JSON.stringify({ error: "Sync não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Buscar conexão
      const { data: connection } = await supabase
        .from("google_calendar_connections")
        .select("*")
        .eq("id", sync.connection_id)
        .single();

      if (!connection) {
        return new Response(
          JSON.stringify({ error: "Conexão não encontrada" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Garantir token válido
      const accessToken = await ensureValidToken(supabase, connection);

      // Deletar no Google
      await deleteGoogleEvent(accessToken, sync.google_calendar_id, internalEvent.google_event_id);

      return new Response(
        JSON.stringify({ success: true, message: "Evento deletado do Google" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ==================================================
    // POST /google-calendar/setup-webhook - Configura webhook para um calendário
    // ==================================================
    if (req.method === "POST" && action === "setup-webhook") {
      const body = await req.json();
      const { workspace_id, sync_id } = body;

      if (!workspace_id || !sync_id) {
        return new Response(
          JSON.stringify({ error: "workspace_id e sync_id são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Buscar sync
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
        .eq("id", sync_id)
        .eq("workspace_id", workspace_id)
        .single();

      if (syncError || !sync) {
        return new Response(
          JSON.stringify({ error: "Calendário sync não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const connection = sync.connection;
      if (!connection) {
        return new Response(
          JSON.stringify({ error: "Conexão não encontrada" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Garantir token válido
      const accessToken = await ensureValidToken(supabase, connection);

      // Gerar IDs únicos para o webhook
      const channelId = crypto.randomUUID();
      const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/google-webhook`;

      // Criar webhook via Google Calendar API
      // Webhook expira em 7 dias (máximo permitido pelo Google)
      const expirationTime = Date.now() + (7 * 24 * 60 * 60 * 1000);

      console.log(`[google-calendar] Setting up webhook for calendar ${sync.google_calendar_id}`);
      console.log(`[google-calendar] Webhook URL: ${webhookUrl}`);
      console.log(`[google-calendar] Channel ID: ${channelId}`);

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

      if (!watchResponse.ok) {
        const errorText = await watchResponse.text();
        console.error("[google-calendar] Webhook setup failed:", errorText);
        return new Response(
          JSON.stringify({ error: `Falha ao configurar webhook: ${errorText}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const watchResult = await watchResponse.json();
      console.log("[google-calendar] Webhook created:", watchResult);

      // Salvar dados do webhook no banco
      const { error: updateError } = await supabase
        .from("google_calendar_sync")
        .update({
          webhook_channel_id: watchResult.id,
          webhook_resource_id: watchResult.resourceId,
          webhook_expiration: new Date(Number(watchResult.expiration)).toISOString(),
        })
        .eq("id", sync_id);

      if (updateError) {
        console.error("[google-calendar] Failed to save webhook data:", updateError);
        return new Response(
          JSON.stringify({ error: "Webhook criado mas falhou ao salvar no banco" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Criar log
      await supabase
        .from("google_sync_log")
        .insert({
          google_calendar_sync_id: sync_id,
          workspace_id,
          user_id: connection.user_id,
          operation: "webhook_setup",
          status: "success",
        });

      return new Response(
        JSON.stringify({
          success: true,
          message: "Webhook configurado com sucesso",
          webhook: {
            channel_id: watchResult.id,
            resource_id: watchResult.resourceId,
            expiration: new Date(Number(watchResult.expiration)).toISOString(),
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ==================================================
    // DELETE /google-calendar/webhook - Remove webhook de um calendário
    // ==================================================
    if (req.method === "DELETE" && action === "webhook") {
      const body = await req.json();
      const { workspace_id, sync_id } = body;

      if (!workspace_id || !sync_id) {
        return new Response(
          JSON.stringify({ error: "workspace_id e sync_id são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Buscar sync
      const { data: sync, error: syncError } = await supabase
        .from("google_calendar_sync")
        .select(`
          *,
          connection:connection_id (
            id,
            access_token,
            refresh_token,
            token_expires_at
          )
        `)
        .eq("id", sync_id)
        .eq("workspace_id", workspace_id)
        .single();

      if (syncError || !sync) {
        return new Response(
          JSON.stringify({ error: "Calendário sync não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!sync.webhook_channel_id || !sync.webhook_resource_id) {
        return new Response(
          JSON.stringify({ success: true, message: "Nenhum webhook configurado" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const connection = sync.connection;
      if (!connection) {
        return new Response(
          JSON.stringify({ error: "Conexão não encontrada" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Garantir token válido
      const accessToken = await ensureValidToken(supabase, connection);

      // Parar webhook via Google Calendar API
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
        console.warn("[google-calendar] Error stopping webhook (may already be stopped):", err);
      }

      // Limpar dados do webhook no banco
      await supabase
        .from("google_calendar_sync")
        .update({
          webhook_channel_id: null,
          webhook_resource_id: null,
          webhook_expiration: null,
        })
        .eq("id", sync_id);

      return new Response(
        JSON.stringify({ success: true, message: "Webhook removido" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Endpoint não encontrado" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Google Calendar error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
