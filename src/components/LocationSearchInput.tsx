import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { normalizeLocation } from '../utils/location';

interface LocationSearchInputProps {
  value: string;
  onChange: (value: string, isValidSelection: boolean) => void;
  isDark: boolean;
  onValidationChange?: (isValid: boolean) => void;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  addresstype: string;
  name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
}

export function LocationSearchInput({ value, onChange, isDark, onValidationChange }: LocationSearchInputProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  // Heurística: se o valor inicial tem vírgula, assumimos que é uma seleção válida restaurada
  const isInitialValueValid = !!(value && value.includes(','));
  
  const [isValidSelection, setIsValidSelection] = useState(isInitialValueValid);
  const [selectedValue, setSelectedValue] = useState<string | null>(value || null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Atualizar query quando value muda externamente (apenas se não estiver editando)
  useEffect(() => {
    if (value !== query && !showResults) {
      setQuery(value);
      // Se o value externo tem vírgula, considerar válido (edição de extração existente)
      if (value && value.includes(',')) {
        setIsValidSelection(true);
        setSelectedValue(value);
      } else if (!value) {
        setIsValidSelection(false);
        setSelectedValue(null);
      }
    }
  }, [value, query, showResults]);

  // Notificar parent sobre mudanças na validação
  useEffect(() => {
    onValidationChange?.(isValidSelection);
  }, [isValidSelection, onValidationChange]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowResults(false);
        // Se fechou sem selecionar, restaurar valor anterior válido
        if (!isValidSelection && selectedValue) {
          setQuery(selectedValue);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef, isValidSelection, selectedValue]);

  // Buscar na API com debounce
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (!query || query.length < 3 || !showResults) return;

      setLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=br&limit=5&addressdetails=1`
        );
        const data = await response.json();

        // Filtrar duplicatas baseadas no display_name (que é o endereço completo)
        // A API do Nominatim pode retornar o mesmo lugar como "node", "way" ou "relation"
        const uniqueResults = data.filter((item: NominatimResult, index: number, self: NominatimResult[]) =>
          index === self.findIndex((t) => (
            t.display_name === item.display_name
          ))
        );

        setResults(uniqueResults);
      } catch (error) {
        console.error('Erro ao buscar localização:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [query, showResults]);

  const handleSelect = (result: NominatimResult) => {
    // Formatar localização de forma mais limpa se possível
    // Preferir: Cidade, Estado, País
    let formattedLocation = result.display_name;

    // Tentar extrair campos específicos para ficar mais limpo
    if (result.address) {
      const city = result.address.city || result.address.town || result.address.village || result.name;
      const state = result.address.state;
      const country = result.address.country || "Brasil";

      if (city && state) {
        formattedLocation = `${city}, ${state}, ${country}`;
      }
    }

    // Normalizar: remover acentos, caracteres especiais
    const normalized = normalizeLocation(formattedLocation);

    setQuery(normalized);
    setSelectedValue(normalized);
    setIsValidSelection(true);
    onChange(normalized, true);
    setShowResults(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    setShowResults(true);

    // Ao digitar, invalidar a seleção atual
    // O usuário DEVE selecionar da lista
    if (newValue !== selectedValue) {
      setIsValidSelection(false);
      onChange(newValue, false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setSelectedValue(null);
    setIsValidSelection(false);
    onChange('', false);
    setShowResults(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setShowResults(true)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
              e.preventDefault();
              e.currentTarget.select();
            }
          }}
          placeholder="Digite e selecione da lista..."
          className={`w-full px-4 py-2 pr-20 rounded-lg border transition-all ${
            isDark
              ? 'bg-white/[0.05] border-white/[0.08] text-white focus:border-[#0169D9]'
              : 'bg-white border-border-light text-text-primary-light focus:border-[#0169D9]'
          } ${!isValidSelection && query ? (isDark ? 'border-yellow-500/50' : 'border-yellow-500') : ''} focus:outline-none`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          ) : isValidSelection ? (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          ) : query ? (
            <AlertCircle className="w-4 h-4 text-yellow-500" />
          ) : (
            <Search className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Mensagem de ajuda quando não selecionou */}
      {!isValidSelection && query && !showResults && (
        <p className={`text-xs mt-1 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
          Selecione uma localização da lista de sugestões
        </p>
      )}

      {showResults && results.length > 0 && (
        <div className={`absolute z-50 w-full mt-1 rounded-lg shadow-lg border overflow-hidden ${
          isDark
            ? 'bg-[#1E1E1E] border-white/[0.08]'
            : 'bg-white border-gray-200'
        }`}>
          {results.map((result) => (
            <button
              key={result.place_id}
              onClick={() => handleSelect(result)}
              className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                isDark
                  ? 'hover:bg-white/[0.05] border-b border-white/[0.05]'
                  : 'hover:bg-gray-50 border-b border-gray-100'
              } last:border-0`}
            >
              <MapPin className={`w-4 h-4 mt-0.5 shrink-0 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {result.name}
                </p>
                <p className={`text-xs truncate max-w-[300px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {result.display_name}
                </p>
              </div>
            </button>
          ))}
          <div className={`px-2 py-1 text-[10px] text-right ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Via OpenStreetMap
          </div>
        </div>
      )}

      {/* Mostrar "Nenhum resultado" quando pesquisou mas não encontrou */}
      {showResults && !loading && query.length >= 3 && results.length === 0 && (
        <div className={`absolute z-50 w-full mt-1 rounded-lg shadow-lg border p-4 text-center ${
          isDark
            ? 'bg-[#1E1E1E] border-white/[0.08] text-gray-400'
            : 'bg-white border-gray-200 text-gray-500'
        }`}>
          <p className="text-sm">Nenhuma localização encontrada</p>
          <p className="text-xs mt-1">Tente digitar o nome da cidade</p>
        </div>
      )}
    </div>
  );
}
