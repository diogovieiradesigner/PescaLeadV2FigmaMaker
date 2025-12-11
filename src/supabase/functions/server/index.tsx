import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kanbanHelpers from "./kanban-helpers.ts";
import { Lead, Funnel, Column } from "./types.ts";
import { handleEvolutionWebhook } from "./evolution-webhook.ts";
import { handleUazapiWebhook } from "./uazapi-webhook.ts"; // ✅ ADICIONADO
import { 
  handleCreateInstance, 
  handleGetInstanceStatus,
  handleGetInstanceQRCode,
  handleDeleteInstance,
  handleLogoutInstance,
  handleRestartInstance,
  handleGetContactProfilePicture
} from "./instance-controller.ts";
import { getSupabaseServiceClient, createSupabaseClientWithAuth } from './supabase-client.ts';

const app = new Hono();

// Create Supabase client (usar singleton)
const supabase = getSupabaseServiceClient(); // ✅ Usando singleton!

// Validar ENV vars
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('🚨 CRITICAL ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
}

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// ============================================
// MIDDLEWARE: Validate Auth
// ============================================
async function validateAuth(c: any, next: any) {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  
  if (!accessToken) {
    return c.json({ error: 'Unauthorized - No token provided' }, 401);
  }

  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  
  if (error || !user) {
    console.log('Auth validation error:', error);
    return c.json({ error: 'Unauthorized - Invalid token' }, 401);
  }

  c.set('userId', user.id);
  c.set('userEmail', user.email);
  
  await next();
}

// ============================================
// MIDDLEWARE: Validate Workspace Access
// ============================================
async function validateWorkspaceAccess(c: any, next: any) {
  const userId = c.get('userId');
  const rawWorkspaceId = c.req.param('workspaceId') || c.req.query('workspaceId');
  const workspaceId = rawWorkspaceId?.trim();

  // 1. Validation: Existence
  if (!workspaceId) {
    return c.json({ error: 'Workspace ID required (missing)' }, 400);
  }

  // 2. Validation: UUID Format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(workspaceId)) {
    return c.json({ error: 'Invalid Workspace ID format', received: workspaceId }, 400);
  }

  console.log(`[Middleware] Checking access: User ${userId} -> Workspace ${workspaceId}`);

  // 3. Auth Client Strategy
  // Instead of using Admin/Service Role (which is failing with 42501),
  // we use the USER'S own token. If RLS is correct, the user can read their own membership.
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const userClient = createSupabaseClientWithAuth(accessToken); // ✅ Usando helper!

  try {
    // Query workspace_members table using USER context
    const { data: member, error } = await userClient
      .from('workspace_members')
      .select('role, permissions')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[Middleware] DB Error (User Context):', error);
      
      // Fallback: Try checking workspace ownership directly via 'workspaces' table
      // Users should be able to see workspaces they own
      if (error.code === '42501') {
         console.log('[Middleware] Member check failed (42501), trying ownership check...');
         const { data: workspace, error: wsError } = await userClient
            .from('workspaces')
            .select('owner_id')
            .eq('id', workspaceId)
            .maybeSingle();
          
         if (!wsError && workspace && workspace.owner_id === userId) {
            console.log(`[Middleware] User ${userId} is owner (Ownership Fallback)`);
            c.set('workspaceId', workspaceId);
            c.set('memberRole', 'owner');
            c.set('member', { role: 'owner', permissions: [] });
            await next();
            return;
         }
      }

      return c.json({ 
        error: 'Authorization check failed', 
        details: error.message 
      }, 500);
    }

    if (!member) {
      console.warn(`[Middleware] Access denied: User ${userId} not in Workspace ${workspaceId}`);
      return c.json({ error: 'Access denied or Workspace not found' }, 403);
    }

    c.set('workspaceId', workspaceId);
    c.set('memberRole', member.role);
    c.set('member', member);

    await next();

  } catch (e) {
    console.error('[Middleware] Unexpected error:', e);
    return c.json({ error: 'Internal Server Error during auth check' }, 500);
  }
}

// ============================================
// HELPER: Check Role Permission
// ============================================
function hasPermission(userRole: string, requiredRole: string): boolean {
  const roleHierarchy = { owner: 4, admin: 3, member: 2, viewer: 1 };
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

// ============================================
// HELPER: Generate Workspace Slug
// ============================================
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ============================================
// WEBHOOK ROUTES
// ============================================

// Alias for the webhook handler to ensure consistency
const webhookHandler = handleEvolutionWebhook;

// Main Webhook Route (Preferred - byEvents: false)
app.post('/make-server-e4f9d774/webhook/evolution', webhookHandler);

// Fallback Routes for instances with byEvents: true
// These handle the 404 errors seen in logs
app.post('/make-server-e4f9d774/webhook/evolution/messages-upsert', webhookHandler);
app.post('/make-server-e4f9d774/webhook/evolution/messages-update', webhookHandler);
app.post('/make-server-e4f9d774/webhook/evolution/connection-update', webhookHandler);
app.post('/make-server-e4f9d774/webhook/evolution/qrcode-updated', webhookHandler);
app.post('/make-server-e4f9d774/webhook/evolution/send-message', webhookHandler);

// ✅ UAZAPI Webhook Route (mapeamento pelo corpo como Evolution)
app.post('/make-server-e4f9d774/webhook/uazapi', handleUazapiWebhook);

// ============================================
// INTERNAL AI MESSAGE SENDER (No Auth - Service Role Only)
// ============================================

/**
 * Rota interna para a IA enviar mensagens
 * Não requer auth do usuário - validação via service role key
 * Verifica se conversation existe antes de enviar
 */
app.post('/make-server-e4f9d774/internal-send-ai-message', async (c) => {
  try {
    // Validar service role key
    const serviceRoleKey = c.req.header('X-Service-Role-Key');
    const expectedKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!serviceRoleKey || serviceRoleKey !== expectedKey) {
      console.error('[INTERNAL-AI-MESSAGE] Unauthorized: Invalid service role key');
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { conversationId, text } = await c.req.json();
    
    if (!conversationId) {
      return c.json({ error: 'conversationId is required' }, 400);
    }
    
    if (!text || !text.trim()) {
      return c.json({ error: 'text is required' }, 400);
    }
    
    console.log(`🤖 [INTERNAL-AI-MESSAGE] Sending AI message to conversation ${conversationId}`);
    
    // ✅ CRITICAL: Verificar se a conversa existe ANTES de tentar enviar
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, contact_phone, workspace_id, inbox_id, status')
      .eq('id', conversationId)
      .single();
    
    if (convError || !conversation) {
      console.error('[INTERNAL-AI-MESSAGE] Conversation not found:', conversationId);
      console.error('   Error:', convError);
      return c.json({ 
        error: 'Conversation not found',
        conversation_id: conversationId,
        details: convError?.message 
      }, 404);
    }
    
    console.log(`[INTERNAL-AI-MESSAGE] Conversation found. Status: ${conversation.status}, Phone: ${conversation.contact_phone}`);
    
    // Clean phone number
    const cleanPhone = conversation.contact_phone.replace(/\D/g, '');
    
    // Get instance
    let instanceId = null;
    
    if (conversation.inbox_id) {
      const { data: inboxInstance } = await supabase
        .from('inbox_instances')
        .select('instance_id')
        .eq('inbox_id', conversation.inbox_id)
        .limit(1)
        .maybeSingle();
      
      if (inboxInstance) {
        instanceId = inboxInstance.instance_id;
      }
    }
    
    if (!instanceId) {
      const { data: workspaceInstance } = await supabase
        .from('instances')
        .select('id')
        .eq('workspace_id', conversation.workspace_id)
        .eq('status', 'connected')
        .limit(1)
        .maybeSingle();
      
      if (workspaceInstance) {
        instanceId = workspaceInstance.id;
      }
    }
    
    if (!instanceId) {
      console.error('[INTERNAL-AI-MESSAGE] No instance found for conversation');
      return c.json({ error: 'No WhatsApp instance available' }, 400);
    }
    
    // Get instance details
    const { data: instance } = await supabase
      .from('instances')
      .select('id, name, status, provider')
      .eq('id', instanceId)
      .single();
    
    if (!instance || instance.status !== 'connected') {
      console.error('[INTERNAL-AI-MESSAGE] Instance not connected:', instance?.status);
      return c.json({ 
        error: 'Instance not connected',
        instanceStatus: instance?.status 
      }, 400);
    }
    
    // Send via provider
    const ProviderFactory = (await import('./provider-factory.ts')).default;
    const provider = await ProviderFactory.getProviderForInstance(instance.id);
    const token = await ProviderFactory.getTokenForInstance(instance.id);
    
    if (!token) {
      return c.json({ error: 'No API token configured' }, 500);
    }
    
    console.log(`[INTERNAL-AI-MESSAGE] Sending via ${instance.provider} provider...`);
    
    const result = await provider.sendTextMessage({
      instanceName: instance.name,
      token: token,
      number: cleanPhone,
      text: text.trim()
    });
    
    // Extract provider message ID
    let providerMessageId = null;
    if (result?.key?.id) {
      providerMessageId = result.key.id;
    } else if (result?.message?.key?.id) {
      providerMessageId = result.message.key.id;
    } else if (result?.id) {
      providerMessageId = result.id;
    } else if (result?.messageId) {
      providerMessageId = result.messageId;
    }
    
    // Save message to database
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
        provider_message_id: providerMessageId
      })
      .select()
      .single();
    
    if (saveError) {
      console.error('[INTERNAL-AI-MESSAGE] Error saving message:', saveError);
      return c.json({ 
        error: 'Failed to save message',
        details: saveError.message 
      }, 500);
    }
    
    // Update conversation
    await supabase
      .from('conversations')
      .update({
        last_message: text.trim(),
        last_message_at: now,
        updated_at: now
      })
      .eq('id', conversationId);
    
    console.log('✅ [INTERNAL-AI-MESSAGE] Message sent and saved successfully');
    
    return c.json({ 
      success: true,
      message: savedMessage,
      providerMessageId,
      provider: instance.provider
    });
    
  } catch (error) {
    console.error('❌ [INTERNAL-AI-MESSAGE] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================
// WEBHOOK QUEUE MANAGEMENT (Protected)
// ============================================

// Reprocessar mensagens com erro na fila
app.post('/make-server-e4f9d774/webhook/queue/retry', validateAuth, async (c) => {
  try {
    console.log('🔄 [WEBHOOK-QUEUE] Manual retry requested');
    
    const body = await c.req.json();
    const { queue_id, limit } = body;
    
    let processed = 0;
    let failed = 0;
    const results = [];
    
    if (queue_id) {
      // Reprocessar um item específico
      console.log(`🔄 [WEBHOOK-QUEUE] Retrying specific item: ${queue_id}`);
      
      const { data: queueItem, error } = await supabase
        .from('webhook_queue')
        .select('*')
        .eq('id', queue_id)
        .single();
      
      if (error) {
        return c.json({ error: error.message }, 500);
      }
      
      // Criar contexto mock para processar
      try {
        const mockContext = {
          req: { text: async () => JSON.stringify(queueItem.payload) },
          json: (data: any) => data
        };
        
        await handleUazapiWebhook(mockContext as any);
        processed++;
        results.push({ queue_id, status: 'success' });
      } catch (error) {
        failed++;
        results.push({ queue_id, status: 'failed', error: error.message });
        
        await supabase.rpc('fail_webhook_queue_item', {
          p_queue_id: queue_id,
          p_error_message: error.message,
          p_error_details: { stack: error.stack }
        });
      }
      
    } else {
      // Reprocessar múltiplos itens pendentes/failed
      const maxLimit = Math.min(limit || 10, 100);
      console.log(`🔄 [WEBHOOK-QUEUE] Retrying up to ${maxLimit} pending/failed items`);
      
      const { data: pendingItems, error: fetchError } = await supabase
        .rpc('get_pending_webhooks', { p_limit: maxLimit });
      
      if (fetchError) {
        return c.json({ error: fetchError.message }, 500);
      }
      
      console.log(`📋 [WEBHOOK-QUEUE] Found ${pendingItems?.length || 0} items to process`);
      
      for (const item of pendingItems || []) {
        try {
          const mockContext = {
            req: { text: async () => JSON.stringify(item.payload) },
            json: (data: any) => data
          };
          
          await handleUazapiWebhook(mockContext as any);
          processed++;
          results.push({ queue_id: item.id, status: 'success' });
        } catch (error) {
          failed++;
          results.push({ queue_id: item.id, status: 'failed', error: error.message });
          
          await supabase.rpc('fail_webhook_queue_item', {
            p_queue_id: item.id,
            p_error_message: error.message,
            p_error_details: { stack: error.stack }
          });
        }
      }
    }
    
    console.log(`✅ [WEBHOOK-QUEUE] Retry complete: ${processed} processed, ${failed} failed`);
    
    return c.json({
      success: true,
      processed,
      failed,
      results
    });
    
  } catch (error) {
    console.error('❌ [WEBHOOK-QUEUE] Retry error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Ver estatísticas da fila
app.get('/make-server-e4f9d774/webhook/queue/stats', validateAuth, async (c) => {
  try {
    const { data: stats, error } = await supabase
      .from('webhook_queue_stats')
      .select('*');
    
    if (error) {
      return c.json({ error: error.message }, 500);
    }
    
    const { data: oldestPending } = await supabase
      .from('webhook_queue')
      .select('created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();
    
    return c.json({
      success: true,
      stats: stats,
      oldest_pending: oldestPending?.created_at || null
    });
  } catch (error) {
    console.error('❌ [WEBHOOK-QUEUE] Stats error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Listar itens da fila com filtros
app.get('/make-server-e4f9d774/webhook/queue', validateAuth, async (c) => {
  try {
    const status = c.req.query('status') || 'failed';
    const limit = parseInt(c.req.query('limit') || '50');
    
    const { data: items, error } = await supabase
      .from('webhook_queue')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 100));
    
    if (error) {
      return c.json({ error: error.message }, 500);
    }
    
    return c.json({
      success: true,
      count: items?.length || 0,
      items: items || []
    });
  } catch (error) {
    console.error('❌ [WEBHOOK-QUEUE] List error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Limpar webhooks antigos
app.post('/make-server-e4f9d774/webhook/queue/cleanup', validateAuth, async (c) => {
  try {
    const { data: deletedCount, error } = await supabase
      .rpc('cleanup_old_webhooks');
    
    if (error) {
      return c.json({ error: error.message }, 500);
    }
    
    return c.json({
      success: true,
      deleted_count: deletedCount
    });
  } catch (error) {
    console.error('❌ [WEBHOOK-QUEUE] Cleanup error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Webhook test endpoint (public - para testar conectividade)
app.get('/make-server-e4f9d774/webhook/test', (c) => {
  console.log('🧪 [WEBHOOK-TEST] Test endpoint called!');
  return c.json({ 
    status: 'ok', 
    message: 'Webhook endpoint is reachable',
    timestamp: new Date().toISOString() 
  });
});

// ============================================
// CACHE STATISTICS ENDPOINT (Protected)
// ============================================
app.get('/make-server-e4f9d774/cache/stats', validateAuth, async (c) => {
  try {
    const ProviderFactory = (await import('./provider-factory.ts')).default;
    const stats = ProviderFactory.getCacheStats();
    
    console.log('📊 [CACHE-STATS] Requested by user');
    ProviderFactory.printCacheStats();
    
    return c.json({
      success: true,
      stats: stats,
      description: {
        hits: 'Number of cache hits (fast retrieval)',
        misses: 'Number of cache misses (had to query database)',
        hitRate: 'Percentage of requests served from cache',
        size: 'Number of tokens currently cached'
      }
    });
  } catch (error) {
    console.error('❌ [CACHE-STATS] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================
// WEBHOOK DIAGNOSTIC ROUTES (Protected)
// ============================================

// Verificar configuração do webhook de uma instância
app.get('/make-server-e4f9d774/instances/:instanceId/webhook/check', validateAuth, validateWorkspaceAccess, async (c) => {
  try {
    const { instanceId } = c.req.param();
    const workspaceId = c.get('workspaceId');

    console.log(`🔍 [WEBHOOK-CHECK] Checking webhook for instance ${instanceId}`);

    // Get instance from DB
    const { data: instance } = await supabase
      .from('instances')
      .select('*')
      .eq('id', instanceId)
      .eq('workspace_id', workspaceId)
      .single();

    if (!instance) {
      return c.json({ error: 'Instance not found' }, 404);
    }

    // ✅ Get provider and token dynamically
    const ProviderFactory = (await import('./provider-factory.ts')).default;
    const provider = await ProviderFactory.getProviderForInstance(instance.id);
    const token = await ProviderFactory.getTokenForInstance(instance.id);

    if (!token) {
      return c.json({ 
        error: 'No API token configured for this instance',
        hint: `Please configure api_key in database or set ${instance.provider.toUpperCase()}_API_KEY environment variable`,
        instanceName: instance.name
      }, 500);
    }

    // Fetch instance info from Provider API
    const info = await provider.fetchInstanceInfo({
      instanceName: instance.name,
      token: token
    });

    return c.json({
      success: true,
      instance: {
        name: instance.name,
        status: instance.status,
        webhook_in_db: instance.webhook_url
      },
      evolution_api_info: info
    });

  } catch (error) {
    console.error('❌ [WEBHOOK-CHECK] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Forçar atualização do webhook de uma instância
app.post('/make-server-e4f9d774/instances/:instanceId/webhook/update', validateAuth, validateWorkspaceAccess, async (c) => {
  try {
    const { instanceId } = c.req.param();
    const workspaceId = c.get('workspaceId');

    console.log(`🔧 [WEBHOOK-UPDATE] Updating webhook for instance ${instanceId}`);

    // Get instance from DB
    const { data: instance } = await supabase
      .from('instances')
      .select('*')
      .eq('id', instanceId)
      .eq('workspace_id', workspaceId)
      .single();

    if (!instance) {
      return c.json({ error: 'Instance not found' }, 404);
    }

    // ✅ Get provider and token dynamically
    const ProviderFactory = (await import('./provider-factory.ts')).default;
    const provider = await ProviderFactory.getProviderForInstance(instance.id);
    const token = await ProviderFactory.getTokenForInstance(instance.id);

    if (!token) {
      return c.json({ 
        error: 'No API token configured for this instance',
        hint: `Please configure api_key in database or set ${instance.provider.toUpperCase()}_API_KEY environment variable`,
        instanceName: instance.name
      }, 500);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    // ✅ CORRIGIDO: Webhook URL dinâmica baseada no provider
    const providerType = instance.provider_type || (instance.provider === 'whatsapp' ? 'evolution' : instance.provider);
    const webhookUrl = `${supabaseUrl}/functions/v1/make-server-e4f9d774/webhook/${providerType}`;

    // Update webhook in Provider API
    const result = await provider.updateWebhook({
      instanceName: instance.name,
      token: token,
      webhookUrl,
      webhookByEvents: true,
      webhookBase64: false,
      webhookEvents: [
        'MESSAGES_UPSERT',
        'MESSAGES_UPDATE',
        'SEND_MESSAGE'
      ]
    });

    // Update in DB
    await supabase
      .from('instances')
      .update({ webhook_url: webhookUrl })
      .eq('id', instanceId);

    return c.json({
      success: true,
      message: 'Webhook updated successfully',
      webhook_url: webhookUrl,
      evolution_response: result
    });

  } catch (error) {
    console.error('❌ [WEBHOOK-UPDATE] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================
// INSTANCE ROUTES (Protected)
// ============================================
app.post('/make-server-e4f9d774/instances/create', validateAuth, validateWorkspaceAccess, handleCreateInstance);
app.get('/make-server-e4f9d774/instances/:instanceId/status', validateAuth, validateWorkspaceAccess, handleGetInstanceStatus);
app.get('/make-server-e4f9d774/instances/:instanceId/qrcode', validateAuth, validateWorkspaceAccess, handleGetInstanceQRCode);
app.delete('/make-server-e4f9d774/instances/:instanceId', validateAuth, validateWorkspaceAccess, handleDeleteInstance);
app.post('/make-server-e4f9d774/instances/:instanceId/logout', validateAuth, validateWorkspaceAccess, handleLogoutInstance);
app.post('/make-server-e4f9d774/instances/:instanceId/restart', validateAuth, validateWorkspaceAccess, handleRestartInstance);
app.get('/make-server-e4f9d774/contacts/profile-picture', validateAuth, validateWorkspaceAccess, handleGetContactProfilePicture);

// ============================================
// LEAD MIGRATION ROUTE
// ============================================
app.post('/make-server-e4f9d774/queue-lead-migration', validateAuth, async (c) => {
  try {
    const { run_id, funnel_id, column_id } = await c.req.json();

    console.log(`[LEAD-MIGRATION] Request received: run_id=${run_id}, funnel_id=${funnel_id}, column_id=${column_id}`);

    // Validação de entrada
    if (!run_id || !funnel_id || !column_id) {
      return c.json({ 
        success: false, 
        error: 'Parâmetros obrigatórios: run_id, funnel_id, column_id' 
      }, 400);
    }

    const userId = c.get('userId');

    // Verificar se a run existe e obter informações
    const { data: run, error: runError } = await supabase
      .from('lead_extraction_runs')
      .select('id, run_name, created_quantity, workspace_id, funnel_id, column_id')
      .eq('id', run_id)
      .single();

    if (runError || !run) {
      console.error('[LEAD-MIGRATION] Run not found:', runError);
      return c.json({ 
        success: false, 
        error: 'Run não encontrada' 
      }, 404);
    }

    // Verificar se o usuário tem acesso ao workspace
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', run.workspace_id)
      .eq('user_id', userId)
      .single();

    if (membershipError || !membership) {
      console.error('[LEAD-MIGRATION] User does not have access to workspace:', membershipError);
      return c.json({ 
        success: false, 
        error: 'Acesso negado ao workspace' 
      }, 403);
    }

    // Verificar se a nova coluna existe e pertence ao funnel correto
    const { data: column, error: columnError } = await supabase
      .from('funnel_columns')
      .select('id, title, funnel_id')
      .eq('id', column_id)
      .eq('funnel_id', funnel_id)
      .single();

    if (columnError || !column) {
      console.error('[LEAD-MIGRATION] Column not found:', columnError);
      return c.json({ 
        success: false, 
        error: 'Coluna não encontrada ou não pertence ao kanban selecionado' 
      }, 404);
    }

    // Verificar se não é a mesma coluna
    if (run.funnel_id === funnel_id && run.column_id === column_id) {
      return c.json({ 
        success: false, 
        error: 'Os leads já estão nesta coluna' 
      }, 400);
    }

    console.log(`[LEAD-MIGRATION] Moving ${run.created_quantity} leads from run ${run.run_name} to column ${column.title}`);

    // Realizar a migração dos leads
    const { data: updateResult, error: updateError } = await supabase
      .from('leads')
      .update({ 
        funnel_id: funnel_id,
        column_id: column_id,
        updated_at: new Date().toISOString()
      })
      .eq('extraction_run_id', run_id)
      .select('id');

    if (updateError) {
      console.error('[LEAD-MIGRATION] Error updating leads:', updateError);
      return c.json({ 
        success: false, 
        error: 'Erro ao mover leads: ' + updateError.message 
      }, 500);
    }

    const movedCount = updateResult?.length || 0;

    console.log(`[LEAD-MIGRATION] Successfully moved ${movedCount} leads`);

    // Atualizar informações da run
    await supabase
      .from('lead_extraction_runs')
      .update({
        funnel_id: funnel_id,
        column_id: column_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', run_id);

    return c.json({
      success: true,
      run_id: run.id,
      run_name: run.run_name,
      leads_moved: movedCount,
      message: `Movimentação concluída: ${movedCount} leads movidos`
    });

  } catch (error: any) {
    console.error('[LEAD-MIGRATION] Unexpected error:', error);
    return c.json({ 
      success: false, 
      error: error.message || 'Erro interno ao processar movimentação' 
    }, 500);
  }
});

// ✅ Buscar perfil completo do contato (nome, email, descrição, website, etc)
app.get('/make-server-e4f9d774/contacts/profile', validateAuth, validateWorkspaceAccess, async (c) => {
  try {
    const phone = c.req.query('phone');
    const conversationId = c.req.query('conversationId');
    const workspaceId = c.get('workspaceId');

    if (!phone) {
      return c.json({ error: 'Phone parameter is required' }, 400);
    }

    if (!conversationId) {
      return c.json({ error: 'ConversationId parameter is required' }, 400);
    }

    console.log(`[GET-PROFILE] Fetching profile for ${phone} in workspace ${workspaceId}`);

    // 1. Get conversation to find instance
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, inbox_id')
      .eq('id', conversationId)
      .eq('workspace_id', workspaceId)
      .single();

    if (convError || !conversation) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    // 2. Get instance via inbox
    let instanceId = null;
    
    if (conversation.inbox_id) {
      const { data: inboxLink } = await supabase
        .from('inbox_instances')
        .select('instance_id')
        .eq('inbox_id', conversation.inbox_id)
        .limit(1)
        .maybeSingle();
      
      instanceId = inboxLink?.instance_id;
    }

    // Fallback: get any connected instance from workspace
    if (!instanceId) {
      const { data: workspaceInstance } = await supabase
        .from('instances')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('status', 'connected')
        .limit(1)
        .maybeSingle();

      instanceId = workspaceInstance?.id;
    }

    if (!instanceId) {
      return c.json({ error: 'No instance found for this conversation' }, 404);
    }

    // 3. Get instance details
    const { data: instance, error: instanceError } = await supabase
      .from('instances')
      .select('name')
      .eq('id', instanceId)
      .single();

    if (instanceError || !instance) {
      return c.json({ error: 'Instance not found' }, 404);
    }

    console.log(`[GET-PROFILE] Using instance: ${instance.name}`);

    // 4. Fetch profile from WhatsApp Provider (dynamic)
    const ProviderFactory = (await import('./provider-factory.ts')).default;
    const provider = await ProviderFactory.getProviderForInstance(instanceId);
    const token = await ProviderFactory.getTokenForInstance(instanceId); // ✅ Token dinâmico!

    if (!token) {
      return c.json({ 
        error: 'No API token configured for this instance',
        hint: `Please configure api_key in database or set ${instance.provider.toUpperCase()}_API_KEY environment variable`,
        instanceName: instance.name
      }, 500);
    }

    console.log(`[GET-PROFILE] Using provider for instance ${instance.name}`);

    const profile = await provider.fetchProfile({
      instanceName: instance.name,
      token: token,
      number: phone
    });

    if (!profile) {
      return c.json({ 
        error: 'Profile not found or not accessible',
        message: 'The contact profile is not available. Make sure the contact is saved in WhatsApp.'
      }, 404);
    }

    console.log(`[GET-PROFILE] Profile fetched successfully for ${phone}`);

    // ✅ NOVO: Se conseguimos o nome do contato, atualizar na conversa (substituir o telefone)
    if (profile.name) {
      console.log(`[GET-PROFILE] Updating contact_name from "${phone}" to "${profile.name}"`);
      
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ contact_name: profile.name })
        .eq('id', conversationId);
      
      if (updateError) {
        console.error(`[GET-PROFILE] Failed to update contact_name:`, updateError);
      } else {
        console.log(`[GET-PROFILE] ✅ Contact name updated successfully`);
      }
    }

    // ✅ Se conseguimos a foto do perfil, atualizar também
    if (profile.picture) {
      console.log(`[GET-PROFILE] Updating avatar_url`);
      
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ avatar_url: profile.picture })
        .eq('id', conversationId);
      
      if (updateError) {
        console.error(`[GET-PROFILE] Failed to update avatar_url:`, updateError);
      } else {
        console.log(`[GET-PROFILE] ✅ Avatar URL updated successfully`);
      }
    }

    return c.json({
      phone,
      name: profile.name || null,
      email: profile.email || null,
      description: profile.description || null,
      website: profile.website || null,
      picture: profile.picture || null,
      isBusiness: profile.isBusiness || false,
      status: profile.status || null
    });

  } catch (error) {
    console.error('[GET-PROFILE] Error:', error);
    return c.json({ error: error.message || 'Failed to fetch profile' }, 500);
  }
});

// ============================================
// CHAT/MESSAGE ROUTES (Protected)
// ============================================

// Enviar mensagem de texto
app.post('/make-server-e4f9d774/conversations/:conversationId/messages/send', validateAuth, validateWorkspaceAccess, async (c) => {
  try {
    const conversationId = c.req.param('conversationId');
    const workspaceId = c.get('workspaceId');
    const { text, quotedMessageId } = await c.req.json();

    if (!text || !text.trim()) {
      return c.json({ error: 'Message text is required' }, 400);
    }

    console.log(`📤 [SEND-MESSAGE] Sending message to conversation ${conversationId}`);

    // 1. Get conversation details (incluir lead_id para logs)
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, contact_phone, workspace_id, inbox_id, lead_id')
      .eq('id', conversationId)
      .eq('workspace_id', workspaceId)
      .single();

    if (convError || !conversation) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    console.log(`[SEND-MESSAGE] Conversation found. Contact: ${conversation.contact_phone}, Inbox ID: ${conversation.inbox_id}`);

    // Clean phone number (remove non-digits)
    const cleanPhone = conversation.contact_phone.replace(/\D/g, '');
    console.log(`[SEND-MESSAGE] Cleaned phone number: ${cleanPhone}`);

    // 2. Get instance - Try multiple strategies
    let instanceId = null;

    // Strategy 1: Try to get via inbox_instances if inbox_id exists
    if (conversation.inbox_id) {
      const { data: inboxInstance } = await supabase
        .from('inbox_instances')
        .select('instance_id')
        .eq('inbox_id', conversation.inbox_id)
        .limit(1)
        .maybeSingle();

      if (inboxInstance) {
        instanceId = inboxInstance.instance_id;
        console.log(`[SEND-MESSAGE] Found instance via inbox_instances: ${instanceId}`);
      }
    }

    // Strategy 2: If no instance found via inbox, get any connected instance from workspace
    if (!instanceId) {
      console.log(`[SEND-MESSAGE] No instance via inbox, trying workspace instances...`);
      
      const { data: workspaceInstance } = await supabase
        .from('instances')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('status', 'connected')
        .limit(1)
        .maybeSingle();

      if (workspaceInstance) {
        instanceId = workspaceInstance.id;
        console.log(`[SEND-MESSAGE] Found connected instance in workspace: ${instanceId}`);
      }
    }

    // Strategy 3: If still no connected instance, get any instance from workspace
    if (!instanceId) {
      console.log(`[SEND-MESSAGE] No connected instance, trying any workspace instance...`);
      
      const { data: anyInstance } = await supabase
        .from('instances')
        .select('id')
        .eq('workspace_id', workspaceId)
        .limit(1)
        .maybeSingle();

      if (anyInstance) {
        instanceId = anyInstance.id;
        console.log(`[SEND-MESSAGE] Found instance in workspace: ${instanceId}`);
      }
    }

    if (!instanceId) {
      return c.json({ 
        error: 'No WhatsApp instance found. Please create and connect an instance first.',
        hint: 'Go to Instances page to create a new WhatsApp instance'
      }, 400);
    }

    // 3. Get instance details
    const { data: instance, error: instanceError } = await supabase
      .from('instances')
      .select('id, name, status')
      .eq('id', instanceId)
      .single();

    if (instanceError || !instance) {
      return c.json({ error: 'Instance not found' }, 404);
    }

    console.log(`[SEND-MESSAGE] Instance details - Name: ${instance.name}, Status: ${instance.status}`);

    if (instance.status !== 'connected') {
      return c.json({ 
        error: `WhatsApp instance "${instance.name}" is not connected. Current status: ${instance.status}`,
        hint: 'Please connect your WhatsApp instance before sending messages',
        instanceName: instance.name,
        instanceStatus: instance.status
      }, 400);
    }

    // 4. Prepare quoted message if provided
    let quotedData = null;
    if (quotedMessageId) {
      const { data: quotedMsg } = await supabase
        .from('messages')
        .select('id, text_content')
        .eq('id', quotedMessageId)
        .single();
      
      if (quotedMsg) {
        quotedData = {
          key: { id: quotedMsg.id },
          message: { conversation: quotedMsg.text_content }
        };
      }
    }

    // 5. Send message via WhatsApp Provider (dynamic)
    const ProviderFactory = (await import('./provider-factory.ts')).default;
    const provider = await ProviderFactory.getProviderForInstance(instance.id);
    const token = await ProviderFactory.getTokenForInstance(instance.id); // ✅ Token dinâmico!

    if (!token) {
      return c.json({ 
        error: 'No API token configured for this instance',
        hint: `Please configure api_key in database or set ${instance.provider.toUpperCase()}_API_KEY environment variable`,
        instanceName: instance.name
      }, 500);
    }

    console.log(`[SEND-MESSAGE] Using provider for instance ${instance.name}`);

    const result = await provider.sendTextMessage({
      instanceName: instance.name,
      token: token,
      number: cleanPhone,
      text: text.trim(),
      quoted: quotedData
    });

    console.log('[SEND-MESSAGE] Provider API response:', JSON.stringify(result));

    // ✅ Extrair o provider_message_id do resultado da API
    // Evolution: result.key.id ou result.message.key.id
    // UAZAPI: result.id ou result.messageId (precisa verificar documentação)
    let providerMessageId = null;
    
    // Tentar Evolution format primeiro
    if (result?.key?.id) {
      providerMessageId = result.key.id;
    } else if (result?.message?.key?.id) {
      providerMessageId = result.message.key.id;
    } 
    // Tentar UAZAPI format
    else if (result?.id) {
      providerMessageId = result.id;
    } else if (result?.messageId) {
      providerMessageId = result.messageId;
    } else if (result?.data?.id) {
      providerMessageId = result.data.id;
    }
    
    if (!providerMessageId) {
      console.warn('⚠️ [SEND-MESSAGE] No provider message ID returned from API');
      console.warn('   API Response structure:', Object.keys(result || {}));
      console.warn('   This message will not be deletable from WhatsApp later!');
    } else {
      console.log(`✅ [SEND-MESSAGE] Provider message ID extracted: ${providerMessageId}`);
    }

    // 6. Save message to database
    const now = new Date().toISOString();
    const userId = c.get('userId');
    
    const messageData: any = {
      conversation_id: conversationId,
      content_type: 'text',
      message_type: 'sent',
      text_content: text.trim(),
      is_read: true,
      created_at: now,
      provider_message_id: providerMessageId || null, // ✅ Salvar o ID do provider (WhatsApp)
      sent_by: userId // ✅ Adicionado sent_by para vincular ao usuário
    };
    
    console.log('💾 [SEND-MESSAGE] Attempting to save message to database...');
    console.log('   Message data to insert:', JSON.stringify(messageData, null, 2));
    
    // ✅ Inserir mensagem (Postgres gera UUID automaticamente para o id)
    const { data: savedMessage, error: saveError } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();

    if (saveError) {
      console.error('❌ [SEND-MESSAGE] Error saving message:');
      console.error('   Error Code:', saveError.code);
      console.error('   Error Message:', saveError.message);
      console.error('   Error Details:', saveError.details);
      console.error('   Error Hint:', saveError.hint);
      console.error('   Full Error:', JSON.stringify(saveError, null, 2));
      console.error('   Message Data:', JSON.stringify(messageData, null, 2));
      return c.json({ 
        error: 'Message sent but failed to save to database', 
        code: saveError.code,
        message: saveError.message,
        details: saveError.details,
        hint: saveError.hint
      }, 500);
    }

    // 7. Update conversation
    await supabase
      .from('conversations')
      .update({
        last_message: text.trim(),
        last_message_at: now,
        updated_at: now
      })
      .eq('id', conversationId);

    console.log('✅ [SEND-MESSAGE] Message sent and saved successfully');

    // ✅ 8. Registrar atividade no lead se existir
    if (conversation.lead_id) {
      try {
        const { data: { user } } = await supabase.auth.getUser(c.get('userId'));
        
        if (user) {
          // Truncar mensagem (máximo 80 caracteres)
          const truncatedText = text.trim().length > 80
            ? text.trim().substring(0, 80) + '...'
            : text.trim();
          
          const description = `Enviou mensagem: "${truncatedText}"`;
          
          const { error: activityInsertError } = await supabase.from('lead_activities').insert({
            lead_id: conversation.lead_id,
            description: description,
            activity_type: 'user',
            user_id: user.id,
          });
          
          if (activityInsertError) {
            console.error('⚠️ [SEND-MESSAGE] Failed to log activity:', activityInsertError);
          } else {
            console.log('✅ [SEND-MESSAGE] Activity logged for lead:', conversation.lead_id);
          }
        }
      } catch (activityError) {
        console.error('⚠️ [SEND-MESSAGE] Failed to log activity:', activityError);
        // Não falhar o envio por causa do log
      }
    }

    return c.json({ 
      success: true, 
      message: savedMessage,
      evolution_response: result
    });

  } catch (error) {
    console.error('❌ [SEND-MESSAGE] Error sending message:', error);
    
    // ✅ Handle Invalid Number Error (User Error 400)
    if (error.message && error.message.includes('[INVALID_NUMBER]')) {
      return c.json({ 
        error: error.message.replace('[INVALID_NUMBER] ', ''),
        code: 'INVALID_NUMBER'
      }, 400);
    }

    return c.json({ error: error.message }, 500);
  }
});

// Enviar áudio via WhatsApp
app.post('/make-server-e4f9d774/conversations/:conversationId/messages/send-audio', validateAuth, validateWorkspaceAccess, async (c) => {
  try {
    const conversationId = c.req.param('conversationId');
    const workspaceId = c.get('workspaceId');
    const { audioUrl, audioDuration, quotedMessageId } = await c.req.json();

    console.log(`🎤 [SEND-AUDIO] ==========================================`);
    console.log(`🎤 [SEND-AUDIO] REQUEST RECEIVED`);
    console.log(`🎤 [SEND-AUDIO] ==========================================`);
    console.log(`   Conversation ID: ${conversationId}`);
    console.log(`   Workspace ID: ${workspaceId}`);
    console.log(`   Audio URL length: ${audioUrl?.length || 0}`);
    console.log(`   Audio URL prefix: ${audioUrl?.substring(0, 50)}...`);
    console.log(`   Audio Duration (raw): ${audioDuration}`);
    console.log(`   Audio Duration (type): ${typeof audioDuration}`);
    console.log(`   Quoted Message ID: ${quotedMessageId || 'none'}`);
    console.log(`🎤 [SEND-AUDIO] ==========================================`);

    if (!audioUrl || !audioUrl.trim()) {
      return c.json({ error: 'Audio URL is required' }, 400);
    }

    // 1. Get conversation details (incluir lead_id para logs)
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, contact_phone, workspace_id, inbox_id, lead_id')
      .eq('id', conversationId)
      .eq('workspace_id', workspaceId)
      .single();

    if (convError || !conversation) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    console.log(`[SEND-AUDIO] Conversation found. Contact: ${conversation.contact_phone}, Inbox ID: ${conversation.inbox_id}, Lead ID: ${conversation.lead_id || 'none'}`);

    // Clean phone number (remove non-digits)
    const cleanPhone = conversation.contact_phone.replace(/\D/g, '');
    console.log(`[SEND-AUDIO] Cleaned phone number: ${cleanPhone}`);

    // 2. Get instance - Try multiple strategies
    let instanceId = null;

    // Strategy 1: Try to get via inbox_instances if inbox_id exists
    if (conversation.inbox_id) {
      const { data: inboxInstance } = await supabase
        .from('inbox_instances')
        .select('instance_id')
        .eq('inbox_id', conversation.inbox_id)
        .limit(1)
        .maybeSingle();

      if (inboxInstance) {
        instanceId = inboxInstance.instance_id;
        console.log(`[SEND-AUDIO] Found instance via inbox_instances: ${instanceId}`);
      }
    }

    // Strategy 2: If no instance found via inbox, get any connected instance from workspace
    if (!instanceId) {
      console.log(`[SEND-AUDIO] No instance via inbox, trying workspace instances...`);
      
      const { data: workspaceInstance } = await supabase
        .from('instances')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('status', 'connected')
        .limit(1)
        .maybeSingle();

      if (workspaceInstance) {
        instanceId = workspaceInstance.id;
        console.log(`[SEND-AUDIO] Found connected instance in workspace: ${instanceId}`);
      }
    }

    // Strategy 3: If still no connected instance, get any instance from workspace
    if (!instanceId) {
      console.log(`[SEND-AUDIO] No connected instance, trying any workspace instance...`);
      
      const { data: anyInstance } = await supabase
        .from('instances')
        .select('id')
        .eq('workspace_id', workspaceId)
        .limit(1)
        .maybeSingle();

      if (anyInstance) {
        instanceId = anyInstance.id;
        console.log(`[SEND-AUDIO] Found instance in workspace: ${instanceId}`);
      }
    }

    if (!instanceId) {
      return c.json({ 
        error: 'No WhatsApp instance found. Please create and connect an instance first.',
        hint: 'Go to Instances page to create a new WhatsApp instance'
      }, 400);
    }

    // 3. Get instance details
    const { data: instance, error: instanceError } = await supabase
      .from('instances')
      .select('id, name, status')
      .eq('id', instanceId)
      .single();

    if (instanceError || !instance) {
      return c.json({ error: 'Instance not found' }, 404);
    }

    console.log(`[SEND-AUDIO] Instance details - Name: ${instance.name}, Status: ${instance.status}`);

    if (instance.status !== 'connected') {
      return c.json({ 
        error: `WhatsApp instance "${instance.name}" is not connected. Current status: ${instance.status}`,
        hint: 'Please connect your WhatsApp instance before sending messages',
        instanceName: instance.name,
        instanceStatus: instance.status
      }, 400);
    }

    // 4. Prepare quoted message if provided
    let quotedData = null;
    if (quotedMessageId) {
      const { data: quotedMsg } = await supabase
        .from('messages')
        .select('id, text_content')
        .eq('id', quotedMessageId)
        .single();
      
      if (quotedMsg) {
        quotedData = {
          key: { id: quotedMsg.id },
          message: { conversation: quotedMsg.text_content }
        };
      }
    }

    // 5. Send audio via WhatsApp Provider (dynamic)
    const ProviderFactory = (await import('./provider-factory.ts')).default;
    const provider = await ProviderFactory.getProviderForInstance(instance.id);
    const token = await ProviderFactory.getTokenForInstance(instance.id); // ✅ Token dinâmico!

    if (!token) {
      return c.json({ 
        error: 'No API token configured for this instance',
        hint: `Please configure api_key in database or set ${instance.provider.toUpperCase()}_API_KEY environment variable`,
        instanceName: instance.name
      }, 500);
    }

    console.log(`[SEND-AUDIO] Using provider for instance ${instance.name}`);

    const result = await provider.sendAudioMessage({
      instanceName: instance.name,
      token: token,
      number: cleanPhone,
      audioUrl: audioUrl.trim(),
      audioDuration: audioDuration || 3,
      quoted: quotedData
    });

    console.log('[SEND-AUDIO] Provider API response:', JSON.stringify(result));

    // ✅ Extrair o provider_message_id do resultado da API
    let providerMessageId = null;
    
    // Tentar Evolution format primeiro
    if (result?.key?.id) {
      providerMessageId = result.key.id;
    } else if (result?.message?.key?.id) {
      providerMessageId = result.message.key.id;
    } 
    // Tentar UAZAPI format
    else if (result?.id) {
      providerMessageId = result.id;
    } else if (result?.messageId) {
      providerMessageId = result.messageId;
    } else if (result?.data?.id) {
      providerMessageId = result.data.id;
    }
    
    if (!providerMessageId) {
      console.warn('⚠️ [SEND-AUDIO] No provider message ID returned from API');
      console.warn('   API Response structure:', Object.keys(result || {}));
      console.warn('   This message will not be deletable from WhatsApp later!');
    } else {
      console.log(`✅ [SEND-AUDIO] Provider message ID extracted: ${providerMessageId}`);
    }

    // 6. Save message to database
    const now = new Date().toISOString();
    const userId = c.get('userId');
    
    const messageData: any = {
      conversation_id: conversationId,
      content_type: 'audio',
      message_type: 'sent',
      text_content: null,
      media_url: audioUrl.trim(),
      audio_duration: audioDuration || null,
      is_read: true,
      created_at: now,
      provider_message_id: providerMessageId || null, // ✅ Salvar o ID do provider (WhatsApp)
      sent_by: userId // ✅ Adicionado sent_by para vincular ao usuário
    };
    
    console.log('💾 [SEND-AUDIO] ==========================================');
    console.log('💾 [SEND-AUDIO] SAVING TO DATABASE');
    console.log('💾 [SEND-AUDIO] ==========================================');
    console.log('   audio_duration field:', messageData.audio_duration);
    console.log('   audio_duration type:', typeof messageData.audio_duration);
    console.log('   Full message data:', JSON.stringify({ ...messageData, media_url: messageData.media_url?.substring(0, 50) + '...' }, null, 2));
    console.log('💾 [SEND-AUDIO] ==========================================');
    
    // ✅ Inserir mensagem (Postgres gera UUID automaticamente para o id)
    const { data: savedMessage, error: saveError } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();

    if (saveError) {
      console.error('❌ [SEND-AUDIO] Error saving message:');
      console.error('   Error Code:', saveError.code);
      console.error('   Error Message:', saveError.message);
      console.error('   Error Details:', saveError.details);
      console.error('   Error Hint:', saveError.hint);
      return c.json({ 
        error: 'Audio sent but failed to save to database', 
        code: saveError.code,
        message: saveError.message,
        details: saveError.details,
        hint: saveError.hint
      }, 500);
    }

    console.log('✅ [SEND-AUDIO] ==========================================');
    console.log('✅ [SEND-AUDIO] SAVED TO DATABASE SUCCESSFULLY!');
    console.log('✅ [SEND-AUDIO] ==========================================');
    console.log('   Saved message ID:', savedMessage.id);
    console.log('   Saved audio_duration:', savedMessage.audio_duration);
    console.log('   Saved audio_duration type:', typeof savedMessage.audio_duration);
    console.log('   Full saved message:', JSON.stringify({ ...savedMessage, media_url: savedMessage.media_url?.substring(0, 50) + '...' }, null, 2));
    console.log('✅ [SEND-AUDIO] ==========================================');

    // 7. Update conversation
    await supabase
      .from('conversations')
      .update({
        last_message: '🎤 Áudio',
        last_message_at: now,
        updated_at: now
      })
      .eq('id', conversationId);

    console.log('✅ [SEND-AUDIO] Audio sent and saved successfully');

    // ✅ 8. Registrar atividade no lead se existir
    if (conversation.lead_id) {
      try {
        const { data: { user } } = await supabase.auth.getUser(c.get('userId'));
        
        if (user) {
          const duration = audioDuration 
            ? ` (${Math.round(audioDuration)}s)`
            : '';
          const description = `Enviou áudio${duration}`;
          
          const { error: activityInsertError } = await supabase.from('lead_activities').insert({
            lead_id: conversation.lead_id,
            description: description,
            activity_type: 'user',
            user_id: user.id,
          });
          
          if (activityInsertError) {
            console.error('⚠️ [SEND-AUDIO] Failed to log activity:', activityInsertError);
          } else {
            console.log('✅ [SEND-AUDIO] Activity logged for lead:', conversation.lead_id);
          }
        }
      } catch (activityError) {
        console.error('⚠️ [SEND-AUDIO] Failed to log activity:', activityError);
        // Não falhar o envio por causa do log
      }
    }

    return c.json({ 
      success: true, 
      message: savedMessage,
      evolution_response: result
    });

  } catch (error) {
    console.error('❌ [SEND-AUDIO] Error sending audio:', error);
    
    // ✅ Handle Invalid Number Error (User Error 400)
    if (error.message && error.message.includes('[INVALID_NUMBER]')) {
      return c.json({ 
        error: error.message.replace('[INVALID_NUMBER] ', ''),
        code: 'INVALID_NUMBER'
      }, 400);
    }

    return c.json({ error: error.message }, 500);
  }
});

// Enviar mídia via WhatsApp (Imagem, Vídeo, Documento)
app.post('/make-server-e4f9d774/conversations/:conversationId/messages/send-media', validateAuth, validateWorkspaceAccess, async (c) => {
  try {
    const conversationId = c.req.param('conversationId');
    const workspaceId = c.get('workspaceId');
    const { mediaUrl, mediaType, mimeType, caption, fileName, quotedMessageId } = await c.req.json();

    if (!mediaUrl || !mediaUrl.trim()) {
      return c.json({ error: 'Media URL is required' }, 400);
    }

    console.log(`🖼️ [SEND-MEDIA] Sending ${mediaType} to conversation ${conversationId}`);
    // Truncar log de URL se for muito longa (base64)
    const logUrl = mediaUrl.length > 100 ? mediaUrl.substring(0, 50) + '...' : mediaUrl;
    console.log(`   Media URL: ${logUrl}`);

    // 1. Get conversation details (incluir lead_id para logs)
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, contact_phone, workspace_id, inbox_id, lead_id')
      .eq('id', conversationId)
      .eq('workspace_id', workspaceId)
      .single();

    if (convError || !conversation) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    console.log(`[SEND-MEDIA] Conversation found. Contact: ${conversation.contact_phone}, Lead ID: ${conversation.lead_id || 'none'}`);

    // Clean phone number (remove non-digits)
    const cleanPhone = conversation.contact_phone.replace(/\D/g, '');
    console.log(`[SEND-MEDIA] Cleaned phone number: ${cleanPhone}`);

    // 2. ✅ Upload media to Storage if base64
    let finalMediaUrl = mediaUrl;
    
    if (mediaUrl.startsWith('data:')) {
      console.log('[SEND-MEDIA] Detected base64 media, uploading to Storage...');
      
      try {
        const { uploadMedia, initializeBucket } = await import('./storage-manager.ts');
        
        // Garantir que o bucket existe
        await initializeBucket();
        
        // Upload da mídia
        const { signedUrl } = await uploadMedia(
          mediaUrl,
          mimeType || 'image/jpeg',
          conversationId
        );
        
        finalMediaUrl = signedUrl;
        console.log('[SEND-MEDIA] ✅ Media uploaded to Storage successfully');
      } catch (uploadError) {
        console.error('[SEND-MEDIA] Failed to upload to Storage:', uploadError);
        console.warn('[SEND-MEDIA] Continuing with base64 (fallback)');
        // Se falhar, continua com base64 original
      }
    } else {
      console.log('[SEND-MEDIA] Media is already a URL, skipping upload');
    }

    // 3. Get instance - Try multiple strategies
    let instanceId = null;

    // Strategy 1: Inbox Instance
    if (conversation.inbox_id) {
      const { data: inboxInstance } = await supabase
        .from('inbox_instances')
        .select('instance_id')
        .eq('inbox_id', conversation.inbox_id)
        .limit(1)
        .maybeSingle();

      if (inboxInstance) {
        instanceId = inboxInstance.instance_id;
      }
    }

    // Strategy 2: Workspace Connected Instance
    if (!instanceId) {
      const { data: workspaceInstance } = await supabase
        .from('instances')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('status', 'connected')
        .limit(1)
        .maybeSingle();

      if (workspaceInstance) {
        instanceId = workspaceInstance.id;
      }
    }

    // Strategy 3: Any Workspace Instance
    if (!instanceId) {
      const { data: anyInstance } = await supabase
        .from('instances')
        .select('id')
        .eq('workspace_id', workspaceId)
        .limit(1)
        .maybeSingle();

      if (anyInstance) {
        instanceId = anyInstance.id;
      }
    }

    if (!instanceId) {
      return c.json({ 
        error: 'No WhatsApp instance found. Please create and connect an instance first.',
      }, 400);
    }

    // 4. Get instance details
    const { data: instance, error: instanceError } = await supabase
      .from('instances')
      .select('id, name, status')
      .eq('id', instanceId)
      .single();

    if (instanceError || !instance) {
      return c.json({ error: 'Instance not found' }, 404);
    }

    if (instance.status !== 'connected') {
      return c.json({ 
        error: `WhatsApp instance "${instance.name}" is not connected.`,
      }, 400);
    }

    // 5. Prepare quoted message if provided
    let quotedData = null;
    if (quotedMessageId) {
      const { data: quotedMsg } = await supabase
        .from('messages')
        .select('id, text_content')
        .eq('id', quotedMessageId)
        .single();
      
      if (quotedMsg) {
        quotedData = {
          key: { id: quotedMsg.id },
          message: { conversation: quotedMsg.text_content }
        };
      }
    }

    // 6. Send media via WhatsApp Provider (dynamic)
    const ProviderFactory = (await import('./provider-factory.ts')).default;
    const provider = await ProviderFactory.getProviderForInstance(instance.id);
    const token = await ProviderFactory.getTokenForInstance(instance.id); // ✅ Token dinâmico!

    if (!token) {
      return c.json({ 
        error: 'No API token configured for this instance',
        hint: `Please configure api_key in database or set ${instance.provider.toUpperCase()}_API_KEY environment variable`,
        instanceName: instance.name
      }, 500);
    }

    console.log(`[SEND-MEDIA] Using provider for instance ${instance.name}`);

    const result = await provider.sendMediaMessage({
      instanceName: instance.name,
      token: token,
      number: cleanPhone,
      mediaType: mediaType || 'image',
      mimeType: mimeType || 'image/jpeg',
      caption: caption,
      mediaUrl: finalMediaUrl, // ✅ CORRIGIDO: Usar finalMediaUrl (Storage URL ou base64 original)
      fileName: fileName,
      quoted: quotedData
    });

    console.log('[SEND-MEDIA] Provider API response:', JSON.stringify(result));

    // ✅ Extrair o provider_message_id do resultado da API
    let providerMessageId = null;
    
    // Tentar Evolution format primeiro
    if (result?.key?.id) {
      providerMessageId = result.key.id;
    } else if (result?.message?.key?.id) {
      providerMessageId = result.message.key.id;
    } 
    // Tentar UAZAPI format
    else if (result?.id) {
      providerMessageId = result.id;
    } else if (result?.messageId) {
      providerMessageId = result.messageId;
    } else if (result?.data?.id) {
      providerMessageId = result.data.id;
    }
    
    if (!providerMessageId) {
      console.warn('⚠️ [SEND-MEDIA] No provider message ID returned from API');
      console.warn('   API Response structure:', Object.keys(result || {}));
      console.warn('   This message will not be deletable from WhatsApp later!');
    } else {
      console.log(`✅ [SEND-MEDIA] Provider message ID extracted: ${providerMessageId}`);
    }

    // 7. Save message to database (✅ salvando signed URL do Storage)
    const now = new Date().toISOString();
    const userId = c.get('userId');
    
    const messageData: any = {
      conversation_id: conversationId,
      content_type: mediaType || 'image',
      message_type: 'sent',
      text_content: caption || null,
      media_url: finalMediaUrl, // ✅ Salvar signed URL do Storage ao invés de base64
      is_read: true,
      created_at: now,
      provider_message_id: providerMessageId || null, // ✅ Salvar o ID do provider (WhatsApp)
      sent_by: userId // ✅ Adicionado sent_by para vincular ao usuário
    };

    // ✅ Inserir mensagem (Postgres gera UUID automaticamente para o id)
    const { data: savedMessage, error: saveError } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();

    if (saveError) {
      console.error('❌ [SEND-MEDIA] Error saving message to DB:', saveError);
      // Retornar sucesso do envio mesmo se falhar o salvamento no DB?
      // Melhor retornar erro para debug
       return c.json({ 
        error: 'Media sent but failed to save to database', 
        details: saveError
      }, 500);
    }

    // 7. Update conversation
    await supabase
      .from('conversations')
      .update({
        last_message: caption || (mediaType === 'image' ? '📷 Imagem' : '📎 Mídia'),
        last_message_at: now,
        updated_at: now
      })
      .eq('id', conversationId);

    // ✅ 8. Registrar atividade no lead se existir
    if (conversation.lead_id) {
      try {
        const { data: { user } } = await supabase.auth.getUser(c.get('userId'));
        
        if (user) {
          let description = '';
          
          if (mediaType === 'image') {
            description = 'Enviou imagem';
          } else if (mediaType === 'video') {
            description = 'Enviou vídeo';
          } else if (mediaType === 'document') {
            description = fileName ? `Enviou documento: ${fileName}` : 'Enviou documento';
          } else {
            description = 'Enviou mídia';
          }
          
          const { error: activityInsertError } = await supabase.from('lead_activities').insert({
            lead_id: conversation.lead_id,
            description: description,
            activity_type: 'user',
            user_id: user.id,
          });
          
          if (activityInsertError) {
            console.error('⚠️ [SEND-MEDIA] Failed to log activity:', activityInsertError);
          } else {
            console.log('✅ [SEND-MEDIA] Activity logged for lead:', conversation.lead_id);
          }
        }
      } catch (activityError) {
        console.error('⚠️ [SEND-MEDIA] Failed to log activity:', activityError);
        // Não falhar o envio por causa do log
      }
    }

    return c.json({ 
      success: true, 
      message: savedMessage,
      evolution_response: result
    });

  } catch (error) {
    console.error('❌ [SEND-MEDIA] Error sending media:', error);
    
    // ✅ Handle Invalid Number Error (User Error 400)
    if (error.message && error.message.includes('[INVALID_NUMBER]')) {
      return c.json({ 
        error: error.message.replace('[INVALID_NUMBER] ', ''),
        code: 'INVALID_NUMBER'
      }, 400);
    }
    
    return c.json({ error: error.message }, 500);
  }
});

// Atualizar attendant_type da conversa
app.patch('/make-server-e4f9d774/conversations/:conversationId/attendant-type', validateAuth, async (c) => {
  try {
    const conversationId = c.req.param('conversationId');
    const { attendant_type } = await c.req.json();

    if (!attendant_type || !['human', 'ai'].includes(attendant_type)) {
      return c.json({ error: 'Invalid attendant_type. Must be "human" or "ai"' }, 400);
    }

    console.log(`🔄 [UPDATE-ATTENDANT] Updating conversation ${conversationId} to ${attendant_type}`);

    // Atualizar no banco de dados
    const { data: updatedConv, error } = await supabase
      .from('conversations')
      .update({ attendant_type })
      .eq('id', conversationId)
      .select()
      .single();

    if (error) {
      console.error('❌ [UPDATE-ATTENDANT] Database error:', error);
      return c.json({ error: `Failed to update attendant type: ${error.message}` }, 500);
    }

    console.log('✅ [UPDATE-ATTENDANT] Attendant type updated successfully');

    return c.json({ 
      success: true, 
      conversation: updatedConv 
    });

  } catch (error) {
    console.error('❌ [UPDATE-ATTENDANT] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Deletar mensagem para todos
app.delete('/make-server-e4f9d774/messages/:messageId/delete', validateAuth, validateWorkspaceAccess, async (c) => {
  try {
    const messageId = c.req.param('messageId');
    const workspaceId = c.get('workspaceId');

    console.log(`🗑️ [DELETE-MESSAGE] Deleting message ${messageId}`);

    // 1. Buscar a mensagem no banco de dados
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .select(`
        id,
        conversation_id,
        message_type,
        created_at,
        provider_message_id,
        conversations!inner(
          id,
          contact_phone,
          workspace_id,
          inbox_id
        )
      `)
      .eq('id', messageId)
      .single();

    if (msgError || !message) {
      console.error('❌ [DELETE-MESSAGE] Message not found:', msgError);
      return c.json({ error: 'Message not found' }, 404);
    }

    // Verificar se a mensagem pertence ao workspace
    if (message.conversations.workspace_id !== workspaceId) {
      return c.json({ error: 'Access denied' }, 403);
    }

    // ✅ VALIDAÇÃO: Só pode deletar mensagens ENVIADAS
    if (message.message_type !== 'sent') {
      return c.json({ 
        error: 'Você só pode deletar mensagens enviadas por você',
        hint: 'Mensagens recebidas não podem ser deletadas'
      }, 400);
    }

    // ✅ VALIDAÇÃO: Limite de tempo (1 hora = 3600000ms)
    const messageTime = new Date(message.created_at).getTime();
    const now = Date.now();
    const timeDiff = now - messageTime;
    const ONE_HOUR = 60 * 60 * 1000;

    if (timeDiff > ONE_HOUR) {
      return c.json({ 
        error: 'Não é possível deletar mensagens com mais de 1 hora',
        hint: 'O WhatsApp só permite deletar mensagens recentes'
      }, 400);
    }

    // 2. Buscar a instância para enviar a requisição de delete para WhatsApp
    let instanceId = null;

    // Strategy 1: Tentar via inbox_instances
    if (message.conversations.inbox_id) {
      const { data: inboxInstance } = await supabase
        .from('inbox_instances')
        .select('instance_id')
        .eq('inbox_id', message.conversations.inbox_id)
        .limit(1)
        .maybeSingle();

      if (inboxInstance) {
        instanceId = inboxInstance.instance_id;
      }
    }

    // Strategy 2: Qualquer instância conectada do workspace
    if (!instanceId) {
      const { data: workspaceInstance } = await supabase
        .from('instances')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('status', 'connected')
        .limit(1)
        .maybeSingle();

      if (workspaceInstance) {
        instanceId = workspaceInstance.id;
      }
    }

    // 3. Buscar detalhes da instância e tentar deletar no WhatsApp
    let deletedFromWhatsApp = false;
    
    if (instanceId) {
      const { data: instance } = await supabase
        .from('instances')
        .select('id, name, status, provider, provider_type')
        .eq('id', instanceId)
        .single();

      if (instance && instance.status === 'connected') {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`🗑️ [DELETE-MESSAGE] Attempting to delete from WhatsApp`);
        console.log(`   Instance: ${instance.name} (${instance.provider_type})`);
        console.log(`   Message ID (DB UUID): ${messageId}`);
        console.log(`   Provider Message ID: ${message.provider_message_id || 'N/A - Cannot delete from WhatsApp!'}`);
        console.log(`   Contact Phone: ${message.conversations.contact_phone}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        try {
          // ✅ Validar se temos o ID do provider para deletar no WhatsApp
          if (!message.provider_message_id) {
            console.warn('⚠️ [DELETE-MESSAGE] No provider_message_id found - cannot delete from WhatsApp');
            console.warn('   This message was saved before the migration or was created manually');
            console.warn('   Message will only be deleted from database');
            throw new Error('Message cannot be deleted from WhatsApp (no provider ID)');
          }

          // ✅ Usar ProviderFactory para provider e token dinâmicos
          const ProviderFactory = (await import('./provider-factory.ts')).default;
          const provider = await ProviderFactory.getProviderForInstance(instance.id);
          const token = await ProviderFactory.getTokenForInstance(instance.id);

          if (!token) {
            console.error(`❌ [DELETE-MESSAGE] No token configured for instance: ${instance.name}`);
            console.error(`   Please configure api_key in database or set ${instance.provider.toUpperCase()}_API_KEY environment variable`);
            throw new Error('No token configured for this instance');
          }

          console.log(`✅ [DELETE-MESSAGE] Provider loaded for instance: ${instance.name}`);
          console.log(`✅ [DELETE-MESSAGE] Token found: ${token.substring(0, 10)}...`);

          // ✅ CORRIGIDO: Usar provider_message_id do banco
          const deleteParams = {
            instanceName: instance.name,
            token: token,
            messageId: message.provider_message_id, // ✅ CORRETO: ID original do WhatsApp
            remoteJid: message.conversations.contact_phone,
            fromMe: true,
          };

          console.log('📤 [DELETE-MESSAGE] Sending delete request to provider:');
          console.log('   Params:', JSON.stringify(deleteParams, null, 2));

          const deleteResult = await provider.deleteMessage(deleteParams);

          console.log('📥 [DELETE-MESSAGE] Provider response:', JSON.stringify(deleteResult, null, 2));

          deletedFromWhatsApp = true;
          console.log(`✅ [DELETE-MESSAGE] Message deleted from WhatsApp via ${instance.provider_type}`);
        } catch (providerError) {
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.error(`❌ [DELETE-MESSAGE] Failed to delete from WhatsApp (${instance.provider_type})`);
          console.error(`   Error type: ${providerError.constructor.name}`);
          console.error(`   Error message: ${providerError.message}`);
          if (providerError.response) {
            console.error(`   HTTP Status: ${providerError.response?.status}`);
            console.error(`   HTTP Response:`, providerError.response?.data);
          }
          console.error(`   Stack trace:`, providerError.stack);
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          // Continuar para marcar como deletada no banco mesmo se falhar no WhatsApp
        }
      }
    }

    // 4. 🗑️ Marcar mensagem como deletada no banco (não deletar fisicamente)
    const { error: updateError } = await supabase
      .from('messages')
      .update({ 
        message_type: 'delete', // ✅ Marcar como tipo 'delete'
        // ✅ NÃO limpar text_content e media_url para manter o histórico visível
      })
      .eq('id', messageId);

    if (updateError) {
      console.error('❌ [DELETE-MESSAGE] Database update error:', updateError);
      return c.json({ error: `Failed to mark message as deleted: ${updateError.message}` }, 500);
    }

    // 5. Atualizar last_message da conversa se necessário
    const { data: latestMessage } = await supabase
      .from('messages')
      .select('text_content, created_at')
      .eq('conversation_id', message.conversation_id)
      // .is('deleted_at', null) // TODO: Descomentar após executar migração SQL
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestMessage) {
      await supabase
        .from('conversations')
        .update({
          last_message: latestMessage.text_content || 'Mídia',
          last_message_at: latestMessage.created_at,
        })
        .eq('id', message.conversation_id);
    } else {
      // Não há mais mensagens não-deletadas
      await supabase
        .from('conversations')
        .update({
          last_message: null,
          last_message_at: null,
        })
        .eq('id', message.conversation_id);
    }

    console.log('✅ [DELETE-MESSAGE] Message deleted successfully');

    return c.json({ 
      success: true, 
      message: 'Message deleted successfully',
      deletedFromWhatsApp
    });

  } catch (error) {
    console.error('❌ [DELETE-MESSAGE] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================
// AUTH ROUTES
// ============================================

// Sign Up
app.post('/make-server-e4f9d774/auth/signup', async (c) => {
  try {
    const { name, email, password, workspaceName } = await c.req.json();

    if (!name || !email || !password || !workspaceName) {
      return c.json({ error: 'Missing required fields: name, email, password, workspaceName' }, 400);
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm since no email server configured
      user_metadata: { name }
    });

    if (authError) {
      console.log('Supabase Auth signup error:', authError);
      return c.json({ error: `Signup failed: ${authError.message}` }, 400);
    }

    const userId = authData.user.id;

    // Create user in public.users table using RPC
    const { data: userRpc, error: userError } = await supabase.rpc('create_user_profile', {
      p_user_id: userId,
      p_email: email,
      p_name: name,
    });

    if (userError || !userRpc?.success) {
      console.log('❌ Error creating public user via RPC:', userError || userRpc?.error);
      // Don't fail hard here, auth user exists
    } else {
      console.log('✅ User profile created via RPC');
    }

    // Create first workspace using RPC
    const { data: wsRpc, error: wsError } = await supabase.rpc('create_workspace_with_owner', {
      p_name: workspaceName,
      p_owner_id: userId,
    });

    if (wsError || !wsRpc?.success) {
      console.log('❌ Error creating workspace via RPC:', wsError || wsRpc?.error);
      return c.json({ error: `Failed to create workspace: ${wsError?.message || wsRpc?.error}` }, 500);
    }

    console.log('✅ Workspace created via RPC (member already added)');

    return c.json({
      message: 'Signup successful',
      user: { id: userId, email, name },
      workspace: {
        id: wsRpc.workspace_id,
        name: wsRpc.name,
        slug: wsRpc.slug,
        owner_id: wsRpc.owner_id
      },
      userId,
      workspaceId: wsRpc.workspace_id
    });

  } catch (error) {
    console.log('Signup error:', error);
    return c.json({ error: `Signup failed: ${error.message}` }, 500);
  }
});

// ============================================
// USER ROUTES (Protected)
// ============================================

// Get User Profile
app.get('/make-server-e4f9d774/user/profile', validateAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ user });
  } catch (error) {
    console.log('Get profile error:', error);
    return c.json({ error: `Failed to get profile: ${error.message}` }, 500);
  }
});

// Update User Profile
app.put('/make-server-e4f9d774/user/profile', validateAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const { name } = await c.req.json();

    if (!name) {
      return c.json({ error: 'Name is required' }, 400);
    }

    const { data: user, error } = await supabase
      .from('users')
      .update({ name })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return c.json({ error: `Failed to update profile: ${error.message}` }, 500);
    }

    return c.json({ user });
  } catch (error) {
    console.log('Update profile error:', error);
    return c.json({ error: `Failed to update profile: ${error.message}` }, 500);
  }
});

// Get User Workspaces
app.get('/make-server-e4f9d774/user/workspaces', validateAuth, async (c) => {
  try {
    const userId = c.get('userId');
    
    const { data: members, error } = await supabase
      .from('workspace_members')
      .select(`
        role,
        workspaces (
          id,
          name,
          slug,
          owner_id,
          created_at,
          settings
        )
      `)
      .eq('user_id', userId);

    if (error) {
      return c.json({ error: `Failed to get workspaces: ${error.message}` }, 500);
    }

    const workspaces = members.map((m: any) => ({
      ...m.workspaces,
      role: m.role
    }));

    return c.json({ 
      workspaces,
      last_workspace_id: workspaces.length > 0 ? workspaces[0].id : null 
    });
  } catch (error) {
    console.log('Get workspaces error:', error);
    return c.json({ error: `Failed to get workspaces: ${error.message}` }, 500);
  }
});

// Switch Workspace (Client side mainly, but server can validate)
app.post('/make-server-e4f9d774/user/switch-workspace', validateAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const { workspaceId } = await c.req.json();

    if (!workspaceId) {
      return c.json({ error: 'Workspace ID required' }, 400);
    }

    // Verify user has access to workspace
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single();

    if (!member) {
      return c.json({ error: 'Access denied' }, 403);
    }

    return c.json({ success: true, workspaceId });
  } catch (error) {
    console.log('Switch workspace error:', error);
    return c.json({ error: `Failed to switch workspace: ${error.message}` }, 500);
  }
});

// ============================================
// WORKSPACE ROUTES (Protected)
// ============================================

// Create Workspace
app.post('/make-server-e4f9d774/workspaces', validateAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const { name } = await c.req.json();

    if (!name) {
      return c.json({ error: 'Workspace name required' }, 400);
    }

    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .insert({
        name,
        slug: generateSlug(name),
        owner_id: userId,
        settings: {}
      })
      .select()
      .single();

    if (wsError) {
      return c.json({ error: `Failed to create workspace: ${wsError.message}` }, 500);
    }

    // Add user as owner
    await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: userId,
        role: 'owner',
        permissions: [],
        invited_by: userId
      });

    return c.json({ workspace });
  } catch (error) {
    console.log('Create workspace error:', error);
    return c.json({ error: `Failed to create workspace: ${error.message}` }, 500);
  }
});

// Get Workspace
app.get('/make-server-e4f9d774/workspaces/:workspaceId', validateAuth, validateWorkspaceAccess, async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const { data: workspace, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single();

    if (error || !workspace) {
      return c.json({ error: 'Workspace not found' }, 404);
    }

    return c.json({ workspace });
  } catch (error) {
    console.log('Get workspace error:', error);
    return c.json({ error: `Failed to get workspace: ${error.message}` }, 500);
  }
});

// Update Workspace (Admin/Owner only)
app.put('/make-server-e4f9d774/workspaces/:workspaceId', validateAuth, validateWorkspaceAccess, async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const memberRole = c.get('memberRole');

    if (!hasPermission(memberRole, 'admin')) {
      return c.json({ error: 'Insufficient permissions - Admin required' }, 403);
    }

    const { name, settings } = await c.req.json();
    
    const updates: any = {};
    if (name) {
      updates.name = name;
      updates.slug = generateSlug(name);
    }
    if (settings) {
      // Need to fetch current settings first to merge if jsonb
      updates.settings = settings; 
    }

    const { data: workspace, error } = await supabase
      .from('workspaces')
      .update(updates)
      .eq('id', workspaceId)
      .select()
      .single();

    if (error) {
      return c.json({ error: `Failed to update workspace: ${error.message}` }, 500);
    }

    return c.json({ workspace });
  } catch (error) {
    console.log('Update workspace error:', error);
    return c.json({ error: `Failed to update workspace: ${error.message}` }, 500);
  }
});

// Delete Workspace (Owner only)
app.delete('/make-server-e4f9d774/workspaces/:workspaceId', validateAuth, validateWorkspaceAccess, async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const memberRole = c.get('memberRole');

    if (memberRole !== 'owner') {
      return c.json({ error: 'Only workspace owner can delete workspace' }, 403);
    }

    const { error } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', workspaceId);

    if (error) {
      return c.json({ error: `Failed to delete workspace: ${error.message}` }, 500);
    }

    return c.json({ success: true });
  } catch (error) {
    console.log('Delete workspace error:', error);
    return c.json({ error: `Failed to delete workspace: ${error.message}` }, 500);
  }
});

// ============================================
// WORKSPACE MEMBERS ROUTES (Protected)
// ============================================

// Get Workspace Members
app.get('/make-server-e4f9d774/workspaces/:workspaceId/members', validateAuth, validateWorkspaceAccess, async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    
    console.log('[GET_MEMBERS] Fetching members for workspace:', workspaceId);
    
    // Use RPC call to bypass RLS or use direct SQL
    // First try: Direct query with service role (should bypass RLS)
    const { data: members, error } = await supabase.rpc('get_workspace_members', {
      p_workspace_id: workspaceId
    });
    
    if (error) {
      // Fallback: Try direct query if RPC doesn't exist
      console.log('[GET_MEMBERS] RPC failed, trying direct query:', error.message);
      
      const { data: directMembers, error: directError } = await supabase
        .from('workspace_members')
        .select(`
          workspace_id,
          user_id,
          role,
          permissions,
          joined_at,
          invited_by,
          users:users!workspace_members_user_id_fkey (
            id,
            name,
            email
          )
        `)
        .eq('workspace_id', workspaceId);
      
      if (directError) {
        console.error('[GET_MEMBERS] Direct query error:', directError);
        return c.json({ error: `Failed to get members: ${directError.message}` }, 500);
      }
      
      // Use direct query results
      const membersWithDetails = (directMembers || []).map((member: any) => ({
        workspace_id: member.workspace_id,
        user_id: member.user_id,
        role: member.role,
        permissions: member.permissions || [],
        joined_at: member.joined_at,
        invited_by: member.invited_by,
        user: member.users ? {
          id: member.users.id,
          name: member.users.name,
          email: member.users.email
        } : null
      }));
      
      console.log('[GET_MEMBERS] Success with direct query, found:', membersWithDetails.length, 'members');
      return c.json({ members: membersWithDetails });
    }

    // Transform RPC results to expected format
    const membersWithDetails = (members || []).map((member: any) => ({
      workspace_id: member.workspace_id,
      user_id: member.user_id,
      role: member.role,
      permissions: member.permissions || [],
      joined_at: member.joined_at,
      invited_by: member.invited_by,
      user: {
        id: member.user_id,
        name: member.user_name,
        email: member.user_email
      }
    }));

    return c.json({ members: membersWithDetails });
  } catch (error) {
    console.log('Get members error:', error);
    return c.json({ error: `Failed to get members: ${error.message}` }, 500);
  }
});

// Invite Member (Admin/Owner only)
app.post('/make-server-e4f9d774/workspaces/:workspaceId/members', validateAuth, validateWorkspaceAccess, async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const memberRole = c.get('memberRole');
    const inviterId = c.get('userId');

    if (!hasPermission(memberRole, 'admin')) {
      return c.json({ error: 'Insufficient permissions - Admin required' }, 403);
    }

    const { email, role = 'member' } = await c.req.json();

    if (!email) {
      return c.json({ error: 'Email required' }, 400);
    }

    // Find user by email
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('email', email)
      .single();

    if (userError || !targetUser) {
        // If user doesn't exist, we should probably create a pending invite or create a shadow user
        // For now, we'll just error as per current logic requirements
      return c.json({ error: 'User not found. Ask them to sign up first.' }, 404);
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', targetUser.id)
      .single();

    if (existingMember) {
      return c.json({ error: 'User is already a member' }, 400);
    }

    // Add as member
    const { data: member, error: addError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspaceId,
        user_id: targetUser.id,
        role,
        permissions: [],
        invited_by: inviterId
      })
      .select()
      .single();

    if (addError) {
      return c.json({ error: `Failed to invite member: ${addError.message}` }, 500);
    }

    return c.json({ 
      member: {
        ...member,
        user: targetUser
      }
    });
  } catch (error) {
    console.log('Invite member error:', error);
    return c.json({ error: `Failed to invite member: ${error.message}` }, 500);
  }
});

// Update Member Role (Admin/Owner only)
app.put('/make-server-e4f9d774/workspaces/:workspaceId/members/:userId', validateAuth, validateWorkspaceAccess, async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const memberRole = c.get('memberRole');
    const targetUserId = c.req.param('userId');

    if (!hasPermission(memberRole, 'admin')) {
      return c.json({ error: 'Insufficient permissions - Admin required' }, 403);
    }

    const { role } = await c.req.json();

    if (!role) {
      return c.json({ error: 'Role required' }, 400);
    }

    // Cannot change owner role via this endpoint if strictly enforcing structure
    // Checking target member role
    const { data: targetMember } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', targetUserId)
      .single();

    if (targetMember?.role === 'owner') {
      return c.json({ error: 'Cannot change owner role directly' }, 400);
    }

    const { data: updatedMember, error } = await supabase
      .from('workspace_members')
      .update({ role })
      .eq('workspace_id', workspaceId)
      .eq('user_id', targetUserId)
      .select()
      .single();

    if (error) {
      return c.json({ error: `Failed to update member: ${error.message}` }, 500);
    }

    return c.json({ member: updatedMember });
  } catch (error) {
    console.log('Update member error:', error);
    return c.json({ error: `Failed to update member: ${error.message}` }, 500);
  }
});

// Remove Member (Admin/Owner only)
app.delete('/make-server-e4f9d774/workspaces/:workspaceId/members/:userId', validateAuth, validateWorkspaceAccess, async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const memberRole = c.get('memberRole');
    const targetUserId = c.req.param('userId');

    if (!hasPermission(memberRole, 'admin')) {
      return c.json({ error: 'Insufficient permissions - Admin required' }, 403);
    }

    const { data: targetMember } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', targetUserId)
      .single();

    if (targetMember?.role === 'owner') {
      return c.json({ error: 'Cannot remove workspace owner' }, 400);
    }

    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', targetUserId);

    if (error) {
      return c.json({ error: `Failed to remove member: ${error.message}` }, 500);
    }

    return c.json({ success: true });
  } catch (error) {
    console.log('Remove member error:', error);
    return c.json({ error: `Failed to remove member: ${error.message}` }, 500);
  }
});

// ============================================
// WORKSPACE INVITES ROUTES (Protected)
// ============================================

// Get Workspace Invites
app.get('/make-server-e4f9d774/workspaces/:workspaceId/invites', validateAuth, validateWorkspaceAccess, async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    
    // Query workspace_invites table if it exists
    // For now, return empty array as invites table may not exist yet
    // TODO: Implement workspace_invites table and query
    
    return c.json({ 
      invites: [],
      message: 'Invites feature coming soon'
    });
  } catch (error) {
    console.log('Get invites error:', error);
    return c.json({ error: `Failed to get invites: ${error.message}` }, 500);
  }
});

// Create Invite (Admin/Owner only)
app.post('/make-server-e4f9d774/workspaces/:workspaceId/invites', validateAuth, validateWorkspaceAccess, async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const memberRole = c.get('memberRole');
    const inviterId = c.get('userId');

    if (!hasPermission(memberRole, 'admin')) {
      return c.json({ error: 'Insufficient permissions - Admin required' }, 403);
    }

    const { role, expires_in_days } = await c.req.json();

    if (!role) {
      return c.json({ error: 'Role is required' }, 400);
    }

    // Validar role
    const validRoles = ['admin', 'member', 'viewer'];
    if (!validRoles.includes(role)) {
      return c.json({ error: 'Invalid role' }, 400);
    }

    // Gerar código único
    const code = crypto.randomUUID().replace(/-/g, '');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (expires_in_days || 7));

    // Inserir convite no banco
    const { error: inviteError } = await supabase
      .from('workspace_invites')
      .insert({
        code,
        workspace_id: workspaceId,
        invited_by: inviterId,
        role,
        expires_at: expiresAt.toISOString(),
      });

    if (inviteError) {
      console.log('Create invite error:', inviteError);
      return c.json({ error: `Failed to create invite: ${inviteError.message}` }, 500);
    }

    console.log('[CREATE-INVITE] Convite criado:', { code, workspaceId, role, expiresAt });

    return c.json({ 
      success: true,
      code,
      expires_at: expiresAt.toISOString()
    });
  } catch (error) {
    console.log('Create invite error:', error);
    return c.json({ error: `Failed to create invite: ${error.message}` }, 500);
  }
});

// Delete Invite (Admin/Owner only)
app.delete('/make-server-e4f9d774/workspaces/:workspaceId/invites/:inviteId', validateAuth, validateWorkspaceAccess, async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const memberRole = c.get('memberRole');
    const inviteId = c.req.param('inviteId');

    if (!hasPermission(memberRole, 'admin')) {
      return c.json({ error: 'Insufficient permissions - Admin required' }, 403);
    }

    // TODO: Implement invite deletion
    
    return c.json({ 
      success: true,
      message: 'Invite feature coming soon'
    });
  } catch (error) {
    console.log('Delete invite error:', error);
    return c.json({ error: `Failed to delete invite: ${error.message}` }, 500);
  }
});

// ============================================
// INVITE MEMBER BY EMAIL (Admin/Owner only)
// ============================================
app.post('/make-server-e4f9d774/functions/v1/invite-member-by-email', validateAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const { workspace_id, email, role } = await c.req.json();

    console.log('[INVITE-BY-EMAIL] Request received:', { workspace_id, email, role });

    // Validate required fields
    if (!workspace_id || !email || !role) {
      return c.json({ 
        success: false,
        error: 'Campos obrigatórios: workspace_id, email, role' 
      }, 400);
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Validate role
    const validRoles = ['admin', 'member', 'viewer'];
    if (!validRoles.includes(role)) {
      return c.json({ 
        success: false,
        error: 'Role inválido. Use: admin, member ou viewer' 
      }, 400);
    }

    // Check if current user has permission (must be admin or owner)
    const { data: currentMember, error: memberCheckError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace_id)
      .eq('user_id', userId)
      .single();

    if (memberCheckError || !currentMember) {
      return c.json({ 
        success: false,
        error: 'Você não tem acesso a este workspace' 
      }, 403);
    }

    if (!hasPermission(currentMember.role, 'admin')) {
      return c.json({ 
        success: false,
        error: 'Apenas admins e owners podem convidar membros' 
      }, 403);
    }

    // Find user by email
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (userError) {
      console.error('[INVITE-BY-EMAIL] Error finding user:', userError);
      return c.json({ 
        success: false,
        error: 'Erro ao buscar usuário' 
      }, 500);
    }

    // User not found
    if (!targetUser) {
      return c.json({ 
        success: false,
        error_code: 'USER_NOT_FOUND',
        message: 'O e-mail não possui conta no sistema.' 
      }, 404);
    }

    console.log('[INVITE-BY-EMAIL] User found:', { id: targetUser.id, name: targetUser.name });

    // Check if user is already a member
    const { data: existingMember, error: existingError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace_id)
      .eq('user_id', targetUser.id)
      .maybeSingle();

    if (existingError) {
      console.error('[INVITE-BY-EMAIL] Error checking existing member:', existingError);
      return c.json({ 
        success: false,
        error: 'Erro ao verificar membro existente' 
      }, 500);
    }

    if (existingMember) {
      return c.json({ 
        success: false,
        error_code: 'ALREADY_MEMBER',
        message: `${targetUser.name} já é membro como ${existingMember.role}.` 
      }, 409);
    }

    // Add user as member
    const { error: insertError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace_id,
        user_id: targetUser.id,
        role: role,
        joined_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('[INVITE-BY-EMAIL] Error adding member:', insertError);
      return c.json({ 
        success: false,
        error: 'Erro ao adicionar membro ao workspace' 
      }, 500);
    }

    console.log('[INVITE-BY-EMAIL] Member added successfully:', { userId: targetUser.id, role });

    return c.json({
      success: true,
      message: `${targetUser.name} foi adicionado como ${role}!`,
      member: {
        user_id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: role
      }
    });

  } catch (error) {
    console.error('[INVITE-BY-EMAIL] Unexpected error:', error);
    return c.json({ 
      success: false,
      error: error.message || 'Erro interno do servidor' 
    }, 500);
  }
});

// ============================================
// PUBLIC INVITE ROUTES (No Auth Required)
// ============================================

// Get Invite Details (Public - para mostrar info do convite)
app.get('/make-server-e4f9d774/invites/:code', async (c) => {
  try {
    const code = c.req.param('code');
    
    console.log('[GET-INVITE] Buscando convite:', code);

    // Buscar convite
    const { data: invite, error: inviteError } = await supabase
      .from('workspace_invites')
      .select(`
        code,
        role,
        expires_at,
        used,
        workspace_id,
        invited_by
      `)
      .eq('code', code)
      .single();

    if (inviteError || !invite) {
      console.log('[GET-INVITE] Convite não encontrado:', inviteError);
      return c.json({ error: 'Convite não encontrado' }, 404);
    }

    // Validar se expirou
    if (new Date(invite.expires_at) < new Date()) {
      return c.json({ error: 'Convite expirado' }, 400);
    }

    // Validar se já foi usado
    if (invite.used) {
      return c.json({ error: 'Convite já foi utilizado' }, 400);
    }

    // Buscar dados do workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id, name')
      .eq('id', invite.workspace_id)
      .single();

    if (workspaceError || !workspace) {
      console.log('[GET-INVITE] Workspace não encontrado:', workspaceError);
      return c.json({ error: 'Workspace não encontrado' }, 404);
    }

    // Buscar dados do convidador
    const { data: inviter, error: inviterError } = await supabase
      .from('users')
      .select('name')
      .eq('id', invite.invited_by)
      .single();

    const inviteDetails = {
      code: invite.code,
      role: invite.role,
      expires_at: invite.expires_at,
      workspace: {
        id: workspace.id,
        name: workspace.name,
      },
      inviter: {
        name: inviter?.name || 'Usuário desconhecido',
      },
    };

    console.log('[GET-INVITE] Convite encontrado:', inviteDetails);

    return c.json({ invite: inviteDetails });
  } catch (error) {
    console.log('[GET-INVITE] Erro:', error);
    return c.json({ error: `Erro ao buscar convite: ${error.message}` }, 500);
  }
});

// Accept Invite (Requires Auth)
app.post('/make-server-e4f9d774/invites/:code/accept', validateAuth, async (c) => {
  try {
    const code = c.req.param('code');
    const userId = c.get('userId');

    console.log('[ACCEPT-INVITE] Aceitando convite:', { code, userId });

    // Buscar convite
    const { data: invite, error: inviteError } = await supabase
      .from('workspace_invites')
      .select('*')
      .eq('code', code)
      .single();

    if (inviteError || !invite) {
      console.log('[ACCEPT-INVITE] Convite não encontrado:', inviteError);
      return c.json({ error: 'Convite não encontrado' }, 404);
    }

    // Validar se expirou
    if (new Date(invite.expires_at) < new Date()) {
      return c.json({ error: 'Convite expirado' }, 400);
    }

    // Validar se já foi usado
    if (invite.used) {
      return c.json({ error: 'Convite já foi utilizado' }, 400);
    }

    // Verificar se o usuário já é membro do workspace
    const { data: existingMember } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', invite.workspace_id)
      .eq('user_id', userId)
      .single();

    if (existingMember) {
      return c.json({ error: 'Você já é membro deste workspace' }, 400);
    }

    // Adicionar membro ao workspace
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: invite.workspace_id,
        user_id: userId,
        role: invite.role,
        invited_by: invite.invited_by,
      });

    if (memberError) {
      console.log('[ACCEPT-INVITE] Erro ao adicionar membro:', memberError);
      return c.json({ error: `Erro ao adicionar membro: ${memberError.message}` }, 500);
    }

    // Marcar convite como usado
    await supabase
      .from('workspace_invites')
      .update({ used: true, used_at: new Date().toISOString(), used_by: userId })
      .eq('code', code);

    // Buscar dados do workspace
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, name, slug')
      .eq('id', invite.workspace_id)
      .single();

    console.log('[ACCEPT-INVITE] Convite aceito com sucesso!');

    return c.json({ 
      success: true,
      workspace: workspace || null,
    });
  } catch (error) {
    console.log('[ACCEPT-INVITE] Erro:', error);
    return c.json({ error: `Erro ao aceitar convite: ${error.message}` }, 500);
  }
});

// ============================================
// HEALTH CHECK
// ============================================
app.get("/make-server-e4f9d774/health", (c) => {
  return c.json({ status: "ok" });
});

// ============================================
// KANBAN - FUNNEL ROUTES (Protected)
// ============================================

// Get all funnels for workspace
app.get('/make-server-e4f9d774/workspaces/:workspaceId/funnels', validateAuth, validateWorkspaceAccess, async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const funnels = await kanbanHelpers.getFunnels(workspaceId);
    return c.json({ funnels });
  } catch (error) {
    console.log('Get funnels error:', error);
    return c.json({ error: `Failed to get funnels: ${error.message}` }, 500);
  }
});

// Get single funnel
app.get('/make-server-e4f9d774/workspaces/:workspaceId/funnels/:funnelId', validateAuth, validateWorkspaceAccess, async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const funnelId = c.req.param('funnelId');
    
    const funnel = await kanbanHelpers.getFunnel(workspaceId, funnelId);
    
    if (!funnel) {
      return c.json({ error: 'Funnel not found' }, 404);
    }
    
    return c.json({ funnel });
  } catch (error) {
    console.log('Get funnel error:', error);
    return c.json({ error: `Failed to get funnel: ${error.message}` }, 500);
  }
});

// Create funnel
app.post('/make-server-e4f9d774/workspaces/:workspaceId/funnels', validateAuth, validateWorkspaceAccess, async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const userId = c.get('userId');
    const memberRole = c.get('memberRole');
    
    if (!hasPermission(memberRole, 'member')) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }
    
    const { name, description } = await c.req.json();
    
    if (!name) {
      return c.json({ error: 'Name is required' }, 400);
    }
    
    const funnel = await kanbanHelpers.createFunnel(workspaceId, name, userId, description);
    
    return c.json({ funnel });
  } catch (error) {
    console.log('Create funnel error:', error);
    return c.json({ error: `Failed to create funnel: ${error.message}` }, 500);
  }
});

// Update funnel
app.put('/make-server-e4f9d774/workspaces/:workspaceId/funnels/:funnelId', validateAuth, validateWorkspaceAccess, async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const memberRole = c.get('memberRole');
    const funnelId = c.req.param('funnelId');
    
    if (!hasPermission(memberRole, 'member')) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }
    
    const { name, columns } = await c.req.json();
    
    console.log('[SERVER] Update funnel request:', {
      funnelId,
      name,
      columnsCount: columns?.length,
      columnIds: columns?.map((c: any) => c.id)
    });
    
    const existing = await kanbanHelpers.getFunnel(workspaceId, funnelId);
    if (!existing) {
      return c.json({ error: 'Funnel not found' }, 404);
    }
    
    const updatedFunnel: Funnel = {
      ...existing,
      ...(name && { name }),
      ...(columns && { columns }),
      updated_at: new Date().toISOString()
    };
    
    await kanbanHelpers.updateFunnel(workspaceId, funnelId, { name, columns });
    
    console.log('[SERVER] Funnel updated successfully');
    
    return c.json({ funnel: updatedFunnel });
  } catch (error) {
    console.log('Update funnel error:', error);
    return c.json({ error: `Failed to update funnel: ${error.message}` }, 500);
  }
});

// Delete funnel
app.delete('/make-server-e4f9d774/workspaces/:workspaceId/funnels/:funnelId', validateAuth, validateWorkspaceAccess, async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const memberRole = c.get('memberRole');
    const funnelId = c.req.param('funnelId');
    
    if (!hasPermission(memberRole, 'admin')) {
      return c.json({ error: 'Insufficient permissions - Admin required' }, 403);
    }
    
    await kanbanHelpers.deleteFunnel(workspaceId, funnelId);
    
    return c.json({ success: true });
  } catch (error) {
    console.log('Delete funnel error:', error);
    return c.json({ error: `Failed to delete funnel: ${error.message}` }, 500);
  }
});

// Get funnel stats
app.get('/make-server-e4f9d774/workspaces/:workspaceId/funnels/:funnelId/stats', validateAuth, validateWorkspaceAccess, async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const funnelId = c.req.param('funnelId');
    
    const stats = await kanbanHelpers.getStats(workspaceId, funnelId);
    
    if (!stats) {
      return c.json({ error: 'Stats not found' }, 404);
    }
    
    return c.json({ stats });
  } catch (error) {
    console.log('Get stats error:', error);
    return c.json({ error: `Failed to get stats: ${error.message}` }, 500);
  }
});

// Recalculate funnel stats
app.post('/make-server-e4f9d774/workspaces/:workspaceId/funnels/:funnelId/recalculate-stats', validateAuth, validateWorkspaceAccess, async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const memberRole = c.get('memberRole');
    const funnelId = c.req.param('funnelId');
    
    if (!hasPermission(memberRole, 'admin')) {
      return c.json({ error: 'Insufficient permissions - Admin required' }, 403);
    }
    
    const stats = await kanbanHelpers.recalculateStats(workspaceId, funnelId);
    
    return c.json({ stats });
  } catch (error) {
    console.log('Recalculate stats error:', error);
    return c.json({ error: `Failed to recalculate stats: ${error.message}` }, 500);
  }
});

// ============================================
// KANBAN - LEAD ROUTES (Protected)
// ============================================

// Get leads for a column (with pagination)
app.get('/make-server-e4f9d774/workspaces/:workspaceId/funnels/:funnelId/columns/:columnId/leads', validateAuth, validateWorkspaceAccess, async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const funnelId = c.req.param('funnelId');
    const columnId = c.req.param('columnId');
    const offset = parseInt(c.req.query('offset') || '0');
    const limit = parseInt(c.req.query('limit') || '10');
    
    // ✅ LER FILTROS DOS QUERY PARAMETERS
    const hasEmail = c.req.query('hasEmail') === 'true';
    const hasWhatsapp = c.req.query('hasWhatsapp') === 'true';
    const searchQuery = c.req.query('searchQuery') || undefined;
    
    console.log('[API] Recebendo request com filtros:', { hasEmail, hasWhatsapp, searchQuery });
    
    const result = await kanbanHelpers.getColumnLeads(
      workspaceId, 
      funnelId, 
      columnId, 
      offset, 
      limit,
      { hasEmail, hasWhatsapp, searchQuery }  // ✅ PASSAR FILTROS
    );
    
    return c.json(result);
  } catch (error) {
    console.log('Get column leads error:', error);
    return c.json({ error: `Failed to get leads: ${error.message}` }, 500);
  }
});

// Get all leads for funnel (for list view - with pagination)
app.get('/make-server-e4f9d774/workspaces/:workspaceId/funnels/:funnelId/leads', validateAuth, validateWorkspaceAccess, async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const funnelId = c.req.param('funnelId');
    const offset = parseInt(c.req.query('offset') || '0');
    const limit = parseInt(c.req.query('limit') || '30');
    
    // ✅ LER FILTROS DOS QUERY PARAMETERS
    const hasEmail = c.req.query('hasEmail') === 'true';
    const hasWhatsapp = c.req.query('hasWhatsapp') === 'true';
    const searchQuery = c.req.query('searchQuery') || undefined;
    
    // ✅ MODO: kanban (carrega todas as colunas) ou list (carrega lista plana)
    const mode = c.req.query('mode') || 'list';
    
    const funnel = await kanbanHelpers.getFunnel(workspaceId, funnelId);
    if (!funnel) {
      return c.json({ error: 'Funnel not found' }, 404);
    }
    
    // ✅ MODO KANBAN: Carregar leads de todas as colunas em paralelo
    if (mode === 'kanban') {
      console.log('[API] 🚀 Modo KANBAN: Carregando todas as colunas em paralelo com filtros:', { hasEmail, hasWhatsapp, searchQuery });
      
      // Carregar leads de TODAS as colunas em paralelo
      const columnPromises = funnel.columns.map(column =>
        kanbanHelpers.getColumnLeads(
          workspaceId,
          funnelId,
          column.id,
          0,
          limit || 10,
          { hasEmail, hasWhatsapp, searchQuery }
        ).then(result => ({ columnId: column.id, ...result }))
      );
      
      const columnResults = await Promise.all(columnPromises);
      
      // Formatar resposta: { columns: { 'column-id': { leads: [...], total: 150, hasMore: true }, ... } }
      const columns: Record<string, any> = {};
      for (const result of columnResults) {
        const { columnId, leads, total } = result;
        columns[columnId] = {
          leads: leads || [],
          total: total || 0,
          hasMore: (leads?.length || 0) < (total || 0),
        };
      }
      
      console.log('[API] ✅ Colunas carregadas:', Object.keys(columns).length);
      
      return c.json({ columns });
    }
    
    // ✅ MODO LIST: Carregar lista plana (modo antigo)
    console.log('[API] 📋 Modo LIST: Carregando lista plana');
    
    // Get leads from all columns
    const allLeads: Lead[] = [];
    for (const column of funnel.columns) {
      const result = await kanbanHelpers.getColumnLeads(
        workspaceId,
        funnelId,
        column.id,
        0,
        1000,
        { hasEmail, hasWhatsapp, searchQuery }  // ✅ PASSAR FILTROS
      );
      allLeads.push(...result.leads);
    }
    
    // Sort by updated_at desc
    allLeads.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    
    // Paginate
    const total = allLeads.length;
    const paginatedLeads = allLeads.slice(offset, offset + limit);
    
    return c.json({
      leads: paginatedLeads,
      total,
      hasMore: offset + limit < total
    });
  } catch (error) {
    console.log('Get funnel leads error:', error);
    return c.json({ error: `Failed to get leads: ${error.message}` }, 500);
  }
});

// Get single lead
app.get('/make-server-e4f9d774/workspaces/:workspaceId/leads/:leadId', validateAuth, validateWorkspaceAccess, async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const leadId = c.req.param('leadId');
    
    const lead = await kanbanHelpers.getLead(workspaceId, leadId);
    
    if (!lead) {
      return c.json({ error: 'Lead not found' }, 404);
    }
    
    return c.json({ lead });
  } catch (error) {
    console.log('Get lead error:', error);
    return c.json({ error: `Failed to get lead: ${error.message}` }, 500);
  }
});

// Create lead
app.post('/make-server-e4f9d774/workspaces/:workspaceId/funnels/:funnelId/leads', validateAuth, validateWorkspaceAccess, async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const userId = c.get('userId');
    const memberRole = c.get('memberRole');
    const funnelId = c.req.param('funnelId');
    
    if (!hasPermission(memberRole, 'member')) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }
    
    const leadData = await c.req.json();
    
    if (!leadData.clientName || !leadData.column_id) {
      return c.json({ error: 'clientName and column_id are required' }, 400);
    }
    
    const lead = await kanbanHelpers.createLead(
      workspaceId,
      funnelId,
      leadData.column_id,
      leadData,
      userId
    );
    
    return c.json({ lead });
  } catch (error) {
    console.log('Create lead error:', error);
    return c.json({ error: `Failed to create lead: ${error.message}` }, 500);
  }
});

// Update lead
app.put('/make-server-e4f9d774/workspaces/:workspaceId/leads/:leadId', validateAuth, validateWorkspaceAccess, async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const userId = c.get('userId');
    const memberRole = c.get('memberRole');
    const leadId = c.req.param('leadId');
    
    if (!hasPermission(memberRole, 'member')) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }
    
    const updates = await c.req.json();
    
    const updatedLead = await kanbanHelpers.updateLead(workspaceId, leadId, updates, userId);
    
    return c.json({ lead: updatedLead });
  } catch (error) {
    console.log('Update lead error:', error);
    return c.json({ error: `Failed to update lead: ${error.message}` }, 500);
  }
});

// Move lead (drag & drop)
app.post('/make-server-e4f9d774/workspaces/:workspaceId/leads/:leadId/move', validateAuth, validateWorkspaceAccess, async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const userId = c.get('userId');
    const memberRole = c.get('memberRole');
    const leadId = c.req.param('leadId');
    
    if (!hasPermission(memberRole, 'member')) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }
    
    const { toColumnId, toPosition } = await c.req.json();
    
    if (!toColumnId || toPosition === undefined) {
      return c.json({ error: 'toColumnId and toPosition are required' }, 400);
    }
    
    // Move lead by updating its column_id
    const updatedLead = await kanbanHelpers.updateLead(
      workspaceId,
      leadId,
      { column_id: toColumnId },
      userId
    );
    
    return c.json({ lead: updatedLead });
  } catch (error) {
    console.log('Move lead error:', error);
    return c.json({ error: `Failed to move lead: ${error.message}` }, 500);
  }
});

// Batch move leads
app.post('/make-server-e4f9d774/workspaces/:workspaceId/leads/batch-move', validateAuth, validateWorkspaceAccess, async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const userId = c.get('userId');
    const memberRole = c.get('memberRole');
    
    if (!hasPermission(memberRole, 'member')) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }
    
    const { moves } = await c.req.json();
    
    if (!moves || !Array.isArray(moves)) {
      return c.json({ error: 'moves array is required' }, 400);
    }
    
    const results = [];
    
    for (const move of moves) {
      try {
        // Move lead by updating its column_id
        const updatedLead = await kanbanHelpers.updateLead(
          workspaceId,
          move.leadId,
          { column_id: move.toColumnId },
          userId
        );
        results.push({ success: true, leadId: move.leadId, lead: updatedLead });
      } catch (error) {
        results.push({ success: false, leadId: move.leadId, error: error.message });
      }
    }
    
    return c.json({ results });
  } catch (error) {
    console.log('Batch move error:', error);
    return c.json({ error: `Failed to batch move: ${error.message}` }, 500);
  }
});

// Delete lead
app.delete('/make-server-e4f9d774/workspaces/:workspaceId/leads/:leadId', validateAuth, validateWorkspaceAccess, async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const userId = c.get('userId');
    const memberRole = c.get('memberRole');
    const leadId = c.req.param('leadId');
    
    // ✅ Permitir member, admin e owner deletarem leads
    if (!hasPermission(memberRole, 'member')) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }
    
    // ✅ Usar hardDeleteLead para deletar permanentemente com CASCADE
    // Isso bypassa RLS usando SERVICE_ROLE_KEY
    await kanbanHelpers.hardDeleteLead(workspaceId, leadId, userId);
    
    return c.json({ success: true });
  } catch (error) {
    console.log('Delete lead error:', error);
    return c.json({ error: `Failed to delete lead: ${error.message}` }, 500);
  }
});

// ============================================
// KANBAN - SEARCH (Protected)
// ============================================

// Search leads
app.get('/make-server-e4f9d774/workspaces/:workspaceId/funnels/:funnelId/search', validateAuth, validateWorkspaceAccess, async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const funnelId = c.req.param('funnelId');
    const query = c.req.query('q');
    const priority = c.req.query('priority');
    const assignee = c.req.query('assignee');
    const tagsParam = c.req.query('tags');
    const tags = tagsParam ? tagsParam.split(',') : undefined;
    
    const leads = await kanbanHelpers.searchLeads(workspaceId, funnelId, query, priority, assignee, tags);
    
    return c.json({ leads });
  } catch (error) {
    console.log('Search leads error:', error);
    return c.json({ error: `Failed to search leads: ${error.message}` }, 500);
  }
});

// ==================== INSTANCES ====================

// GET /make-server-e4f9d774/instances - List all instances for a workspace
app.get('/make-server-e4f9d774/instances', async (c) => {
  const workspaceId = c.req.query('workspace_id');

  if (!workspaceId) {
    return c.json({ error: 'workspace_id is required' }, 400);
  }

  try {
    const { data, error } = await supabase
      .from('instances')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[INSTANCES] Supabase error:', error);
      return c.json({ error: error.message }, 500);
    }

    return c.json(data || []);
  } catch (err) {
    console.error('[INSTANCES] Unexpected error:', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// PUT /make-server-e4f9d774/instances/:id - Update an instance
app.put('/make-server-e4f9d774/instances/:id', async (c) => {
  const id = c.req.param('id');

  try {
    const body = await c.req.json();
    const { name, provider, phone_number, working_hours, status } = body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (provider !== undefined) updates.provider = provider;
    if (phone_number !== undefined) updates.phone_number = phone_number;
    if (working_hours !== undefined) updates.working_hours = working_hours;
    if (status !== undefined) updates.status = status;

    const { data, error } = await supabase
      .from('instances')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating instance:', error);
      return c.json({ error: error.message }, 500);
    }

    return c.json(data);
  } catch (err) {
    console.error('Unexpected error updating instance:', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ==================== INBOXES ====================

// GET /make-server-e4f9d774/inboxes - List all inboxes for a workspace
app.get('/make-server-e4f9d774/inboxes', async (c) => {
  const workspaceId = c.req.query('workspace_id');

  if (!workspaceId) {
    return c.json({ error: 'workspace_id is required' }, 400);
  }

  try {
    const { data, error } = await supabase
      .from('inboxes')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching inboxes:', error);
      return c.json({ error: error.message }, 500);
    }

    return c.json(data || []);
  } catch (err) {
    console.error('Unexpected error fetching inboxes:', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// POST /make-server-e4f9d774/inboxes - Create a new inbox
app.post('/make-server-e4f9d774/inboxes', async (c) => {
  try {
    const body = await c.req.json();
    const { workspace_id, name, description, auto_assignment, assigned_agents } = body;

    if (!workspace_id || !name) {
      return c.json({ error: 'workspace_id and name are required' }, 400);
    }

    const { data, error } = await supabase
      .from('inboxes')
      .insert({
        workspace_id,
        name,
        description,
        auto_assignment: auto_assignment || false,
        assigned_agents: assigned_agents || [],
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating inbox:', error);
      return c.json({ error: error.message }, 500);
    }

    return c.json(data);
  } catch (err) {
    console.error('Unexpected error creating inbox:', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// PUT /make-server-e4f9d774/inboxes/:id - Update an inbox
app.put('/make-server-e4f9d774/inboxes/:id', async (c) => {
  const id = c.req.param('id');

  try {
    const body = await c.req.json();
    const { name, description, auto_assignment, assigned_agents } = body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (auto_assignment !== undefined) updates.auto_assignment = auto_assignment;
    if (assigned_agents !== undefined) updates.assigned_agents = assigned_agents;

    const { data, error } = await supabase
      .from('inboxes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating inbox:', error);
      return c.json({ error: error.message }, 500);
    }

    return c.json(data);
  } catch (err) {
    console.error('Unexpected error updating inbox:', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// DELETE /make-server-e4f9d774/inboxes/:id - Delete an inbox
app.delete('/make-server-e4f9d774/inboxes/:id', async (c) => {
  const id = c.req.param('id');

  try {
    const { error } = await supabase
      .from('inboxes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting inbox:', error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true });
  } catch (err) {
    console.error('Unexpected error deleting inbox:', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ==================== CAMPAIGNS ====================

// DELETE /make-server-e4f9d774/campaigns/:runId - Delete a campaign run and related data
app.delete('/make-server-e4f9d774/campaigns/:runId', validateAuth, validateWorkspaceAccess, async (c) => {
  try {
    const runId = c.req.param('runId');
    const workspaceId = c.get('workspaceId');
    const userId = c.get('userId');

    console.log(`[Delete Campaign] User ${userId} deleting campaign ${runId} in workspace ${workspaceId}`);

    // Verificar se a campanha pertence ao workspace
    // campaign_runs -> config_id -> campaign_configs -> workspace_id
    const { data: campaignRun, error: checkError } = await supabase
      .from('campaign_runs')
      .select(`
        id,
        config_id,
        campaign_configs!inner (
          id,
          workspace_id
        )
      `)
      .eq('id', runId)
      .single();

    if (checkError || !campaignRun) {
      console.error('Campaign run not found:', checkError);
      return c.json({ error: 'Campanha não encontrada' }, 404);
    }

    // Verificar se o config pertence ao workspace correto
    const configWorkspaceId = campaignRun.campaign_configs.workspace_id;
    if (configWorkspaceId !== workspaceId) {
      console.error(`Campaign does not belong to workspace. Expected: ${workspaceId}, Got: ${configWorkspaceId}`);
      return c.json({ error: 'Campanha não pertence ao workspace' }, 403);
    }

    // Deletar em cascata: campaign_messages -> campaign_logs -> campaign_runs
    // As foreign keys estão configuradas com ON DELETE CASCADE no banco
    
    console.log('[Delete Campaign] Deleting campaign_messages...');
    const { error: messagesError } = await supabase
      .from('campaign_messages')
      .delete()
      .eq('run_id', runId);

    if (messagesError) {
      console.error('Error deleting campaign_messages:', messagesError);
      return c.json({ error: `Erro ao deletar mensagens: ${messagesError.message}` }, 500);
    }

    console.log('[Delete Campaign] Deleting campaign_logs...');
    const { error: logsError } = await supabase
      .from('campaign_logs')
      .delete()
      .eq('run_id', runId);

    if (logsError) {
      console.error('Error deleting campaign_logs:', logsError);
      return c.json({ error: `Erro ao deletar logs: ${logsError.message}` }, 500);
    }

    console.log('[Delete Campaign] Deleting campaign_runs...');
    const { error: runError } = await supabase
      .from('campaign_runs')
      .delete()
      .eq('id', runId);

    if (runError) {
      console.error('Error deleting campaign_runs:', runError);
      return c.json({ error: `Erro ao deletar campanha: ${runError.message}` }, 500);
    }

    console.log(`[Delete Campaign] ✅ Campaign ${runId} deleted successfully`);

    return c.json({ 
      success: true,
      message: 'Campanha deletada com sucesso'
    });
  } catch (err) {
    console.error('Unexpected error deleting campaign:', err);
    return c.json({ error: 'Erro interno ao deletar campanha' }, 500);
  }
});

// ==================== AGENTS ====================

// GET /make-server-e4f9d774/agents - List all agents for a workspace
app.get('/make-server-e4f9d774/agents', async (c) => {
  const workspaceId = c.req.query('workspace_id');

  if (!workspaceId) {
    return c.json({ error: 'workspace_id is required' }, 400);
  }

  try {
    // Fetch from workspace_members join users
    const { data: members, error } = await supabase
      .from('workspace_members')
      .select(`
        user_id,
        users:users!workspace_members_user_id_fkey (
          id,
          name,
          email
        )
      `)
      .eq('workspace_id', workspaceId);

    if (error) {
      console.error('Error fetching agents:', error);
      return c.json({ error: error.message }, 500);
    }

    const agents = (members || []).map((member: any) => ({
      id: member.user_id,
      workspace_id: workspaceId,
      user_id: member.user_id,
      name: member.users?.name || 'Unknown',
      email: member.users?.email || '',
      status: 'offline', // Default status
    }));

    return c.json(agents);
  } catch (err) {
    console.error('Unexpected error fetching agents:', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// POST /make-server-e4f9d774/agents - Create a new agent (invite to workspace)
app.post('/make-server-e4f9d774/agents', async (c) => {
  try {
    const body = await c.req.json();
    const { workspace_id, user_id, email, name } = body;

    if (!workspace_id || (!user_id && !email)) {
      return c.json({ error: 'workspace_id and (user_id or email) are required' }, 400);
    }

    let finalUserId = user_id;
    
    // If user_id not provided, find user by email
    if (!finalUserId && email) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('email', email)
        .single();

      if (userError || !user) {
        // User must exist
        return c.json({ error: 'User not found with this email' }, 404);
      }
      
      finalUserId = user.id;
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', workspace_id)
      .eq('user_id', finalUserId)
      .single();

    if (existingMember) {
      // Get user details
       const { data: user } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', finalUserId)
        .single();

      return c.json({
        id: finalUserId,
        workspace_id,
        user_id: finalUserId,
        name: user?.name || name || 'Unknown',
        email: user?.email || email || '',
        status: 'offline',
      });
    }

    // Add to workspace members
    const { data: member, error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id,
        user_id: finalUserId,
        role: 'member',
        permissions: []
      })
      .select()
      .single();

    if (memberError) {
      console.error('Error adding agent:', memberError);
      return c.json({ error: memberError.message }, 500);
    }
    
    // Get user details for response
    const { data: user } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', finalUserId)
      .single();

    return c.json({
      id: finalUserId,
      workspace_id,
      user_id: finalUserId,
      name: user?.name || name || 'Unknown',
      email: user?.email || email || '',
      status: 'offline',
    });

  } catch (err) {
    console.error('Unexpected error creating agent:', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ============================================
// CONVERSATION ROUTES (Protected)
// ============================================

// Update conversation attendant type
app.patch('/make-server-e4f9d774/conversations/:conversationId/attendant-type', validateAuth, validateWorkspaceAccess, async (c) => {
  try {
    const { conversationId } = c.req.param();
    const workspaceId = c.get('workspaceId');
    const { attendant_type } = await c.req.json();

    console.log(`🔄 [UPDATE-ATTENDANT] Conversation ${conversationId} → ${attendant_type}`);

    if (!attendant_type || !['human', 'ai'].includes(attendant_type)) {
      return c.json({ error: 'Invalid attendant_type. Must be "human" or "ai"' }, 400);
    }

    // Verify conversation belongs to workspace
    const { data: conversation, error: fetchError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('workspace_id', workspaceId)
      .single();

    if (fetchError || !conversation) {
      console.error('❌ [UPDATE-ATTENDANT] Conversation not found or access denied');
      return c.json({ error: 'Conversation not found' }, 404);
    }

    // Update attendant_type
    const { data: updated, error: updateError } = await supabase
      .from('conversations')
      .update({ 
        attendant_type,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ [UPDATE-ATTENDANT] Error updating:', updateError);
      return c.json({ error: updateError.message }, 500);
    }

    console.log(`✅ [UPDATE-ATTENDANT] Updated successfully`);
    return c.json({ success: true, conversation: updated });

  } catch (error) {
    console.error('❌ [UPDATE-ATTENDANT] Unexpected error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================
// NOTIFICATION PREFERENCES
// ============================================

// Get user notification preferences
app.get('/make-server-e4f9d774/notification-preferences', validateAuth, async (c) => {
  try {
    const userId = c.get('userId');

    console.log(`[NOTIFICATION-PREFS] Loading preferences for user:`, userId);

    let { data: preferences, error } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Se não existe, criar com defaults
    if (error && error.code === 'PGRST116') {
      console.log(`[NOTIFICATION-PREFS] Creating default preferences for user:`, userId);
      
      const { data: newPrefs, error: insertError } = await supabase
        .from('user_notification_preferences')
        .insert({
          user_id: userId,
          email_enabled: true,
          whatsapp_enabled: false,
          push_enabled: true,
          transfer_email: true,
          transfer_whatsapp: true,
          transfer_push: true,
          new_message_email: false,
          new_message_whatsapp: false,
          new_message_push: true,
          lead_created_email: false,
          lead_created_whatsapp: false,
          lead_created_push: false,
          mention_email: true,
          mention_whatsapp: false,
          mention_push: true,
          quiet_hours_enabled: false,
          quiet_hours_start: '22:00',
          quiet_hours_end: '08:00',
          daily_summary_enabled: false,
          daily_summary_time: '09:00'
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      preferences = newPrefs;
    } else if (error) {
      throw error;
    }

    return c.json({ preferences });
  } catch (error) {
    console.error('[NOTIFICATION-PREFS] Error loading preferences:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Update user notification preferences
app.put('/make-server-e4f9d774/notification-preferences', validateAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    console.log(`[NOTIFICATION-PREFS] Updating preferences for user:`, userId);

    const { data, error } = await supabase
      .from('user_notification_preferences')
      .upsert({
        user_id: userId,
        ...body
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log(`[NOTIFICATION-PREFS] Preferences updated successfully`);
    return c.json({ success: true, preferences: data });
  } catch (error) {
    console.error('[NOTIFICATION-PREFS] Error updating preferences:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Serve
Deno.serve(app.fetch);