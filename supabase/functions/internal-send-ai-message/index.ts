/**
 * Internal Send AI Message Edge Function
 * 
 * Endpoint interno para envio de mensagens via IA.
 * Reutiliza a mesma lógica do make-server mas em função separada.
 * 
 * Autenticação via X-Service-Role-Key (chamadas internas Edge Function → Edge Function)
 */

import { createClient } from "npm:@supabase/supabase-js@2";

// Singleton do Supabase client
let supabaseInstance: any = null;
function getSupabase() {
  if (!supabaseInstance) {
    supabaseInstance = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
  }
  return supabaseInstance;
}

// Provider Factory inline (mesmo código do make-server)
async function getProviderAndToken(instanceId: string) {
  const supabase = getSupabase();
  
  const { data: instance, error } = await supabase
    .from('instances')
    .select('id, name, status, provider_type, api_key, provider_config')
    .eq('id', instanceId)
    .single();

  if (error || !instance) {
    throw new Error('Instance not found');
  }

  const providerType = instance.provider_type || 'evolution';
  
  // Determinar token
  let token = instance.api_key;
  if (!token) {
    if (providerType === 'evolution') {
      token = Deno.env.get('EVOLUTION_API_KEY');
    }
    // Uazapi requer token específico da instância
  }

  return { instance, providerType, token };
}

// Evolution Provider - sendTextMessage
async function sendViaEvolution(instanceName: string, token: string, number: string, text: string) {
  const baseUrl = Deno.env.get('EVOLUTION_API_URL')?.replace(/\/$/, '');
  if (!baseUrl) throw new Error('EVOLUTION_API_URL not configured');

  const response = await fetch(`${baseUrl}/message/sendText/${encodeURIComponent(instanceName)}`, {
    method: 'POST',
    headers: {
      'apikey': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      number,
      text,
      delay: 1200,
      linkPreview: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Evolution API error: ${response.status}`);
  }

  return await response.json();
}

// Uazapi Provider - sendTextMessage
async function sendViaUazapi(instanceName: string, token: string, number: string, text: string) {
  const baseUrl = Deno.env.get('UAZAPI_API_URL')?.replace(/\/$/, '') || 'https://free.uazapi.com';

  // Sanitizar número para Brasil
  let cleanNumber = number.replace(/\D/g, '');
  if (cleanNumber.length === 10 || cleanNumber.length === 11) {
    cleanNumber = '55' + cleanNumber;
  }

  const response = await fetch(`${baseUrl}/send/text`, {
    method: 'POST',
    headers: {
      'token': token,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      number: cleanNumber,
      text,
      delay: 1200,
      readchat: true,
      readmessages: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Uazapi API error: ${errorText}`);
  }

  return await response.json();
}

// Main handler
Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Service-Role-Key',
      },
    });
  }

  // Só aceita POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Validar autenticação interna
    const serviceRoleKeyHeader = req.headers.get('X-Service-Role-Key');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!serviceRoleKeyHeader || serviceRoleKeyHeader !== serviceRoleKey) {
      console.error('❌ [INTERNAL-SEND] Unauthorized: Invalid or missing X-Service-Role-Key');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { conversationId, text } = await req.json();

    if (!conversationId || !text?.trim()) {
      return new Response(JSON.stringify({ error: 'conversationId and text required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`📤 [INTERNAL-SEND] Sending AI msg to conversation ${conversationId}`);
    console.log(`📝 [INTERNAL-SEND] Text length: ${text.length}`);

    const supabase = getSupabase();

    // 1. Get conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, contact_phone, workspace_id, inbox_id, lead_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      console.error('❌ [INTERNAL-SEND] Conversation not found:', convError);
      return new Response(JSON.stringify({ error: 'Conversation not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[INTERNAL-SEND] Contact: ${conversation.contact_phone}`);

    const cleanPhone = conversation.contact_phone.replace(/\D/g, '');

    // 2. Get instance (multiple strategies)
    let instanceId: string | null = null;

    // Strategy 1: Via inbox_instances
    if (conversation.inbox_id) {
      const { data: ii } = await supabase
        .from('inbox_instances')
        .select('instance_id')
        .eq('inbox_id', conversation.inbox_id)
        .limit(1)
        .maybeSingle();
      
      if (ii) {
        instanceId = ii.instance_id;
        console.log(`[INTERNAL-SEND] Found instance via inbox: ${instanceId}`);
      }
    }

    // Strategy 2: Connected instance from workspace
    if (!instanceId) {
      const { data: wi } = await supabase
        .from('instances')
        .select('id')
        .eq('workspace_id', conversation.workspace_id)
        .eq('status', 'connected')
        .limit(1)
        .maybeSingle();
      
      if (wi) {
        instanceId = wi.id;
        console.log(`[INTERNAL-SEND] Found connected instance: ${instanceId}`);
      }
    }

    if (!instanceId) {
      console.error('❌ [INTERNAL-SEND] No WhatsApp instance found');
      return new Response(JSON.stringify({ error: 'No WhatsApp instance found' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Get provider and token
    const { instance, providerType, token } = await getProviderAndToken(instanceId);

    if (instance.status !== 'connected') {
      return new Response(JSON.stringify({ 
        error: `Instance "${instance.name}" not connected. Status: ${instance.status}` 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!token) {
      console.error('❌ [INTERNAL-SEND] No API token configured');
      return new Response(JSON.stringify({ error: 'No API token configured' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[INTERNAL-SEND] Provider: ${providerType}, Instance: ${instance.name}`);

    // 4. Send message via provider
    let result;
    if (providerType === 'uazapi') {
      result = await sendViaUazapi(instance.name, token, cleanPhone, text.trim());
    } else {
      result = await sendViaEvolution(instance.name, token, cleanPhone, text.trim());
    }

    console.log('[INTERNAL-SEND] Provider response:', JSON.stringify(result));

    // Extract provider_message_id
    const providerMessageId = result?.key?.id || result?.message?.key?.id || result?.id;
    if (providerMessageId) {
      console.log(`✅ [INTERNAL-SEND] Provider message ID: ${providerMessageId}`);
    }

    // 5. Save message to database
    const now = new Date().toISOString();
    const { data: savedMessage, error: saveError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        content_type: 'text',
        message_type: 'sent',
        text_content: text.trim(),
        is_read: true,
        created_at: now,
        provider_message_id: providerMessageId || null,
        sent_by: null, // AI message
      })
      .select()
      .single();

    if (saveError) {
      console.error('❌ [INTERNAL-SEND] Save error:', saveError);
      return new Response(JSON.stringify({ 
        error: 'Message sent but failed to save',
        details: saveError,
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 6. Update conversation
    await supabase
      .from('conversations')
      .update({
        last_message: text.trim().substring(0, 100),
        last_message_at: now,
        updated_at: now,
      })
      .eq('id', conversationId);

    console.log('✅ [INTERNAL-SEND] Message sent and saved!');

    // 7. Log activity if lead exists
    if (conversation.lead_id) {
      try {
        const truncated = text.trim().length > 80 
          ? text.trim().substring(0, 80) + '...' 
          : text.trim();
        
        await supabase.from('lead_activities').insert({
          lead_id: conversation.lead_id,
          description: `[IA] Enviou: "${truncated}"`,
          activity_type: 'system',
        });
        console.log('✅ [INTERNAL-SEND] Activity logged');
      } catch (e) {
        console.warn('⚠️ [INTERNAL-SEND] Activity log failed:', e);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: savedMessage,
      provider_response: result,
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ [INTERNAL-SEND] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});