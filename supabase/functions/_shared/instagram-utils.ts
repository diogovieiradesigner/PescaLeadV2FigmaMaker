// =============================================================================
// SHARED MODULE: Instagram Utilities
// =============================================================================
// Utilitários compartilhados para processamento de dados do Instagram
// Usado por: instagram-discovery, instagram-enrichment, instagram-migrate
// =============================================================================

/**
 * Extrai username de uma URL do Instagram
 * Suporta TODOS os formatos conhecidos de URL do Instagram
 *
 * Formatos suportados:
 * - Perfil direto: instagram.com/username/
 * - Post: instagram.com/username/p/CODE/
 * - Reel: instagram.com/username/reel/CODE/
 * - Reels: instagram.com/username/reels/
 * - TV/IGTV: instagram.com/username/tv/CODE/
 * - Live: instagram.com/username/live/CODE/
 * - Stories: instagram.com/stories/username/ID/
 * - Highlights: instagram.com/stories/highlights/ID/ (NÃO tem username)
 * - Guide: instagram.com/username/guide/title/ID/
 * - Tagged: instagram.com/username/tagged/
 * - Channel: instagram.com/username/channel/
 * - Saved: instagram.com/username/saved/
 * - URLs com query params: instagram.com/username/?igshid=xxx&utm_source=xxx
 * - Mobile deep link: instagram://user?username=xxx
 * - @username
 *
 * @example
 * extractUsernameFromUrl("https://www.instagram.com/drdentista_sp/")
 * // => "drdentista_sp"
 *
 * extractUsernameFromUrl("https://www.instagram.com/jaimeportugal.arquiteto/reel/DMIirUIMlmZ/")
 * // => "jaimeportugal.arquiteto"
 *
 * extractUsernameFromUrl("https://www.instagram.com/stories/clinica_dental/12345/")
 * // => "clinica_dental"
 */
export function extractUsernameFromUrl(url: string): string | null {
  if (!url) return null;

  try {
    // Páginas especiais/reservadas que NÃO são usernames
    const specialPages = [
      'p', 'reel', 'reels', 'stories', 'explore', 'accounts', 'directory',
      'about', 'legal', 'tv', 'live', 'highlights', 'guide', 'guides',
      'tagged', 'channel', 'saved', 'api', 'developer', 'help', 'privacy',
      'terms', 'press', 'jobs', 'brand', 'advertising', 'blog', 'nametag',
      'direct', 'emails', 'settings', 'session', 'login', 'challenge',
      'web', 'static', 'challenge', 'data', 'loc', 'locations'
    ];

    // Helper: valida se é um username válido
    const isValidUsername = (u: string): boolean => {
      if (!u) return false;
      const lower = u.toLowerCase();
      if (specialPages.includes(lower)) return false;
      // Username deve ter 1-30 chars, apenas letras, números, _ e .
      return /^[a-zA-Z0-9_.]{1,30}$/.test(u);
    };

    // === MOBILE DEEP LINK ===
    // instagram://user?username=xxx
    const deepLinkPattern = /instagram:\/\/user\?username=([a-zA-Z0-9_.]+)/i;
    const deepLinkMatch = url.match(deepLinkPattern);
    if (deepLinkMatch && isValidUsername(deepLinkMatch[1])) {
      return deepLinkMatch[1].toLowerCase();
    }

    // === @USERNAME (texto simples) ===
    const patternAt = /^@([a-zA-Z0-9_.]+)$/i;
    const matchAt = url.match(patternAt);
    if (matchAt && isValidUsername(matchAt[1])) {
      return matchAt[1].toLowerCase();
    }

    // === STORIES URL ===
    // instagram.com/stories/username/ID/
    // CUIDADO: instagram.com/stories/highlights/ID/ NÃO tem username
    const storiesPattern = /instagram\.com\/stories\/([a-zA-Z0-9_.]+)(?:\/|\?|$)/i;
    const storiesMatch = url.match(storiesPattern);
    if (storiesMatch && isValidUsername(storiesMatch[1])) {
      return storiesMatch[1].toLowerCase();
    }

    // === URL COM USERNAME NO PATH SEGUIDO DE SUBPÁGINA ===
    // instagram.com/username/reel/CODE/
    // instagram.com/username/p/CODE/
    // instagram.com/username/tv/CODE/
    // instagram.com/username/live/CODE/
    // instagram.com/username/guide/title/ID/
    // instagram.com/username/tagged/
    // instagram.com/username/channel/
    // instagram.com/username/saved/
    // instagram.com/username/reels/
    const pathPattern = /instagram\.com\/([a-zA-Z0-9_.]+)\/(?:reel|p|reels|tv|live|guide|guides|tagged|channel|saved)(?:\/|$|\?)/i;
    const pathMatch = url.match(pathPattern);
    if (pathMatch && isValidUsername(pathMatch[1])) {
      return pathMatch[1].toLowerCase();
    }

    // === URL DE PERFIL DIRETO ===
    // instagram.com/username/
    // instagram.com/username?hl=en&igshid=xxx
    // instagram.com/username/?utm_source=xxx
    // Deve capturar username mesmo com query params complexos
    const profilePattern = /instagram\.com\/([a-zA-Z0-9_.]+)\/?(?:\?[^\/]*)?$/i;
    const profileMatch = url.match(profilePattern);
    if (profileMatch && isValidUsername(profileMatch[1])) {
      return profileMatch[1].toLowerCase();
    }

    // === FALLBACK: Primeiro segmento após instagram.com/ ===
    // Tenta extrair qualquer coisa que pareça username
    const fallbackPattern = /instagram\.com\/([a-zA-Z0-9_.]+)/i;
    const fallbackMatch = url.match(fallbackPattern);
    if (fallbackMatch && isValidUsername(fallbackMatch[1])) {
      return fallbackMatch[1].toLowerCase();
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Valida se uma URL é do Instagram
 */
export function isValidInstagramUrl(url: string): boolean {
  if (!url) return false;
  const pattern = /^(?:https?:\/\/)?(?:www\.)?instagram\.com\//i;
  return pattern.test(url);
}

/**
 * Valida se um username do Instagram é válido
 * Regras: 1-30 caracteres, letras, números, pontos e underscores
 */
export function isValidUsername(username: string): boolean {
  if (!username) return false;
  const pattern = /^[a-zA-Z0-9_.]{1,30}$/;
  return pattern.test(username);
}

/**
 * Normaliza username (remove @ e espaços, converte para minúsculo)
 */
export function normalizeUsername(username: string): string {
  if (!username) return '';
  return username.trim().replace(/^@/, '').toLowerCase();
}

/**
 * Constrói URL do perfil a partir do username
 */
export function buildProfileUrl(username: string): string {
  const normalized = normalizeUsername(username);
  return `https://www.instagram.com/${normalized}/`;
}

/**
 * Extrai contatos da bio do Instagram
 * Busca emails, telefones e WhatsApp
 *
 * @example
 * extractContactsFromBio("Contato: email@exemplo.com | WhatsApp: (11) 99999-9999")
 * // => { emails: ["email@exemplo.com"], phones: ["11999999999"], whatsapps: ["11999999999"] }
 */
export function extractContactsFromBio(bio: string): {
  emails: string[];
  phones: string[];
  whatsapps: string[];
} {
  const result = {
    emails: [] as string[],
    phones: [] as string[],
    whatsapps: [] as string[],
  };

  if (!bio) return result;

  // Normaliza texto
  const text = bio.toLowerCase();

  // === EMAILS ===
  // Padrão de email mais rigoroso
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
  const emailMatches = bio.match(emailPattern);
  if (emailMatches) {
    result.emails = [...new Set(emailMatches.map(e => e.toLowerCase()))];
  }

  // === TELEFONES ===
  // Padrões brasileiros
  const phonePatterns = [
    // (11) 99999-9999 ou (11) 9999-9999
    /\(?\d{2}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}/g,
    // 11 99999-9999
    /\d{2}[\s.-]?\d{4,5}[\s.-]?\d{4}/g,
    // +55 11 99999-9999
    /\+?55[\s.-]?\d{2}[\s.-]?\d{4,5}[\s.-]?\d{4}/g,
  ];

  const allPhones: string[] = [];
  for (const pattern of phonePatterns) {
    const matches = bio.match(pattern);
    if (matches) {
      allPhones.push(...matches);
    }
  }

  // Normaliza telefones (apenas números)
  const normalizedPhones = allPhones
    .map(p => p.replace(/\D/g, ''))
    .filter(p => p.length >= 10 && p.length <= 13)
    .map(p => {
      // Remove prefixo 55 se presente
      if (p.startsWith('55') && p.length > 11) {
        return p.slice(2);
      }
      return p;
    });

  result.phones = [...new Set(normalizedPhones)];

  // === WHATSAPP ===
  // Busca menções explícitas de WhatsApp
  const hasWhatsappMention = /whats?app|wpp|zap/i.test(text);

  if (hasWhatsappMention && result.phones.length > 0) {
    // Se menciona WhatsApp, assume que os telefones são WhatsApp
    result.whatsapps = [...result.phones];
  } else {
    // Busca links do WhatsApp
    const waLinkPattern = /wa\.me\/(\d+)/gi;
    const waMatches = [...bio.matchAll(waLinkPattern)];
    if (waMatches.length > 0) {
      result.whatsapps = waMatches.map(m => {
        let num = m[1];
        if (num.startsWith('55') && num.length > 11) {
          num = num.slice(2);
        }
        return num;
      });
    }
  }

  return result;
}

/**
 * Extrai website/link da bio
 */
export function extractWebsiteFromBio(bio: string): string | null {
  if (!bio) return null;

  // Padrão de URL genérico
  const urlPattern = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+(?:\.[a-zA-Z]{2,})+)(?:\/[^\s]*)?/gi;
  const matches = bio.match(urlPattern);

  if (matches) {
    // Filtra URLs de redes sociais comuns
    const socialDomains = ['instagram.com', 'facebook.com', 'twitter.com', 'tiktok.com', 'youtube.com', 'linkedin.com'];
    const filtered = matches.filter(url => {
      const lower = url.toLowerCase();
      return !socialDomains.some(domain => lower.includes(domain));
    });

    if (filtered.length > 0) {
      let url = filtered[0];
      // Adiciona https se não tiver protocolo
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      return url;
    }
  }

  return null;
}

/**
 * Deduplica array de objetos por campo
 */
export function deduplicateByField<T>(items: T[], field: keyof T): T[] {
  const seen = new Set<any>();
  return items.filter(item => {
    const value = item[field];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}

/**
 * Deduplica perfis por username
 */
export function deduplicateProfiles<T extends { username: string }>(profiles: T[]): T[] {
  return deduplicateByField(profiles, 'username');
}

/**
 * Remove acentos de string
 */
export function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Gera hash SHA-256 de uma string
 * Usado para deduplicação robusta de perfis
 *
 * @example
 * const hash = await sha256("username_fullname_bio");
 * // => "a1b2c3d4e5f6..."
 */
export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Gera hash de deduplicação para um perfil do Instagram
 * Combina username + full_name + primeiros 50 chars da bio para hash único
 *
 * @example
 * const hash = await generateProfileHash({ username: "test", full_name: "Test User", biography: "..." });
 */
export async function generateProfileHash(profile: {
  username: string;
  full_name?: string;
  biography?: string;
}): Promise<string> {
  const hashInput = [
    profile.username?.toLowerCase() || '',
    profile.full_name?.toLowerCase() || '',
    (profile.biography || '').slice(0, 50).toLowerCase(),
  ].join('_');

  return sha256(hashInput);
}

/**
 * Formata número de telefone brasileiro
 */
export function formatBrazilianPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  } else if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return phone;
}

/**
 * Interface para resultado de descoberta
 */
export interface DiscoveryResult {
  google_title: string;
  google_link: string;
  google_snippet: string;
  search_query: string;
  search_position: number;
  username: string;
  profile_url: string;
}

/**
 * Interface para link externo do Instagram
 */
export interface ExternalLink {
  url: string;
  link_type: string;
}

/**
 * Interface para perfil relacionado
 */
export interface RelatedProfile {
  id: string;
  username: string;
  full_name?: string;
  profile_pic_url?: string;
  is_verified?: boolean;
}

/**
 * Interface para perfil enriquecido
 */
export interface EnrichedProfile {
  instagram_id?: string;
  username: string;
  full_name?: string;
  biography?: string;
  profile_pic_url?: string;
  profile_pic_url_hd?: string;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
  is_verified?: boolean;
  is_business_account?: boolean;
  is_professional_account?: boolean;
  is_private?: boolean;
  external_url?: string;
  external_urls?: ExternalLink[];
  business_email?: string;
  business_phone?: string;
  business_category?: string;
  business_address?: any;
  email_from_bio?: string;
  phone_from_bio?: string;
  whatsapp_from_bio?: string;
  // Dados de localização (extraídos dos posts)
  location_name?: string;
  location_id?: string;
  // Perfis relacionados/sugeridos
  related_profiles?: RelatedProfile[];
  // Score de qualidade calculado
  lead_score?: number;
  raw_data?: any;
}

/**
 * Processa resultado do Apify/Bright Data e extrai contatos
 * Suporta múltiplos formatos de resposta:
 * - Apify Instagram API Scraper (camelCase): followersCount, externalUrls, etc
 * - Formato legado (snake_case): followers_count, external_url, etc
 */
export function processEnrichedProfile(rawData: any): EnrichedProfile {
  // === Dados básicos ===
  const profile: EnrichedProfile = {
    instagram_id: rawData.id || rawData.pk || rawData.user_id,
    username: rawData.username || '',
    full_name: rawData.fullName || rawData.full_name || rawData.name || '',
    biography: rawData.biography || rawData.bio || '',

    // Imagens de perfil (Apify usa profilePicUrl e profilePicUrlHD)
    profile_pic_url: rawData.profilePicUrl || rawData.profile_pic_url || '',
    profile_pic_url_hd: rawData.profilePicUrlHD || rawData.profile_pic_url_hd || rawData.profilePicUrl || '',

    // Métricas (Apify usa camelCase: followersCount, followsCount, postsCount)
    followers_count: rawData.followersCount || rawData.followers_count || rawData.followers || rawData.edge_followed_by?.count,
    following_count: rawData.followsCount || rawData.following_count || rawData.following || rawData.edge_follow?.count,
    posts_count: rawData.postsCount || rawData.posts_count || rawData.media_count || rawData.edge_owner_to_timeline_media?.count,

    // Status da conta (Apify usa: verified, isBusinessAccount, private)
    is_verified: rawData.verified || rawData.is_verified || false,
    is_business_account: rawData.isBusinessAccount || rawData.is_business_account || rawData.is_business || false,
    is_professional_account: rawData.isProfessionalAccount || rawData.is_professional_account || false,
    is_private: rawData.private || rawData.is_private || false,

    // URL externa principal
    external_url: rawData.externalUrl || rawData.external_url || rawData.website || '',

    // Array de URLs externas (Apify retorna externalUrls como array)
    external_urls: rawData.externalUrls || [],

    // Contato business
    business_email: rawData.businessEmail || rawData.business_email || rawData.public_email || '',
    business_phone: rawData.businessPhoneNumber || rawData.business_phone_number || rawData.public_phone_number || rawData.contact_phone_number || '',
    business_category: rawData.businessCategoryName || rawData.business_category_name || rawData.category_name || rawData.category || '',
    business_address: rawData.businessAddress || rawData.business_address_json || rawData.address_json || null,

    raw_data: rawData,
  };

  // === Extrair localização do primeiro post (se disponível) ===
  if (rawData.latestPosts && Array.isArray(rawData.latestPosts) && rawData.latestPosts.length > 0) {
    // Procura o primeiro post com localização
    for (const post of rawData.latestPosts) {
      if (post.locationName) {
        profile.location_name = post.locationName;
        profile.location_id = post.locationId;
        break;
      }
    }
  }

  // === Extrair perfis relacionados ===
  if (rawData.relatedProfiles && Array.isArray(rawData.relatedProfiles)) {
    profile.related_profiles = rawData.relatedProfiles.map((rp: any) => ({
      id: rp.id || rp.pk,
      username: rp.username,
      full_name: rp.fullName || rp.full_name,
      profile_pic_url: rp.profilePicUrl || rp.profile_pic_url,
      is_verified: rp.verified || rp.is_verified || false,
    }));
  }

  // === Extrai contatos da bio ===
  if (profile.biography) {
    const contacts = extractContactsFromBio(profile.biography);

    if (contacts.emails.length > 0 && !profile.business_email) {
      profile.email_from_bio = contacts.emails[0];
    }

    if (contacts.phones.length > 0 && !profile.business_phone) {
      profile.phone_from_bio = contacts.phones[0];
    }

    if (contacts.whatsapps.length > 0) {
      profile.whatsapp_from_bio = contacts.whatsapps[0];
    }
  }

  // === Extrai WhatsApp dos links externos (externalUrls) ===
  // Muitos perfis têm wa.me ou api.whatsapp.com nos links, não na bio
  if (!profile.whatsapp_from_bio && profile.external_urls && Array.isArray(profile.external_urls)) {
    for (const linkObj of profile.external_urls) {
      const url = (linkObj.url || linkObj || '').toLowerCase();

      // Detecta links do WhatsApp
      if (url.includes('wa.me') || url.includes('whatsapp.com') || url.includes('api.whatsapp')) {
        // Extrai número do link wa.me/5511999999999
        const waMatch = url.match(/wa\.me\/(\d+)/);
        if (waMatch) {
          let num = waMatch[1];
          // Remove prefixo 55 se presente e número tem mais de 11 dígitos
          if (num.startsWith('55') && num.length > 11) {
            num = num.slice(2);
          }
          profile.whatsapp_from_bio = num;
          break;
        }

        // Extrai número do link api.whatsapp.com/send?phone=5511999999999
        const apiMatch = url.match(/phone=(\d+)/);
        if (apiMatch) {
          let num = apiMatch[1];
          if (num.startsWith('55') && num.length > 11) {
            num = num.slice(2);
          }
          profile.whatsapp_from_bio = num;
          break;
        }

        // Se tem link de WhatsApp mas não conseguiu extrair número, marca como "link"
        // para indicar que tem WhatsApp mesmo sem número extraído
        if (!profile.whatsapp_from_bio) {
          profile.whatsapp_from_bio = 'link_externo';
        }
        break;
      }
    }
  }

  // === Também verifica o external_url principal ===
  if (!profile.whatsapp_from_bio && profile.external_url) {
    const url = profile.external_url.toLowerCase();
    if (url.includes('wa.me') || url.includes('whatsapp.com') || url.includes('api.whatsapp')) {
      const waMatch = url.match(/wa\.me\/(\d+)/);
      if (waMatch) {
        let num = waMatch[1];
        if (num.startsWith('55') && num.length > 11) {
          num = num.slice(2);
        }
        profile.whatsapp_from_bio = num;
      } else {
        const apiMatch = url.match(/phone=(\d+)/);
        if (apiMatch) {
          let num = apiMatch[1];
          if (num.startsWith('55') && num.length > 11) {
            num = num.slice(2);
          }
          profile.whatsapp_from_bio = num;
        } else {
          profile.whatsapp_from_bio = 'link_externo';
        }
      }
    }
  }

  // === Calcular lead score ===
  profile.lead_score = calculateLeadScore(profile);

  return profile;
}

/**
 * Constrói queries de busca para o Google/Serper
 * ATUALIZADO: Retorna apenas variações do termo de busca (nicho).
 * A localização é passada separadamente para a API Serper (campo "location").
 * O operador site:instagram.com é adicionado automaticamente na função de busca.
 *
 * @example
 * buildSearchQueries("dentista", "são paulo")
 * // => [
 * //   "dentista",
 * //   "clinica odontologica",
 * //   "consultorio dentario",
 * //   "odontologia",
 * // ]
 */
export function buildSearchQueries(niche: string, location: string): string[] {
  // SIMPLIFICADO: Retorna APENAS o termo exato digitado pelo usuário
  // O sistema deve avançar nas páginas (1, 2, 3...) ao invés de variar o termo
  // Variações de termo confundem o usuário e não trazem resultados consistentes
  const nicheClean = niche.trim().toLowerCase();

  // Retorna apenas o termo exato - SEM variações
  return [nicheClean];
}

/**
 * Calcula score de qualidade do lead
 * Base em: completude dos dados, métricas, tipo de conta, links externos
 */
export function calculateLeadScore(profile: EnrichedProfile): number {
  let score = 0;

  // Dados básicos (max 25)
  if (profile.full_name) score += 8;
  if (profile.biography) score += 8;
  if (profile.profile_pic_url) score += 4;
  if (profile.profile_pic_url_hd) score += 2;
  if (profile.business_category) score += 3;

  // Links externos (max 15)
  if (profile.external_url) score += 5;
  if (profile.external_urls && profile.external_urls.length > 0) {
    // Bonus por múltiplos links (máx 10 pontos extras)
    score += Math.min(profile.external_urls.length * 2, 10);
  }

  // Contato (max 35)
  if (profile.business_email || profile.email_from_bio) score += 15;
  if (profile.business_phone || profile.phone_from_bio) score += 12;
  if (profile.whatsapp_from_bio) score += 8;

  // Tipo de conta (max 10)
  if (profile.is_business_account) score += 7;
  if (profile.is_verified) score += 3;

  // Localização (max 5)
  if (profile.location_name) score += 5;

  // Métricas (max 10)
  if (profile.followers_count) {
    if (profile.followers_count >= 10000) score += 4;
    else if (profile.followers_count >= 1000) score += 3;
    else if (profile.followers_count >= 100) score += 1;
  }
  if (profile.posts_count && profile.posts_count >= 10) score += 3;
  if (!profile.is_private) score += 3;

  return Math.min(score, 100);
}
