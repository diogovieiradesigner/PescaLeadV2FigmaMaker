// =============================================================================
// HOOK: useCNPJFilters
// Carrega opções de filtro da CNPJ API
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase/client';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../utils/api-config';
import type { FilterDefinition, FiltersResponse, StatsPreview, CNPJFilters } from '../types/cnpj-extraction';

interface CNAEOption {
  value: string;
  label: string;
  count?: number;
}

interface UseCNPJFiltersResult {
  filters: Record<string, FilterDefinition> | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getStats: (filters: CNPJFilters) => Promise<StatsPreview | null>;
  statsLoading: boolean;
  // CNAEs
  cnaes: CNAEOption[];
  cnaesLoading: boolean;
  searchCNAEs: (query: string) => Promise<void>;
}

export function useCNPJFilters(): UseCNPJFiltersResult {
  const [filters, setFilters] = useState<Record<string, FilterDefinition> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [cnaes, setCnaes] = useState<CNAEOption[]>([]);
  const [cnaesLoading, setCnaesLoading] = useState(false);

  const fetchFilters = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Chamar endpoint /filters da cnpj-api
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/cnpj-api/filters`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch filters: ${response.status}`);
      }

      const data: FiltersResponse = await response.json();

      if (data.success) {
        setFilters(data.filters);
      } else {
        throw new Error('API returned unsuccessful response');
      }
    } catch (err) {
      console.error('[useCNPJFilters] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const getStats = useCallback(async (filtersToCheck: CNPJFilters): Promise<StatsPreview | null> => {
    try {
      setStatsLoading(true);

      const { data: { session } } = await supabase.auth.getSession();

      console.log('[useCNPJFilters] getStats - Sending filters:', JSON.stringify(filtersToCheck, null, 2));

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/cnpj-api/stats`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({ filters: filtersToCheck }),
        }
      );

      if (!response.ok) {
        console.error('[useCNPJFilters] Stats error:', response.status);
        return null;
      }

      const data = await response.json();

      if (data.success) {
        return data.preview;
      }

      return null;
    } catch (err) {
      console.error('[useCNPJFilters] Stats error:', err);
      return null;
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Buscar CNAEs do banco
  const searchCNAEs = useCallback(async (query: string = '') => {
    console.log('[useCNPJFilters] searchCNAEs called with query:', query);

    try {
      setCnaesLoading(true);

      const params = new URLSearchParams();
      if (query) params.set('q', query);
      params.set('limit', '100');

      const url = `${SUPABASE_URL}/functions/v1/cnpj-api/cnaes?${params.toString()}`;
      console.log('[useCNPJFilters] Fetching CNAEs from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
      });

      console.log('[useCNPJFilters] Response status:', response.status);

      if (!response.ok) {
        console.error('[useCNPJFilters] CNAEs error - status:', response.status);
        const errorText = await response.text();
        console.error('[useCNPJFilters] CNAEs error - body:', errorText);
        return;
      }

      const data = await response.json();
      console.log('[useCNPJFilters] CNAEs response:', {
        success: data.success,
        total: data.total,
        cnaesCount: data.cnaes?.length || 0,
        firstThree: data.cnaes?.slice(0, 3)
      });

      if (data.success && data.cnaes) {
        setCnaes(data.cnaes);
        console.log('[useCNPJFilters] CNAEs state updated with', data.cnaes.length, 'items');
      } else {
        console.warn('[useCNPJFilters] API returned success=false or no cnaes:', data);
      }
    } catch (err) {
      console.error('[useCNPJFilters] CNAEs fetch error:', err);
    } finally {
      setCnaesLoading(false);
      console.log('[useCNPJFilters] cnaesLoading set to false');
    }
  }, []);

  // Carregar CNAEs populares no início
  useEffect(() => {
    console.log('[useCNPJFilters] Initial useEffect - loading CNAEs on mount');
    searchCNAEs('');
  }, [searchCNAEs]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  return {
    filters,
    loading,
    error,
    refetch: fetchFilters,
    getStats,
    statsLoading,
    cnaes,
    cnaesLoading,
    searchCNAEs,
  };
}

// =============================================================================
// HOOK: useCNPJExtraction
// Gerencia o estado da extração CNPJ
// =============================================================================

interface CNPJExtractionState {
  extractionName: string;
  filters: CNPJFilters;
  targetQuantity: number;
  funnelId: string;
  columnId: string;
}

interface UseCNPJExtractionResult {
  state: CNPJExtractionState;
  setExtractionName: (name: string) => void;
  setFilters: (filters: CNPJFilters) => void;
  updateFilter: <K extends keyof CNPJFilters>(key: K, value: CNPJFilters[K]) => void;
  setTargetQuantity: (qty: number) => void;
  setFunnelId: (id: string) => void;
  setColumnId: (id: string) => void;
  resetFilters: () => void;
  isValid: boolean;
  validationErrors: string[];
}

const DEFAULT_FILTERS: CNPJFilters = {
  // Sem filtros padrão - todos os campos começam vazios (= "Todos")
};

const CNPJ_EXTRACTION_STORAGE_KEY = 'cnpj_extraction_state';

// Helper para carregar estado do localStorage
function loadStateFromStorage(): CNPJExtractionState | null {
  try {
    const saved = localStorage.getItem(CNPJ_EXTRACTION_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Validar estrutura básica
      if (parsed && typeof parsed === 'object' && parsed.filters) {
        return {
          extractionName: parsed.extractionName || '',
          filters: parsed.filters || DEFAULT_FILTERS,
          targetQuantity: parsed.targetQuantity || 100,
          funnelId: parsed.funnelId || '',
          columnId: parsed.columnId || '',
        };
      }
    }
  } catch (e) {
    console.error('[useCNPJExtraction] Erro ao carregar estado do localStorage:', e);
  }
  return null;
}

// Helper para salvar estado no localStorage
function saveStateToStorage(state: CNPJExtractionState) {
  try {
    localStorage.setItem(CNPJ_EXTRACTION_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('[useCNPJExtraction] Erro ao salvar estado no localStorage:', e);
  }
}

export function useCNPJExtraction(): UseCNPJExtractionResult {
  // Inicializar estado com dados do localStorage se disponível
  const [state, setState] = useState<CNPJExtractionState>(() => {
    const savedState = loadStateFromStorage();
    return savedState || {
      extractionName: '',
      filters: DEFAULT_FILTERS,
      targetQuantity: 100,
      funnelId: '',
      columnId: '',
    };
  });

  // Salvar estado no localStorage sempre que mudar
  useEffect(() => {
    saveStateToStorage(state);
  }, [state]);

  const setExtractionName = useCallback((name: string) => {
    setState(prev => ({ ...prev, extractionName: name }));
  }, []);

  const setFilters = useCallback((filters: CNPJFilters) => {
    setState(prev => ({ ...prev, filters }));
  }, []);

  const updateFilter = useCallback(<K extends keyof CNPJFilters>(key: K, value: CNPJFilters[K]) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, [key]: value },
    }));
  }, []);

  const setTargetQuantity = useCallback((qty: number) => {
    setState(prev => ({ ...prev, targetQuantity: Math.min(Math.max(qty, 1), 10000) }));
  }, []);

  const setFunnelId = useCallback((id: string) => {
    setState(prev => ({ ...prev, funnelId: id, columnId: '' }));
  }, []);

  const setColumnId = useCallback((id: string) => {
    setState(prev => ({ ...prev, columnId: id }));
  }, []);

  const resetFilters = useCallback(() => {
    setState(prev => ({ ...prev, filters: DEFAULT_FILTERS }));
  }, []);

  // Validação
  const validationErrors: string[] = [];

  // Verificar se pelo menos um filtro está preenchido (qualquer filtro serve)
  const hasLocationFilter = state.filters.localizacao?.trim() || state.filters.uf?.length || state.filters.municipio?.length || state.filters.ddd?.length;
  const hasNicheFilter = state.filters.cnae?.length || state.filters.cnae_divisao?.length;
  const hasOtherFilter = state.filters.porte?.length || state.filters.situacao?.length || state.filters.tipo?.length ||
                         state.filters.simples !== undefined || state.filters.mei !== undefined ||
                         state.filters.com_email || state.filters.com_telefone;

  if (!hasLocationFilter && !hasNicheFilter && !hasOtherFilter) {
    validationErrors.push('Informe pelo menos um filtro (localização, CNAE ou outros)');
  }

  if (!state.funnelId) {
    validationErrors.push('Selecione o funil de destino');
  }

  if (!state.columnId) {
    validationErrors.push('Selecione a coluna de destino');
  }

  if (state.targetQuantity < 10 || state.targetQuantity > 10000) {
    validationErrors.push('Quantidade deve ser entre 10 e 10.000');
  }

  const isValid = validationErrors.length === 0;

  return {
    state,
    setExtractionName,
    setFilters,
    updateFilter,
    setTargetQuantity,
    setFunnelId,
    setColumnId,
    resetFilters,
    isValid,
    validationErrors,
  };
}
