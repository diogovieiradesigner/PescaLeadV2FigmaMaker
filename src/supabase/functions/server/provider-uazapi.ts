import { InstanceConnectionResult, IWhatsAppProvider } from "./chat-types.ts";

const getBaseUrl = () => {
  const url = Deno.env.get('UAZAPI_API_URL'); // ✅ CORRIGIDO: Era UAZAPI_URL
  if (!url) {
    // Fallback para URL pública se não configurada
    return 'https://free.uazapi.com';
  }
  return url.replace(/\/$/, '');
};

const getAdminToken = () => {
  const token = Deno.env.get('UAZAPI_ADMIN_TOKEN');
  if (!token) throw new Error('Configuration Error: UAZAPI_ADMIN_TOKEN not set');
  return token;
};

// ✅ Helper: Sanitize number for Brazil (add 55 if missing)
const sanitizeNumber = (number: string): string => {
  let clean = number.replace(/\D/g, ''); // Remove non-digits
  
  // If it has @, split and take first part
  if (number.includes('@')) {
    clean = number.split('@')[0].replace(/\D/g, '');
  }
  
  // Fix Brazilian numbers missing DDI (55)
  // DDD (2) + Number (8 or 9) = 10 or 11 digits.
  // If 10 or 11 digits, prepend 55.
  if (clean.length === 10 || clean.length === 11) {
     console.log(`[Uazapi] Number ${clean} seems to be missing DDI (55). Prepending...`);
     clean = '55' + clean;
  }
  
  return clean;
};

const UazapiProvider: IWhatsAppProvider = {
  
  async create({ instanceName, token }) {
    const baseUrl = getBaseUrl();
    const adminToken = getAdminToken();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🆕 [UAZAPI] CREATING NEW INSTANCE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`[Uazapi] Creating instance ${instanceName}`);
    console.log(`[Uazapi] Base URL: ${baseUrl}`);
    console.log(`[Uazapi] Admin Token: ${adminToken ? '***' + adminToken.slice(-4) : 'MISSING'}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const webhookUrl = `${supabaseUrl}/functions/v1/make-server-e4f9d774/webhook/uazapi`;
    console.log(`[Uazapi] Webhook URL: ${webhookUrl}`);

    const payload = {
      name: instanceName,
      systemName: 'figma-make',
      adminField01: 'whatsapp-chat-system',
      adminField02: new Date().toISOString()
    };

    console.log('[Uazapi] Create payload:', JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(`${baseUrl}/instance/init`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'admintoken': adminToken
        },
        body: JSON.stringify(payload)
      });

      console.log('[Uazapi] Response status:', response.status);
      console.log('[Uazapi] Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));
      
      const responseText = await response.text();
      console.log('[Uazapi] Response body (raw):', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('[Uazapi] Failed to parse response as JSON:', e);
        throw new Error(`Uazapi returned invalid JSON. Status: ${response.status}, Body: ${responseText.substring(0, 200)}`);
      }

      console.log('📥 [UAZAPI-PROVIDER] Response received:', JSON.stringify(data, null, 2));

      if (!response.ok) {
        console.error('❌ [UAZAPI-PROVIDER] Creation failed');
        console.error('   Status:', response.status);
        console.error('   Response:', data);
        
        const errorMessage = data.message || data.error || JSON.stringify(data);
        throw new Error(`Uazapi error (${response.status}): ${errorMessage}`);
      }

      // Extrair QR Code da resposta (se disponível)
      const qrCode = data.qrCode?.base64 || data.base64 || data.qr || null;

      // O token da instância pode vir em diferentes campos
      const instanceToken = data.token || data.apiKey || data.instanceToken || token;

      const result = {
        instanceId: instanceName, // Uazapi usa o name como ID
        instanceName: instanceName,
        token: instanceToken,
        qrCode: qrCode,
        apiKey: instanceToken,
        providerConfig: { 
          baseUrl, 
          instanceName: instanceName,
          adminToken: adminToken 
        }
      };

      console.log('✅ [UAZAPI-PROVIDER] Instance created successfully!');
      console.log('   Instance ID:', result.instanceId);
      console.log('   Instance Name:', result.instanceName);
      console.log('   Has QR Code:', !!result.qrCode);
      console.log('   Token:', result.token ? '***' + result.token.slice(-4) : 'N/A');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      return result;
    } catch (error) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ [UAZAPI-PROVIDER] CREATE ERROR');
      console.error('   Error type:', error.constructor.name);
      console.error('   Error message:', error.message);
      console.error('   Stack:', error.stack);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      throw new Error(`Failed to create Uazapi instance: ${error.message}`);
    }
  },

  async getInstanceStatus({ instanceName, token }) {
    const baseUrl = getBaseUrl();
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 [UAZAPI] CHECKING STATUS: ${instanceName}`);
    console.log('   Base URL:', baseUrl);
    console.log('   Token:', token ? `***${token.slice(-8)}` : 'MISSING');
    console.log('   Token length:', token?.length);

    try {
      // ✅ Endpoint correto: GET /instance/status
      const response = await fetch(`${baseUrl}/instance/status`, {
        method: 'GET',
        headers: { 
          'Accept': 'application/json',
          'token': token // ✅ Usa o token da instância (não o adminToken)
        }
      });

      console.log('📡 [UAZAPI] Response status:', response.status);
      
      if (!response.ok) {
        console.error('❌ [UAZAPI] Status check failed:', response.status);
        const errorText = await response.text();
        console.error('   Error body:', errorText);
        
        if (response.status === 404 || response.status === 401) {
          return { status: 'disconnected' };
        }
        return { status: 'error', raw: await response.json() };
      }

      const data = await response.json();
      console.log('📥 [UAZAPI] Status response:', JSON.stringify(data, null, 2));

      // ✅ Mapear resposta da Uazapi para nosso formato
      // Estrutura da resposta:
      // {
      //   "instance": { "status": "connected" | "connecting" | "disconnected", ... },
      //   "status": { "connected": boolean, "loggedIn": boolean, ... }
      // }
      
      const instanceStatus = data.instance?.status; // "connected", "connecting", "disconnected"
      const isConnected = data.status?.connected === true && data.status?.loggedIn === true; // ✅ Verificar ambos
      
      console.log('🔍 [UAZAPI] Status analysis:');
      console.log('   instance.status:', instanceStatus);
      console.log('   status.connected:', data.status?.connected);
      console.log('   status.loggedIn:', data.status?.loggedIn);
      
      // ✅ SÓ RETORNAR "connected" SE REALMENTE ESTIVER CONECTADO E LOGADO
      if (instanceStatus === 'connected' && isConnected) {
        console.log('✅ [UAZAPI] Status: CONNECTED');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        return { status: 'connected', raw: data };
      } else if (instanceStatus === 'connecting') {
        console.log('🔄 [UAZAPI] Status: CONNECTING (não atualizar banco)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        return { status: 'connecting', raw: data };
      } else {
        console.log('❌ [UAZAPI] Status: DISCONNECTED');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        return { status: 'disconnected', raw: data };
      }
    } catch (error) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ [UAZAPI] STATUS ERROR');
      console.error('   Error:', error.message);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return { status: 'error', raw: error.message };
    }
  },

  async getQRCode({ instanceName, token }) {
    const baseUrl = getBaseUrl();
    
    try {
      // TODO: Descobrir endpoint de QR Code da Uazapi
      console.warn('[Uazapi] QR Code fetch not yet implemented');
      throw new Error('QR Code fetch not yet implemented for Uazapi');
    } catch (error) {
      console.error('[Uazapi] Error fetching QR Code:', error);
      throw error;
    }
  },

  async logout({ instanceName, token }) {
    const baseUrl = getBaseUrl();
    console.log(`[Uazapi] Disconnecting/logout instance ${instanceName}`);
    
    try {
      // ✅ Endpoint correto: POST /instance/disconnect
      const response = await fetch(`${baseUrl}/instance/disconnect`, {
        method: 'POST',
        headers: { 
          'Accept': 'application/json',
          'token': token // ✅ Usa o token da instância (não o adminToken)
        }
      });

      console.log('[Uazapi] Disconnect response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Uazapi] Disconnect failed:', errorData);
        return false;
      }

      const data = await response.json();
      console.log('[Uazapi] Disconnect successful:', JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('[Uazapi] Logout error:', error);
      return false;
    }
  },

  async delete({ instanceName, token }) {
    const baseUrl = getBaseUrl();
    
    try {
      // TODO: Descobrir endpoint de delete da Uazapi
      console.warn('[Uazapi] Delete not yet implemented');
      return false;
    } catch (error) {
      console.error('[Uazapi] Delete error:', error);
      return false;
    }
  },

  async restart({ instanceName, token }) {
    const baseUrl = getBaseUrl();
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🔄 [UAZAPI] RESTARTING INSTANCE: ${instanceName}`);

    try {
      // ✅ Endpoint: POST /instance/restart
      const response = await fetch(`${baseUrl}/instance/restart`, {
        method: 'POST',
        headers: { 
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'token': token
        }
      });

      if (!response.ok) {
        console.error('❌ [UAZAPI] Restart failed:', response.status);
        throw new Error(`Restart failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ [UAZAPI] Restart successful');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return data;
    } catch (error) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ [UAZAPI] RESTART ERROR');
      console.error('   Error:', error.message);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      throw error;
    }
  },

  // ✅ NOVO: Método connect() para iniciar conexão e obter QR code
  async connect({ instanceName, token, phone }) {
    const baseUrl = getBaseUrl();
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🔌 [UAZAPI] CONNECTING INSTANCE: ${instanceName}`);
    console.log('   Phone:', phone || 'NOT PROVIDED (will use QR Code)');

    try {
      // ✅ Endpoint correto: POST /instance/connect
      // ⚠️ IMPORTANTE: SÓ ENVIAR phone se for fornecido, senão retorna QR Code
      const payload = phone ? { phone } : {};
      
      console.log('   Payload:', JSON.stringify(payload));
      
      const response = await fetch(`${baseUrl}/instance/connect`, {
        method: 'POST',
        headers: { 
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'token': token // ✅ Token da instância
        },
        body: JSON.stringify(payload) // ✅ CORRIGIDO: Só envia phone se existir
      });

      if (!response.ok) {
        console.error('❌ [UAZAPI] Connect failed:', response.status);
        const errorText = await response.text();
        console.error('   Error response:', errorText);
        throw new Error(`Connect failed with status ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('📥 [UAZAPI] Connect response:', JSON.stringify(data, null, 2));
      console.log('✅ [UAZAPI] Connect successful');
      console.log('   Has QR Code:', !!data.qrcode);
      console.log('   Has Pair Code:', !!data.paircode);
      
      // ⚠️ Capturar mensagem de aviso/erro da Uazapi
      if (data.response) {
        console.log('⚠️ [UAZAPI] API Warning/Message:', data.response);
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // ✅ Retornar no formato esperado
      return {
        qrcode: data.qrcode || data.instance?.qrcode,
        paircode: data.paircode || data.instance?.paircode,
        base64: data.qrcode || data.instance?.qrcode,
        pairingCode: data.paircode || data.instance?.paircode,
        connected: false, // Ainda não conectado, aguardando scan
        message: data.response, // ✅ NOVO: Mensagem de aviso da API
        raw: data
      };
    } catch (error) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ [UAZAPI] CONNECT ERROR');
      console.error('   Error:', error.message);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      throw error;
    }
  },

  async fetchInstanceInfo({ instanceName, token }) {
    const baseUrl = getBaseUrl();
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📡 [UAZAPI] FETCHING INSTANCE INFO: ${instanceName}`);

    try {
      // ✅ Endpoint: GET /instance/status (retorna info completa da instância)
      const response = await fetch(`${baseUrl}/instance/status`, {
        method: 'GET',
        headers: { 
          'Accept': 'application/json',
          'token': token // ✅ Token da instância
        }
      });

      if (!response.ok) {
        console.error('❌ [UAZAPI] Failed to fetch instance info:', response.status);
        throw new Error('Failed to fetch instance info');
      }

      const data = await response.json();
      console.log('📥 [UAZAPI] Instance info response:', JSON.stringify(data, null, 2));

      // ✅ Retornar no formato esperado (similar à Evolution)
      // A resposta da Uazapi tem a estrutura:
      // {
      //   "instance": { "status": "connected", "qrcode": "...", "paircode": "...", ... },
      //   "status": { "connected": boolean, "loggedIn": boolean, ... }
      // }
      
      const isConnected = data.instance?.status === 'connected' || data.status?.connected === true;
      
      console.log('🔍 [UAZAPI] Instance info analysis:');
      console.log('   Connected:', isConnected);
      console.log('   Has QR code:', !!data.instance?.qrcode);
      console.log('   Has Pair code:', !!data.instance?.paircode);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      return {
        connected: isConnected,
        base64: data.instance?.qrcode,  // QR code em base64
        pairingCode: data.instance?.paircode, // Código de pareamento
        qrcode: data.instance?.qrcode,
        instance: data.instance,
        status: data.status
      };
    } catch (error) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ [UAZAPI] INSTANCE INFO ERROR');
      console.error('   Error:', error.message);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      throw error;
    }
  },

  async updateWebhook({ instanceName, token, webhookUrl }) {
    const baseUrl = getBaseUrl();
    console.log(`[Uazapi] Updating webhook for ${instanceName} to ${webhookUrl}`);

    try {
      // TODO: Descobrir endpoint de atualizar webhook da Uazapi
      console.warn('[Uazapi] Update webhook not yet implemented');
      return {};
    } catch (error) {
      console.error('[Uazapi] Update webhook error:', error);
      throw error;
    }
  },

  async fetchProfilePictureUrl({ instanceName, token, number }) {
    const baseUrl = getBaseUrl();
    console.log(`[Uazapi] Fetching profile picture for ${number} via ${instanceName}`);

    try {
      // ✅ Uazapi usa o endpoint /chat/details que retorna informações do contato
      // incluindo o campo "image" com a URL da foto do perfil
      
      // Formatar número: remover caracteres especiais, manter apenas dígitos
      const cleanNumber = number.replace(/\D/g, '');
      
      console.log(`[Uazapi] Clean number for request: ${cleanNumber}`);

      const payload = {
        number: cleanNumber,
        preview: false // Não precisamos do preview, apenas dos detalhes
      };

      const response = await fetch(`${baseUrl}/chat/details`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'token': token
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.warn(`[Uazapi] Failed to fetch profile picture: ${response.status}`);
        return null;
      }

      const data = await response.json();
      
      console.log(`[Uazapi] Profile details fetched successfully`);
      console.log(`[Uazapi] Contact name: ${data.name || 'N/A'}`);
      console.log(`[Uazapi] Profile image: ${data.image ? 'Found' : 'Not found'}`);
      
      // Retornar a URL da imagem do perfil
      return data.image || null;
    } catch (error) {
      console.error('[Uazapi] Error fetching profile picture:', error);
      return null;
    }
  },

  async sendPresence({ instanceName, token, number, delay }) {
    const baseUrl = getBaseUrl();
    console.log(`[Uazapi] Sending typing presence to ${number} via ${instanceName}`);

    try {
      // TODO: Descobrir endpoint de presença da Uazapi
      console.warn('[Uazapi] Send presence not yet implemented');
      return false;
    } catch (error) {
      console.error('[Uazapi] Error sending presence:', error);
      return false;
    }
  },

  async sendRecordingPresence({ instanceName, token, number, delay }) {
    const baseUrl = getBaseUrl();
    console.log(`[Uazapi] Sending recording presence to ${number} via ${instanceName}`);

    try {
      // TODO: Descobrir endpoint de presença de gravação da Uazapi
      console.warn('[Uazapi] Send recording presence not yet implemented');
      return false;
    } catch (error) {
      console.error('[Uazapi] Error sending recording presence:', error);
      return false;
    }
  },

  async sendTextMessage({ instanceName, token, number, text, quoted }) {
    const baseUrl = getBaseUrl();
    console.log(`[Uazapi] Sending text message to ${number} via ${instanceName}`);

    // Calcular delay baseado no número de caracteres (simular digitação natural)
    const typingDelay = Math.min(Math.max(500 + (text.length * 50), 1000), 5000);
    
    // ✅ Sanitizar número (remover @, adicionar 55 se necessário)
    const formattedNumber = sanitizeNumber(number);

    console.log(`[Uazapi] Original number: ${number}`);
    console.log(`[Uazapi] Formatted number: ${formattedNumber}`);

    // Payload para Uazapi
    const payload: any = {
      number: formattedNumber,
      text: text,
      delay: typingDelay,
      readchat: true,
      readmessages: true
    };

    // Adicionar quoted se fornecido
    if (quoted) {
      payload.replyid = quoted;
    }

    console.log('[Uazapi] Request payload:', JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(`${baseUrl}/send/text`, {
        method: 'POST',
        headers: { 
          'token': token,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      console.log(`[Uazapi] Response status: ${response.status}`);

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        // Ignore parsing error
      }

      if (!response.ok) {
        console.error('[Uazapi] Failed to send message. Status:', response.status);
        console.error('[Uazapi] Error body:', responseText);
        
        const errorMessage = data?.message || data?.error || responseText || `Status ${response.status}`;
        
        // ✅ Detect specific WhatsApp errors
        if (errorMessage.includes('not on WhatsApp') || errorMessage.includes('invalid number') || errorMessage.includes('not exists')) {
             throw new Error(`[INVALID_NUMBER] The number ${formattedNumber} is not registered on WhatsApp.`);
        }

        throw new Error(`Failed to send message: ${errorMessage}`);
      }

      if (!data) {
         data = { success: true, raw: responseText };
      }

      console.log('[Uazapi] Message sent successfully:', JSON.stringify(data));
      return data;
    } catch (error) {
      console.error('[Uazapi] Error sending message:', error);
      throw error;
    }
  },

  async deleteMessage({ instanceName, token, messageId, remoteJid, fromMe, participant }) {
    const baseUrl = getBaseUrl();
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🗑️ [UAZAPI-PROVIDER] DELETE MESSAGE REQUEST');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Instance: ${instanceName}`);
    console.log(`   Remote JID: ${remoteJid}`);
    console.log(`   Message ID: ${messageId}`);
    console.log(`   Message ID type: ${typeof messageId}`);
    console.log(`   Message ID length: ${messageId?.length || 0}`);
    console.log(`   From Me: ${fromMe ?? true}`);
    console.log(`   Participant: ${participant || 'N/A'}`);

    // ✅ Payload para Uazapi: apenas messageId
    const payload = {
      messageId: messageId
    };

    console.log('📤 [UAZAPI-PROVIDER] Request details:');
    console.log(`   URL: ${baseUrl}/message`);
    console.log(`   Method: DELETE`);
    console.log(`   Token: ${token.substring(0, 10)}...`);
    console.log(`   Payload:`, JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(`${baseUrl}/message`, {
        method: 'DELETE',
        headers: { 
          'token': token,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      console.log(`📥 [UAZAPI-PROVIDER] Response status: ${response.status} ${response.statusText}`);
      console.log(`   Response headers:`, JSON.stringify(Object.fromEntries(response.headers.entries())));

      const responseText = await response.text();
      console.log(`   Response body (raw): ${responseText}`);

      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { message: responseText };
        }
        
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('❌ [UAZAPI-PROVIDER] DELETE FAILED');
        console.error(`   HTTP Status: ${response.status}`);
        console.error(`   Error:`, JSON.stringify(errorData, null, 2));
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        throw new Error(`Failed to delete message: ${errorData.message || response.status}`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { success: true, raw: responseText };
      }

      console.log('✅ [UAZAPI-PROVIDER] Message deleted successfully!');
      console.log('   Response data:', JSON.stringify(data, null, 2));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      return data;
    } catch (error) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ [UAZAPI-PROVIDER] EXCEPTION CAUGHT');
      console.error(`   Error type: ${error.constructor.name}`);
      console.error(`   Error message: ${error.message}`);
      console.error(`   Stack:`, error.stack);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      throw error;
    }
  },

  async sendAudioMessage({ instanceName, token, number, audioUrl, audioDuration, quoted }) {
    const baseUrl = getBaseUrl();
    console.log(`[Uazapi] Sending audio message to ${number} via ${instanceName}`);
    
    // ✅ Sanitizar número
    const formattedNumber = sanitizeNumber(number);
    console.log(`[Uazapi] Formatted number: ${formattedNumber}`);

    try {
      // ✅ Endpoint: POST /send/media
      const url = `${baseUrl}/send/media`;
      
      const payload = {
        number: formattedNumber,
        type: 'ptt', // ✅ PTT = Mensagem de voz
        file: audioUrl,
        ...(quoted && { replyid: quoted })
      };

      console.log(`[Uazapi] POST ${url}`);
      console.log(`[Uazapi] Payload:`, JSON.stringify(payload, null, 2));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'token': token,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Uazapi] Failed to send audio: ${response.status} ${response.statusText}`);
        console.error(`[Uazapi] Error response:`, errorText);
        throw new Error(`Failed to send audio: ${errorText}`);
      }

      const data = await response.json();
      console.log(`[Uazapi] ✅ Audio sent successfully:`, JSON.stringify(data, null, 2));
      
      return data;
    } catch (error) {
      console.error('[Uazapi] Error sending audio:', error);
      throw error;
    }
  },

  async sendMediaMessage({ instanceName, token, number, mediaType, mimeType, caption, mediaUrl, fileName, quoted }) {
    const baseUrl = getBaseUrl();
    console.log(`[Uazapi] Sending media message (${mediaType}) to ${number} via ${instanceName}`);
    
    // ✅ Sanitizar número
    const formattedNumber = sanitizeNumber(number);
    console.log(`[Uazapi] Formatted number: ${formattedNumber}`);

    try {
      // ✅ Mapear tipos de mídia Evolution → Uazapi
      const uazapiMediaType = mediaType.toLowerCase();

      // ✅ Determinar se é URL ou base64
      let file = mediaUrl;
      
      if (!mediaUrl.startsWith('http') && !mediaUrl.startsWith('data:')) {
        file = `data:${mimeType};base64,${mediaUrl}`;
      }

      // ✅ Preparar payload conforme docs Uazapi
      const payload: any = {
        number: formattedNumber,
        type: uazapiMediaType,
        file: file
      };

      // ✅ Adicionar campos opcionais
      if (caption) {
        payload.text = caption; // Uazapi usa "text" para caption
      }

      if (fileName && mediaType.toLowerCase() === 'document') {
        payload.docName = fileName; // Apenas para documentos
      }

      if (quoted) {
        payload.replyid = quoted; // Uazapi usa "replyid"
      }

      // ✅ Adicionar delay para simular comportamento natural
      payload.delay = 1200;
      payload.readchat = true; // Marca conversa como lida após envio

      console.log(`[Uazapi] Payload:`, JSON.stringify({ ...payload, file: payload.file.substring(0, 50) + '...' }));

      const response = await fetch(`${baseUrl}/send/media`, {
        method: 'POST',
        headers: { 
          'token': token,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        // Ignore
      }

      if (!response.ok) {
        console.error('[Uazapi] Failed to send media. Status:', response.status);
        console.error('[Uazapi] Error body:', responseText);
        const errorMessage = data?.error || data?.message || responseText || `Status ${response.status}`;
        throw new Error(`Failed to send media: ${errorMessage}`);
      }

      if (!data) data = { success: true, raw: responseText };

      console.log('[Uazapi] Media sent successfully:', JSON.stringify(data));
      return data;
    } catch (error) {
      console.error('[Uazapi] Error sending media:', error);
      throw error;
    }
  },

  async fetchMediaBase64({ instanceName, token, messageKey }) {
    const baseUrl = getBaseUrl();
    console.log(`[Uazapi] Fetching base64 media for message ${messageKey.id}...`);

    try {
      // ✅ Endpoint correto: POST /message/download
      const url = `${baseUrl}/message/download`;
      
      console.log(`[Uazapi] Requesting media from: ${url}`);
      console.log(`[Uazapi] Message ID: ${messageKey.id}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'token': token,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          id: messageKey.id,
          return_base64: true,  // ✅ Retornar em base64
          return_link: false,   // ✅ Não precisamos da URL (já vamos subir pro Storage)
          generate_mp3: true    // ✅ Para áudios, retornar como MP3
        })
      });

      if (!response.ok) {
        console.error(`[Uazapi] Media download failed: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error(`[Uazapi] Error response: ${errorText}`);
        return null;
      }

      const data = await response.json();
      
      // ✅ Resposta esperada: { fileURL?, mimetype, base64Data?, transcription? }
      if (!data.base64Data) {
        console.error('[Uazapi] Response does not contain base64Data');
        return null;
      }

      console.log(`[Uazapi] ✅ Media downloaded successfully`);
      console.log(`[Uazapi] MIME type: ${data.mimetype || 'unknown'}`);
      console.log(`[Uazapi] Base64 length: ${data.base64Data.length} chars`);
      
      // ✅ Retornar objeto com base64 e mimetype (para áudios, mimetype será audio/mpeg após conversão)
      return {
        base64: data.base64Data,
        mimetype: data.mimetype || 'application/octet-stream'
      };
    } catch (error) {
      console.error('[Uazapi] Error fetching media base64:', error);
      return null;
    }
  },

  async fetchProfile({ instanceName, token, number }) {
    const baseUrl = getBaseUrl();
    console.log(`[Uazapi] Fetching profile for ${number} via ${instanceName}`);

    try {
      // ✅ Uazapi usa o endpoint /chat/details que retorna informações completas do contato
      
      // Formatar número: remover caracteres especiais, manter apenas dígitos
      const cleanNumber = number.replace(/\D/g, '');
      
      console.log(`[Uazapi] Clean number for request: ${cleanNumber}`);

      const payload = {
        number: cleanNumber,
        preview: false // Não precisamos do preview, apenas dos detalhes
      };

      const response = await fetch(`${baseUrl}/chat/details`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'token': token
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.warn(`[Uazapi] Failed to fetch profile: ${response.status}`);
        return {
          name: null,
          picture: null,
          status: null,
          isBusiness: false,
          email: null,
          description: null,
          website: null
        };
      }

      const data = await response.json();
      
      console.log(`[Uazapi] Profile fetched successfully`);
      console.log(`[Uazapi] Contact name: ${data.name || 'N/A'}`);
      console.log(`[Uazapi] WhatsApp name: ${data.wa_name || 'N/A'}`);
      console.log(`[Uazapi] Profile image: ${data.image ? 'Found' : 'Not found'}`);
      
      // ✅ Retornar no formato esperado (compatível com Evolution)
      return {
        name: data.name || data.wa_name || data.wa_contactName || null,
        picture: data.image || null,
        status: null, // Uazapi não retorna status no /chat/details
        isBusiness: false, // Uazapi não indica se é business neste endpoint
        email: null, // Uazapi não retorna email
        description: null, // Uazapi não retorna descrição
        website: null // Uazapi não retorna website
      };
    } catch (error) {
      console.error('[Uazapi] Error fetching profile:', error);
      return {
        name: null,
        picture: null,
        status: null,
        isBusiness: false,
        email: null,
        description: null,
        website: null
      };
    }
  },
};

export default UazapiProvider;