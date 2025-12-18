// =============================================================================
// SHARED MODULE: Instagram Utilities
// =============================================================================
// Utilitários compartilhados para processamento de dados do Instagram
// Usado por: instagram-discovery, instagram-enrichment, instagram-migrate
// =============================================================================

/**
 * Extrai username de uma URL do Instagram
 * Suporta múltiplos formatos de URL
 *
 * @example
 * extractUsernameFromUrl("https://www.instagram.com/drdentista_sp/")
 * // => "drdentista_sp"
 *
 * extractUsernameFromUrl("https://instagram.com/drdentista_sp")
 * // => "drdentista_sp"
 */
export function extractUsernameFromUrl(url: string): string | null {
  if (!url) return null;

  try {
    // Limpa a URL
    const cleanUrl = url.trim().toLowerCase();

    // Padrões de URL do Instagram
    const patterns = [
      // https://www.instagram.com/username/
      /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)\/?(?:\?.*)?$/i,
      // https://instagram.com/username
      /(?:https?:\/\/)?instagram\.com\/([a-zA-Z0-9_.]+)\/?(?:\?.*)?$/i,
      // @username
      /^@([a-zA-Z0-9_.]+)$/i,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        const username = match[1].toLowerCase();
        // Ignora páginas especiais
        if (!['p', 'reel', 'reels', 'stories', 'explore', 'accounts', 'directory', 'about', 'legal'].includes(username)) {
          return username;
        }
      }
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

  // === Calcular lead score ===
  profile.lead_score = calculateLeadScore(profile);

  return profile;
}

/**
 * Constrói queries de busca para o Google/Serper
 *
 * @example
 * buildSearchQueries("dentista", "são paulo")
 * // => [
 * //   "dentista são paulo site:instagram.com",
 * //   "dentista sp site:instagram.com",
 * //   "dentista sao paulo instagram",
 * //   ...
 * // ]
 */
export function buildSearchQueries(niche: string, location: string): string[] {
  const nicheClean = niche.trim().toLowerCase();
  const locationClean = location.trim().toLowerCase();
  const locationNoAccents = removeAccents(locationClean);

  // Mapeamento de estados para siglas
  const stateAbbreviations: Record<string, string> = {
    'são paulo': 'sp', 'sao paulo': 'sp',
    'rio de janeiro': 'rj',
    'minas gerais': 'mg',
    'bahia': 'ba',
    'paraná': 'pr', 'parana': 'pr',
    'rio grande do sul': 'rs',
    'santa catarina': 'sc',
    'pernambuco': 'pe',
    'ceará': 'ce', 'ceara': 'ce',
    'goiás': 'go', 'goias': 'go',
    'distrito federal': 'df', 'brasília': 'df', 'brasilia': 'df',
  };

  const queries: string[] = [];
  const abbrev = stateAbbreviations[locationClean] || stateAbbreviations[locationNoAccents] || '';

  // Query principal
  queries.push(`${nicheClean} ${locationClean} site:instagram.com`);

  // Com sigla do estado
  if (abbrev) {
    queries.push(`${nicheClean} ${abbrev} site:instagram.com`);
  }

  // Sem acentos
  if (locationNoAccents !== locationClean) {
    queries.push(`${nicheClean} ${locationNoAccents} site:instagram.com`);
  }

  // Variação com "instagram" no texto
  queries.push(`${nicheClean} ${locationClean} instagram`);

  // Hashtag style (colado)
  const nicheHashtag = nicheClean.replace(/\s+/g, '');
  const locationHashtag = locationNoAccents.replace(/\s+/g, '');
  queries.push(`${nicheHashtag}${locationHashtag} site:instagram.com`);

  // Variações de nicho comuns
  const nicheVariations: Record<string, string[]> = {
    'dentista': ['clinica odontologica', 'consultorio dentario', 'odontologia'],
    'advogado': ['escritorio de advocacia', 'advogada', 'advocacia'],
    'medico': ['clinica medica', 'consultorio medico', 'medica'],
    'nutricionista': ['nutri', 'nutrição'],
    'psicologo': ['psicologa', 'psicologia', 'terapeuta'],
    'personal trainer': ['personal', 'treinador pessoal'],
    'fotografo': ['fotografa', 'fotografia', 'estudio fotografico'],
    'restaurante': ['restaurantes', 'gastronomia'],
    'salão de beleza': ['salao', 'cabeleireiro', 'cabelereira'],
  };

  const variations = nicheVariations[nicheClean];
  if (variations) {
    for (const variation of variations.slice(0, 2)) { // Limita a 2 variações
      queries.push(`${variation} ${locationClean} site:instagram.com`);
    }
  }

  // Remove duplicatas e retorna
  return [...new Set(queries)];
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
