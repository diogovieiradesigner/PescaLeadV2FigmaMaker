import { Theme } from '../hooks/useTheme';
import { Mail, MessageCircle, X, Filter } from 'lucide-react';
import { cn } from './ui/utils';

export interface LeadFilters {
  hasEmail: boolean;
  hasWhatsapp: boolean;
}

interface KanbanFiltersProps {
  theme: Theme;
  filters: LeadFilters;
  onFiltersChange: (filters: LeadFilters) => void;
}

export function KanbanFilters({ theme, filters, onFiltersChange }: KanbanFiltersProps) {
  const isDark = theme === 'dark';

  const handleToggleFilter = (filterKey: keyof LeadFilters) => {
    onFiltersChange({
      ...filters,
      [filterKey]: !filters[filterKey],
    });
  };

  const handleClearAll = () => {
    onFiltersChange({
      hasEmail: false,
      hasWhatsapp: false,
    });
  };

  const hasActiveFilters = filters.hasEmail || filters.hasWhatsapp;
  const activeFiltersCount = [filters.hasEmail, filters.hasWhatsapp].filter(Boolean).length;

  return (
    <div className={cn(
      "px-4 py-3 border-b transition-colors",
      "bg-black border-white/10"
    )}>
      <div className="flex items-center justify-between gap-3">
        {/* Label e contador */}
        <div className="flex items-center gap-2">
          <Filter className={cn(
            "w-4 h-4",
            "text-white/70"
          )} />
          <span className={cn(
            "text-sm font-medium",
            "text-white"
          )}>
            Filtros
          </span>
          {hasActiveFilters && (
            <span className={cn(
              "px-2 py-0.5 text-xs rounded-full",
              isDark 
                ? "bg-blue-500/20 text-blue-400" 
                : "bg-blue-100 text-blue-700"
            )}>
              {activeFiltersCount}
            </span>
          )}
        </div>

        {/* Botões de filtro */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtro: Tem E-mail */}
          <button
            onClick={() => handleToggleFilter('hasEmail')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5",
              filters.hasEmail
                ? isDark
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/50"
                  : "bg-blue-100 text-blue-700 border border-blue-300"
                : isDark
                  ? "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800"
                  : "bg-zinc-50 text-zinc-600 border border-zinc-200 hover:bg-zinc-100"
            )}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Tem E-mail</span>
          </button>

          {/* Filtro: Tem Whatsapp */}
          <button
            onClick={() => handleToggleFilter('hasWhatsapp')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5",
              filters.hasWhatsapp
                ? isDark
                  ? "bg-green-500/20 text-green-400 border border-green-500/50"
                  : "bg-green-100 text-green-700 border border-green-300"
                : isDark
                  ? "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800"
                  : "bg-zinc-50 text-zinc-600 border border-zinc-200 hover:bg-zinc-100"
            )}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Tem Whatsapp</span>
          </button>

          {/* Botão Limpar Filtros */}
          {hasActiveFilters && (
            <button
              onClick={handleClearAll}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5",
                isDark
                  ? "bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30"
                  : "bg-red-100 text-red-700 border border-red-300 hover:bg-red-200"
              )}
              title="Limpar todos os filtros"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
