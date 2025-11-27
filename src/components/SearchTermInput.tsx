import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Search, Clock, TrendingUp, Plus, Check, Trash2 } from 'lucide-react';
import { supabase } from '../utils/supabase/client';

interface SearchTermHistory {
  term: string;
  count: number;
  last_used: string;
}

interface SearchTermInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  workspaceId: string;
  extractionId?: string;
  isDark: boolean;
  placeholder?: string;
}

export interface SearchTermInputRef {
  saveToHistory: () => Promise<void>;
}

export const SearchTermInput = forwardRef<SearchTermInputRef, SearchTermInputProps>(({
  value,
  onChange,
  onKeyDown,
  workspaceId,
  extractionId,
  isDark,
  placeholder = "Ex: clínicas médicas"
}, ref) => {
  const [suggestions, setSuggestions] = useState<SearchTermHistory[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Buscar histórico de termos de todas as extrações do workspace
  useEffect(() => {
    if (!workspaceId) return;

    const fetchHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('lead_extractions')
          .select('search_terms_history')
          .eq('workspace_id', workspaceId);

        if (error) throw error;

        // Agregar todos os históricos
        const allTerms = new Map<string, SearchTermHistory>();
        
        data?.forEach(extraction => {
          const history = extraction.search_terms_history as SearchTermHistory[] | null;
          if (history && Array.isArray(history)) {
            history.forEach(item => {
              const existing = allTerms.get(item.term);
              if (existing) {
                existing.count += item.count;
                if (new Date(item.last_used) > new Date(existing.last_used)) {
                  existing.last_used = item.last_used;
                }
              } else {
                allTerms.set(item.term, { ...item });
              }
            });
          }
        });

        // Converter para array e ordenar por contagem
        const sortedTerms = Array.from(allTerms.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        setSuggestions(sortedTerms);
      } catch (error) {
        console.error('Erro ao buscar histórico de termos:', error);
      }
    };

    fetchHistory();
  }, [workspaceId, refreshKey]);

  // Expor função de salvar para o componente pai
  useImperativeHandle(ref, () => ({
    saveToHistory: async () => {
      if (!value || !workspaceId || !extractionId) return;

      try {
        setSaving(true);
        // Buscar histórico atual da extração
        const { data: extraction, error: fetchError } = await supabase
          .from('lead_extractions')
          .select('search_terms_history')
          .eq('id', extractionId)
          .maybeSingle();

        if (fetchError) throw fetchError;
        
        if (!extraction) return;

        let history = (extraction?.search_terms_history as SearchTermHistory[]) || [];
        
        // Verificar se o termo já existe
        const existingIndex = history.findIndex(item => item.term.toLowerCase() === value.toLowerCase());
        
        if (existingIndex >= 0) {
          // Atualizar contagem e data
          history[existingIndex].count += 1;
          history[existingIndex].last_used = new Date().toISOString();
        } else {
          // Adicionar novo termo
          history.push({
            term: value,
            count: 1,
            last_used: new Date().toISOString()
          });
        }

        // Manter apenas os 20 termos mais recentes
        history = history
          .sort((a, b) => new Date(b.last_used).getTime() - new Date(a.last_used).getTime())
          .slice(0, 20);

        // Salvar de volta
        const { error: updateError } = await supabase
          .from('lead_extractions')
          .update({ search_terms_history: history })
          .eq('id', extractionId);

        if (updateError) throw updateError;
        
        console.debug('Termo salvo no histórico com sucesso!');
        
        // Atualizar lista de sugestões
        setRefreshKey(prev => prev + 1);
      } catch (error) {
        console.debug('Não foi possível salvar termo no histórico:', error);
      } finally {
        setSaving(false);
      }
    }
  }));

  // Filtrar sugestões baseado no input
  const filteredSuggestions = suggestions.filter(item =>
    item.term.toLowerCase().includes(value.toLowerCase())
  );

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Navegação com teclado
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && filteredSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === 'Enter' && highlightedIndex >= 0) {
        e.preventDefault();
        onChange(filteredSuggestions[highlightedIndex].term);
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        return;
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        return;
      }
    }

    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  const handleSelectSuggestion = (term: string) => {
    onChange(term);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleSaveCurrentTerm = async () => {
    if (!value || !workspaceId || !extractionId) return;

    try {
      setSaving(true);
      
      const { data: extraction, error: fetchError } = await supabase
        .from('lead_extractions')
        .select('search_terms_history')
        .eq('id', extractionId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      
      if (!extraction) return;

      let history = (extraction?.search_terms_history as SearchTermHistory[]) || [];
      
      const existingIndex = history.findIndex(item => item.term.toLowerCase() === value.toLowerCase());
      
      if (existingIndex >= 0) {
        history[existingIndex].count += 1;
        history[existingIndex].last_used = new Date().toISOString();
      } else {
        history.push({
          term: value,
          count: 1,
          last_used: new Date().toISOString()
        });
      }

      history = history
        .sort((a, b) => new Date(b.last_used).getTime() - new Date(a.last_used).getTime())
        .slice(0, 20);

      const { error: updateError } = await supabase
        .from('lead_extractions')
        .update({ search_terms_history: history })
        .eq('id', extractionId);

      if (updateError) throw updateError;
      
      // Atualizar lista de sugestões
      setRefreshKey(prev => prev + 1);
      
      // Fechar dropdown após salvar
      setTimeout(() => setShowSuggestions(false), 500);
    } catch (error) {
      console.error('Erro ao salvar termo:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTerm = async (termToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar selecionar o termo ao deletar
    
    if (!workspaceId) return;

    try {
      // Buscar todas as extrações do workspace
      const { data: extractions, error: fetchError } = await supabase
        .from('lead_extractions')
        .select('id, search_terms_history')
        .eq('workspace_id', workspaceId);

      if (fetchError) throw fetchError;

      // Atualizar cada extração removendo o termo
      for (const extraction of extractions || []) {
        let history = (extraction.search_terms_history as SearchTermHistory[]) || [];
        
        // Remover o termo
        history = history.filter(item => item.term.toLowerCase() !== termToDelete.toLowerCase());

        await supabase
          .from('lead_extractions')
          .update({ search_terms_history: history })
          .eq('id', extraction.id);
      }
      
      // Atualizar lista de sugestões
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Erro ao deletar termo:', error);
    }
  };

  // Verificar se o termo atual é novo (não está nas sugestões)
  const isNewTerm = value && !suggestions.some(item => item.term.toLowerCase() === value.toLowerCase());
  const canSave = value && extractionId && isNewTerm;

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder}
          className={`w-full px-4 py-2 pl-10 rounded-lg border transition-all ${
            isDark
              ? 'bg-white/[0.05] border-white/[0.08] text-white focus:border-[#0169D9]'
              : 'bg-white border-border-light text-text-primary-light focus:border-[#0169D9]'
          } focus:outline-none`}
        />
        <Search
          className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
            isDark ? 'text-white/40' : 'text-gray-400'
          }`}
        />
      </div>

      {/* Dropdown de sugestões */}
      {showSuggestions && (
        <div
          ref={dropdownRef}
          className={`absolute z-50 w-full mt-1 rounded-lg border shadow-lg overflow-hidden ${
            isDark
              ? 'bg-[#1a1a1a] border-white/[0.08]'
              : 'bg-white border-border-light'
          }`}
        >
          {/* Botão de salvar termo novo */}
          {canSave && (
            <button
              onClick={handleSaveCurrentTerm}
              disabled={saving}
              className={`w-full px-3 py-2.5 flex items-center gap-3 border-b transition-colors ${
                isDark
                  ? 'bg-[#0169D9]/10 hover:bg-[#0169D9]/20 border-white/[0.08] text-[#0169D9]'
                  : 'bg-blue-50 hover:bg-blue-100 border-border-light text-[#0169D9]'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {saving ? (
                <>
                  <Check className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium">Salvando...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 flex-shrink-0" />
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">Salvar "{value}"</div>
                    <div className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                      Adicionar ao histórico de termos
                    </div>
                  </div>
                </>
              )}
            </button>
          )}

          {filteredSuggestions.length > 0 ? (
            <>
              <div className={`px-3 py-2 text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                Termos usados anteriormente
              </div>
              <div className="max-h-64 overflow-y-auto">
                {filteredSuggestions.map((item, index) => (
                  <div
                    key={item.term}
                    className={`w-full px-3 py-2 flex items-center gap-3 transition-colors ${
                      highlightedIndex === index
                        ? isDark
                          ? 'bg-white/[0.08]'
                          : 'bg-gray-100'
                        : isDark
                        ? 'hover:bg-white/[0.05]'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <button
                      onClick={() => handleSelectSuggestion(item.term)}
                      className="flex-1 flex items-center gap-3 text-left min-w-0"
                    >
                      <Clock className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-white/30' : 'text-gray-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {item.term}
                        </div>
                      </div>
                      {item.count > 1 && (
                        <div className="flex items-center gap-1">
                          <TrendingUp className={`w-3 h-3 ${isDark ? 'text-white/30' : 'text-gray-400'}`} />
                          <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                            {item.count}x
                          </span>
                        </div>
                      )}
                    </button>
                    <button
                      onClick={(e) => handleDeleteTerm(item.term, e)}
                      className={`p-1 rounded-full transition-colors flex-shrink-0 ${
                        isDark ? 'hover:bg-red-500/20' : 'hover:bg-red-500/10'
                      }`}
                      title="Deletar termo"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : !canSave && (
            <div className={`px-4 py-8 text-center ${
              isDark ? 'text-white/40' : 'text-gray-400'
            }`}>
              <Search className={`w-8 h-8 mx-auto mb-2 ${isDark ? 'text-white/20' : 'text-gray-300'}`} />
              <div className="text-sm">
                Nenhum termo salvo ainda
              </div>
              <div className="text-xs mt-1">
                {extractionId ? 'Salve a extração primeiro para começar' : 'Digite um termo para começar'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

SearchTermInput.displayName = 'SearchTermInput';