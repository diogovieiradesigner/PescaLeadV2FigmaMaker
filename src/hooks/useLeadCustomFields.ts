import { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabase/client';

/**
 * Hook para buscar custom fields de um lead sob demanda
 * 
 * ✅ SOLUÇÃO PARA N+1 QUERY PROBLEM:
 * - Antes: fetchConversations buscava custom fields de 100 leads de uma vez (~3.5s)
 * - Depois: Busca apenas quando necessário (~20ms por lead)
 * 
 * @param leadId - ID do lead (null = não busca)
 * @param options.cache - Se true, mantém dados em cache (padrão: true)
 * @returns { customFields, loading, error, refresh }
 */

export interface CustomField {
  id: string;
  fieldName: string;
  fieldType: 'text' | 'number' | 'date' | 'email' | 'phone' | 'url' | 'textarea';
  fieldValue: string;
}

interface UseLeadCustomFieldsOptions {
  cache?: boolean; // Se true, mantém dados ao mudar leadId para null
  enabled?: boolean; // Se false, não busca automaticamente
}

export function useLeadCustomFields(
  leadId: string | null,
  options: UseLeadCustomFieldsOptions = {}
) {
  const { cache = true, enabled = true } = options;
  
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Cache para evitar re-fetch desnecessário
  const cacheRef = useRef<Map<string, CustomField[]>>(new Map());
  const lastFetchedLeadIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Não buscar se:
    // - leadId for null
    // - enabled = false
    if (!leadId || !enabled) {
      if (!cache) {
        setCustomFields([]);
        // 🔥 Limpar ref quando cache está desabilitado
        lastFetchedLeadIdRef.current = null;
      }
      return;
    }

    // ✅ CACHE: Se já buscou este lead antes, reutilizar
    if (cache && cacheRef.current.has(leadId)) {
      console.log(`[useLeadCustomFields] ✅ Cache hit para lead ${leadId}`);
      setCustomFields(cacheRef.current.get(leadId)!);
      lastFetchedLeadIdRef.current = leadId;
      return;
    }

    // ✅ Evitar re-fetch do mesmo leadId consecutivamente (APENAS SE CACHE ATIVO)
    // 🔥 BUGFIX: Se cache está desabilitado, sempre re-fetch mesmo que seja o mesmo leadId
    if (cache && lastFetchedLeadIdRef.current === leadId) {
      console.log(`[useLeadCustomFields] ⏭️ Pulando fetch (mesmo leadId com cache ativo)`);
      return;
    }

    const fetchCustomFields = async () => {
      console.log(`[useLeadCustomFields] 🔍 Buscando custom fields para lead ${leadId}${cache ? ' (com cache)' : ' (SEM cache)'}`);
      setLoading(true);
      setError(null);
      lastFetchedLeadIdRef.current = leadId;

      try {
        const { data: fieldValues, error: fetchError } = await supabase
          .from('lead_custom_values')
          .select(`
            value,
            custom_fields (
              id,
              name,
              field_type
            )
          `)
          .eq('lead_id', leadId);

        if (fetchError) throw fetchError;

        // Converter para formato frontend
        const fields: CustomField[] = (fieldValues || []).map((fv: any) => ({
          id: fv.custom_fields.id,
          fieldName: fv.custom_fields.name,
          fieldType: fv.custom_fields.field_type,
          fieldValue: fv.value || '',
        }));

        setCustomFields(fields);
        
        // ✅ CACHE: Armazenar resultado
        if (cache) {
          cacheRef.current.set(leadId, fields);
        }

        console.log(`[useLeadCustomFields] ✅ ${fields.length} custom fields carregados`);
      } catch (err: any) {
        console.error('[useLeadCustomFields] ❌ Erro ao buscar custom fields:', err);
        setError(err.message || 'Erro ao carregar campos personalizados');
        setCustomFields([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomFields();
  }, [leadId, enabled, cache]);

  // Função para forçar refresh (útil para kanban que sempre recarrega)
  const refresh = () => {
    if (!leadId) return;
    
    // Limpar cache deste lead
    cacheRef.current.delete(leadId);
    lastFetchedLeadIdRef.current = null;
    
    // Forçar re-fetch
    setLoading(true);
    supabase
      .from('lead_custom_values')
      .select(`
        value,
        custom_fields (
          id,
          name,
          field_type
        )
      `)
      .eq('lead_id', leadId)
      .then(({ data: fieldValues, error: fetchError }) => {
        if (fetchError) throw fetchError;

        const fields: CustomField[] = (fieldValues || []).map((fv: any) => ({
          id: fv.custom_fields.id,
          fieldName: fv.custom_fields.name,
          fieldType: fv.custom_fields.field_type,
          fieldValue: fv.value || '',
        }));

        setCustomFields(fields);
        
        if (cache) {
          cacheRef.current.set(leadId, fields);
        }
      })
      .catch((err) => {
        console.error('[useLeadCustomFields] Erro no refresh:', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  };

  return {
    customFields,
    loading,
    error,
    refresh,
  };
}