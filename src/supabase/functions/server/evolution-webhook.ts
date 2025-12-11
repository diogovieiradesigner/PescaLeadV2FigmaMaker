import { Context } from "npm:hono";
import { EvolutionWebhookPayload, UnifiedMessage, EvolutionMessage } from "./chat-types.ts";
import { processIncomingMessage } from "./chat-service.ts";
import EvolutionProvider from "./provider-evolution.ts";
import { uploadMedia, initializeBucket } from "./storage-manager.ts";

// Inicializar bucket na primeira execução
let bucketInitialized = false;
async function ensureBucketExists() {
  if (!bucketInitialized) {
    try {
      await initializeBucket();
      bucketInitialized = true;
    } catch (error) {
      console.error('[WEBHOOK] Failed to initialize storage bucket:', error);
      // Não falha o webhook, apenas loga o erro
    }
  }
}

// Helper: Extract content from complex WhatsApp message object
function extractMessageContent(message: any): string {
  if (!message) return '';
  if (typeof message === 'string') return message;
  
  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    message.documentMessage?.caption || 
    ''
  );
}

// Helper: Determine content type
function determineContentType(message: any, messageType: string = 'text'): 'text' | 'image' | 'audio' | 'video' | 'document' {
  // Evolution sends explicit type sometimes, or we deduce from object keys
  if (messageType === 'imageMessage' || message?.imageMessage) return 'image';
  if (messageType === 'videoMessage' || message?.videoMessage) return 'video';
  if (messageType === 'audioMessage' || message?.audioMessage) return 'audio';
  if (messageType === 'documentMessage' || message?.documentMessage) return 'document';
  return 'text';
}

// Helper: Extract media URL
async function extractMediaUrl(message: any, messageKey: any, instanceName: string, token: string, conversationId?: string): Promise<string | undefined> {
  if (!message) return undefined;
  
  // 1. Try to find the message content object (imageMessage, videoMessage, etc)
  const messageType = Object.keys(message).find(key => 
    ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'].includes(key)
  );
  
  if (!messageType) return undefined;
  
  const content = message[messageType];
  if (!content) return undefined;

  const mimeType = content.mimetype || 'application/octet-stream';
  let base64Data: string | null = null;

  // 2. Check if we have a direct Base64 (Evolution sometimes sends it here if configured)
  if (message.base64) {
    console.log('[WEBHOOK] Found direct base64 in message');
    base64Data = message.base64;
  }
  // 3. Check URL - if encrypted, fetch via Evolution API
  else if (content.url) {
    const isEncrypted = content.url.includes('.enc') || content.url.includes('mmg.whatsapp.net');
    
    if (isEncrypted) {
      console.log('[WEBHOOK] Detected encrypted WhatsApp URL, fetching via Evolution API...');
      base64Data = await fetchMediaFromEvolution(instanceName, messageKey, token);
      
      if (!base64Data) {
        console.warn('[WEBHOOK] Failed to fetch media via Evolution API, falling back to thumbnail');
      }
    } else {
      // Not encrypted - return URL directly (skip upload)
      console.log('[WEBHOOK] Found public URL, skipping upload');
      return content.url;
    }
  }

  // 4. Fallback: jpegThumbnail (for images/videos)
  if (!base64Data && content.jpegThumbnail) {
    console.log('[WEBHOOK] Using jpegThumbnail as fallback (low resolution)');
    base64Data = content.jpegThumbnail;
  }

  // 5. If we have base64, upload to Storage
  if (base64Data && conversationId) {
    try {
      // Garantir que o bucket existe antes do upload
      await ensureBucketExists();
      
      console.log(`[WEBHOOK] Uploading media to Storage (type: ${messageType}, mime: ${mimeType})...`);
      
      const { signedUrl } = await uploadMedia(
        base64Data,
        mimeType,
        conversationId
      );
      
      console.log('[WEBHOOK] ✅ Media uploaded to Storage successfully');
      return signedUrl;
    } catch (error) {
      console.error('[WEBHOOK] Failed to upload media to Storage:', error);
      // Fallback: retornar base64 inline se upload falhar
      console.warn('[WEBHOOK] Falling back to inline base64 due to upload error');
      return `data:${mimeType};base64,${base64Data}`;
    }
  }

  // 6. Se temos base64 mas não temos conversationId, retornar inline
  if (base64Data) {
    console.log('[WEBHOOK] Returning inline base64 (no conversationId for upload)');
    return `data:${mimeType};base64,${base64Data}`;
  }
  
  // 7. Último recurso: retornar URL original (pode estar quebrada)
  return content.url;
}

// Helper: Fetch media from Evolution API
async function fetchMediaFromEvolution(instanceName: string, messageKey: any, token: string): Promise<string | null> {
  try {
    console.log(`[Evolution] Fetching base64 media for message ${messageKey.id}...`);
    
    const result = await EvolutionProvider.fetchMediaBase64({
      instanceName,
      token,
      messageKey: {
        remoteJid: messageKey.remoteJid,
        fromMe: messageKey.fromMe,
        id: messageKey.id
      }
    });
    
    if (result && result.base64) {
      console.log('[Evolution] Media base64 fetched successfully');
      return result.base64;
    }
    
    console.warn('[Evolution] No base64 returned from Evolution API');
    return null;
  } catch (error) {
    console.error('[Evolution] Error fetching media from Evolution:', error);
    return null;
  }
}

// Main Handler
export const handleEvolutionWebhook = async (c: Context) => {
  console.log('\n==============================================');
  console.log('🔔 [WEBHOOK] Evolution webhook received');
  console.log('==============================================');
  
  try {
    const payload: EvolutionWebhookPayload = await c.req.json();
    
    console.log('📋 [WEBHOOK] Event type:', payload.event);
    console.log('🏷️  [WEBHOOK] Instance:', payload.instance);
    
    // 1. Validate Event
    if (payload.event !== 'MESSAGES_UPSERT' && payload.event !== 'messages.upsert') {
      console.log('⏭️  [WEBHOOK] Event ignored - not a message event');
      return c.json({ status: 'ignored', reason: 'Not a message.upsert event' });
    }

    const { instance, data } = payload;
    
    if (!data) {
       console.error('❌ [WEBHOOK] Invalid payload: "data" is missing');
       return c.json({ status: 'error', reason: 'No data' }, 400);
    }

    // 2. Normalize data structure (handle both formats)
    let messages: EvolutionMessage[] = [];
    
    // Format A: Array of messages
    if (Array.isArray(data.messages)) {
      console.log('📋 [WEBHOOK] Format: Array of messages (Standard)');
      messages = data.messages;
    } 
    // Format B: Single message object inside data
    else if (data.key) {
      console.log('📋 [WEBHOOK] Format: Single message object (Direct)');
      // We cast data to EvolutionMessage because we verified it has 'key'
      messages = [data as unknown as EvolutionMessage];
    } else {
      console.error('❌ [WEBHOOK] Invalid payload structure - neither array nor single object');
      console.error('   Keys in data:', Object.keys(data));
      return c.json({ status: 'error', reason: 'Invalid payload structure' }, 400);
    }

    console.log(`📨 [WEBHOOK] Processing ${messages.length} message(s)`);

    const results = [];

    // ✅ Buscar instância no banco e obter token dinâmico
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: instanceRecord, error: instanceError } = await supabase
      .from('instances')
      .select('id, provider_type')
      .eq('name', instance)
      .single();

    if (instanceError || !instanceRecord) {
      console.error('❌ [WEBHOOK] Instance not found in database:', instance);
      return c.json({ status: 'error', reason: 'Instance not found' }, 404);
    }

    // ✅ Obter token dinâmico via ProviderFactory
    const ProviderFactory = (await import('./provider-factory.ts')).default;
    const token = await ProviderFactory.getTokenForInstance(instanceRecord.id);

    if (!token) {
      console.error('❌ [WEBHOOK] No API token configured for instance:', instance);
      console.error(`   Please configure api_key in database or set ${instanceRecord.provider_type.toUpperCase()}_API_KEY environment variable`);
      return c.json({ status: 'error', reason: 'API key not configured' }, 500);
    }

    console.log(`✅ [WEBHOOK] Using token for instance ${instance} (provider: ${instanceRecord.provider_type})`);

    // 3. Process each message in the batch
    for (const msgData of messages) {
      const { key, pushName, message, messageTimestamp } = msgData;
      
      if (!key) {
        console.log('⚠️  [WEBHOOK] Skipping message - no key');
        continue;
      }

      const { remoteJid, fromMe, id } = key;
      
      // Ignore broadcasts
      if (remoteJid === 'status@broadcast') {
        // console.log('⏭️  [WEBHOOK] Skipping broadcast message');
        continue;
      }

      console.log(`\n--- Processing message ${id} ---`);
      console.log('📞 From:', remoteJid);
      console.log('👤 Push name:', pushName);
      
      // Extract Content
      const content = extractMessageContent(message);
      
      // Deduce Type
      const contentType = determineContentType(message);
      
      // Extract Media URL (now with token)
      const mediaUrl = await extractMediaUrl(message, key, instance, token, remoteJid);
      
      console.log(`📎 Content [${contentType}]:`, content ? (content.substring(0, 50) + (content.length > 50 ? '...' : '')) : '<empty>');
      if (mediaUrl) console.log(`🔗 Media URL: ${mediaUrl}`);

      // 4. CREATE UNIFIED MESSAGE
      const unifiedMsg: UnifiedMessage = {
        instanceName: instance,
        remoteJid: remoteJid,
        fromMe: fromMe,
        messageId: id,
        pushName: pushName || remoteJid.split('@')[0],
        content: content,
        contentType: contentType,
        mediaUrl: mediaUrl,
        timestamp: typeof messageTimestamp === 'number' ? messageTimestamp : Date.now() / 1000
      };

      // 5. SEND TO SERVICE
      const result = await processIncomingMessage(unifiedMsg);
      results.push(result);
    }

    console.log('\n==============================================');
    console.log(`✅ [WEBHOOK] Completed. Processed: ${results.length}`);
    console.log('==============================================\n');

    return c.json({ 
      status: 'processed', 
      processed_count: results.length,
      results 
    });

  } catch (error) {
    console.error('\n❌ [WEBHOOK] EXCEPTION:', error);
    return c.json({ status: 'error', message: error.message }, 500);
  }
};