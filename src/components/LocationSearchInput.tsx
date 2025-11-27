import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { normalizeLocation } from '../utils/location';

interface LocationSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  isDark: boolean;
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

export function LocationSearchInput({ value, onChange, isDark }: LocationSearchInputProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Atualizar query quando value muda externamente (apenas se não estiver editando)
  useEffect(() => {
    if (value !== query && !showResults) {
      setQuery(value);
    }
  }, [value]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

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
    onChange(normalized);
    setShowResults(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    onChange(e.target.value); // Atualiza o pai também
    setShowResults(true);
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
          placeholder="Ex: joao pessoa"
          className={`w-full px-4 py-2 pr-10 rounded-lg border transition-all ${
            isDark 
              ? 'bg-white/[0.05] border-white/[0.08] text-white focus:border-[#0169D9]' 
              : 'bg-white border-border-light text-text-primary-light focus:border-[#0169D9]'
          } focus:outline-none`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>
      </div>

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
    </div>
  );
}
