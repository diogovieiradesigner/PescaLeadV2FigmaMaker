// =============================================================================
// COMPONENT: CNPJFiltersForm
// Formulário de filtros para extração CNPJ
// =============================================================================

import { useState, useEffect, useRef } from 'react';
import { Theme } from '../hooks/useTheme';
import { ChevronDown, X, Search, Info } from 'lucide-react';
import type { CNPJFilters, FilterOption } from '../types/cnpj-extraction';
import { PORTE_OPTIONS, SITUACAO_OPTIONS, TIPO_OPTIONS } from '../types/cnpj-extraction';
import { LocationSearchInput } from './LocationSearchInput';
import { normalizeLocation } from '../utils/location';

interface CNPJFiltersFormProps {
  theme: Theme;
  filters: CNPJFilters;
  onFilterChange: <K extends keyof CNPJFilters>(key: K, value: CNPJFilters[K]) => void;
  cnaeOptions?: FilterOption[];
  loading?: boolean;
  onCNAESearch?: (query: string) => void;
}

// Componente MultiSelect reutilizável
interface MultiSelectProps {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  isDark: boolean;
  searchable?: boolean;
  disabled?: boolean;
  onSearchChange?: (query: string) => void;
  showCount?: boolean;
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
  placeholder,
  isDark,
  searchable = false,
  disabled = false,
  onSearchChange,
  showCount = false
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown ao clicar fora (sem bloquear scroll da página)
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Se tem onSearchChange, filtra no servidor; senão filtra local
  const filteredOptions = searchable && search && !onSearchChange
    ? options.filter(opt =>
        opt.label.toLowerCase().includes(search.toLowerCase()) ||
        opt.value.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  const handleSearchInput = (value: string) => {
    setSearch(value);
    if (onSearchChange) {
      onSearchChange(value);
    }
  };

  const selectedLabels = selected
    .map(val => options.find(opt => opt.value === val)?.label || val)
    .slice(0, 3);

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className="relative" ref={containerRef}>
      <label className={`block mb-2 text-sm ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
        {label}
      </label>

      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-4 py-2 text-left border-b transition-all flex items-center justify-between ${
          isDark
            ? 'bg-black border-white/[0.2] text-white hover:bg-white/[0.05]'
            : 'bg-white border border-border-light text-text-primary-light hover:bg-gray-50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={selected.length === 0 ? (isDark ? 'text-white/40' : 'text-gray-400') : ''}>
          {selected.length === 0
            ? placeholder || 'Selecione...'
            : selected.length <= 3
              ? selectedLabels.join(', ')
              : `${selectedLabels.join(', ')} +${selected.length - 3}`
          }
        </span>
        <div className="flex items-center gap-2">
          {selected.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); clearAll(); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); clearAll(); } }}
              className={`p-1 rounded hover:bg-white/10 cursor-pointer ${isDark ? 'text-white/50' : 'text-gray-500'}`}
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''} ${isDark ? 'text-white/50' : 'text-gray-500'}`} />
        </div>
      </button>

      {isOpen && (
        <div className={`absolute z-50 w-full mt-1 rounded-lg shadow-lg border max-h-60 overflow-hidden ${
          isDark
            ? 'bg-[#1a1a1a] border-white/[0.1]'
            : 'bg-white border-border-light'
        }`}>
          {searchable && (
            <div className={`p-2 border-b ${isDark ? 'border-white/[0.1]' : 'border-border-light'}`}>
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-white/40' : 'text-gray-400'}`} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  placeholder="Buscar..."
                  className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm ${
                    isDark
                      ? 'bg-white/[0.05] text-white placeholder-white/40'
                      : 'bg-gray-50 text-text-primary-light placeholder-gray-400'
                  } focus:outline-none`}
                />
              </div>
            </div>
          )}

          <div className="overflow-y-auto max-h-48">
            {filteredOptions.length === 0 ? (
              <div className={`px-4 py-3 text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                Nenhum resultado encontrado
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleOption(option.value)}
                  className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 transition-colors ${
                    selected.includes(option.value)
                      ? isDark
                        ? 'bg-[#0169D9]/20 text-[#0169D9]'
                        : 'bg-blue-50 text-[#0169D9]'
                      : isDark
                        ? 'text-white hover:bg-white/[0.05]'
                        : 'text-text-primary-light hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                    selected.includes(option.value)
                      ? 'bg-[#0169D9] border-[#0169D9]'
                      : isDark ? 'border-white/30' : 'border-gray-300'
                  }`}>
                    {selected.includes(option.value) && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="flex-1">{option.label}</span>
                  {option.count !== undefined && (
                    <span className={isDark ? 'text-white/40' : 'text-gray-400'}>
                      ({option.count.toLocaleString()})
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export function CNPJFiltersForm({
  theme,
  filters,
  onFilterChange,
  cnaeOptions = [],
  loading = false,
  onCNAESearch
}: CNPJFiltersFormProps) {
  const isDark = theme === 'dark';
  const [cnaeSearchTimeout, setCnaeSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Log para debug - verificar CNAEs recebidos da API
  console.log('[CNPJFiltersForm] cnaeOptions received:', cnaeOptions.length, 'items');
  console.log('[CNPJFiltersForm] loading:', loading);
  if (cnaeOptions.length > 0) {
    console.log('[CNPJFiltersForm] First 3 CNAEs:', cnaeOptions.slice(0, 3));
  }

  // Debounced search para CNAEs
  const handleCNAESearch = (query: string) => {
    console.log('[CNPJFiltersForm] handleCNAESearch called with:', query);

    if (cnaeSearchTimeout) {
      clearTimeout(cnaeSearchTimeout);
    }

    if (onCNAESearch) {
      const timeout = setTimeout(() => {
        console.log('[CNPJFiltersForm] Triggering onCNAESearch with:', query);
        onCNAESearch(query);
      }, 300);
      setCnaeSearchTimeout(timeout);
    } else {
      console.warn('[CNPJFiltersForm] onCNAESearch is not defined!');
    }
  };

  return (
    <div className="space-y-6">
      {/* Seção: Localização */}
      <div>
        <h4 className={`text-sm font-medium mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
          <span>Localização</span>
          <Info className={`w-4 h-4 ${isDark ? 'text-white/40' : 'text-gray-400'}`} />
        </h4>

        <div>
          <label className={`block mb-2 text-sm ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
            Cidade, Estado *
          </label>
          <LocationSearchInput
            value={filters.localizacao || ''}
            onChange={(val) => onFilterChange('localizacao', normalizeLocation(val) || undefined)}
            isDark={isDark}
          />
          <p className={`mt-1 text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
            Digite para buscar cidades ou estados
          </p>
        </div>
      </div>

      {/* Seção: Atividade Econômica */}
      <div>
        <h4 className={`text-sm font-medium mb-4 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
          Atividade Econômica (Nicho)
        </h4>

        <MultiSelect
          label="CNAE (Atividade)"
          options={cnaeOptions}
          selected={filters.cnae || []}
          onChange={(values) => onFilterChange('cnae', values)}
          placeholder={loading ? "Carregando CNAEs..." : "Busque atividades econômicas..."}
          isDark={isDark}
          searchable
          disabled={loading}
          onSearchChange={handleCNAESearch}
          showCount
        />
      </div>

      {/* Seção: Porte e Situação */}
      <div>
        <h4 className={`text-sm font-medium mb-4 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
          Características da Empresa
        </h4>

        <div className="grid grid-cols-3 gap-4">
          <MultiSelect
            label="Porte"
            options={PORTE_OPTIONS}
            selected={filters.porte || []}
            onChange={(values) => onFilterChange('porte', values)}
            placeholder="Todos os portes"
            isDark={isDark}
            disabled={loading}
          />

          <MultiSelect
            label="Situação"
            options={SITUACAO_OPTIONS}
            selected={filters.situacao || ['02']}
            onChange={(values) => onFilterChange('situacao', values)}
            placeholder="Todas situações"
            isDark={isDark}
            disabled={loading}
          />

          <MultiSelect
            label="Tipo"
            options={TIPO_OPTIONS}
            selected={filters.tipo || []}
            onChange={(values) => onFilterChange('tipo', values)}
            placeholder="Matriz e Filial"
            isDark={isDark}
            disabled={loading}
          />
        </div>
      </div>

      {/* Seção: Capital Social */}
      <div>
        <h4 className={`text-sm font-medium mb-4 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
          Capital Social
        </h4>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={`block mb-2 text-sm ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
              Mínimo (R$)
            </label>
            <input
              type="number"
              min="0"
              value={filters.capital_social_min || ''}
              onChange={(e) => onFilterChange('capital_social_min', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="0"
              disabled={loading}
              className={`w-full px-4 py-2 border-b transition-all ${
                isDark
                  ? 'bg-black border-white/[0.2] text-white focus:bg-black focus:border-[#0169D9]'
                  : 'bg-white border border-border-light text-text-primary-light focus:border-[#0169D9]'
              } focus:outline-none disabled:opacity-50`}
            />
          </div>

          <div>
            <label className={`block mb-2 text-sm ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
              Máximo (R$)
            </label>
            <input
              type="number"
              min="0"
              value={filters.capital_social_max || ''}
              onChange={(e) => onFilterChange('capital_social_max', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="Sem limite"
              disabled={loading}
              className={`w-full px-4 py-2 border-b transition-all ${
                isDark
                  ? 'bg-black border-white/[0.2] text-white focus:bg-black focus:border-[#0169D9]'
                  : 'bg-white border border-border-light text-text-primary-light focus:border-[#0169D9]'
              } focus:outline-none disabled:opacity-50`}
            />
          </div>
        </div>
      </div>

      {/* Seção: Regime Tributário e Contato */}
      <div>
        <h4 className={`text-sm font-medium mb-4 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
          Filtros Adicionais
        </h4>

        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.simples || false}
              onChange={(e) => onFilterChange('simples', e.target.checked || undefined)}
              disabled={loading}
              className="w-4 h-4 rounded border-gray-300 text-[#0169D9] focus:ring-[#0169D9]"
            />
            <span className={`text-sm ${isDark ? 'text-white/70' : 'text-text-primary-light'}`}>
              Optante do Simples Nacional
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.mei || false}
              onChange={(e) => onFilterChange('mei', e.target.checked || undefined)}
              disabled={loading}
              className="w-4 h-4 rounded border-gray-300 text-[#0169D9] focus:ring-[#0169D9]"
            />
            <span className={`text-sm ${isDark ? 'text-white/70' : 'text-text-primary-light'}`}>
              É MEI
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.com_email || false}
              onChange={(e) => onFilterChange('com_email', e.target.checked || undefined)}
              disabled={loading}
              className="w-4 h-4 rounded border-gray-300 text-[#0169D9] focus:ring-[#0169D9]"
            />
            <span className={`text-sm ${isDark ? 'text-white/70' : 'text-text-primary-light'}`}>
              Apenas com E-mail
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.com_telefone || false}
              onChange={(e) => onFilterChange('com_telefone', e.target.checked || undefined)}
              disabled={loading}
              className="w-4 h-4 rounded border-gray-300 text-[#0169D9] focus:ring-[#0169D9]"
            />
            <span className={`text-sm ${isDark ? 'text-white/70' : 'text-text-primary-light'}`}>
              Apenas com Telefone
            </span>
          </label>
        </div>
      </div>

      {/* Seção: Data de Abertura */}
      <div>
        <h4 className={`text-sm font-medium mb-4 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
          Data de Abertura
        </h4>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={`block mb-2 text-sm ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
              A partir de
            </label>
            <input
              type="date"
              value={filters.data_abertura_min || ''}
              onChange={(e) => onFilterChange('data_abertura_min', e.target.value || undefined)}
              disabled={loading}
              className={`w-full px-4 py-2 border-b transition-all ${
                isDark
                  ? 'bg-black border-white/[0.2] text-white focus:bg-black focus:border-[#0169D9]'
                  : 'bg-white border border-border-light text-text-primary-light focus:border-[#0169D9]'
              } focus:outline-none disabled:opacity-50`}
            />
          </div>

          <div>
            <label className={`block mb-2 text-sm ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
              Até
            </label>
            <input
              type="date"
              value={filters.data_abertura_max || ''}
              onChange={(e) => onFilterChange('data_abertura_max', e.target.value || undefined)}
              disabled={loading}
              className={`w-full px-4 py-2 border-b transition-all ${
                isDark
                  ? 'bg-black border-white/[0.2] text-white focus:bg-black focus:border-[#0169D9]'
                  : 'bg-white border border-border-light text-text-primary-light focus:border-[#0169D9]'
              } focus:outline-none disabled:opacity-50`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
