// =============================================================================
// SHARED MODULE: Contact Deduplication
// =============================================================================
// Lógica de deduplicação de contatos com rastreamento de origem
// Preserva TODAS as sources ao deduplicate (instagram + website)
// =============================================================================

export interface ContactWithSource {
  value: string;
  source: 'instagram' | 'website';
}

export interface UniqueContact {
  value: string;
  sources: string[];
  source: string; // String concatenada: 'instagram' ou 'website' ou 'instagram+website'
  duplicate_found: boolean;
}

/**
 * Normaliza email (Gmail aliases, lowercase)
 * Gmail: user+tag@gmail.com → user@gmail.com
 * Gmail: u.s.e.r@gmail.com → user@gmail.com
 */
export function normalizeEmail(email: string): string {
  let normalized = email.toLowerCase().trim();

  // Gmail: remover +alias e pontos antes do @
  if (normalized.endsWith('@gmail.com') || normalized.endsWith('@googlemail.com')) {
    const [local] = normalized.split('@');
    const cleanLocal = local.split('+')[0].replace(/\./g, '');
    normalized = `${cleanLocal}@gmail.com`; // Sempre gmail.com
  }

  return normalized;
}

/**
 * Normaliza telefone (remove formatação, trata +55)
 */
export function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, '');

  // Remove prefixo 55 se tiver mais de 11 dígitos
  if (digits.startsWith('55') && digits.length > 11) {
    digits = digits.slice(2);
  }

  return digits;
}

/**
 * Deduplica emails preservando TODAS as sources
 * Exemplo:
 *   Input: [{ value: 'user@gmail.com', source: 'instagram' }, { value: 'USER@gmail.com', source: 'website' }]
 *   Output: [{ value: 'user@gmail.com', sources: ['instagram', 'website'], source: 'instagram+website', duplicate_found: true }]
 */
export function deduplicateEmails(emails: ContactWithSource[]): UniqueContact[] {
  const emailsMap = new Map<string, { value: string; sources: string[] }>();

  for (const item of emails) {
    const normalized = normalizeEmail(item.value);

    if (emailsMap.has(normalized)) {
      // Adiciona source à lista existente
      emailsMap.get(normalized)!.sources.push(item.source);
    } else {
      // Cria nova entrada
      emailsMap.set(normalized, {
        value: item.value, // Mantém formato original do primeiro
        sources: [item.source]
      });
    }
  }

  return Array.from(emailsMap.values()).map(e => ({
    ...e,
    duplicate_found: e.sources.length > 1,
    source: e.sources.join('+') // 'instagram' ou 'website' ou 'instagram+website'
  }));
}

/**
 * Deduplica telefones preservando TODAS as sources
 */
export function deduplicatePhones(phones: ContactWithSource[]): UniqueContact[] {
  const phonesMap = new Map<string, { value: string; sources: string[] }>();

  for (const item of phones) {
    const normalized = normalizePhone(item.value);

    if (phonesMap.has(normalized)) {
      phonesMap.get(normalized)!.sources.push(item.source);
    } else {
      phonesMap.set(normalized, {
        value: item.value,
        sources: [item.source]
      });
    }
  }

  return Array.from(phonesMap.values()).map(p => ({
    ...p,
    duplicate_found: p.sources.length > 1,
    source: p.sources.join('+')
  }));
}

/**
 * Deduplica WhatsApp preservando TODAS as sources
 */
export function deduplicateWhatsApp(whatsapp: ContactWithSource[]): UniqueContact[] {
  const whatsappMap = new Map<string, { value: string; sources: string[] }>();

  for (const item of whatsapp) {
    const normalized = normalizePhone(item.value);

    if (whatsappMap.has(normalized)) {
      whatsappMap.get(normalized)!.sources.push(item.source);
    } else {
      whatsappMap.set(normalized, {
        value: item.value,
        sources: [item.source]
      });
    }
  }

  return Array.from(whatsappMap.values()).map(w => ({
    ...w,
    duplicate_found: w.sources.length > 1,
    source: w.sources.join('+')
  }));
}
