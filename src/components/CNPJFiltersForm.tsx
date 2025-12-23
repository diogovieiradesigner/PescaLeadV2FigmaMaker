// =============================================================================
// COMPONENT: CNPJFiltersForm
// Formulário de filtros para extração CNPJ
// =============================================================================

import { useState, useEffect, useRef } from 'react';
import { Theme } from '../hooks/useTheme';
import { ChevronDown, X, Search, Info, Loader2, AlertTriangle } from 'lucide-react';
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
  cnaesSearching?: boolean;
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
  isSearching?: boolean;
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
  showCount = false,
  isSearching = false
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const [optionsCache, setOptionsCache] = useState<FilterOption[]>([]);

  // Atualizar cache de opções para manter labels de itens selecionados
  useEffect(() => {
    if (options.length > 0) {
      setOptionsCache(prev => {
        const newCache = [...prev];
        options.forEach(opt => {
          const index = newCache.findIndex(p => p.value === opt.value);
          if (index === -1) {
            newCache.push(opt);
          } else {
            newCache[index] = opt; // Atualiza se já existir
          }
        });
        return newCache;
      });
    }
  }, [options]);

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
  const baseOptions = searchable && search && !onSearchChange
    ? options.filter(opt =>
        opt.label.toLowerCase().includes(search.toLowerCase()) ||
        opt.value.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  // Garantir que itens selecionados sempre apareçam na lista, mesmo que não estejam nos resultados da busca
  const filteredOptions = [...baseOptions];
  
  selected.forEach(val => {
    if (!filteredOptions.some(opt => opt.value === val)) {
      // Tenta achar no cache, senão usa o valor como label
      const cached = optionsCache.find(opt => opt.value === val);
      filteredOptions.unshift(cached || { value: val, label: val });
    }
  });

  const handleSearchInput = (value: string) => {
    setSearch(value);
    if (onSearchChange) {
      onSearchChange(value);
    }
  };

  const selectedLabels = selected
    .map(val => optionsCache.find(opt => opt.value === val)?.label || options.find(opt => opt.value === val)?.label || val)
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
            {isSearching ? (
              <div className={`px-4 py-6 text-sm flex flex-col items-center gap-2 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Buscando CNAEs...</span>
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className={`px-4 py-3 text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                {search ? 'Nenhum resultado encontrado' : 'Digite para buscar...'}
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

// Componente Select com opção "Todos" integrada
interface SelectWithAllProps {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  allLabel?: string;
  isDark: boolean;
  disabled?: boolean;
}

function SelectWithAll({
  label,
  options,
  selected,
  onChange,
  allLabel = 'Todos',
  isDark,
  disabled = false
}: SelectWithAllProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown ao clicar fora
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

  // "Todos" está selecionado quando nenhum filtro específico está ativo (array vazio)
  // Isso significa que TODAS as opções estão incluídas
  const isAllSelected = selected.length === 0;

  // Texto exibido no botão
  const displayText = isAllSelected
    ? allLabel
    : selected.length <= 2
      ? selected.map(val => options.find(opt => opt.value === val)?.label || val).join(', ')
      : `${selected.slice(0, 2).map(val => options.find(opt => opt.value === val)?.label || val).join(', ')} +${selected.length - 2}`;

  const handleSelectAll = () => {
    onChange([]); // Array vazio = todos selecionados
    setIsOpen(false);
  };

  const toggleOption = (value: string) => {
    if (isAllSelected) {
      // Se "Todos" estava selecionado, desmarcar significa selecionar apenas os outros
      const allExceptThis = options.filter(opt => opt.value !== value).map(opt => opt.value);
      onChange(allExceptThis);
    } else if (selected.includes(value)) {
      // Se já estava selecionado, remover
      const newSelected = selected.filter(v => v !== value);
      // Se não sobrar nenhum, volta para "Todos"
      onChange(newSelected);
    } else {
      // Adicionar à seleção
      const newSelected = [...selected, value];
      // Se selecionou todas as opções individualmente, converter para "Todos" (array vazio)
      if (newSelected.length === options.length) {
        onChange([]);
      } else {
        onChange(newSelected);
      }
    }
  };

  // Verificar se uma opção específica está marcada
  // Quando "Todos" está ativo (array vazio), todas as opções estão marcadas
  const isOptionSelected = (value: string) => {
    return isAllSelected || selected.includes(value);
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
        <span>{displayText}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''} ${isDark ? 'text-white/50' : 'text-gray-500'}`} />
      </button>

      {isOpen && (
        <div className={`absolute z-50 w-full mt-1 rounded-lg shadow-lg border max-h-60 overflow-hidden ${
          isDark
            ? 'bg-[#1a1a1a] border-white/[0.1]'
            : 'bg-white border-border-light'
        }`}>
          <div className="overflow-y-auto max-h-48">
            {/* Opção "Todos" */}
            <button
              type="button"
              onClick={handleSelectAll}
              className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 transition-colors ${
                isAllSelected
                  ? isDark
                    ? 'bg-[#0169D9]/20 text-[#0169D9]'
                    : 'bg-blue-50 text-[#0169D9]'
                  : isDark
                    ? 'text-white hover:bg-white/[0.05]'
                    : 'text-text-primary-light hover:bg-gray-50'
              }`}
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                isAllSelected
                  ? 'bg-[#0169D9] border-[#0169D9]'
                  : isDark ? 'border-white/30' : 'border-gray-300'
              }`}>
                {isAllSelected && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="flex-1 font-medium">{allLabel}</span>
            </button>

            {/* Separador */}
            <div className={`border-t ${isDark ? 'border-white/[0.1]' : 'border-gray-100'}`} />

            {/* Opções específicas - todas marcadas quando "Todos" está ativo */}
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleOption(option.value)}
                className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 transition-colors ${
                  isOptionSelected(option.value)
                    ? isDark
                      ? 'bg-[#0169D9]/20 text-[#0169D9]'
                      : 'bg-blue-50 text-[#0169D9]'
                    : isDark
                      ? 'text-white hover:bg-white/[0.05]'
                      : 'text-text-primary-light hover:bg-gray-50'
                }`}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                  isOptionSelected(option.value)
                    ? 'bg-[#0169D9] border-[#0169D9]'
                    : isDark ? 'border-white/30' : 'border-gray-300'
                }`}>
                  {isOptionSelected(option.value) && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="flex-1">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Funções de validação de filtros
function validateFilters(filters: CNPJFilters): string[] {
  const errors: string[] = [];

  // 1. Validar compatibilidade entre porte e capital social
  if (filters.porte && filters.porte.length > 0 && (filters.capital_social_min || filters.capital_social_max)) {
    const microEmpresa = filters.porte.includes('01');
    const pequenoPorte = filters.porte.includes('03');
    const capitalMin = filters.capital_social_min || 0;
    const capitalMax = filters.capital_social_max;

    // Microempresa: capital social geralmente até R$ 360.000,00
    if (microEmpresa && capitalMin > 360000) {
      errors.push('Microempresas geralmente têm capital social de até R$ 360.000,00. Verifique se este filtro é adequado.');
    }

    // Empresa de Pequeno Porte: capital social geralmente até R$ 4.800.000,00
    if (pequenoPorte && capitalMin > 4800000) {
      errors.push('Empresas de Pequeno Porte geralmente têm capital social de até R$ 4.800.000,00. Verifique se este filtro é adequado.');
    }

    // Se houver máximo definido, validar compatibilidade
    if (capitalMax && capitalMax < capitalMin) {
      errors.push('O capital social máximo não pode ser menor que o mínimo.');
    }
  }

  // 2. Validar combinações impossíveis de situação cadastral
  if (filters.situacao && filters.situacao.length > 0) {
    const ativa = filters.situacao.includes('02');
    const baixada = filters.situacao.includes('08');
    const inapta = filters.situacao.includes('04');

    // Não faz sentido buscar empresas ativas e baixadas ao mesmo tempo
    if (ativa && baixada) {
      errors.push('Não é possível buscar empresas ativas e baixadas simultaneamente.');
    }

    // Não faz sentido buscar empresas ativas e inaptas ao mesmo tempo
    if (ativa && inapta) {
      errors.push('Não é possível buscar empresas ativas e inaptas simultaneamente.');
    }
  }

  // 3. Validar intervalo de capital social
  if (filters.capital_social_min && filters.capital_social_max) {
    if (filters.capital_social_max < filters.capital_social_min) {
      errors.push('O capital social máximo não pode ser menor que o mínimo.');
    }
  }

  // 4. Validar datas de abertura
  if (filters.data_abertura_min && filters.data_abertura_max) {
    const dataMin = new Date(filters.data_abertura_min);
    const dataMax = new Date(filters.data_abertura_max);
    
    if (dataMax < dataMin) {
      errors.push('A data de abertura máxima não pode ser anterior à data mínima.');
    }
  }

  // 5. Validar MEI vs Porte
  if (filters.mei && filters.porte && filters.porte.length > 0) {
    const microEmpresa = filters.porte.includes('01');
    if (!microEmpresa) {
      errors.push('Para buscar MEIs, é recomendável selecionar o porte "Micro Empresa".');
    }
  }

  // 6. Validar Simples Nacional vs Porte
  if (filters.simples && filters.porte && filters.porte.length > 0) {
    const microEmpresa = filters.porte.includes('01');
    const pequenoPorte = filters.porte.includes('03');
    
    if (!microEmpresa && !pequenoPorte) {
      errors.push('O Simples Nacional é mais comum em microempresas e empresas de pequeno porte.');
    }
  }

  return errors;
}

export function CNPJFiltersForm({
  theme,
  filters,
  onFilterChange,
  cnaeOptions = [],
  loading = false,
  onCNAESearch,
  cnaesSearching = false
}: CNPJFiltersFormProps) {
  const isDark = theme === 'dark';
  const [cnaeSearchTimeout, setCnaeSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Validar filtros sempre que mudarem
  useEffect(() => {
    const errors = validateFilters(filters);
    setValidationErrors(errors);
  }, [filters]);

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
          placeholder={cnaesSearching ? "Buscando CNAEs..." : "Busque atividades econômicas..."}
          isDark={isDark}
          searchable
          disabled={loading}
          onSearchChange={handleCNAESearch}
          showCount
          isSearching={cnaesSearching}
        />
      </div>

      {/* Seção: Porte e Situação */}
      <div>
        <h4 className={`text-sm font-medium mb-4 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
          Características da Empresa
        </h4>

        <div className="grid grid-cols-3 gap-4">
          <SelectWithAll
            label="Porte"
            options={PORTE_OPTIONS}
            selected={filters.porte || []}
            onChange={(values) => onFilterChange('porte', values)}
            allLabel="Todos"
            isDark={isDark}
            disabled={loading}
          />

          <SelectWithAll
            label="Situação"
            options={SITUACAO_OPTIONS}
            selected={filters.situacao || []}
            onChange={(values) => onFilterChange('situacao', values)}
            allLabel="Todas"
            isDark={isDark}
            disabled={loading}
          />

          <SelectWithAll
            label="Tipo"
            options={TIPO_OPTIONS}
            selected={filters.tipo || []}
            onChange={(values) => onFilterChange('tipo', values)}
            allLabel="Todos"
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

      {/* Seção: Mensagens de validação */}
      {validationErrors.length > 0 && (
        <div className={`mt-6 p-4 rounded-lg border ${isDark ? 'bg-red-900/20 border-red-800/30' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
            <div className="flex-1">
              <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-red-300' : 'text-red-800'}`}>
                Atenção: Verifique seus filtros
              </h4>
              <ul className={`space-y-1 text-sm ${isDark ? 'text-red-200' : 'text-red-700'}`}>
                {validationErrors.map((error, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-current rounded-full mt-1.5 flex-shrink-0" />
                    {error}
                  </li>
                ))}
              </ul>
              <p className={`mt-3 text-xs ${isDark ? 'text-red-300/70' : 'text-red-600/80'}`}>
                Essas combinações podem não retornar resultados ou podem ser logicamente inconsistentes.
                Revise os filtros antes de iniciar a extração.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
