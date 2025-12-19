// =============================================================================
// SHARED MODULE: Website Validator
// =============================================================================
// Validação e categorização de URLs para scraping de websites
// Usado por: instagram-website-enqueue, google-maps-enqueue
// =============================================================================

/**
 * Domínios bloqueados para scraping
 * Baseado em process-whois-queue + expansão para Instagram
 */
export const BLOCKED_DOMAINS = [
  // Redes Sociais
  'instagram.com', 'facebook.com', 'linkedin.com',
  'twitter.com', 'x.com', 'youtube.com', 'tiktok.com',
  'snapchat.com', 'threads.net', 'pinterest.com',
  'reddit.com', 'tumblr.com', 'vimeo.com',

  // Agregadores de Links Bio
  'linktr.ee', 'linktree.com', 'bio.link', 'beacons.ai',
  'milkshake.app', 'hoo.be', 'solo.to', 'link.me',
  'tap.bio', 'koji.to', 'later.com', 'shorby.com',
  'taplink.cc', 'campsite.bio', 'allmylinks.com',
  'linkpop.com', 'stan.store', 'creator.link',
  'linklist.bio', 'bio.site', 'apptuts.bio', // ⚠️ Encontrados em produção
  'rdstation.com', 'ig.rdstation.com', // RD Station links

  // Site Builders (difícil extração)
  'carrd.co', 'framer.ai', 'wixsite.com',
  'wordpress.com', 'blogspot.com', 'sites.google.com',
  'webnode.page', 'weebly.com', 'godaddy.com',
  'squarespace.com', 'shopify.com', 'strikingly.com',
  'ueniweb.com',

  // Comunicação (não são sites)
  'wa.me', 'whatsapp.com', 'api.whatsapp.com',
  'telegram.me', 't.me', 'viber.com', 'discord.gg',

  // Encurtadores
  'bit.ly', 'goo.gl', 'tinyurl.com', 'short.link',
  'ow.ly', 'buff.ly', 'rebrand.ly', 'cutt.ly',

  // Google Services
  'business.google.com', 'g.page', 'maps.google.com',
  'forms.google.com', 'forms.gle', 'drive.google.com',
  'docs.google.com',

  // Marketplaces/E-commerce Genéricos
  'mercadolivre.com.br', 'mercadolibre.com',
  'olx.com.br', 'amazon.com.br', 'americanas.com.br',
  'magazineluiza.com.br', 'casasbahia.com.br',
  'shopee.com.br', 'aliexpress.com',
  'sympla.com.br', // Eventos/ingressos

  // Formulários e Ferramentas
  'calendly.com', 'typeform.com', 'jotform.com',

  // Outros Padrões Inválidos
  'localhost', '127.0.0.1', 'example.com',
  'test.com', 'placeholder.com',
];

/**
 * Categorias de URLs
 */
export type URLCategory = 'business' | 'social' | 'aggregator' | 'communication' | 'invalid';

/**
 * Normaliza URL adicionando protocolo se necessário
 */
export function normalizeUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return 'https://' + trimmed;
  }
  return trimmed;
}

/**
 * Extrai domínio de uma URL
 */
export function extractDomain(url: string): string | null {
  try {
    const normalized = normalizeUrl(url);
    const urlObj = new URL(normalized);
    return urlObj.hostname.replace('www.', '').toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Valida se URL é um website empresarial válido para scraping
 *
 * @param url - URL a validar
 * @returns true se é válido para scraping, false caso contrário
 */
export function isValidBusinessWebsite(url: string): boolean {
  try {
    const normalized = normalizeUrl(url);
    const urlObj = new URL(normalized);
    const hostname = urlObj.hostname.replace('www.', '').toLowerCase();

    // 0. Bloquear portas não padrão
    if (urlObj.port && !['80', '443', ''].includes(urlObj.port)) {
      return false;
    }

    // 1. Verificar bloqueados EXATOS
    if (BLOCKED_DOMAINS.some(domain => hostname === domain)) {
      return false;
    }

    // 2. Verificar bloqueados PARCIAIS (endsWith para pegar subdomínios)
    // ✅ Bloqueia: "shop.mercadolivre.com.br"
    // ✅ Permite: "myfacebook.company.com" (não termina com .facebook.com)
    if (BLOCKED_DOMAINS.some(domain => hostname.endsWith('.' + domain))) {
      return false;
    }

    // 3. Bloquear .gov (governamental)
    if (hostname.endsWith('.gov') || hostname.endsWith('.gov.br')) {
      return false;
    }

    // 4. Bloquear TLDs suspeitos (spam)
    const suspiciousTLDs = ['.xyz', '.top', '.click', '.loan', '.win', '.bid'];
    if (suspiciousTLDs.some(tld => hostname.endsWith(tld))) {
      return false;
    }

    // 5. Bloquear IPs (não são domínios reais)
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return false;
    }

    // 6. Validar TLD mínimo (.com, .com.br, etc)
    if (!hostname.includes('.')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Categoriza URL para determinar tratamento
 */
export function categorizeUrl(url: string): URLCategory {
  try {
    const normalized = normalizeUrl(url);
    const urlObj = new URL(normalized);
    const hostname = urlObj.hostname.replace('www.', '').toLowerCase();

    // Comunicação (WhatsApp, Telegram)
    if (
      hostname.includes('wa.me') ||
      hostname.includes('whatsapp.com') ||
      hostname.includes('telegram.me') ||
      hostname.includes('t.me') ||
      hostname.includes('viber.com')
    ) {
      return 'communication';
    }

    // Agregadores de links
    const aggregators = [
      'linktr.ee', 'linktree.com', 'bio.link', 'beacons.ai',
      'milkshake.app', 'hoo.be', 'solo.to', 'link.me',
      'tap.bio', 'koji.to', 'later.com', 'shorby.com',
      'taplink.cc', 'campsite.bio', 'allmylinks.com',
      'linkpop.com', 'stan.store', 'creator.link'
    ];

    if (aggregators.some(agg => hostname === agg || hostname.endsWith('.' + agg))) {
      return 'aggregator';
    }

    // Redes sociais
    const socialNetworks = [
      'instagram.com', 'facebook.com', 'linkedin.com',
      'twitter.com', 'x.com', 'youtube.com', 'tiktok.com',
      'snapchat.com', 'threads.net', 'pinterest.com',
      'reddit.com', 'tumblr.com', 'vimeo.com'
    ];

    if (socialNetworks.some(social => hostname === social || hostname.endsWith('.' + social))) {
      return 'social';
    }

    // Se passou por todas as validações, é business
    if (isValidBusinessWebsite(url)) {
      return 'business';
    }

    return 'invalid';
  } catch {
    return 'invalid';
  }
}

/**
 * Extrai número de WhatsApp de URLs wa.me ou api.whatsapp.com
 * COM VALIDAÇÃO de comprimento e formato
 *
 * @param url - URL contendo WhatsApp
 * @returns Número normalizado (sem +55) ou null se inválido
 */
export function extractWhatsAppFromUrl(url: string): string | null {
  if (!url) return null;

  const urlLower = url.toLowerCase();

  // Padrão 1: wa.me/5511999999999
  const waMatch = urlLower.match(/wa\.me\/(\d+)/);
  if (waMatch) {
    let num = waMatch[1];

    // Validar comprimento (10-15 dígitos aceitos)
    if (num.length < 10 || num.length > 15) {
      console.log(`[extractWhatsApp] Número inválido (comprimento ${num.length}): ${num}`);
      return null;
    }

    // Remove prefixo 55 se tiver mais de 11 dígitos
    if (num.startsWith('55') && num.length > 11) {
      num = num.slice(2);
    }

    // Validar padrão brasileiro: [DDD 2 dígitos][9][8 dígitos]
    if (!/^[1-9]{2}9[0-9]{8}$/.test(num)) {
      console.log(`[extractWhatsApp] Número não é padrão brasileiro: ${num}`);
      // Retorna mesmo assim para casos internacionais, mas loga
      return num;
    }

    return num;
  }

  // Padrão 2: api.whatsapp.com/send/?phone=5511999999999
  const apiMatch = urlLower.match(/phone=(\d+)/);
  if (apiMatch) {
    let num = apiMatch[1];

    // Validar comprimento
    if (num.length < 10 || num.length > 15) {
      return null;
    }

    if (num.startsWith('55') && num.length > 11) {
      num = num.slice(2);
    }

    // Validar formato
    if (!/^[1-9]{2}9[0-9]{8}$/.test(num)) {
      return num; // Retorna mesmo assim
    }

    return num;
  }

  return null;
}

/**
 * Valida CNPJ usando algoritmo de checksum
 *
 * @param cnpj - CNPJ a validar (pode ter formatação)
 * @returns CNPJ normalizado (14 dígitos) ou null se inválido
 */
export function validateCNPJ(cnpj: string): string | null {
  if (!cnpj) return null;

  const digits = cnpj.replace(/\D/g, '');

  // Deve ter exatamente 14 dígitos
  if (digits.length !== 14) return null;

  // Verificar se todos os dígitos são iguais (CNPJ inválido)
  if (/^(\d)\1{13}$/.test(digits)) return null;

  // Validar dígitos verificadores
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum1 = 0;
  let sum2 = 0;

  for (let i = 0; i < 12; i++) {
    sum1 += parseInt(digits[i]) * weights1[i];
  }

  for (let i = 0; i < 13; i++) {
    sum2 += parseInt(digits[i]) * weights2[i];
  }

  const check1 = (sum1 % 11) < 2 ? 0 : 11 - (sum1 % 11);
  const check2 = (sum2 % 11) < 2 ? 0 : 11 - (sum2 % 11);

  if (parseInt(digits[12]) !== check1 || parseInt(digits[13]) !== check2) {
    return null;
  }

  return digits;
}
