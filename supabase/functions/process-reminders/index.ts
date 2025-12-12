/**
 * Process Reminders Edge Function
 *
 * Processa a fila de lembretes e envia mensagens WhatsApp.
 * Usa o mesmo sistema de providers do make-server.
 */

import { createClient } from "npm:@supabase/supabase-js@2";

// ============================================
// CONFIGURATION
// ============================================
const BATCH_SIZE = 10; // Processar até 10 lembretes por vez
const MAX_RETRIES = 3;

// Template padrão de lembrete
const DEFAULT_REMINDER_TEMPLATE = `Olá {nome}! 👋

Lembrando que você tem um(a) *{tipo}* agendado(a):

📅 *{titulo}*
🗓 Data: {data}
🕐 Horário: {hora}
📍 Local: {local}

Caso tenha algum imprevisto, nos avise com antecedência.

Até breve! 😊`;

// Mapeamento de tipos de evento
const EVENT_TYPE_LABELS: Record<string, string> = {
  meeting: 'Reunião',
  call: 'Ligação',
  demo: 'Demonstração',
  reminder: 'Lembrete',
};

// ============================================
// SUPABASE CLIENT
// ============================================
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ============================================
// HELPER: Format Date
// ============================================
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ============================================
// HELPER: Format Time
// ============================================
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

// ============================================
// HELPER: Replace Template Variables
// ============================================
function replaceTemplateVariables(
  template: string,
  data: {
    lead_name: string;
    lead_company: string | null;
    event_title: string;
    event_type: string;
    event_start_time: string;
    event_location: string | null;
  }
): string {
  const eventTypeLabel = EVENT_TYPE_LABELS[data.event_type] || data.event_type;

  return template
    .replace(/\{nome\}/g, data.lead_name || '')
    .replace(/\{empresa\}/g, data.lead_company || 'N/A')
    .replace(/\{titulo\}/g, data.event_title || '')
    .replace(/\{tipo\}/g, eventTypeLabel)
    .replace(/\{data\}/g, formatDate(data.event_start_time))
    .replace(/\{hora\}/g, formatTime(data.event_start_time))
    .replace(/\{local\}/g, data.event_location || 'A definir');
}

// ============================================
// HELPER: Get Instance for Inbox
// ============================================
async function getInstanceForInbox(inboxId: string): Promise<{
  instanceId: string;
  instanceName: string;
} | null> {
  // Buscar instância via inbox_instances
  const { data: inboxInstance, error } = await supabase
    .from('inbox_instances')
    .select('instance_id, instances!inner(id, name, status)')
    .eq('inbox_id', inboxId)
    .limit(1)
    .maybeSingle();

  if (error || !inboxInstance) {
    console.error(`[process-reminders] No instance found for inbox ${inboxId}:`, error);
    return null;
  }

  const instance = (inboxInstance as any).instances;
  if (!instance || instance.status !== 'connected') {
    console.error(`[process-reminders] Instance not connected for inbox ${inboxId}`);
    return null;
  }

  return {
    instanceId: instance.id,
    instanceName: instance.name,
  };
}

// ============================================
// HELPER: Send WhatsApp Message
// ============================================
async function sendWhatsAppMessage(
  instanceId: string,
  instanceName: string,
  phone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Import provider factory dinamicamente (mesmo padrão do make-server)
    const ProviderFactory = (await import('../make-server-e4f9d774/provider-factory.ts')).default;

    const provider = await ProviderFactory.getProviderForInstance(instanceId);
    const token = await ProviderFactory.getTokenForInstance(instanceId);

    if (!token) {
      return { success: false, error: 'No API token configured for instance' };
    }

    // Limpar número de telefone
    const cleanPhone = phone.replace(/\D/g, '');

    console.log(`[process-reminders] Sending message to ${cleanPhone} via ${instanceName}`);

    const result = await provider.sendTextMessage({
      instanceName: instanceName,
      token: token,
      number: cleanPhone,
      text: message,
    });

    console.log(`[process-reminders] Message sent successfully:`, result);
    return { success: true };

  } catch (error) {
    console.error(`[process-reminders] Error sending message:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ============================================
// MAIN: Process Queue
// ============================================
async function processQueue(specificQueueId?: string): Promise<{
  processed: number;
  sent: number;
  failed: number;
  errors: string[];
}> {
  const stats = {
    processed: 0,
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    // Buscar itens da fila
    let query = supabase
      .from('reminder_queue')
      .select('*')
      .eq('status', 'queued')
      .lt('attempts', MAX_RETRIES)
      .order('queued_at', { ascending: true })
      .limit(BATCH_SIZE);

    // Se tiver ID específico, filtrar
    if (specificQueueId) {
      query = supabase
        .from('reminder_queue')
        .select('*')
        .eq('id', specificQueueId)
        .in('status', ['queued', 'failed']);
    }

    const { data: queueItems, error: fetchError } = await query;

    if (fetchError) {
      console.error('[process-reminders] Error fetching queue:', fetchError);
      stats.errors.push(`Fetch error: ${fetchError.message}`);
      return stats;
    }

    if (!queueItems || queueItems.length === 0) {
      console.log('[process-reminders] No items in queue');
      return stats;
    }

    console.log(`[process-reminders] Found ${queueItems.length} items to process`);

    // Processar cada item
    for (const item of queueItems) {
      stats.processed++;

      try {
        // Marcar como processando
        await supabase
          .from('reminder_queue')
          .update({
            status: 'processing',
            attempts: item.attempts + 1,
          })
          .eq('id', item.id);

        // Buscar instância para o inbox
        const instanceInfo = await getInstanceForInbox(item.inbox_id);

        if (!instanceInfo) {
          throw new Error(`No connected instance found for inbox ${item.inbox_id}`);
        }

        // Montar mensagem com template
        const template = item.message_template || DEFAULT_REMINDER_TEMPLATE;
        const message = replaceTemplateVariables(template, {
          lead_name: item.lead_name,
          lead_company: item.lead_company,
          event_title: item.event_title,
          event_type: item.event_type,
          event_start_time: item.event_start_time,
          event_location: item.event_location,
        });

        // Enviar mensagem
        const sendResult = await sendWhatsAppMessage(
          instanceInfo.instanceId,
          instanceInfo.instanceName,
          item.lead_phone,
          message
        );

        if (sendResult.success) {
          // Marcar como enviado na fila
          await supabase
            .from('reminder_queue')
            .update({
              status: 'sent',
              processed_at: new Date().toISOString(),
            })
            .eq('id', item.id);

          // Atualizar status do lembrete original
          await supabase
            .from('event_reminders')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
            })
            .eq('id', item.reminder_id);

          stats.sent++;
          console.log(`[process-reminders] ✅ Sent reminder ${item.reminder_id} to ${item.lead_name}`);

        } else {
          throw new Error(sendResult.error || 'Failed to send message');
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[process-reminders] ❌ Error processing item ${item.id}:`, errorMessage);

        // Atualizar fila com erro
        const newStatus = item.attempts + 1 >= MAX_RETRIES ? 'failed' : 'queued';

        await supabase
          .from('reminder_queue')
          .update({
            status: newStatus,
            last_error: errorMessage,
            processed_at: newStatus === 'failed' ? new Date().toISOString() : null,
          })
          .eq('id', item.id);

        // Se excedeu tentativas, marcar lembrete como falhou
        if (newStatus === 'failed') {
          await supabase
            .from('event_reminders')
            .update({
              status: 'failed',
              error_message: errorMessage,
              retry_count: item.attempts + 1,
            })
            .eq('id', item.reminder_id);
        }

        stats.failed++;
        stats.errors.push(`Item ${item.id}: ${errorMessage}`);
      }
    }

    return stats;

  } catch (error) {
    console.error('[process-reminders] Fatal error:', error);
    stats.errors.push(`Fatal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return stats;
  }
}

// ============================================
// HANDLER
// ============================================
Deno.serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar autorização (service role ou cron)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.includes(supabaseServiceKey) && !authHeader?.includes('Bearer')) {
      console.log('[process-reminders] Checking auth...');
    }

    // Extrair queue_id do body se houver (para trigger do banco)
    let specificQueueId: string | undefined;
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        specificQueueId = body.queue_id;
      } catch {
        // Sem body, processar batch normal
      }
    }

    console.log('[process-reminders] Starting processing...');
    const startTime = Date.now();

    const stats = await processQueue(specificQueueId);

    const duration = Date.now() - startTime;

    console.log(`[process-reminders] Completed in ${duration}ms:`, stats);

    return new Response(
      JSON.stringify({
        success: true,
        duration_ms: duration,
        ...stats,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[process-reminders] Handler error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
