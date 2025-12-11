/**
 * Provider Factory
 * 
 * Seleciona o provider correto (Evolution API ou Uazapi) baseado na instância.
 * Implementa o Factory Pattern para suportar múltiplos fornecedores de WhatsApp.
 */

import EvolutionProvider from './provider-evolution.ts';
import UazapiProvider from './provider-uazapi.ts'; // ✅ ADICIONADO
import { getSupabaseServiceClient } from './supabase-client.ts';
import tokenCache from './token-cache.ts';

interface WhatsAppProvider {
  // Mensagens
  sendTextMessage(params: {
    instanceName: string;
    token: string;
    number: string;
    text: string;
    quoted?: any;
  }): Promise<any>;

  sendAudioMessage(params: {
    instanceName: string;
    token: string;
    number: string;
    audioUrl: string;
    audioDuration?: number;
    quoted?: any;
  }): Promise<any>;

  sendMediaMessage(params: {
    instanceName: string;
    token: string;
    number: string;
    mediaType: string;
    mimeType: string;
    caption?: string;
    mediaUrl: string;
    fileName?: string;
    quoted?: any;
  }): Promise<any>;

  deleteMessage(params: {
    instanceName: string;
    token: string;
    messageId: string;
    remoteJid: string;      // ✅ ADICIONADO - JID do chat (número@s.whatsapp.net)
    fromMe: boolean;         // ✅ ADICIONADO - Se a mensagem foi enviada por nós
    participant?: string;    // ✅ ADICIONADO - Para mensagens de grupo (opcional)
  }): Promise<any>;

  // Instância
  fetchInstanceInfo(params: {
    instanceName: string;
    token: string;
  }): Promise<any>;

  updateWebhook(params: {
    instanceName: string;
    token: string;
    webhookUrl: string;
    webhookByEvents: boolean;
    webhookBase64: boolean;
    webhookEvents: string[];
  }): Promise<any>;

  // Contatos
  fetchProfilePictureUrl(params: {
    instanceName: string;
    token: string;
    number: string;  // ✅ MANTIDO como "number" (padrão da interface)
  }): Promise<string | null>;

  fetchProfile(params: {
    instanceName: string;
    token: string;
    number: string;  // ✅ MANTIDO como "number" (padrão da interface)
  }): Promise<any>;
}

/**
 * Factory que retorna o provider correto baseado na instância
 */
export class ProviderFactory {
  /**
   * Busca o provider da instância no banco de dados
   */
  static async getProviderForInstance(instanceId: string): Promise<WhatsAppProvider> {
    const supabase = getSupabaseServiceClient(); // ✅ Usando singleton!

    // Buscar instância no banco
    const { data: instance, error } = await supabase
      .from('instances')
      .select('provider_type') // ✅ CORRIGIDO: usar provider_type ao invés de provider
      .eq('id', instanceId)
      .single();

    if (error || !instance) {
      console.warn(`⚠️ [ProviderFactory] Instance ${instanceId} not found, defaulting to Evolution`);
      return EvolutionProvider;
    }

    const providerType = instance.provider_type || 'evolution'; // ✅ CORRIGIDO

    console.log(`✅ [ProviderFactory] Instance ${instanceId} uses provider: ${providerType}`);

    switch (providerType) {
      case 'evolution':
        return EvolutionProvider;
      
      case 'uazapi':
        return UazapiProvider; // ✅ ADICIONADO
      
      default:
        console.warn(`⚠️ [ProviderFactory] Unknown provider "${providerType}", defaulting to Evolution`);
        return EvolutionProvider;
    }
  }

  /**
   * Busca o provider baseado no nome da instância (via query no banco)
   */
  static async getProviderForInstanceName(instanceName: string): Promise<WhatsAppProvider> {
    const supabase = getSupabaseServiceClient(); // ✅ Usando singleton!

    // Buscar instância no banco
    const { data: instance, error } = await supabase
      .from('instances')
      .select('provider_type') // ✅ CORRIGIDO: usar provider_type ao invés de provider
      .eq('name', instanceName)
      .single();

    if (error || !instance) {
      console.warn(`⚠️ [ProviderFactory] Instance "${instanceName}" not found, defaulting to Evolution`);
      return EvolutionProvider;
    }

    const providerType = instance.provider_type || 'evolution'; // ✅ CORRIGIDO

    console.log(`✅ [ProviderFactory] Instance "${instanceName}" uses provider: ${providerType}`);

    switch (providerType) {
      case 'evolution':
        return EvolutionProvider;
      
      case 'uazapi':
        return UazapiProvider; // ✅ ADICIONADO
      
      default:
        console.warn(`⚠️ [ProviderFactory] Unknown provider "${providerType}", defaulting to Evolution`);
        return EvolutionProvider;
    }
  }

  /**
   * Busca o token correto para uma instância
   * 
   * ✅ OTIMIZADO COM CACHE!
   * - Primeira chamada: busca do banco (50-100ms)
   * - Chamadas seguintes: busca do cache (0.001ms)
   * - Cache expira após 5 minutos (configurável)
   * 
   * Estratégia de fallback (em ordem):
   * 1. api_key do banco (token específico da instância)
   * 2. ENV var global do provider (token compartilhado)
   * 3. null (sem token configurado)
   * 
   * ✅ Backward compatible: se api_key estiver vazio, usa ENV var (comportamento atual)
   */
  static async getTokenForInstance(instanceId: string): Promise<string | null> {
    // 🚀 PRIORIDADE 0: Cache em memória (super rápido!)
    const cached = tokenCache.get(instanceId);
    if (cached) {
      return cached.token;
    }

    // ⏳ Cache miss - buscar do banco
    const supabase = getSupabaseServiceClient(); // ✅ Usando singleton!

    // Buscar instância no banco
    const { data: instance, error } = await supabase
      .from('instances')
      .select('provider_type, api_key')
      .eq('id', instanceId)
      .single();

    if (error || !instance) {
      console.warn(`⚠️ [ProviderFactory] Instance ${instanceId} not found, falling back to ENV var`);
      // Fallback para Evolution como padrão
      const fallbackToken = Deno.env.get('EVOLUTION_API_KEY') || null;
      
      // Cache mesmo o fallback
      if (fallbackToken) {
        tokenCache.set(instanceId, fallbackToken, 'evolution');
      }
      
      return fallbackToken;
    }

    const providerType = instance.provider_type || 'evolution';
    let finalToken: string | null = null;

    // PRIORIDADE 1: Token específico da instância (banco)
    if (instance.api_key && instance.api_key.trim() !== '') {
      console.log(`✅ [ProviderFactory] Using instance-specific token for ${providerType}`);
      finalToken = instance.api_key;
    } else {
      // PRIORIDADE 2: ENV var global do provider (comportamento atual - backward compatible!)
      let envToken = null;

      switch (providerType) {
        case 'evolution':
          envToken = Deno.env.get('EVOLUTION_API_KEY');
          break;
        
        case 'uazapi':
          // Uazapi requires instance-specific token (api_key from DB).
          // Admin token cannot be used for sending messages.
          envToken = null; 
          break;
        
        default:
          console.warn(`⚠️ [ProviderFactory] Unknown provider type "${providerType}"`);
          break;
      }

      if (envToken) {
        console.log(`✅ [ProviderFactory] Using ENV var token for ${providerType} (backward compatible mode)`);
        finalToken = envToken;
      } else {
        // PRIORIDADE 3: Nenhum token encontrado
        console.error(`❌ [ProviderFactory] No token found for instance ${instanceId} (provider: ${providerType})`);
        console.error(`   Please set api_key in database or configure ${providerType.toUpperCase()}_API_KEY environment variable`);
        finalToken = null;
      }
    }

    // 💾 Armazenar no cache para próximas chamadas
    if (finalToken) {
      tokenCache.set(instanceId, finalToken, providerType);
    }

    return finalToken;
  }

  /**
   * Invalida o cache de token de uma instância
   * Use quando deletar/modificar uma instância
   */
  static invalidateCache(instanceId: string): void {
    tokenCache.invalidate(instanceId);
  }

  /**
   * Retorna estatísticas do cache
   */
  static getCacheStats() {
    return tokenCache.getStats();
  }

  /**
   * Imprime estatísticas do cache
   */
  static printCacheStats(): void {
    tokenCache.printStats();
  }
}

export default ProviderFactory;