import { InstanceConnectionResult, IWhatsAppProvider } from "./chat-types.ts";

const getBaseUrl = () => {
  const url = Deno.env.get('EVOLUTION_API_URL');
  if (!url) throw new Error('Configuration Error: EVOLUTION_API_URL not set');
  return url.replace(/\/$/, '');
};

const EvolutionProvider: IWhatsAppProvider = {
  
  async create({ instanceName, token }) {
    const baseUrl = getBaseUrl();
    console.log(`[Evolution] Creating instance ${instanceName}`);
    console.log(`[Evolution] Base URL: ${baseUrl}`);
    console.log(`[Evolution] Token: ${token ? '***' + token.slice(-4) : 'MISSING'}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const webhookUrl = `${supabaseUrl}/functions/v1/make-server-e4f9d774/webhook/evolution`;
    console.log(`[Evolution] Webhook URL: ${webhookUrl}`);

    const payload = {
      instanceName,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS", // ✅ Campo obrigatório!
      webhook: {
        url: webhookUrl,
        byEvents: false, // ✅ FIXADO: Enviar TODOS os eventos para a mesma URL
        base64: false,
        events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE", "QRCODE_UPDATED"]
      }
    };

    console.log('[Evolution] Create payload:', JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(`${baseUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'apikey': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      console.log('[Evolution] Response status:', response.status);
      console.log('[Evolution] Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));
      
      const responseText = await response.text();
      console.log('[Evolution] Response body (raw):', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('[Evolution] Failed to parse response as JSON:', e);
        throw new Error(`Evolution API returned invalid JSON. Status: ${response.status}, Body: ${responseText.substring(0, 200)}`);
      }

      console.log('📥 [EVOLUTION-PROVIDER] Response received:', JSON.stringify(data, null, 2));

      if (!response.ok) {
        console.error('❌ [EVOLUTION-PROVIDER] Creation failed');
        console.error('   Status:', response.status);
        console.error('   Response:', data);
        
        const errorMessage = data.message || data.error || JSON.stringify(data);
        throw new Error(`Evolution API error (${response.status}): ${errorMessage}`);
      }

      const result = {
        instanceId: data.instance?.instanceName || instanceName,
        instanceName: data.instance?.instanceName || instanceName,
        token: data.hash?.apikey || data.instance?.token || token,
        qrCode: data.qrcode?.base64 || data.base64 || null,
        apiKey: token,
        providerConfig: { baseUrl, instanceName: instanceName }
      };

      console.log('✅ [EVOLUTION-PROVIDER] Instance created successfully!');
      console.log('   Instance ID:', result.instanceId);
      console.log('   Has QR Code:', !!result.qrCode);
      console.log('==============================================\n');

      return result;
    } catch (error) {
      console.error('[Evolution] Create error:', error);
      throw new Error(`Failed to create Evolution instance: ${error.message}`);
    }
  },

  async getInstanceStatus({ instanceName, token }) {
    const baseUrl = getBaseUrl();
    console.log(`[Evolution] Checking status via /connectionState for ${instanceName}`);

    try {
      // Using the correct endpoint: /instance/connectionState/{instance}
      const response = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, {
        method: 'GET',
        headers: { 'apikey': token }
      });

      if (!response.ok) {
        if (response.status === 404) return { status: 'disconnected' };
        return { status: 'error', raw: await response.json() };
      }

      const data = await response.json();
      console.log('[Evolution] Connection state response:', JSON.stringify(data));

      // Evolution API returns { instance: { state: 'open' } } when connected
      // or { instance: { state: 'close' } } when disconnected
      if (data.instance?.state === 'open') {
        return { status: 'connected', raw: data };
      }

      return { status: 'disconnected', raw: data };

    } catch (error) {
      console.error('[Evolution] Status error:', error);
      return { status: 'error', raw: error.message };
    }
  },

  async getQRCode({ instanceName, token }) {
    const baseUrl = getBaseUrl();
    
    const response = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: { 'apikey': token }
    });

    if (!response.ok) throw new Error('Failed to fetch QR Code');

    const data = await response.json();
    const base64 = data.base64 || data.qrcode?.base64;
    const code = data.code || data.qrcode?.code;

    return { base64, code };
  },

  async logout({ instanceName, token }) {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers: { 'apikey': token }
    });
    return response.ok;
  },

  async delete({ instanceName, token }) {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers: { 'apikey': token }
    });
    if (response.status === 404) return true; // Already deleted
    return response.ok;
  },

  async restart({ instanceName, token }) {
    const baseUrl = getBaseUrl();
    console.log(`[Evolution] Restarting instance ${instanceName}`);

    const response = await fetch(`${baseUrl}/instance/restart/${instanceName}`, {
      method: 'PUT',
      headers: { 'apikey': token }
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Failed to restart instance');
    }

    return true;
  },

  // Novo método: buscar informações da instância incluindo webhook
  async fetchInstanceInfo({ instanceName, token }) {
    const baseUrl = getBaseUrl();
    console.log(`[Evolution] Fetching instance info for ${instanceName}`);

    const response = await fetch(`${baseUrl}/instance/fetchInstances?instanceName=${instanceName}`, {
      method: 'GET',
      headers: { 'apikey': token }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch instance info');
    }

    const data = await response.json();
    console.log('[Evolution] Instance info:', JSON.stringify(data, null, 2));
    return data;
  },

  // Novo método: atualizar webhook de uma instância existente
  async updateWebhook({ instanceName, token, webhookUrl }) {
    const baseUrl = getBaseUrl();
    console.log(`[Evolution] Updating webhook for ${instanceName} to ${webhookUrl}`);

    const payload = {
      webhook: {
        url: webhookUrl,
        byEvents: false, // ✅ FIXADO: Enviar TODOS os eventos para a mesma URL
        base64: false,
        events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE", "QRCODE_UPDATED"]
      }
    };

    const response = await fetch(`${baseUrl}/webhook/set/${instanceName}`, {
      method: 'POST',
      headers: { 
        'apikey': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Failed to update webhook');
    }

    const data = await response.json();
    console.log('[Evolution] Webhook updated:', JSON.stringify(data, null, 2));
    return data;
  },

  async fetchProfilePictureUrl({ instanceName, token, number }) { // ✅ CORRIGIDO: "phone" → "number"
    const baseUrl = getBaseUrl();
    console.log(`[Evolution] Fetching profile picture for ${number} via ${instanceName}`);

    // Formatar o telefone conforme feedback do usuário: +55...
    // Se o número não começar com +, adicionamos.
    // Evolution geralmente aceita JID ou número. Se não for JID (@...), garantimos formato +[DDI][DDD][NUM]
    let formattedPhone = number; // ✅ CORRIGIDO: usa "number"
    if (!formattedPhone.includes('@') && !formattedPhone.startsWith('+')) {
        formattedPhone = `+${formattedPhone}`;
    }
    
    console.log(`[Evolution] Formatted phone for request: ${formattedPhone}`);

    const payload = {
      number: formattedPhone
    };

    try {
      const response = await fetch(`${baseUrl}/chat/fetchProfilePictureUrl/${instanceName}`, {
        method: 'POST',
        headers: { 
          'apikey': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.warn(`[Evolution] Failed to fetch profile picture: ${response.status}`);
        return null;
      }

      const data = await response.json();
      // Evolution returns { profilePictureUrl: "..." }
      const url = data.picture || data.profilePictureUrl; // Tentar ambos os campos possíveis
      
      if (!url) {
        console.log('[Evolution] No picture URL returned in payload:', JSON.stringify(data));
        return null;
      }

      return url;
    } catch (error) {
      console.error('[Evolution] Error fetching profile picture:', error);
      return null;
    }
  },

  // Simular digitação (typing presence)
  async sendPresence({ instanceName, token, number, delay }) {
    const baseUrl = getBaseUrl();
    console.log(`[Evolution] Sending typing presence to ${number} via ${instanceName}`);

    const payload = {
      number,
      options: {
        delay: delay || 1000,
        presence: 'composing',
        number
      }
    };

    try {
      const response = await fetch(`${baseUrl}/chat/sendPresence/${instanceName}`, {
        method: 'POST',
        headers: { 
          'apikey': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.warn(`[Evolution] Failed to send presence: ${response.status}`);
        return false;
      }

      console.log('[Evolution] Typing presence sent successfully');
      return true;
    } catch (error) {
      console.error('[Evolution] Error sending presence:', error);
      return false;
    }
  },

  // Simular gravação de áudio (recording presence)
  async sendRecordingPresence({ instanceName, token, number, delay }) {
    const baseUrl = getBaseUrl();
    console.log(`[Evolution] Sending recording presence to ${number} via ${instanceName}`);

    const payload = {
      number,
      options: {
        delay: delay || 3000,
        presence: 'recording', // ✅ Mudança: recording em vez de composing
        number
      }
    };

    try {
      const response = await fetch(`${baseUrl}/chat/sendPresence/${instanceName}`, {
        method: 'POST',
        headers: { 
          'apikey': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.warn(`[Evolution] Failed to send recording presence: ${response.status}`);
        return false;
      }

      console.log('[Evolution] Recording presence sent successfully');
      return true;
    } catch (error) {
      console.error('[Evolution] Error sending recording presence:', error);
      return false;
    }
  },

  // Enviar mensagem de texto
  async sendTextMessage({ instanceName, token, number, text, quoted }) {
    const baseUrl = getBaseUrl();
    console.log(`[Evolution] Sending text message to ${number} via ${instanceName}`);

    // Calcular delay baseado no número de caracteres (simular digitação natural)
    // Fórmula: ~50ms por caractere + delay base de 500ms (mínimo 1s, máximo 5s)
    const typingDelay = Math.min(Math.max(500 + (text.length * 50), 1000), 5000);
    
    console.log(`[Evolution] Calculated typing delay: ${typingDelay}ms for ${text.length} characters`);

    // 1. Simular digitação
    await this.sendPresence({ instanceName, token, number, delay: typingDelay });

    // 2. Aguardar o tempo de digitação
    await new Promise(resolve => setTimeout(resolve, typingDelay));

    // 3. Enviar mensagem
    const payload = {
      number,
      text,
      delay: 1200, // Delay adicional antes de enviar
      linkPreview: true
    };

    if (quoted) {
      payload.quoted = quoted;
    }

    try {
      const response = await fetch(`${baseUrl}/message/sendText/${encodeURIComponent(instanceName)}`, {
        method: 'POST',
        headers: { 
          'apikey': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Evolution] Failed to send message:', errorData);
        throw new Error(`Failed to send message: ${errorData.message || response.status}`);
      }

      const data = await response.json();
      console.log('[Evolution] Message sent successfully:', JSON.stringify(data));
      return data;
    } catch (error) {
      console.error('[Evolution] Error sending message:', error);
      throw error;
    }
  },

  // Deletar mensagem para todos
  async deleteMessage({ instanceName, token, messageId, remoteJid, fromMe, participant }) {
    const baseUrl = getBaseUrl();
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🗑️ [EVOLUTION-PROVIDER] DELETE MESSAGE REQUEST');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Instance: ${instanceName}`);
    console.log(`   Remote JID: ${remoteJid}`);
    console.log(`   Message ID: ${messageId}`);
    console.log(`   Message ID type: ${typeof messageId}`);
    console.log(`   Message ID length: ${messageId?.length || 0}`);
    console.log(`   From Me: ${fromMe ?? true}`);
    console.log(`   Participant: ${participant || 'N/A'}`);

    const payload = {
      id: messageId,
      remoteJid,
      fromMe: fromMe ?? true,
    };

    // Adicionar participant apenas se fornecido (para mensagens em grupos)
    if (participant) {
      payload.participant = participant;
    }

    console.log('📤 [EVOLUTION-PROVIDER] Request details:');
    console.log(`   URL: ${baseUrl}/chat/deleteMessageForEveryone/${instanceName}`);
    console.log(`   Method: DELETE`);
    console.log(`   Token: ${token.substring(0, 10)}...`);
    console.log(`   Payload:`, JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(`${baseUrl}/chat/deleteMessageForEveryone/${encodeURIComponent(instanceName)}`, {
        method: 'DELETE',
        headers: { 
          'apikey': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      console.log(`📥 [EVOLUTION-PROVIDER] Response status: ${response.status} ${response.statusText}`);
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
        console.error('❌ [EVOLUTION-PROVIDER] DELETE FAILED');
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

      console.log('✅ [EVOLUTION-PROVIDER] Message deleted successfully!');
      console.log('   Response data:', JSON.stringify(data, null, 2));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      return data;
    } catch (error) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ [EVOLUTION-PROVIDER] EXCEPTION CAUGHT');
      console.error(`   Error type: ${error.constructor.name}`);
      console.error(`   Error message: ${error.message}`);
      console.error(`   Stack:`, error.stack);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      throw error;
    }
  },

  // Enviar áudio
  async sendAudioMessage({ instanceName, token, number, audioUrl, audioDuration, quoted }) {
    const baseUrl = getBaseUrl();
    console.log(`[Evolution] Sending audio message to ${number} via ${instanceName}`);
    console.log(`[Evolution] Audio URL: ${audioUrl}`);
    console.log(`[Evolution] Audio Duration: ${audioDuration}s`);

    // ✅ Remover prefixo "data:audio/...;base64," se existir
    const base64Audio = audioUrl.startsWith('data:') 
      ? audioUrl.split(',')[1] 
      : audioUrl;

    console.log('[Evolution] Audio Duration:', `${audioDuration}s`);
    console.log('[Evolution] Base64 length:', base64Audio.length);
    console.log('[Evolution] Base64 prefix:', base64Audio.substring(0, 50));

    // ✅ Calcular tempo de "gravando..." (duração + 1s)
    const recordingDelayMs = (audioDuration + 1) * 1000;
    console.log('[Evolution] Calculated recording delay:', `${recordingDelayMs}ms for ${audioDuration}s audio`);

    // ✅ Enviar presença de "recording" antes de enviar o áudio
    await this.sendRecordingPresence({ instanceName, token, number, delay: recordingDelayMs });

    // 2. Aguardar o tempo de gravação simulado
    await new Promise(resolve => setTimeout(resolve, recordingDelayMs));

    // 3. Enviar áudio usando o endpoint CORRETO: /message/sendWhatsAppAudio
    // ✅ Formato correto conforme documentação Evolution API
    const payload = {
      number,
      audio: base64Audio, // ✅ Campo "audio" em vez de "media"
      delay: 1200
    };

    if (quoted) {
      payload.quoted = quoted;
    }

    console.log('[Evolution] Audio payload details:', {
      number,
      base64Length: base64Audio.length,
      base64Prefix: base64Audio.substring(0, 50),
      base64Suffix: base64Audio.substring(base64Audio.length - 50),
      isBase64: /^[A-Za-z0-9+/=]+$/.test(base64Audio.substring(0, 100)),
      hadDataPrefix: audioUrl.startsWith('data:'),
      delay: 1200,
      hasQuoted: !!quoted
    });

    try {
      console.log('[Evolution] Attempting to send audio via sendWhatsAppAudio...');
      console.log('[Evolution] Full endpoint:', `${baseUrl}/message/sendWhatsAppAudio/${encodeURIComponent(instanceName)}`);
      console.log('[Evolution] API Key:', token ? '***' + token.slice(-4) : 'MISSING');
      
      const response = await fetch(`${baseUrl}/message/sendWhatsAppAudio/${encodeURIComponent(instanceName)}`, {
        method: 'POST',
        headers: { 
          'apikey': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      console.log('[Evolution] Audio send response status:', response.status);
      console.log('[Evolution] Audio send response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));

      const responseText = await response.text();
      console.log('[Evolution] Audio send response body (raw):', responseText);

      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { message: responseText };
        }
        
        console.error('[Evolution] Failed to send audio:', {
          status: response.status,
          error: response.statusText,
          response: errorData
        });
        throw new Error(`Failed to send audio: ${response.status}`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { success: true, raw: responseText };
      }
      
      console.log('[Evolution] Audio sent successfully:', JSON.stringify(data));
      return data;
    } catch (error) {
      console.error('[Evolution] Error sending audio:', error);
      throw error;
    }
  },

  // Enviar mídia (imagem, vídeo, documento)
  async sendMediaMessage({ instanceName, token, number, mediaType, mimeType, caption, mediaUrl, fileName, quoted }) {
    const baseUrl = getBaseUrl();
    console.log(`[Evolution] Sending media message (${mediaType}) to ${number} via ${instanceName}`);
    console.log(`[Evolution] MimeType: ${mimeType}, FileName: ${fileName}`);

    // ✅ Remover prefixo "data:image/...;base64," se existir para enviar apenas o base64 puro
    const mediaContent = mediaUrl.startsWith('data:') 
      ? mediaUrl.split(',')[1] 
      : mediaUrl;

    console.log(`[Evolution] Media content length: ${mediaContent.length}`);
    console.log(`[Evolution] Media starts with: ${mediaContent.substring(0, 20)}...`);

    // Simular digitação para envio de mídia
    await this.sendPresence({ instanceName, token, number, delay: 1000 });

    const payload = {
        number,
        mediatype: mediaType, // "image", "video", "document"
        mimetype: mimeType, // "image/png", "video/mp4", etc
        caption: caption || '',
        media: mediaContent, // Base64 (clean) or URL
        fileName: fileName || 'file',
        delay: 1200,
        linkPreview: true
    };

    if (quoted) {
      payload.quoted = quoted;
    }

    try {
      const response = await fetch(`${baseUrl}/message/sendMedia/${encodeURIComponent(instanceName)}`, {
        method: 'POST',
        headers: { 
          'apikey': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Evolution] Failed to send media:', errorData);
        throw new Error(`Failed to send media: ${errorData.message || response.status}`);
      }

      const data = await response.json();
      console.log('[Evolution] Media sent successfully:', JSON.stringify(data));
      return data;
    } catch (error) {
      console.error('[Evolution] Error sending media:', error);
      throw error;
    }
  },

  // Buscar base64 de mídia criptografada via Evolution API
  async fetchMediaBase64({ instanceName, token, messageKey }) {
    const baseUrl = getBaseUrl();
    console.log(`[Evolution] Fetching base64 media for message ${messageKey.id}...`);

    const payload = {
      message: {
        key: {
          remoteJid: messageKey.remoteJid,
          fromMe: messageKey.fromMe,
          id: messageKey.id
        }
      },
      convertToMp4: false
    };

    try {
      const response = await fetch(`${baseUrl}/chat/getBase64FromMediaMessage/${instanceName}`, {
        method: 'POST',
        headers: { 
          'apikey': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.error(`[Evolution] Failed to fetch media base64: ${response.status}`);
        const errorText = await response.text();
        console.error(`[Evolution] Error response: ${errorText}`);
        return null;
      }

      const data = await response.json();
      console.log('[Evolution] Media base64 fetched successfully');
      console.log(`[Evolution] Base64 length: ${data.base64?.length || 0}`);
      console.log(`[Evolution] MimeType: ${data.mimetype || 'unknown'}`);
      
      return {
        base64: data.base64,
        mimetype: data.mimetype,
        filename: data.filename
      };
    } catch (error) {
      console.error('[Evolution] Error fetching media base64:', error);
      return null;
    }
  },

  // Buscar perfil do contato (nome, foto, status, etc)
  async fetchProfile({ instanceName, token, number }) {
    const baseUrl = getBaseUrl();
    console.log(`[Evolution] Fetching profile for ${number} via ${instanceName}`);

    // Formatar o número sem @ se for apenas número
    let formattedNumber = number;
    if (formattedNumber.includes('@')) {
      formattedNumber = formattedNumber.split('@')[0];
    }
    
    console.log(`[Evolution] Formatted number: ${formattedNumber}`);

    // ✅ Função helper: tentar buscar perfil
    const tryFetchProfile = async (num: string) => {
      const payload = { number: num };
      console.log(`[Evolution] Trying with number: ${num}`);
      
      const response = await fetch(`${baseUrl}/chat/fetchProfile/${instanceName}`, {
        method: 'POST',
        headers: { 
          'apikey': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      console.log(`[Evolution] Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[Evolution] Failed with ${num}: ${response.status}`);
        console.warn(`[Evolution] Error response: ${errorText}`);
        return null;
      }

      const data = await response.json();
      console.log('[Evolution] Profile fetched successfully:', JSON.stringify(data));
      
      // ✅ Validar se o name NÃO é vazio e NÃO é só o número
      const hasValidName = data.name && 
                          data.name.trim() !== '' && 
                          !/^\d+$/.test(data.name.trim());
      
      console.log(`[Evolution] Has valid name? ${hasValidName} (name="${data.name}")`);
      
      return {
        name: hasValidName ? data.name : null,
        picture: data.picture || null,
        status: data.status?.status || null,
        isBusiness: data.isBusiness || false,
        email: data.email || null,
        description: data.description || null,
        website: data.website || null
      };
    };

    try {
      // ✅ TENTATIVA 1: Número original
      console.log('[Evolution] 🔍 Attempt 1: Original number');
      let result = await tryFetchProfile(formattedNumber);
      
      if (result && result.name) {
        console.log('[Evolution] ✅ Success with original number!');
        return result;
      }

      // ✅ TENTATIVA 2: Se for número brasileiro (55) e tem 12 dígitos, adicionar 9º dígito
      if (formattedNumber.startsWith('55') && formattedNumber.length === 12) {
        const ddi = formattedNumber.substring(0, 2); // "55"
        const ddd = formattedNumber.substring(2, 4); // "83"
        const phone = formattedNumber.substring(4);  // "98564818"
        const numberWith9 = `${ddi}${ddd}9${phone}`; // "5583998564818"
        
        console.log('[Evolution] 🔍 Attempt 2: Adding 9th digit (BR format)');
        result = await tryFetchProfile(numberWith9);
        
        if (result && result.name) {
          console.log('[Evolution] ✅ Success with 9th digit added!');
          return result;
        }
      }

      // ✅ TENTATIVA 3: Se for número brasileiro (55) e tem 13 dígitos, remover 9º dígito
      if (formattedNumber.startsWith('55') && formattedNumber.length === 13) {
        const ddi = formattedNumber.substring(0, 2); // "55"
        const ddd = formattedNumber.substring(2, 4); // "83"
        const phone = formattedNumber.substring(5);  // Remove o 9 (posição 4)
        const numberWithout9 = `${ddi}${ddd}${phone}`; // "558398564818"
        
        console.log('[Evolution] 🔍 Attempt 3: Removing 9th digit (BR format)');
        result = await tryFetchProfile(numberWithout9);
        
        if (result && result.name) {
          console.log('[Evolution] ✅ Success with 9th digit removed!');
          return result;
        }
      }

      console.log('[Evolution] ❌ All attempts failed - no valid name found');
      console.log('[Evolution] 💡 TIP: The Evolution API may not have access to this contact name.');
      console.log('[Evolution]      Try saving the contact in WhatsApp first, or check instance permissions.');
      return null;

    } catch (error) {
      console.error('[Evolution] Error fetching profile:', error);
      console.error('[Evolution] Error details:', error.message, error.stack);
      return null;
    }
  }
};

// Legacy exports for backward compatibility during refactor (optional, but safe)
export const createEvolutionInstance = (name: string, token: string) => EvolutionProvider.createInstance({ name, token });
export const getEvolutionInstanceStatus = (name: string, token: string) => EvolutionProvider.getInstanceStatus({ instanceName: name, token });
export const getEvolutionQRCode = (name: string, token: string) => EvolutionProvider.getQRCode({ instanceName: name, token });
export const deleteEvolutionInstance = (name: string, token: string) => EvolutionProvider.delete({ instanceName: name, token });
export const logoutEvolutionInstance = (name: string, token: string) => EvolutionProvider.logout({ instanceName: name, token });

export default EvolutionProvider;