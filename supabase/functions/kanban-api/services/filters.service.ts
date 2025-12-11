// =============================================================================
// FILTERS SERVICE
// =============================================================================
// Lógica de aplicação de filtros nas queries
// =============================================================================

import type { PostgrestFilterBuilder } from 'npm:@supabase/supabase-js@2';
import type { LeadFilters } from '../types.ts';

/**
 * Aplica filtros a uma query Supabase
 */
export function applyFilters<T>(
  query: PostgrestFilterBuilder<any, T, any>,
  filters?: LeadFilters
): PostgrestFilterBuilder<any, T, any> {
  if (!filters) return query;
  
  let filteredQuery = query;
  
  // Filtro: Tem E-mail
  // Nota: E-mails podem estar em:
  // 1. emails_count > 0 (campo direto na tabela leads)
  // 2. custom_fields (campo "WHOIS Email" ou "Email Principal")
  // Por enquanto, usar apenas emails_count. Para custom_fields, precisaria de JOIN.
  if (filters.hasEmail) {
    filteredQuery = filteredQuery.gt('emails_count', 0);
  }
  
  // Filtro: Tem Whatsapp (telefone)
  // Nota: Verificar whatsapp_valid ou whatsapp_jid
  if (filters.hasWhatsapp) {
    filteredQuery = filteredQuery.eq('whatsapp_valid', true);
  }
  
  // Filtro: Busca por texto
  if (filters.searchQuery?.trim()) {
    const search = filters.searchQuery.trim();
    filteredQuery = filteredQuery.or(
      `client_name.ilike.%${search}%,company.ilike.%${search}%`
    );
  }
  
  // Filtro: Prioridade
  if (filters.priority) {
    filteredQuery = filteredQuery.eq('priority', filters.priority);
  }
  
  // Filtro: Tags
  if (filters.tags && filters.tags.length > 0) {
    // Supabase PostgREST: tags contém qualquer uma das tags fornecidas
    filteredQuery = filteredQuery.contains('tags', filters.tags);
  }
  
  // Filtro: Assignee
  if (filters.assigneeId) {
    filteredQuery = filteredQuery.eq('assigned_to', filters.assigneeId);
  }
  
  return filteredQuery;
}

/**
 * Valida filtros antes de aplicar
 */
export function validateFilters(filters?: LeadFilters): void {
  if (!filters) return;
  
  if (filters.searchQuery && filters.searchQuery.length > 100) {
    throw new Error('Search query too long (max 100 characters)');
  }
  
  if (filters.tags && filters.tags.length > 10) {
    throw new Error('Too many tags (max 10)');
  }
}

