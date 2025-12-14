// Edge Function: public-booking
// Endpoints públicos para agendamento de clientes
// Não requer autenticação

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  // Path: /public-booking/{action}
  const action = pathParts[pathParts.length - 1];

  try {
    // GET /public-booking/workspace/:slug - Buscar info do workspace para agendamento
    if (req.method === "GET" && url.searchParams.has("slug")) {
      const slug = url.searchParams.get("slug")!;

      // Buscar workspace pelo slug
      const { data: workspace, error: wsError } = await supabase
        .from("workspaces")
        .select("id, name, slug, settings")
        .eq("slug", slug)
        .single();

      if (wsError || !workspace) {
        return new Response(
          JSON.stringify({ error: "Empresa não encontrada" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Buscar configurações do calendário
      const { data: calendarSettings } = await supabase
        .from("calendar_settings")
        .select("*")
        .eq("workspace_id", workspace.id)
        .limit(1)
        .single();

      return new Response(
        JSON.stringify({
          success: true,
          workspace: {
            id: workspace.id,
            name: workspace.name,
            slug: workspace.slug,
          },
          settings: calendarSettings || {
            availability: {
              monday: [{ start: "09:00", end: "18:00" }],
              tuesday: [{ start: "09:00", end: "18:00" }],
              wednesday: [{ start: "09:00", end: "18:00" }],
              thursday: [{ start: "09:00", end: "18:00" }],
              friday: [{ start: "09:00", end: "18:00" }],
              saturday: [],
              sunday: [],
            },
            default_durations: { meeting: 60, call: 30, demo: 45, reminder: 15 },
            buffer_between_events: 15,
            min_booking_notice_hours: 2,
            max_booking_days_ahead: 30,
            timezone: "America/Sao_Paulo",
            booking_page_theme: "auto",
            booking_page_logo: null,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /public-booking/availability?workspace_id=X&date=YYYY-MM-DD - Buscar slots disponíveis
    if (req.method === "GET" && url.searchParams.has("workspace_id") && url.searchParams.has("date")) {
      const workspaceId = url.searchParams.get("workspace_id")!;
      const dateStr = url.searchParams.get("date")!;
      const eventType = url.searchParams.get("event_type") || "meeting";

      // Buscar configurações
      const { data: calendarSettings } = await supabase
        .from("calendar_settings")
        .select("availability, default_durations, buffer_between_events")
        .eq("workspace_id", workspaceId)
        .limit(1)
        .single();

      // Dia da semana
      const requestedDate = new Date(dateStr + "T12:00:00");
      const dayOfWeek = requestedDate.getDay();
      const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const dayName = dayNames[dayOfWeek];

      // Disponibilidade do dia
      const defaultAvailability = { start: "09:00", end: "18:00" };
      const dayAvailability = calendarSettings?.availability?.[dayName] || [defaultAvailability];

      if (!dayAvailability || dayAvailability.length === 0) {
        return new Response(
          JSON.stringify({
            success: true,
            date: dateStr,
            day_name: dayName,
            available_slots: [],
            message: "Sem expediente neste dia",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Buscar eventos existentes no dia
      const dayStart = new Date(dateStr + "T00:00:00").toISOString();
      const dayEnd = new Date(dateStr + "T23:59:59").toISOString();

      const { data: existingEvents } = await supabase
        .from("internal_events")
        .select("start_time, end_time")
        .eq("workspace_id", workspaceId)
        .neq("event_status", "cancelled")
        .gte("start_time", dayStart)
        .lte("start_time", dayEnd);

      // Calcular slots disponíveis
      const bufferMinutes = calendarSettings?.buffer_between_events || 15;
      const slotDuration = calendarSettings?.default_durations?.[eventType] || 60;
      const availableSlots: { start: string; end: string }[] = [];

      for (const period of dayAvailability) {
        const periodStart = new Date(`${dateStr}T${period.start}:00`);
        const periodEnd = new Date(`${dateStr}T${period.end}:00`);
        let currentSlotStart = periodStart;

        while (currentSlotStart.getTime() + slotDuration * 60 * 1000 <= periodEnd.getTime()) {
          const currentSlotEnd = new Date(currentSlotStart.getTime() + slotDuration * 60 * 1000);

          // Verificar conflito
          const hasConflict = existingEvents?.some((event: any) => {
            const eventStart = new Date(event.start_time);
            const eventEnd = new Date(event.end_time);
            const bufferedEventStart = new Date(eventStart.getTime() - bufferMinutes * 60 * 1000);
            const bufferedEventEnd = new Date(eventEnd.getTime() + bufferMinutes * 60 * 1000);
            return currentSlotStart < bufferedEventEnd && currentSlotEnd > bufferedEventStart;
          });

          // Verificar se é horário futuro (com margem mínima)
          const now = new Date();
          const minNoticeMs = (calendarSettings?.min_booking_notice_hours || 2) * 60 * 60 * 1000;
          const isFuture = currentSlotStart.getTime() > now.getTime() + minNoticeMs;

          if (!hasConflict && isFuture) {
            availableSlots.push({
              start: currentSlotStart.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false }),
              end: currentSlotEnd.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false }),
            });
          }

          currentSlotStart = new Date(currentSlotStart.getTime() + 30 * 60 * 1000);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          date: dateStr,
          day_name: dayName,
          available_slots: availableSlots,
          slot_duration: slotDuration,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /public-booking/create - Criar agendamento público
    if (req.method === "POST") {
      const body = await req.json();
      const {
        workspace_id,
        name,
        phone,
        email,
        company,
        date,
        start_time,
        event_type = "meeting",
        notes,
      } = body;

      // Validações
      if (!workspace_id || !name || !phone || !date || !start_time) {
        return new Response(
          JSON.stringify({ error: "Campos obrigatórios: workspace_id, name, phone, date, start_time" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Buscar workspace
      const { data: workspace, error: wsError } = await supabase
        .from("workspaces")
        .select("id, name")
        .eq("id", workspace_id)
        .single();

      if (wsError || !workspace) {
        return new Response(
          JSON.stringify({ error: "Workspace não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Buscar configurações do calendário
      const { data: calendarSettings } = await supabase
        .from("calendar_settings")
        .select("default_durations")
        .eq("workspace_id", workspace_id)
        .limit(1)
        .single();

      // Buscar ou criar calendário interno
      let { data: calendar } = await supabase
        .from("internal_calendars")
        .select("id")
        .eq("workspace_id", workspace_id)
        .eq("is_active", true)
        .limit(1)
        .single();

      if (!calendar) {
        const { data: newCalendar, error: calError } = await supabase
          .from("internal_calendars")
          .insert({
            workspace_id,
            name: "Calendário Principal",
            calendar_type: "workspace",
            color: "#3b82f6",
            timezone: "America/Sao_Paulo",
          })
          .select("id")
          .single();

        if (calError) {
          console.error("Error creating calendar:", calError);
          return new Response(
            JSON.stringify({ error: "Erro ao criar calendário" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        calendar = newCalendar;
      }

      // Calcular horário de início e fim
      const duration = calendarSettings?.default_durations?.[event_type] || 60;
      const startDateTime = new Date(`${date}T${start_time}:00`);
      const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 1000);

      // Verificar se horário ainda está disponível
      const { data: conflictingEvents } = await supabase
        .from("internal_events")
        .select("id")
        .eq("workspace_id", workspace_id)
        .neq("event_status", "cancelled")
        .lt("start_time", endDateTime.toISOString())
        .gt("end_time", startDateTime.toISOString());

      if (conflictingEvents && conflictingEvents.length > 0) {
        return new Response(
          JSON.stringify({ error: "Este horário não está mais disponível. Por favor, escolha outro." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Normalizar telefone
      let normalizedPhone = phone.replace(/\D/g, "");
      if (normalizedPhone.length === 11 && normalizedPhone.startsWith("0")) {
        normalizedPhone = normalizedPhone.substring(1);
      }
      if (!normalizedPhone.startsWith("55") && normalizedPhone.length <= 11) {
        normalizedPhone = "55" + normalizedPhone;
      }

      // Buscar lead existente pelo telefone ou criar novo
      let { data: existingLead } = await supabase
        .from("leads")
        .select("id, client_name")
        .eq("workspace_id", workspace_id)
        .eq("whatsapp", normalizedPhone)
        .limit(1)
        .single();

      let leadId = existingLead?.id;

      if (!leadId) {
        // Buscar primeira coluna do primeiro funil para criar o lead
        const { data: funnel } = await supabase
          .from("funnels")
          .select("id")
          .eq("workspace_id", workspace_id)
          .eq("is_active", true)
          .order("created_at", { ascending: true })
          .limit(1)
          .single();

        if (funnel) {
          const { data: column } = await supabase
            .from("funnel_columns")
            .select("id")
            .eq("funnel_id", funnel.id)
            .order("position", { ascending: true })
            .limit(1)
            .single();

          if (column) {
            // Criar novo lead
            const { data: newLead, error: leadError } = await supabase
              .from("leads")
              .insert({
                workspace_id,
                funnel_id: funnel.id,
                column_id: column.id,
                client_name: name,
                whatsapp: normalizedPhone,
                email: email || null,
                company: company || null,
                source: "booking_page",
                status: "active",
              })
              .select("id")
              .single();

            if (!leadError && newLead) {
              leadId = newLead.id;
            }
          }
        }
      }

      // Criar evento
      const eventTitle = `Agendamento: ${name}`;
      const { data: event, error: eventError } = await supabase
        .from("internal_events")
        .insert({
          workspace_id,
          internal_calendar_id: calendar.id,
          title: eventTitle,
          description: notes || `Agendamento feito via página pública\nTelefone: ${phone}\n${email ? `Email: ${email}` : ""}`,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          event_type,
          event_status: "tentative", // Pendente de confirmação
          show_as: "busy",
          lead_id: leadId || null,
          attendees: [{ name, phone: normalizedPhone, email: email || null, status: "pending" }],
        })
        .select("id, title, start_time, end_time")
        .single();

      if (eventError) {
        console.error("Error creating event:", eventError);
        return new Response(
          JSON.stringify({ error: "Erro ao criar agendamento" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Agendamento realizado com sucesso!",
          event: {
            id: event.id,
            title: event.title,
            date: date,
            start_time: start_time,
            end_time: endDateTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false }),
          },
          lead_id: leadId,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Endpoint não encontrado" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Public booking error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
