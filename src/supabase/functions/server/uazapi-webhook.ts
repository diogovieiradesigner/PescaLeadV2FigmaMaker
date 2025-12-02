import { Context } from "npm:hono@4";
import { UnifiedMessage } from "./chat-types.ts";
import { processIncomingMessage } from "./chat-service.ts";
import { uploadMedia, initializeBucket } from "./storage-manager.ts";
import { getSupabaseServiceClient } from './supabase-client.ts';
import UazapiProvider from './provider-uazapi.ts'; // ✅ Importar provider

const supabase = getSupabaseServiceClient();

// Inicializar bucket na primeira execução
let bucketInitialized = false;
async function ensureBucketExists() {
  if (!bucketInitialized) {
    try {
      await initializeBucket();
      bucketInitialized = true;
    } catch (error) {
      console.error('[UAZAPI-WEBHOOK] Failed to initialize storage bucket:', error);
    }
  }
}

/**
 * Handler para webhook da Uazapi
 */
export async function handleUazapiWebhook(c: Context) {
  console.log('\n==============================================');
  console.log('📨 [UAZAPI-WEBHOOK] INCOMING EVENT');
  console.log('==============================================');

  try {
    const rawBody = await c.req.text();
    console.log('📦 [UAZAPI-WEBHOOK] Raw body received');

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      console.error('❌ [UAZAPI-WEBHOOK] Invalid JSON:', e);
      return c.json({ error: 'Invalid JSON payload' }, 400);
    }

    console.log('📋 [UAZAPI-WEBHOOK] Parsed payload:', JSON.stringify(payload, null, 2));

    // Identificar tipo de evento
    const eventType = payload.EventType || payload.event || 'unknown';
    console.log(`🔔 [UAZAPI-WEBHOOK] Event type: ${eventType}`);

    // Identificar a instância
    const instanceName = payload.instanceName || payload.instance || payload.owner;
    console.log(`📱 [UAZAPI-WEBHOOK] Instance: ${instanceName}`);

    // Processar evento baseado no tipo
    if (eventType === 'messages' && payload.message) {
      const result = await handleIncomingMessage(payload);
      
      console.log('✅ [UAZAPI-WEBHOOK] Event processed successfully');
      console.log('==============================================\n');
      
      return c.json({ status: 'processed', result });
    } else {
      console.log(`⚠️ [UAZAPI-WEBHOOK] Unhandled event type: ${eventType}`);
      console.log('==============================================\n');
      
      return c.json({ status: 'ignored', reason: 'Not a message event' });
    }

  } catch (error) {
    console.error('\n==============================================');
    console.error('❌ [UAZAPI-WEBHOOK] ERROR PROCESSING EVENT');
    console.error('==============================================');
    console.error('   Error type:', error.constructor.name);
    console.error('   Error message:', error.message);
    console.error('   Stack:', error.stack);
    console.error('==============================================\n');
    
    return c.json({ error: 'Internal server error', message: error.message }, 500);
  }
}

/**
 * Processa mensagens recebidas da Uazapi
 * 
 * Estrutura do payload:
 * {
 *   "EventType": "messages",
 *   "instanceName": "diogotesteee",
 *   "owner": "558398564818",
 *   "chat": {
 *     "name": "Cleide Menezes",
 *     "wa_contactName": "Cleide Menezes",
 *     "wa_chatid": "5583921420047@s.whatsapp.net",
 *     ...
 *   },
 *   "message": {
 *     "id": "558398564818:3EB09A7E26514AD254A6BD",
 *     "chatid": "5583921420047@s.whatsapp.net",
 *     "sender": "5583921420047@s.whatsapp.net",
 *     "senderName": "Cleide",
 *     "fromMe": false,
 *     "content": "Testando uazapi",
 *     "text": "Testando uazapi",
 *     "messageType": "Conversation",
 *     "type": "text",
 *     "mediaType": "",
 *     "messageTimestamp": 1763863890000
 *   }
 * }
 */
async function handleIncomingMessage(payload: any) {
  console.log('\n--- [UAZAPI-WEBHOOK] Processing message ---');
  
  const message = payload.message;
  const chat = payload.chat;
  const instanceName = payload.instanceName || payload.instance || payload.owner;
  
  if (!message) {
    console.error('❌ [UAZAPI-WEBHOOK] No message data in payload');
    throw new Error('No message data in payload');
  }

  if (!instanceName) {
    console.error('❌ [UAZAPI-WEBHOOK] No instance name in payload');
    throw new Error('No instance name in payload');
  }

  // Extrair dados da mensagem
  const {
    id: messageId,
    chatid: remoteJid,
    sender,
    senderName,
    fromMe,
    content,
    text,
    messageType,
    type: msgType,
    mediaType,
    messageTimestamp
  } = message;

  console.log('📞 RemoteJid:', remoteJid);
  console.log('👤 SenderName:', senderName);
  console.log('📝 Content:', content || text);
  console.log('📋 MessageType:', messageType || msgType);
  console.log('🔄 FromMe:', fromMe);
  console.log('🆔 MessageId:', messageId);
  console.log('⏰ Timestamp:', messageTimestamp);

  // Verificar se remoteJid é status@broadcast (ignorar)
  if (remoteJid === 'status@broadcast') {
    console.log('⏭️  [UAZAPI-WEBHOOK] Skipping broadcast message');
    return { status: 'skipped', reason: 'Broadcast message' };
  }

  // Determinar tipo de conteúdo
  let contentType: 'text' | 'image' | 'audio' | 'video' | 'document' = 'text';
  
  if (mediaType) {
    if (mediaType.includes('image')) contentType = 'image';
    else if (mediaType.includes('audio') || mediaType === 'ptt') contentType = 'audio'; // ✅ PTT = Push-to-Talk (áudio)
    else if (mediaType.includes('video')) contentType = 'video';
    else if (mediaType.includes('document')) contentType = 'document';
  } else if (messageType) {
    const lowerType = messageType.toLowerCase();
    if (lowerType.includes('image')) contentType = 'image';
    else if (lowerType.includes('audio')) contentType = 'audio';
    else if (lowerType.includes('video')) contentType = 'video';
    else if (lowerType.includes('document')) contentType = 'document';
  }

  console.log(`📎 Content type: ${contentType}`);

  // ✅ Processar media URLs da Uazapi
  let mediaUrl: string | undefined = undefined;
  
  if (contentType !== 'text' && message.content) {
    console.log('[UAZAPI-WEBHOOK] Processing media message...');
    
    const contentData = message.content;
    const whatsappUrl = contentData.URL || contentData.url;
    const mimeType = contentData.mimetype || 'application/octet-stream';
    
    if (whatsappUrl) {
      console.log(`[UAZAPI-WEBHOOK] Found media URL: ${whatsappUrl.substring(0, 80)}...`);
      
      // URLs do WhatsApp (mmg.whatsapp.net) são criptografadas
      // ✅ SOLUÇÃO: Usar endpoint POST /message/download da Uazapi
      const isEncrypted = whatsappUrl.includes('mmg.whatsapp.net');
      
      if (isEncrypted) {
        console.log('[UAZAPI-WEBHOOK] Detected encrypted WhatsApp media URL');
        console.log('[UAZAPI-WEBHOOK] Fetching media via Uazapi API...');
        
        try {
          // ✅ Buscar mídia usando o provider
          const mediaData = await UazapiProvider.fetchMediaBase64({
            instanceName,
            token: payload.token,
            messageKey: {
              id: messageId,
              remoteJid: remoteJid,
              fromMe: fromMe
            }
          });
          
          if (mediaData && mediaData.base64) {
            console.log(`[UAZAPI-WEBHOOK] ✅ Media fetched successfully (${mediaData.base64.length} chars)`);
            
            // ✅ Calcular tamanho estimado do arquivo em MB
            const estimatedSizeMB = (mediaData.base64.length * 0.75) / (1024 * 1024); // base64 é ~33% maior que binário
            console.log(`[UAZAPI-WEBHOOK] Estimated file size: ${estimatedSizeMB.toFixed(2)} MB`);
            
            // ✅ Se arquivo for muito grande (>10MB), usar thumbnail
            if (estimatedSizeMB > 10 && contentData.JPEGThumbnail) {
              console.warn(`[UAZAPI-WEBHOOK] ⚠️ File too large (${estimatedSizeMB.toFixed(2)} MB), using thumbnail instead`);
              
              await ensureBucketExists();
              const { signedUrl } = await uploadMedia(
                `data:image/jpeg;base64,${contentData.JPEGThumbnail}`,
                'image/jpeg',
                `uazapi-${messageId}-thumb`
              );
              mediaUrl = signedUrl;
              console.log('[UAZAPI-WEBHOOK] ✅ Thumbnail uploaded to Storage successfully');
            } else {
              // Arquivo dentro do limite - fazer upload normal
              await ensureBucketExists();
              
              try {
                const { signedUrl } = await uploadMedia(
                  `data:${mimeType};base64,${mediaData.base64}`,
                  mimeType,
                  `uazapi-${messageId}`
                );
                
                mediaUrl = signedUrl;
                console.log('[UAZAPI-WEBHOOK] ✅ Media uploaded to Storage successfully');
              } catch (uploadError) {
                // Se falhar no upload (ex: arquivo excedeu limite), tentar thumbnail
                console.error('[UAZAPI-WEBHOOK] Upload failed, trying thumbnail:', uploadError);
                
                if (contentData.JPEGThumbnail) {
                  console.log('[UAZAPI-WEBHOOK] Using JPEGThumbnail as fallback');
                  const { signedUrl } = await uploadMedia(
                    `data:image/jpeg;base64,${contentData.JPEGThumbnail}`,
                    'image/jpeg',
                    `uazapi-${messageId}-thumb`
                  );
                  mediaUrl = signedUrl;
                  console.log('[UAZAPI-WEBHOOK] ✅ Thumbnail uploaded to Storage successfully');
                } else {
                  throw uploadError; // Sem thumbnail, re-throw o erro
                }
              }
            }
          } else {
            console.warn('[UAZAPI-WEBHOOK] Failed to fetch media, trying fallback to thumbnail...');
            
            // Fallback: usar JPEGThumbnail se disponível
            if (contentData.JPEGThumbnail) {
              console.log('[UAZAPI-WEBHOOK] Using JPEGThumbnail as fallback');
              await ensureBucketExists();
              const { signedUrl } = await uploadMedia(
                `data:image/jpeg;base64,${contentData.JPEGThumbnail}`,
                'image/jpeg',
                `uazapi-${messageId}-thumb`
              );
              mediaUrl = signedUrl;
              console.log('[UAZAPI-WEBHOOK] ✅ Thumbnail uploaded to Storage successfully');
            }
          }
        } catch (error) {
          console.error('[UAZAPI-WEBHOOK] Error fetching media:', error);
          
          // Fallback: usar JPEGThumbnail se disponível
          if (contentData.JPEGThumbnail) {
            console.log('[UAZAPI-WEBHOOK] Using JPEGThumbnail as fallback after error');
            try {
              await ensureBucketExists();
              const { signedUrl } = await uploadMedia(
                `data:image/jpeg;base64,${contentData.JPEGThumbnail}`,
                'image/jpeg',
                `uazapi-${messageId}-thumb`
              );
              mediaUrl = signedUrl;
              console.log('[UAZAPI-WEBHOOK] ✅ Thumbnail uploaded to Storage successfully');
            } catch (thumbError) {
              console.error('[UAZAPI-WEBHOOK] Failed to upload thumbnail:', thumbError);
            }
          }
        }
      } else {
        // URL pública não criptografada - usar diretamente
        console.log('[UAZAPI-WEBHOOK] Public URL detected, using directly');
        mediaUrl = whatsappUrl;
      }
    } else {
      console.warn('[UAZAPI-WEBHOOK] No URL found in media message content');
    }
  }
  
  console.log(`📎 Final media URL: ${mediaUrl ? mediaUrl.substring(0, 80) + '...' : 'none'}`);
  
  // Determinar pushName correto
  // Para Uazapi: 
  // - Se fromMe=false: usar senderName (nome do contato que enviou)
  // - Se fromMe=true: NÃO usar senderName (seria o nome da instância)
  const pushName = fromMe ? '' : (senderName || chat?.name || chat?.wa_contactName || '');
  
  console.log('👤 Push name (for contact):', pushName);
  
  // ✅ Extrair conteúdo de texto corretamente
  // Se content for string: usar diretamente
  // Se content for objeto (mídia): usar text ou caption
  let textContent = '';
  if (typeof content === 'string') {
    textContent = content;
  } else if (typeof content === 'object') {
    // Para mídias, pode ter caption ou text
    textContent = content.caption || text || '';
  } else {
    textContent = text || '';
  }
  
  console.log('📝 Final text content:', textContent);
  
  // Criar mensagem unificada
  const unifiedMsg: UnifiedMessage = {
    instanceName: instanceName,
    remoteJid: remoteJid,
    fromMe: fromMe,
    messageId: messageId,
    pushName: pushName,
    content: textContent,
    contentType: contentType,
    mediaUrl: mediaUrl,
    timestamp: messageTimestamp ? messageTimestamp / 1000 : Date.now() / 1000
  };

  console.log('📤 [UAZAPI-WEBHOOK] Unified message created:');
  console.log(JSON.stringify(unifiedMsg, null, 2));
  console.log('📤 [UAZAPI-WEBHOOK] Calling processIncomingMessage...');
  
  // Processar mensagem através do serviço de chat
  const result = await processIncomingMessage(unifiedMsg);
  
  console.log('✅ [UAZAPI-WEBHOOK] Message processed with result:', JSON.stringify(result, null, 2));
  console.log('--- [UAZAPI-WEBHOOK] Message processing complete ---\n');
  
  return result;
}