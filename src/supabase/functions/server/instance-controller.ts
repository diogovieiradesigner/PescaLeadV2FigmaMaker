import { Context } from "npm:hono@4";
import { createClient } from "npm:@supabase/supabase-js@2";
import { CreateInstancePayload, InstanceConnectionResult, IWhatsAppProvider } from "./chat-types.ts";
import EvolutionProvider from "./provider-evolution.ts";
import UazapiProvider from "./provider-uazapi.ts"; // ✅ ADICIONADO
import { getSupabaseServiceClient } from './supabase-client.ts';

// --- PROVIDER FACTORY ---
export const getProvider = (type: string): IWhatsAppProvider => {
  switch (type) {
    case 'evolution':
      return EvolutionProvider;
    case 'uazapi': // ✅ ADICIONADO: Suporte para Uazapi
      return UazapiProvider;
    case 'z-api':
       throw new Error("Z-API migration pending");
    default:
      throw new Error(`Provider ${type} not supported`);
  }
};

export const getProviderToken = (type: string) => {
   switch (type) {
    case 'evolution':
      return Deno.env.get('EVOLUTION_API_KEY');
    case 'uazapi': // ✅ Uazapi usa ADMIN_TOKEN na criação
      return Deno.env.get('UAZAPI_ADMIN_TOKEN');
    case 'z-api':
      return Deno.env.get('Z_API_CLIENT_TOKEN');
    default:
      return '';
  }
}

// Setup Supabase (usar singleton)
const supabase = getSupabaseServiceClient(); // ✅ Usando singleton!

// --- SERVICE LAYER ---
const createInstanceService = async (payload: CreateInstancePayload) => {
  const provider = getProvider(payload.provider);
  const token = getProviderToken(payload.provider);
  
  if (!token) throw new Error(`Configuration Error: Token not set for ${payload.provider}`);

  // 1. Call Provider
  const result = await provider.create({
    instanceName: payload.instanceName,
    token: token,
    phone: payload.phone
  });

  // 2. Save to Database
  // Check if instance already exists for this workspace + name
  const { data: existing } = await supabase
    .from('instances')
    .select('id')
    .eq('workspace_id', payload.workspaceId)
    .eq('name', result.instanceName)
    .maybeSingle();

  let dbOp;
  
  const instanceData = {
    workspace_id: payload.workspaceId,
    name: result.instanceName,
    provider: 'whatsapp',
    provider_type: payload.provider,
    phone_number: payload.phone || '',
    status: 'disconnected',
    api_key: result.apiKey,
    instance_id: result.instanceId,
    instance_token: result.token,
    qr_code: result.qrCode,
    provider_config: result.providerConfig,
    webhook_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/make-server-e4f9d774/webhook/${payload.provider}`
  };

  if (existing) {
    console.log('Updating existing instance:', existing.id);
    dbOp = supabase
      .from('instances')
      .update(instanceData)
      .eq('id', existing.id)
      .select()
      .single();
  } else {
    console.log('Creating new instance record');
    dbOp = supabase
      .from('instances')
      .insert(instanceData)
      .select()
      .single();
  }

  const { data: instance, error } = await dbOp;

  if (error) {
    console.error('DB Error:', error);
    throw new Error(`Database persistence failed: ${error.message}`);
  }

  return { instance, qrCode: result.qrCode };
};

export const getInstanceStatusService = async (workspaceId: string, instanceId: string) => {
  console.log('🔍 [GetInstanceStatus] Starting...');
  console.log('   workspaceId:', workspaceId);
  console.log('   instanceId:', instanceId);
  
  // 1. Get instance from DB to find provider/name
  console.log('📊 [GetInstanceStatus] Fetching instance from DB...');
  const { data: instance, error } = await supabase
    .from('instances')
    .select('*')
    .eq('id', instanceId)
    .eq('workspace_id', workspaceId)
    .single();

  if (error) {
    console.error('❌ [GetInstanceStatus] DB error:', error);
    throw new Error('Instance not found');
  }
  
  if (!instance) {
    console.error('❌ [GetInstanceStatus] Instance not found in DB');
    throw new Error('Instance not found');
  }
  
  console.log('✅ [GetInstanceStatus] Instance found:', instance.name, '(provider:', instance.provider, ')');

  // ✅ Get provider and token dynamically
  console.log('🏭 [GetInstanceStatus] Getting provider and token...');
  const ProviderFactory = (await import('./provider-factory.ts')).default;
  const provider = await ProviderFactory.getProviderForInstance(instance.id);
  const token = await ProviderFactory.getTokenForInstance(instance.id);
  
  console.log('✅ [GetInstanceStatus] Provider retrieved');
  console.log('🔑 [GetInstanceStatus] Token retrieved:', token ? 'yes' : 'no');
  
  if (!token) {
    console.error('❌ [GetInstanceStatus] No token configured');
    throw new Error('No API token configured for this instance. Please configure api_key in database or set environment variable.');
  }
  
  // Call Provider
  console.log('🌐 [GetInstanceStatus] Calling provider.getInstanceStatus...');
  console.log('   instanceName:', instance.name);
  
  const statusResult = await provider.getInstanceStatus({
    instanceName: instance.name,
    token: token
  });
  
  console.log('✅ [GetInstanceStatus] Provider response:', statusResult.status);

  // Update DB if status changed
  if (statusResult.status !== 'error' && statusResult.status !== instance.status) {
    console.log('💾 [GetInstanceStatus] Updating status in DB...');
    await supabase
      .from('instances')
      .update({ status: statusResult.status, updated_at: new Date().toISOString() })
      .eq('id', instanceId);
    console.log('✅ [GetInstanceStatus] Status updated');
  } else {
    console.log('⏭️ [GetInstanceStatus] Status unchanged, skipping DB update');
  }

  console.log('🎉 [GetInstanceStatus] Complete!');
  return { ...statusResult, instance };
};

export const getInstanceQRCodeService = async (workspaceId: string, instanceId: string) => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📱 [GetQRCode] Starting QR Code fetch...');
  console.log('   Instance ID:', instanceId);
  console.log('   Workspace ID:', workspaceId);
  
  const { data: instance } = await supabase
    .from('instances')
    .select('*')
    .eq('id', instanceId)
    .eq('workspace_id', workspaceId)
    .single();

  if (!instance) {
    console.error('❌ [GetQRCode] Instance not found');
    throw new Error('Instance not found');
  }

  console.log('✅ [GetQRCode] Instance found:', instance.name);

  // ✅ Get provider and token dynamically
  const ProviderFactory = (await import('./provider-factory.ts')).default;
  const provider = await ProviderFactory.getProviderForInstance(instance.id);
  const token = await ProviderFactory.getTokenForInstance(instance.id);

  if (!token) {
    console.error('❌ [GetQRCode] No API token configured');
    throw new Error('No API token configured for this instance. Please configure api_key in database or set environment variable.');
  }

  console.log('🔑 [GetQRCode] Token retrieved');
  console.log('🏭 [GetQRCode] Provider type:', instance.settings?.provider_type || 'evolution');

  // ✅ Determinar qual método usar baseado no provider
  const providerType = instance.provider_type || instance.settings?.provider_type || 'evolution';
  
  if (providerType === 'uazapi') {
    // ✅ UAZAPI: Usar método connect() que retorna QR code diretamente
    console.log('🔌 [GetQRCode] Using Uazapi connect() method...');
    
    // ⚠️ NÃO ENVIAR phone para obter QR Code!
    // Se enviar phone, a Uazapi tenta conexão direta e não retorna QR Code
    console.log('📱 [GetQRCode] Requesting QR Code (no phone provided)');
    
    const result = await provider.connect({
      instanceName: instance.name,
      token: token
      // ❌ NÃO ENVIAR: phone: instance.phone_number
    });
    
    console.log('✅ [GetQRCode] Connect result received');
    console.log('   Has QR Code:', !!result.qrcode);
    console.log('   Has Pair Code:', !!result.pairingCode);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return result;
  } else {
    // ✅ EVOLUTION: Usar método restart() + fetchInstanceInfo()
    console.log('🔄 [GetQRCode] Using Evolution restart() + fetchInstanceInfo() flow...');
    
    await provider.restart({
      instanceName: instance.name,
      token: token
    });

    console.log('✅ [GetQRCode] Restart called successfully');

    // Now fetch instance info to get QR code/paircode
    console.log('📡 [GetQRCode] Fetching instance info...');
    const result = await provider.fetchInstanceInfo({
      instanceName: instance.name,
      token: token
    });

    console.log('✅ [GetQRCode] Instance info retrieved');
    console.log('   Connected:', result.connected);
    console.log('   Has QR Code:', !!result.qrcode);
    console.log('   Has Pair Code:', !!result.pairingCode);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return result;
  }
};

export const deleteInstanceService = async (workspaceId: string, instanceId: string) => {
  const { data: instance } = await supabase
    .from('instances')
    .select('*')
    .eq('id', instanceId)
    .eq('workspace_id', workspaceId)
    .single();

  if (!instance) return; // Already gone

  // Delete from Provider
  try {
    // ✅ Get provider and token dynamically
    const ProviderFactory = (await import('./provider-factory.ts')).default;
    const provider = await ProviderFactory.getProviderForInstance(instance.id);
    const token = await ProviderFactory.getTokenForInstance(instance.id);

    if (!token) {
      console.warn('⚠️ No token configured for instance, skipping provider deletion');
      // Continue to delete from database even if no token
    } else {
      // Provider interface doesn't have delete method exposed
      // This would need to be implemented if needed
      console.log('✅ Skipping provider deletion (not in interface)');
    }
  } catch (e) {
    console.warn('Failed to delete from provider, proceeding with DB delete', e);
  }

  // Delete from DB
  const { error } = await supabase
    .from('instances')
    .delete()
    .eq('id', instanceId);

  if (error) throw error;

  // 🗑️ Invalidar cache de token após deletar a instância!
  const ProviderFactory = (await import('./provider-factory.ts')).default;
  ProviderFactory.invalidateCache(instanceId);
  console.log(`🗑️ [DeleteInstance] Cache invalidated for instance ${instanceId}`);
};

export const logoutInstanceService = async (workspaceId: string, instanceId: string) => {
  const { data: instance } = await supabase
    .from('instances')
    .select('*')
    .eq('id', instanceId)
    .eq('workspace_id', workspaceId)
    .single();

  if (!instance) throw new Error('Instance not found');

  // ✅ Get provider and token dynamically
  const ProviderFactory = (await import('./provider-factory.ts')).default;
  const provider = await ProviderFactory.getProviderForInstance(instance.id);
  const token = await ProviderFactory.getTokenForInstance(instance.id);

  if (!token) {
    throw new Error('No API token configured for this instance. Please configure api_key in database or set environment variable.');
  }

  // Provider interface doesn't have logout method
  // For now, we can only mark as disconnected in DB
  console.log('✅ Logout requested - marking instance as disconnected in DB');

  // Update DB
  await supabase
    .from('instances')
    .update({ status: 'disconnected' })
    .eq('id', instanceId);
};

export const restartInstanceService = async (workspaceId: string, instanceId: string) => {
  const { data: instance } = await supabase
    .from('instances')
    .select('*')
    .eq('id', instanceId)
    .eq('workspace_id', workspaceId)
    .single();

  if (!instance) throw new Error('Instance not found');

  // ✅ Get provider and token dynamically
  const ProviderFactory = (await import('./provider-factory.ts')).default;
  const provider = await ProviderFactory.getProviderForInstance(instance.id);
  const token = await ProviderFactory.getTokenForInstance(instance.id);

  if (!token) {
    throw new Error('No API token configured for this instance. Please configure api_key in database or set environment variable.');
  }

  // Provider interface doesn't have restart method
  // For now, we'll just update status
  console.log('✅ Restart requested - updating instance status');
  
  // Usually restart keeps the same status after reboot or goes to connecting, 
  // we can optionally set to 'connecting' in DB to reflect UI
  await supabase
    .from('instances')
    .update({ status: 'connecting' })
    .eq('id', instanceId);
};

// --- PROFILE PICTURE SERVICE ---
export const getContactProfilePictureService = async (workspaceId: string, phone: string, conversationId?: string) => {
  // 1. Check if we already have it in DB (cached)
  // First try to find by conversationId if provided
  let conversation;
  
  if (conversationId) {
    const { data } = await supabase
      .from('conversations')
      .select('id, avatar_url, workspace_id')
      .eq('id', conversationId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    conversation = data;
  } 
  
  // Fallback: try by phone if conversation not found by ID or ID not provided
  if (!conversation) {
    const { data } = await supabase
      .from('conversations')
      .select('id, avatar_url, workspace_id')
      .eq('contact_phone', phone)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    conversation = data;
  }

  // If we have a URL in DB, return it (caching)
  // Only if we found the conversation
  if (conversation?.avatar_url) {
    return { url: conversation.avatar_url, source: 'db' };
  }

  // 2. If not, we need to fetch from provider.
  // We need an active instance for this workspace to fetch.
  const { data: instance } = await supabase
    .from('instances')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('status', 'connected')
    .limit(1)
    .maybeSingle();

  if (!instance) {
    // If no connected instance, we can't fetch
    return { url: null, source: 'none', reason: 'No connected instance' };
  }

  // ✅ Get provider and token dynamically
  const ProviderFactory = (await import('./provider-factory.ts')).default;
  const provider = await ProviderFactory.getProviderForInstance(instance.id);
  const token = await ProviderFactory.getTokenForInstance(instance.id);

  if (!token) {
    return { url: null, source: 'none', reason: 'No API token configured' };
  }

  const url = await provider.fetchProfilePictureUrl({
    instanceName: instance.name,
    token: token,
    number: phone
  });

  if (url && conversation) {
     // Update DB with avatar
     await supabase
       .from('conversations')
       .update({ avatar_url: url })
       .eq('id', conversation.id);
  }

  // ✅ NOVO: Buscar também o nome do contato para substituir o telefone
  // Só fazemos isso se temos uma conversa válida
  if (conversation) {
    try {
      const profile = await provider.fetchProfile({
        instanceName: instance.name,
        token: token,
        number: phone
      });

      if (profile?.name) {
        console.log(`[PROFILE-PICTURE-SERVICE] Found contact name: ${profile.name}`);
        await supabase
          .from('conversations')
          .update({ contact_name: profile.name })
          .eq('id', conversation.id);
        console.log(`[PROFILE-PICTURE-SERVICE] ✅ Contact name updated`);
      }
    } catch (error) {
      // Não bloquear se falhar ao buscar o nome
      console.warn(`[PROFILE-PICTURE-SERVICE] Failed to fetch profile name:`, error);
    }
  }

  return { url, source: 'api' };
};


// --- CONTROLLER LAYER ---
export const handleCreateInstance = async (c: Context) => {
  try {
    console.log('=== CREATE INSTANCE REQUEST ===');
    const payload: CreateInstancePayload = await c.req.json();
    console.log('Payload received:', JSON.stringify(payload, null, 2));

    // Basic Validation
    if (!payload.workspaceId || !payload.instanceName || !payload.provider) {
      console.error('Validation error: Missing required fields');
      return c.json({ error: 'Missing required fields: workspaceId, instanceName, provider' }, 400);
    }

    console.log('Starting instance creation service...');
    const data = await createInstanceService(payload);
    console.log('Instance created successfully!');

    return c.json({
      success: true,
      message: 'Instance created. Scan QR Code.',
      ...data
    });

  } catch (error) {
    console.error('=== CREATE INSTANCE ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('================================');
    
    return c.json({ 
      error: error.message,
      details: error.stack 
    }, 400);
  }
};

export const handleGetInstanceStatus = async (c: Context) => {
  try {
    const workspaceId = c.get('workspaceId');
    const instanceId = c.req.param('instanceId');
    
    console.log('📡 [Handler] GET /instances/:instanceId/status');
    console.log('   instanceId:', instanceId);
    console.log('   workspaceId:', workspaceId);
    
    const result = await getInstanceStatusService(workspaceId, instanceId);
    
    console.log('✅ [Handler] Success! Returning result');
    return c.json(result);
  } catch (error) {
    console.error('❌ [Handler] Error in handleGetInstanceStatus');
    console.error('   Error type:', error.constructor.name);
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    
    return c.json({ error: error.message }, 500);
  }
};

export const handleGetInstanceQRCode = async (c: Context) => {
  try {
    const workspaceId = c.get('workspaceId');
    const instanceId = c.req.param('instanceId');
    
    const result = await getInstanceQRCodeService(workspaceId, instanceId);
    return c.json(result);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
};

export const handleDeleteInstance = async (c: Context) => {
  try {
    const workspaceId = c.get('workspaceId');
    const instanceId = c.req.param('instanceId');
    
    await deleteInstanceService(workspaceId, instanceId);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
};

export const handleLogoutInstance = async (c: Context) => {
  try {
    const workspaceId = c.get('workspaceId');
    const instanceId = c.req.param('instanceId');
    
    await logoutInstanceService(workspaceId, instanceId);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
};

export const handleRestartInstance = async (c: Context) => {
  try {
    const workspaceId = c.get('workspaceId');
    const instanceId = c.req.param('instanceId');
    
    await restartInstanceService(workspaceId, instanceId);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
};

export const handleGetContactProfilePicture = async (c: Context) => {
  try {
    const workspaceId = c.get('workspaceId');
    const phone = c.req.query('phone');
    const conversationId = c.req.query('conversationId');

    if (!phone) return c.json({ error: 'Phone number required' }, 400);

    const result = await getContactProfilePictureService(workspaceId, phone, conversationId);
    return c.json(result);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
};